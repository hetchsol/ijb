const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const { authenticateCreator } = require('./creator');
const Content = require('../models/Content');

const router = express.Router();

// Create uploads & thumbnails directories
const uploadsDir = path.join(__dirname, '..', 'uploads');
const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailsDir);
    } else if (file.fieldname === 'preview') {
      cb(null, uploadsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp3|mp4|wav|avi|mov|zip|rar|txt|epub|mobi|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'preview', maxCount: 1 }
]);

// Upload content
router.post('/upload', authenticateCreator, uploadFields, async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, description, category, priceZmw } = req.body;

  if (!title || !title.trim()) {
    // Clean up uploaded files
    Object.values(req.files).flat().forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const mainFile = req.files.file[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;
    const previewFile = req.files.preview ? req.files.preview[0] : null;

    const content = await Content.create({
      creator: req.creatorId,
      title: title.trim(),
      description: description || '',
      filePath: mainFile.filename,
      fileName: mainFile.originalname,
      fileSize: mainFile.size,
      category: category || 'Other',
      priceZmw: Math.max(1, parseInt(priceZmw) || 2),
      thumbnailPath: thumbnailFile ? thumbnailFile.filename : null,
      previewPath: previewFile ? previewFile.filename : null
    });

    res.status(201).json({
      message: 'Content uploaded successfully',
      content: {
        id: content._id,
        title: content.title,
        description: content.description,
        fileName: content.fileName,
        fileSize: content.fileSize,
        category: content.category,
        priceZmw: content.priceZmw
      }
    });
  } catch (error) {
    // Clean up files on error
    Object.values(req.files).flat().forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    res.status(500).json({ error: 'Failed to upload content' });
  }
});

// Browse content (public, with pagination)
router.get('/browse', async (req, res) => {
  const { category, search, sort, minPrice, maxPrice, minRating, page = 1, limit = 12 } = req.query;

  try {
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.priceZmw = {};
      if (minPrice) filter.priceZmw.$gte = parseInt(minPrice);
      if (maxPrice) filter.priceZmw.$lte = parseInt(maxPrice);
    }

    if (minRating) {
      filter.averageRating = { $gte: parseFloat(minRating) };
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'popular': sortOption = { downloadCount: -1 }; break;
      case 'price_low': sortOption = { priceZmw: 1 }; break;
      case 'price_high': sortOption = { priceZmw: -1 }; break;
      case 'rating': sortOption = { averageRating: -1 }; break;
      case 'newest':
      default: sortOption = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, totalCount] = await Promise.all([
      Content.find(filter)
        .populate('creator', 'displayName username isVerified')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Content.countDocuments(filter)
    ]);

    // Map to expected frontend format
    const mapped = items.map(item => ({
      id: item._id,
      title: item.title,
      description: item.description,
      file_name: item.fileName,
      file_size: item.fileSize,
      category: item.category,
      price_zmw: item.priceZmw,
      download_count: item.downloadCount,
      average_rating: item.averageRating,
      review_count: item.reviewCount,
      thumbnail_path: item.thumbnailPath,
      created_at: item.createdAt,
      creator_name: item.creator?.displayName || 'Unknown',
      creator_username: item.creator?.username || '',
      creator_verified: item.creator?.isVerified || false
    }));

    res.json({ items: mapped, totalCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get single content details
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('creator', 'displayName username isVerified');

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({
      id: content._id,
      title: content.title,
      description: content.description,
      file_name: content.fileName,
      file_size: content.fileSize,
      category: content.category,
      price_zmw: content.priceZmw,
      download_count: content.downloadCount,
      average_rating: content.averageRating,
      review_count: content.reviewCount,
      thumbnail_path: content.thumbnailPath,
      preview_path: content.previewPath,
      created_at: content.createdAt,
      creator_name: content.creator?.displayName || 'Unknown',
      creator_username: content.creator?.username || '',
      creator_verified: content.creator?.isVerified || false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get content preview
router.get('/preview/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content || !content.previewPath) {
      return res.status(404).json({ error: 'Preview not available' });
    }

    const filePath = path.join(uploadsDir, content.previewPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Preview file not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load preview' });
  }
});

// Get creator's own content
router.get('/my/uploads', authenticateCreator, async (req, res) => {
  try {
    const content = await Content.find({ creator: req.creatorId })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = content.map(item => ({
      id: item._id,
      title: item.title,
      description: item.description,
      file_name: item.fileName,
      file_size: item.fileSize,
      category: item.category,
      price_zmw: item.priceZmw,
      download_count: item.downloadCount,
      average_rating: item.averageRating,
      created_at: item.createdAt
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Delete content
router.delete('/:id', authenticateCreator, async (req, res) => {
  try {
    const content = await Content.findOne({ _id: req.params.id, creator: req.creatorId });
    if (!content) {
      return res.status(404).json({ error: 'Content not found or unauthorized' });
    }

    // Delete files from filesystem
    const filePath = path.join(uploadsDir, content.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (content.thumbnailPath) {
      const thumbPath = path.join(thumbnailsDir, content.thumbnailPath);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    if (content.previewPath) {
      const prevPath = path.join(uploadsDir, content.previewPath);
      if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
    }

    await Content.deleteOne({ _id: content._id });

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

module.exports = router;
