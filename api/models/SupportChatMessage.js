const mongoose = require('mongoose');

const SupportChatMessageSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    body: { type: String, default: '', trim: true, maxlength: 4000 },
    /** Rasm: data URL (frontend siqilgan JPEG) */
    mediaType: { type: String, enum: ['', 'image'], default: '' },
    mediaUrl: { type: String, default: '', maxlength: 500000 },
    sender: { type: String, enum: ['EMPLOYEE', 'ADMIN'], required: true },
    senderName: { type: String, default: '' },
    /** Qabul qiluvchi o‘qiganda true (xodim yoki admin) */
    readByRecipient: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SupportChatMessageSchema.index({ employeeId: 1, createdAt: -1 });

module.exports = mongoose.model('SupportChatMessage', SupportChatMessageSchema);
