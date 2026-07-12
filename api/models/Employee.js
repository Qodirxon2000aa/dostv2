const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  uid:        { type: String },
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String },
  plainPassword: { type: String, default: '' },
  position:   { type: String, required: true },
  role:       { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' },
  salaryType: { type: String, enum: ['MONTHLY', 'DAILY'], default: 'MONTHLY' },
  salaryRate: { type: Number, default: 0 },
  currency:   { type: String, default: 'UZS' },

  // 🔥 QO‘SHILDI (HECH NARSA O‘CHIRILMADI)
  balance:    { type: Number, default: 0 },

  status:     { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    speed: { type: Number, default: null },
    heading: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);