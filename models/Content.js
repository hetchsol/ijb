const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  category: {
    type: String,
    enum: ['Music', 'Books', 'Art', 'Videos', 'Documents', 'Other'],
    default: 'Other'
  },
  priceZmw: { type: Number, default: 2, min: 1 },
  thumbnailPath: { type: String },
  previewPath: { type: String },
  downloadCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Content', contentSchema);
