const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  /** Bo'sh = barcha obyektlarda ko'rinadi (eski qatorlar). To'ldirilsa — faqat ushbu omborlarda. */
  linkedObjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Object' }],
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
