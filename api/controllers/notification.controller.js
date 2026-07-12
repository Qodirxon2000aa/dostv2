const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const { getIO } = require('../socketHub');

exports.create = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    if (!(role === 'SUPER_ADMIN' || role === 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Faqat adminlar xabar yubora oladi' });
    }
    const { employeeId, message, createdBy } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Xodim tanlanmagan' });
    }
    const text = message != null ? String(message).trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, message: 'Xabar matni bo‘sh' });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }

    const doc = await Notification.create({
      employeeId,
      employeeName: emp.name || '',
      message: text,
      createdBy: createdBy ? String(createdBy).trim() : 'Admin',
      read: false,
    });

    const io = getIO();
    if (io) {
      const plain = doc.toObject ? doc.toObject() : doc;
      io.to(`employee:${String(employeeId)}`).emit('notification:new', plain);
      io.to('admins').emit('notification:sent', {
        _id: plain._id,
        employeeId: String(employeeId),
        employeeName: plain.employeeName || emp.name || '',
        message: plain.message,
        createdBy: plain.createdBy,
        createdAt: plain.createdAt,
      });
    }

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Bir xil matnni barcha faol ishchi xodimlarga (admin rollarsiz) yuborish */
exports.createBroadcast = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    if (!(role === 'SUPER_ADMIN' || role === 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Faqat adminlar xabar yubora oladi' });
    }
    const { message, createdBy } = req.body;
    const text = message != null ? String(message).trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, message: 'Xabar matni bo‘sh' });
    }

    const emps = await Employee.find({
      status: 'ACTIVE',
      role: { $nin: ['SUPER_ADMIN', 'ADMIN'] },
    })
      .select('_id name')
      .lean();

    if (!emps.length) {
      return res.status(400).json({ success: false, message: 'Yuborish uchun faol xodim yo‘q' });
    }

    const by = createdBy ? String(createdBy).trim() : 'Admin';
    const rows = emps.map((e) => ({
      employeeId: e._id,
      employeeName: e.name || '',
      message: text,
      createdBy: by,
      read: false,
    }));

    const docs = await Notification.insertMany(rows);
    const io = getIO();
    if (io) {
      for (const doc of docs) {
        const plain = doc.toObject ? doc.toObject() : doc;
        io.to(`employee:${String(plain.employeeId)}`).emit('notification:new', plain);
        io.to('admins').emit('notification:sent', {
          _id: plain._id,
          employeeId: String(plain.employeeId),
          employeeName: plain.employeeName || '',
          message: plain.message,
          createdBy: plain.createdBy,
          createdAt: plain.createdAt,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: { count: docs.length, message: text, createdBy: by },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByEmployee = async (req, res) => {
  try {
    const all = req.query.all === '1' || req.query.all === 'true';
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    if (all) {
      if (!(role === 'SUPER_ADMIN' || role === 'ADMIN')) {
        return res.status(403).json({ success: false, message: 'Faqat adminlar barcha xabarni ko‘ra oladi' });
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
      const data = await Notification.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return res.json({ success: true, data });
    }

    const queryEmployeeId = String(req.query.employeeId || '').trim();
    const employeeId = role === 'SUPER_ADMIN' || role === 'ADMIN' ? queryEmployeeId : requesterId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId kerak' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const data = await Notification.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    const existing = await Notification.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Topilmadi' });
    }
    const ownerId = String(existing.employeeId || '');
    if (!(role === 'SUPER_ADMIN' || role === 'ADMIN') && ownerId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Faqat o‘z xabaringizni o‘qilgan qila olasiz' });
    }
    const doc = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
