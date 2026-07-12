const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  objectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Object' },
  objectName: { type: String },
  date:       { type: String, required: true },   // "2025-06-15"
  status:     { type: String, enum: ['PENDING', 'PRESENT', 'ABSENT'], default: 'PENDING' },
  markedBy:   { type: String, default: 'admin' },
}, { timestamps: true });

// Bir xodim bir kunda faqat bitta yozuv
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);