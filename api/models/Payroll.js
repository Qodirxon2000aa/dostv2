const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  employeeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName:     { type: String },
  calculatedSalary: { type: Number, default: 0 },
  amount:           { type: Number, default: 0 },
  month:            { type: String },
  date:             { type: String },
  type:             { type: String, enum: ['MONTHLY', 'DAILY_PAY', 'QUICK_ADD'], default: 'MONTHLY' },
  status:           { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  paymentStatus:    { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  paidAt:           { type: Date },
  objectId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Object', default: null },
  objectName:       { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Payroll', PayrollSchema);