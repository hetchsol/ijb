const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Content = require('../models/Content');
const Creator = require('../models/Creator');
const Transaction = require('../models/Transaction');

const router = express.Router();

const PLATFORM_COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT) || 15;

function calculateRevenueSplit(amount) {
  const platformFee = (amount * PLATFORM_COMMISSION) / 100;
  const creatorEarnings = amount - platformFee;
  return { platformFee: Math.round(platformFee * 100) / 100, creatorEarnings: Math.round(creatorEarnings * 100) / 100 };
}

// Initiate payment
router.post('/initiate', [
  body('contentId').notEmpty(),
  body('paymentMethod').isIn(['mtn_momo', 'airtel_money', 'zamtel', 'visa']),
  body('phoneNumber').optional().matches(/^0[97]\d{8}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input. Check content ID and payment method.' });
  }

  const { contentId, paymentMethod, phoneNumber } = req.body;

  // Validate phone for mobile money
  if (['mtn_momo', 'airtel_money', 'zamtel'].includes(paymentMethod) && !phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required for mobile money payments' });
  }

  try {
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const price = content.priceZmw;
    const { platformFee, creatorEarnings } = calculateRevenueSplit(price);
    const transactionRef = uuidv4();
    const downloadToken = uuidv4();

    const transaction = await Transaction.create({
      content: content._id,
      creator: content.creator,
      transactionRef,
      paymentMethod,
      amountZmw: price,
      platformFee,
      creatorEarnings,
      phoneNumber: phoneNumber || null,
      downloadToken,
      paymentStatus: 'pending'
    });

    const paymentResponse = initiatePaymentGateway(paymentMethod, transactionRef, price, phoneNumber);

    res.json({
      transactionId: transaction._id,
      transactionRef,
      paymentMethod,
      amount: price,
      status: 'pending',
      ...paymentResponse
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

function initiatePaymentGateway(method, reference, amount, phoneNumber) {
  const messages = {
    mtn_momo: { message: 'Please approve the payment on your MTN phone', instructions: `A payment request for ZMW ${amount.toFixed(2)} has been sent to ${phoneNumber}` },
    airtel_money: { message: 'Please approve the payment on your Airtel phone', instructions: `A payment request for ZMW ${amount.toFixed(2)} has been sent to ${phoneNumber}` },
    zamtel: { message: 'Please approve the payment on your Zamtel phone', instructions: `A payment request for ZMW ${amount.toFixed(2)} has been sent to ${phoneNumber}` },
    visa: { message: 'You will be redirected to our secure payment partner', instructions: 'Your payment is being processed securely' }
  };
  return {
    ...(messages[method] || { message: 'Processing payment' }),
    checkStatusUrl: `/api/payment/status/${reference}`
  };
}

// Verify payment
router.post('/verify/:transactionRef', async (req, res) => {
  const { transactionRef } = req.params;
  const { status } = req.body;

  try {
    const transaction = await Transaction.findOne({ transactionRef });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.paymentStatus === 'completed') {
      return res.json({ message: 'Transaction already completed', downloadToken: transaction.downloadToken });
    }

    const newStatus = status === 'success' ? 'completed' : 'failed';
    transaction.paymentStatus = newStatus;

    if (newStatus === 'completed') {
      transaction.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      transaction.downloadsRemaining = 3;
      await transaction.save();

      await Content.findByIdAndUpdate(transaction.content, { $inc: { downloadCount: 1 } });
      await Creator.findByIdAndUpdate(transaction.creator, { $inc: { totalEarnings: transaction.creatorEarnings } });

      res.json({
        message: 'Payment successful',
        downloadToken: transaction.downloadToken,
        downloadUrl: `/api/payment/download/${transaction.downloadToken}`
      });
    } else {
      await transaction.save();
      res.status(400).json({ error: 'Payment failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Check payment status
router.get('/status/:transactionRef', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionRef: req.params.transactionRef })
      .select('paymentStatus downloadToken');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      status: transaction.paymentStatus,
      downloadToken: transaction.paymentStatus === 'completed' ? transaction.downloadToken : null,
      downloadUrl: transaction.paymentStatus === 'completed'
        ? `/api/payment/download/${transaction.downloadToken}`
        : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Download file with token (protected)
router.get('/download/:token', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      downloadToken: req.params.token,
      paymentStatus: 'completed'
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Invalid download token or payment not completed' });
    }

    // Check token expiry
    if (transaction.tokenExpiresAt && new Date() > transaction.tokenExpiresAt) {
      return res.status(403).json({ error: 'Download token has expired. Please purchase again.' });
    }

    // Check remaining downloads
    if (transaction.downloadsRemaining !== undefined && transaction.downloadsRemaining <= 0) {
      return res.status(403).json({ error: 'Download limit reached for this token.' });
    }

    const content = await Content.findById(transaction.content);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', content.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Decrement remaining downloads and mark as downloaded
    transaction.downloaded = true;
    if (transaction.downloadsRemaining !== undefined) {
      transaction.downloadsRemaining -= 1;
    }
    await transaction.save();

    res.download(filePath, content.fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// Simulate payment (dev only)
router.post('/simulate-success/:transactionRef', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  try {
    const transaction = await Transaction.findOne({ transactionRef: req.params.transactionRef });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.paymentStatus = 'completed';
    transaction.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    transaction.downloadsRemaining = 3;
    await transaction.save();

    await Content.findByIdAndUpdate(transaction.content, { $inc: { downloadCount: 1 } });
    await Creator.findByIdAndUpdate(transaction.creator, { $inc: { totalEarnings: transaction.creatorEarnings } });

    res.json({
      message: 'Payment simulated successfully',
      downloadToken: transaction.downloadToken,
      downloadUrl: `/api/payment/download/${transaction.downloadToken}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;
