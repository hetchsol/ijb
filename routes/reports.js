const express = require('express');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');

const router = express.Router();

// Submit a report
router.post('/', [
  body('contentId').notEmpty(),
  body('reason').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('reporterEmail').optional().isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input. Reason is required.' });
  }

  const { contentId, reason, description, reporterEmail } = req.body;

  try {
    const report = await Report.create({
      content: contentId,
      reason,
      description: description || '',
      reporterEmail: reporterEmail || ''
    });

    res.status(201).json({ message: 'Report submitted. Thank you for helping keep our platform safe.', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
