const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token topilmadi' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      uid: String(payload.uid || ''),
      role: String(payload.role || 'EMPLOYEE'),
      name: String(payload.name || ''),
      email: String(payload.email || ''),
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token yaroqsiz yoki eskirgan' });
  }
}

module.exports = { requireAuth, getBearerToken };
