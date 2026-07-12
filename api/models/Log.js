const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  performer: { type: String },
  action:    { type: String, required: true },
}, { timestamps: true });   // createdAt = timestamp

module.exports = mongoose.model('Log', LogSchema);