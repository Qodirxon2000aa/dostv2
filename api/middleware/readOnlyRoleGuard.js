/**
 * Auth middleware req.user.role beradi.
 * ADMIN uchun faqat GET (ko'rish) — POST/PUT/PATCH/DELETE taqiq.
 */
module.exports = function readOnlyRoleGuard(req, res, next) {
  if (req.method === 'OPTIONS' || req.method === 'HEAD') return next();
  if (req.method === 'GET') return next();

  const role = String(req.user?.role || '').trim();
  if (role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: "Faqat ko'rish rejimi: o'zgartirish taqiqlangan",
    });
  }
  next();
};
