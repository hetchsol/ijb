const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String },
  bio: { type: String },
  totalEarnings: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  passwordResetToken: { type: String },
  resetTokenExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Creator', creatorSchema);
