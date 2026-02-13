const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Submit a review (must have purchased)
router.post('/', [
  body('contentId').notEmpty(),
  body('downloadToken').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('reviewerName').optional().trim().isLength({ max: 50 }),
  body('comment').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input. Rating must be 1-5.' });
  }

  const { contentId, downloadToken, rating, reviewerName, comment } = req.body;

  try {
    // Verify purchase
    const transaction = await Transaction.findOne({
      content: contentId,
      downloadToken,
      paymentStatus: 'completed'
    });

    if (!transaction) {
      return res.status(403).json({ error: 'You must purchase this content before reviewing' });
    }

    // Check if already reviewed with this transaction
    const existing = await Review.findOne({ transaction: transaction._id });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this content' });
    }

    const review = await Review.create({
      content: contentId,
      transaction: transaction._id,
      reviewerName: reviewerName || 'Anonymous',
      rating,
      comment: comment || ''
    });

    // Update content average rating
    const stats = await Review.aggregate([
      { $match: { content: review.content } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await Content.findByIdAndUpdate(contentId, {
        averageRating: Math.round(stats[0].avgRating * 10) / 10,
        reviewCount: stats[0].count
      });
    }

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for content
router.get('/content/:contentId', async (req, res) => {
  try {
    const reviews = await Review.find({ content: req.params.contentId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
