const Attendance = require('../models/Attendance');
const Employee   = require('../models/Employee'); // Employee modelini import qilamiz
const mongoose   = require('mongoose');

exports.getAll = async (req, res) => {
  try {
    const { date, employeeId, status } = req.query;
    const filter = {};
    
    if (date)       filter.date = date;
    if (status)     filter.status = status;
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      filter.employeeId = employeeId;
    }

    const data = await Attendance.find(filter)
      .populate('employeeId', 'name position')
      .sort({ createdAt: -1 });

    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ getAll xatosi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upsert — bir xodim bir kunda bitta yozuv
exports.upsert = async (req, res) => {
  try {
    const { employeeId, date, status, objectId, objectName, markedBy } = req.body;

    // Validatsiya
    if (!employeeId || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'employeeId va date majburiy' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'employeeId noto\'g\'ri format' 
      });
    }

    // Employee mavjudligini tekshirish
    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Xodim topilmadi' 
      });
    }

    if (['SUPER_ADMIN', 'ADMIN'].includes(employeeExists.role)) {
      return res.status(400).json({
        success: false,
        message: 'Administratorlar uchun davomat yozilmaydi — faqat ishchilar',
      });
    }

    // Yangilash uchun ma'lumotlar
    const updateData = {
      status:     status     || 'PENDING',
      objectName: objectName || null,
      markedBy:   markedBy   || 'admin',
    };

    // ObjectId tekshirish
    if (objectId) {
      if (mongoose.Types.ObjectId.isValid(objectId)) {
        updateData.objectId = objectId;
      } else {
        updateData.objectId = null;
      }
    }

    // Upsert
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { $set: updateData },
      { 
        new: true, 
        upsert: true, 
        runValidators: true, 
        setDefaultsOnInsert: true 
      }
    ).populate('employeeId', 'name position');

    console.log('✅ Davomat saqlandi:', record);

    res.json({ success: true, data: record });
  } catch (err) {
    console.error('❌ Upsert xatosi:', err);
    
    // Agar unique index xatosi bo'lsa
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Bu xodim uchun bu sana bo\'yicha yozuv allaqachon mavjud' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server xatosi' 
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const existing = await Attendance.findById(req.params.id).populate('employeeId', 'name position role');
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Yozuv topilmadi',
      });
    }
    const role = existing.employeeId?.role;
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Administrator yozuvi tasdiqlanmaydi — yozuvni o‘chiring',
      });
    }

    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'PRESENT' } },
      { new: true }
    ).populate('employeeId', 'name position');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Yozuv topilmadi',
      });
    }

    res.json({ success: true, data: record });
  } catch (err) {
    console.error('❌ Approve xatosi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Yozuv topilmadi' 
      });
    }
    
    res.json({ success: true, message: "O'chirildi" });
  } catch (err) {
    console.error('❌ Remove xatosi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};