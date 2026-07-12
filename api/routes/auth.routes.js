const router = require('express').Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/** Masofadan qayta kirmaslik uchun uzoq muddat (masalan: 365d, 90d). Env: JWT_EXPIRES_IN */
const JWT_EXPIRES_IN = String(process.env.JWT_EXPIRES_IN || '365d').trim() || '365d';

router.post('/login', async (req, res) => {
  const password = req.body.password != null ? String(req.body.password) : '';
  const login = String(req.body.login ?? req.body.email ?? '').trim();
  try {
    if (!login) {
      return res.status(400).json({ success: false, message: 'Login kiriting' });
    }
    const user = await Employee.findOne({ email: login });
    if (!user)
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });

    const storedPassword = user.password != null ? String(user.password) : '';
    let isPasswordValid = false;

    // Backward compatibility: old plain-text passwords are upgraded on successful login.
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else if (storedPassword) {
      isPasswordValid = storedPassword === password;
      if (isPasswordValid) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid)
      return res.status(401).json({ success: false, message: "Parol noto'g'ri" });

    const token = jwt.sign(
      {
        uid: user._id.toString(),
        role: user.role || 'EMPLOYEE',
        name: user.name || '',
        email: user.email || '',
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        _id:      user._id.toString(),
        uid:      user._id.toString(),
        email:    user.email,
        name:     user.name,
        role:     user.role || 'EMPLOYEE',
        position: user.position,
        salaryRate: user.salaryRate,
        salaryType: user.salaryType,
        currency:   user.currency,
        token,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;