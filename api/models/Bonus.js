// models/Bonus.js
const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Object',
    default: null,
  },
  objectName: {
    type: String,
    default: '',
    trim: true,
  },
  amount:     { type: Number, required: true, min: 0 },
  reason:     { type: String, required: true, trim: true },
  date:       { type: String, required: true }, // YYYY-MM-DD
  status:     { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdBy:  { type: String, default: 'Admin' },
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Bonus', bonusSchema);