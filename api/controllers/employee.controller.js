const Employee = require('../models/Employee');
const { getIO } = require('../socketHub');
const HASH_PREFIXES = ['$2a$', '$2b$', '$2y$'];
const FALLBACK_PASSWORD = '1234';

function toPlainObject(emp) {
  if (!emp) return {};
  return typeof emp.toObject === 'function' ? emp.toObject() : { ...emp };
}

/** GET javobida ko‘rinadigan parol — DB ga yozmaymiz (N+1 update sekinlik / timeout sabab bo‘lmasin). */
function sanitizeEmployee(emp) {
  const item = toPlainObject(emp);
  const raw = typeof item.password === 'string' ? item.password.trim() : '';
  const plain = typeof item.plainPassword === 'string' ? item.plainPassword.trim() : '';
  const isHash = HASH_PREFIXES.some((p) => raw.startsWith(p));

  let visible = plain;
  if (!visible && raw && !isHash) visible = raw;
  if (!visible) visible = FALLBACK_PASSWORD;

  item.password = visible;
  item.plainPassword = visible;
  return item;
}

exports.getAll = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: employees.map(sanitizeEmployee) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id).lean();
    if (!emp) return res.status(404).json({ success: false, message: 'Topilmadi' });
    res.json({ success: true, data: sanitizeEmployee(emp) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = { ...req.body };
    const plain = typeof payload.password === 'string' ? payload.password.trim() : '';
    payload.password = plain || FALLBACK_PASSWORD;
    payload.plainPassword = payload.password;
    const emp = await Employee.create(payload);
    res.status(201).json({ success: true, data: sanitizeEmployee(emp) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (typeof payload.password === 'string') {
      const trimmed = payload.password.trim();
      if (trimmed) {
        payload.password = trimmed;
        payload.plainPassword = trimmed;
      } else {
        delete payload.password;
      }
    }
    const emp = await Employee.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();
    if (!emp) return res.status(404).json({ success: false, message: 'Topilmadi' });
    res.json({ success: true, data: sanitizeEmployee(emp) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Topilmadi' });
    res.json({ success: true, message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
  
exports.updateMyLocation = async (req, res) => {
  try {
    const uid = String(req.user?.uid || '').trim();
    if (req.user?.role !== 'EMPLOYEE') {
      return res.status(403).json({ success: false, message: 'Faqat xodim yubora oladi' });
    }
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi aniqlanmadi' });
    }

    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const accuracy = req.body?.accuracy == null ? null : Number(req.body.accuracy);
    const speed = req.body?.speed == null ? null : Number(req.body.speed);
    const heading = req.body?.heading == null ? null : Number(req.body.heading);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Latitude/longitude noto‘g‘ri' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Lokatsiya diapazoni noto‘g‘ri' });
    }

    const updated = await Employee.findByIdAndUpdate(
      uid,
      {
        $set: {
          currentLocation: {
            lat,
            lng,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
            speed: Number.isFinite(speed) ? speed : null,
            heading: Number.isFinite(heading) ? heading : null,
            updatedAt: new Date(),
          },
        },
      },
      { new: true, select: 'name currentLocation' }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    const io = getIO();
    if (io) {
      io.to('admins').emit('employee:location', {
        employeeId: uid,
        name: updated.name,
        currentLocation: updated.currentLocation,
      });
    }
    return res.json({ success: true, data: updated.currentLocation });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLocations = async (_req, res) => {
  try {
    if (_req.user?.role !== 'SUPER_ADMIN' && _req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo‘q' });
    }
    const rows = await Employee.find(
      { 'currentLocation.updatedAt': { $ne: null } },
      'name position status currentLocation'
    ).sort({ 'currentLocation.updatedAt': -1 }).lean();

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};