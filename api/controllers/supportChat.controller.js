const SupportChatMessage = require('../models/SupportChatMessage');
const Employee = require('../models/Employee');
const { getIO } = require('../socketHub');

function emitNewMessage(doc) {
  const io = getIO();
  if (!io) return;
  const plain = doc.toObject ? doc.toObject() : doc;
  const eid = String(plain.employeeId);
  io.to(`employee:${eid}`).emit('support-chat:new', plain);
  io.to('admins').emit('support-chat:new', plain);
}

function emitSupportChatUpdated(doc) {
  const io = getIO();
  if (!io) return;
  const plain = doc.toObject ? doc.toObject() : doc;
  const eid = String(plain.employeeId);
  io.to(`employee:${eid}`).emit('support-chat:update', plain);
  io.to('admins').emit('support-chat:update', plain);
}

function emitSupportChatDeleted(payload) {
  const io = getIO();
  if (!io) return;
  const eid = String(payload.employeeId);
  io.to(`employee:${eid}`).emit('support-chat:delete', payload);
  io.to('admins').emit('support-chat:delete', payload);
}

function assertCanMutateSupportMessage(req, msg) {
  const role = String(req.user?.role || '').trim();
  const userId = String(req.user?.uid || '').trim();
  const bodyEid = String(req.body.employeeId || '').trim();
  const msgEid = String(msg.employeeId);
  if (bodyEid && bodyEid !== msgEid) {
    const err = new Error('Suhbat (xodim) mos kelmaydi');
    err.status = 403;
    throw err;
  }
  if (role === 'SUPER_ADMIN') return;
  if (role === 'ADMIN') {
    const err = new Error("Faqat ko'rish rejimida tahrir taqiqlangan");
    err.status = 403;
    throw err;
  }
  if (msg.sender === 'ADMIN') {
    const err = new Error('Admin xabarini faqat super admin tahrir yoki o‘chira oladi');
    err.status = 403;
    throw err;
  }
  if (!userId || userId !== msgEid) {
    const err = new Error('Faqat o‘z xabaringizni tahrir yoki o‘chira olasiz');
    err.status = 403;
    throw err;
  }
}

exports.listMessages = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    const queryEmployeeId = String(req.query.employeeId || '').trim();
    const employeeId = role === 'SUPER_ADMIN' || role === 'ADMIN' ? queryEmployeeId : requesterId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId kerak' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const data = await SupportChatMessage.find({ employeeId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    const requestedEmployeeId = String(req.body.employeeId || '').trim();
    const employeeId = role === 'SUPER_ADMIN' || role === 'ADMIN' ? requestedEmployeeId : requesterId;
    const { body, sender, senderName, mediaType, mediaUrl } = req.body;
    const text = body != null ? String(body).trim() : '';
    const mType = mediaType === 'image' ? 'image' : '';
    const mUrl = mediaUrl != null ? String(mediaUrl).trim() : '';
    const hasImage = mType === 'image' && mUrl.startsWith('data:image/');
    if (!text && !hasImage) {
      return res.status(400).json({ success: false, message: 'Matn yoki rasm kerak' });
    }
    if (hasImage && mUrl.length > 450000) {
      return res.status(400).json({ success: false, message: 'Rasm juda katta' });
    }
    if (!employeeId || !/^[a-f\d]{24}$/i.test(employeeId)) {
      return res.status(400).json({ success: false, message: 'Xodim tanlanmagan' });
    }
    const senderRole = sender === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    if (senderRole === 'ADMIN' && !(role === 'SUPER_ADMIN' || role === 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Admin sifatida yuborish taqiqlangan' });
    }
    if (senderRole === 'EMPLOYEE' && role !== 'EMPLOYEE' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo‘q' });
    }
    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }

    const name =
      senderRole === 'ADMIN'
        ? (senderName != null ? String(senderName).trim() : '') || 'Admin'
        : (senderName != null ? String(senderName).trim() : '') || emp.name || 'Xodim';

    const doc = await SupportChatMessage.create({
      employeeId,
      body: text,
      mediaType: hasImage ? 'image' : '',
      mediaUrl: hasImage ? mUrl : '',
      sender: senderRole,
      senderName: name,
      readByRecipient: false,
    });

    emitNewMessage(doc);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const msg = await SupportChatMessage.findById(id);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Xabar topilmadi' });
    }
    assertCanMutateSupportMessage(req, msg);

    const { body, mediaType, mediaUrl, clearMedia } = req.body;
    let text = msg.body;
    if (body !== undefined) {
      text = body != null ? String(body).trim() : '';
    }
    let mType = msg.mediaType || '';
    let mUrl = msg.mediaUrl || '';
    if (clearMedia === true) {
      mType = '';
      mUrl = '';
    } else if (mediaType === 'image' && mediaUrl != null) {
      const u = String(mediaUrl).trim();
      if (u.startsWith('data:image/')) {
        if (u.length > 450000) {
          return res.status(400).json({ success: false, message: 'Rasm juda katta' });
        }
        mType = 'image';
        mUrl = u;
      }
    }

    const hasImage = mType === 'image' && mUrl.startsWith('data:image/');
    if (!text && !hasImage) {
      return res.status(400).json({ success: false, message: 'Matn yoki rasm kerak' });
    }

    msg.body = text;
    msg.mediaType = hasImage ? 'image' : '';
    msg.mediaUrl = hasImage ? mUrl : '';
    msg.editedAt = new Date();
    await msg.save();

    emitSupportChatUpdated(msg);
    res.json({ success: true, data: msg.toObject() });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const msg = await SupportChatMessage.findById(id);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Xabar topilmadi' });
    }
    assertCanMutateSupportMessage(req, msg);
    const employeeId = String(msg.employeeId);
    await SupportChatMessage.deleteOne({ _id: id });
    emitSupportChatDeleted({ _id: id, employeeId });
    res.json({ success: true });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    const requestedEmployeeId = String(req.body.employeeId || '').trim();
    const employeeId = role === 'SUPER_ADMIN' || role === 'ADMIN' ? requestedEmployeeId : requesterId;
    const { as } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId kerak' });
    }
    const reader = as === 'admin' ? 'admin' : 'employee';
    const filter =
      reader === 'admin'
        ? { employeeId, sender: 'EMPLOYEE', readByRecipient: false }
        : { employeeId, sender: 'ADMIN', readByRecipient: false };

    await SupportChatMessage.updateMany(filter, { $set: { readByRecipient: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    if (!(role === 'SUPER_ADMIN' || role === 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Faqat adminlar uchun' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const pipeline = [
      { $sort: { employeeId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$employeeId',
          lastMessage: { $first: '$$ROOT' },
          unreadForAdmin: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$sender', 'EMPLOYEE'] }, { $eq: ['$readByRecipient', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: limit },
    ];
    const grouped = await SupportChatMessage.aggregate(pipeline);

    const ids = grouped.map((g) => g._id).filter(Boolean);
    const employees = await Employee.find({ _id: { $in: ids } })
      .select('name email position')
      .lean();
    const byId = Object.fromEntries(employees.map((e) => [String(e._id), e]));

    const data = grouped.map((g) => {
      const id = String(g._id);
      const emp = byId[id] || {};
      const lm = g.lastMessage || {};
      return {
        employeeId: id,
        employeeName: emp.name || lm.senderName || 'Xodim',
        email: emp.email || '',
        position: emp.position || '',
        lastMessage: lm.mediaType === 'image' ? '📷 Rasm' : lm.body || '',
        lastAt: lm.createdAt || null,
        lastSender: lm.sender || null,
        unreadForAdmin: g.unreadForAdmin || 0,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.unreadCountForEmployee = async (req, res) => {
  try {
    const role = String(req.user?.role || '');
    const requesterId = String(req.user?.uid || '');
    const queryEmployeeId = String(req.query.employeeId || '').trim();
    const employeeId = role === 'SUPER_ADMIN' || role === 'ADMIN' ? queryEmployeeId : requesterId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId kerak' });
    }
    const n = await SupportChatMessage.countDocuments({
      employeeId,
      sender: 'ADMIN',
      readByRecipient: false,
    });
    res.json({ success: true, data: { count: n } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
