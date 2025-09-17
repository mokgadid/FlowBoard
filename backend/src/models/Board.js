const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Enforce uniqueness per user (same user can't reuse the same board name),
// but allow different users to share the same board name.
BoardSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Board', BoardSchema);


