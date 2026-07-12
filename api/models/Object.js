const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  comment:   { type: String, default: '' },
  createdAt: { type: Date,   default: Date.now },
}, { _id: false });

const WithdrawalSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const ObjectSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
  totalBudget:   { type: Number, default: 0 },
  spentAmount:   { type: Number, default: 0 },
  incomeHistory: { type: [IncomeSchema], default: [] },
  withdrawalHistory: { type: [WithdrawalSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Object', ObjectSchema);