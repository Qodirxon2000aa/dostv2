const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, default: '' },
  message:      { type: String, required: true, trim: true },
  read:         { type: Boolean, default: false },
  readAt:       { type: Date, default: null },
  createdBy:    { type: String, default: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
