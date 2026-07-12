const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  date:     { type: String, required: true },
  quantity: { type: Number, required: true },
  note:     { type: String, default: '' },
}, { _id: true });

const restockSchema = new mongoose.Schema({
  date:     { type: String, required: true },
  quantity: { type: Number, required: true },
  amount:   { type: Number, default: 0 },
  note:     { type: String, default: '' },
}, { _id: true });

const warehouseSchema = new mongoose.Schema({
  objectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Object', required: true },
  name:      { type: String, required: true, trim: true },
  supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '', trim: true },
  supplierPhone:{ type: String, default: '', trim: true },
  unit:      { type: String, required: true, default: 'm' },
  supplied:  { type: Number, required: true, default: 0 },
  used:      { type: Number, default: 0 },
  remaining:   { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  usages:    { type: [usageSchema], default: [] },
  restocks:  { type: [restockSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);