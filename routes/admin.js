const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Creator = require('../models/Creator');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Report = require('../models/Report');

const router = express.Router();

// Middleware to verify admin JWT token
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    req.adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login (using Admin model with hashed password)
router.post('/login', [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Admin login successful',
      token,
      admin: { id: admin._id, username: admin.username }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get platform statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalCreators, totalContent, txStats, recentActivity, categoryStats, topCreators] = await Promise.all([
      Creator.countDocuments(),
      Content.countDocuments(),
      Transaction.aggregate([
        { $match: { paymentStatus: 'completed' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            revenue: { $sum: '$amountZmw' },
            platformEarnings: { $sum: '$platformFee' }
          }
        }
      ]),
      Transaction.aggregate([
        { $match: { paymentStatus: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$amountZmw' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
        { $project: { date: '$_id', count: 1, revenue: 1, _id: 0 } }
      ]),
      Content.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]),
      Creator.find().sort({ totalEarnings: -1 }).limit(5).select('displayName username totalEarnings')
    ]);

    res.json({
      totalCreators,
      totalContent,
      totalTransactions: txStats[0]?.total || 0,
      totalRevenue: txStats[0]?.revenue || 0,
      platformEarnings: txStats[0]?.platformEarnings || 0,
      recentActivity,
      categoryStats,
      topCreators
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all creators
router.get('/creators', authenticateAdmin, async (req, res) => {
  try {
    const creators = await Creator.find()
      .select('username email displayName totalEarnings isVerified createdAt')
      .sort({ createdAt: -1 });

    const mapped = creators.map(c => ({
      id: c._id,
      username: c.username,
      email: c.email,
      display_name: c.displayName,
      total_earnings: c.totalEarnings,
      is_verified: c.isVerified,
      created_at: c.createdAt
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch creators' });
  }
});

// Toggle creator verification
router.put('/creators/:id/verify', authenticateAdmin, async (req, res) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    creator.isVerified = !creator.isVerified;
    await creator.save();
    res.json({ message: `Creator ${creator.isVerified ? 'verified' : 'unverified'} successfully`, isVerified: creator.isVerified });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update creator' });
  }
});

// Delete creator
router.delete('/creators/:id', authenticateAdmin, async (req, res) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Delete files
    const content = await Content.find({ creator: creator._id });
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');

    content.forEach(item => {
      const filePath = path.join(uploadsDir, item.filePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (item.thumbnailPath) {
        const thumbPath = path.join(thumbnailsDir, item.thumbnailPath);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }
    });

    await Content.deleteMany({ creator: creator._id });
    await Transaction.deleteMany({ creator: creator._id });
    await Withdrawal.deleteMany({ creator: creator._id });
    await Creator.deleteOne({ _id: creator._id });

    res.json({ message: 'Creator deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete creator' });
  }
});

// Get all content
router.get('/content', authenticateAdmin, async (req, res) => {
  try {
    const content = await Content.find()
      .populate('creator', 'username displayName')
      .sort({ createdAt: -1 });

    const mapped = content.map(item => ({
      id: item._id,
      title: item.title,
      category: item.category,
      price_zmw: item.priceZmw,
      download_count: item.downloadCount,
      created_at: item.createdAt,
      creator_username: item.creator?.username || 'Deleted',
      creator_name: item.creator?.displayName || 'Deleted'
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Delete content (admin)
router.delete('/content/:id', authenticateAdmin, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, content.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (content.thumbnailPath) {
      const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');
      const thumbPath = path.join(thumbnailsDir, content.thumbnailPath);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    await Content.deleteOne({ _id: content._id });
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Get all transactions
router.get('/transactions', authenticateAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('content', 'title')
      .populate('creator', 'username')
      .sort({ createdAt: -1 })
      .limit(100);

    const mapped = transactions.map(tx => ({
      id: tx._id,
      content_title: tx.content?.title || 'Deleted',
      creator_username: tx.creator?.username || 'Deleted',
      amount_zmw: tx.amountZmw,
      platform_fee: tx.platformFee,
      payment_method: tx.paymentMethod,
      payment_status: tx.paymentStatus,
      created_at: tx.createdAt
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all withdrawals
router.get('/withdrawals', authenticateAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('creator', 'username displayName')
      .sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Process withdrawal
router.put('/withdrawals/:id', authenticateAdmin, [
  body('status').isIn(['approved', 'rejected'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal already processed' });
    }

    withdrawal.status = req.body.status;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    if (req.body.status === 'approved') {
      await Creator.findByIdAndUpdate(withdrawal.creator, {
        $inc: { totalEarnings: -withdrawal.amount }
      });
    }

    res.json({ message: `Withdrawal ${req.body.status}`, withdrawal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get all reports
router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('content', 'title')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status
router.put('/reports/:id', authenticateAdmin, [
  body('status').isIn(['reviewed', 'dismissed'])
], async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report updated', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

module.exports = router;
module.exports.authenticateAdmin = authenticateAdmin;
