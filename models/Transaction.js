const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
  transactionRef: { type: String, unique: true, required: true },
  paymentMethod: {
    type: String,
    enum: ['mtn_momo', 'airtel_money', 'zamtel', 'visa'],
    required: true
  },
  amountZmw: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  creatorEarnings: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  phoneNumber: { type: String },
  downloadToken: { type: String, unique: true },
  tokenExpiresAt: { type: Date },
  downloadsRemaining: { type: Number, default: 3 },
  downloaded: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
