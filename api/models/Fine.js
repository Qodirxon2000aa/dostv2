const mongoose = require('mongoose');

const FineSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  amount:       { type: Number, required: true, min: 1 },
  comment:      { type: String, default: '' },
  appliedBy:    { type: String, default: 'admin' },
  status:       { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Fine', FineSchema);