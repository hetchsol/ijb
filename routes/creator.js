const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Creator = require('../models/Creator');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');

const router = express.Router();

// Middleware to verify JWT token
const authenticateCreator = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.creatorId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Register new creator
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').optional().trim().isLength({ max: 100 }),
  body('bio').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input. Username must be 3-30 alphanumeric characters, password at least 6 characters.' });
  }

  const { username, password, email, displayName, bio } = req.body;

  try {
    const existing = await Creator.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const creator = await Creator.create({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      bio: bio || ''
    });

    const token = jwt.sign({ id: creator._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Creator registered successfully',
      token,
      creator: {
        id: creator._id,
        username: creator.username,
        email: creator.email,
        displayName: creator.displayName
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
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
    const creator = await Creator.findOne({ username });
    if (!creator) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, creator.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: creator._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      creator: {
        id: creator._id,
        username: creator.username,
        email: creator.email,
        displayName: creator.displayName,
        totalEarnings: creator.totalEarnings
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get creator profile (authenticated)
router.get('/profile', authenticateCreator, async (req, res) => {
  try {
    const creator = await Creator.findById(req.creatorId).select('-passwordHash -passwordResetToken -resetTokenExpires');
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    res.json(creator);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get public creator profile by username
router.get('/profile/:username', async (req, res) => {
  try {
    const creator = await Creator.findOne({ username: req.params.username })
      .select('username displayName bio isVerified totalEarnings createdAt');
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const content = await Content.find({ creator: creator._id })
      .sort({ createdAt: -1 })
      .select('title description category priceZmw downloadCount averageRating reviewCount thumbnailPath createdAt');

    const totalDownloads = await Content.aggregate([
      { $match: { creator: creator._id } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } }
    ]);

    res.json({
      creator,
      content,
      totalDownloads: totalDownloads[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get creator stats
router.get('/stats', authenticateCreator, async (req, res) => {
  try {
    const creator = await Creator.findById(req.creatorId);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const contentStats = await Content.aggregate([
      { $match: { creator: creator._id } },
      { $group: { _id: null, totalContent: { $sum: 1 }, totalDownloads: { $sum: '$downloadCount' } } }
    ]);

    const recentActivity = await Transaction.aggregate([
      { $match: { creator: creator._id, paymentStatus: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          downloads: { $sum: 1 },
          earnings: { $sum: '$creatorEarnings' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
      { $project: { date: '$_id', downloads: 1, earnings: 1, _id: 0 } }
    ]);

    // Per-content stats for charts
    const contentBreakdown = await Content.find({ creator: creator._id })
      .select('title downloadCount')
      .sort({ downloadCount: -1 })
      .limit(10);

    res.json({
      totalContent: contentStats[0]?.totalContent || 0,
      totalDownloads: contentStats[0]?.totalDownloads || 0,
      totalEarnings: creator.totalEarnings,
      recentActivity,
      contentBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Request withdrawal
router.post('/withdraw', authenticateCreator, [
  body('amount').isFloat({ min: 5 }),
  body('method').notEmpty(),
  body('accountDetails').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input. Minimum withdrawal is ZMW 5.' });
  }

  try {
    const creator = await Creator.findById(req.creatorId);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const { amount, method, accountDetails } = req.body;

    // Check pending withdrawals
    const pendingTotal = await Withdrawal.aggregate([
      { $match: { creator: creator._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingAmount = pendingTotal[0]?.total || 0;

    if (amount > creator.totalEarnings - pendingAmount) {
      return res.status(400).json({ error: 'Insufficient balance (accounting for pending withdrawals)' });
    }

    const withdrawal = await Withdrawal.create({
      creator: creator._id,
      amount,
      method,
      accountDetails
    });

    res.status(201).json({ message: 'Withdrawal request submitted', withdrawal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit withdrawal request' });
  }
});

// Get creator's withdrawals
router.get('/withdrawals', authenticateCreator, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ creator: req.creatorId })
      .sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

module.exports = router;
module.exports.authenticateCreator = authenticateCreator;
