// routes/bonuses.js
const express = require('express');
const router = express.Router();
const Bonus = require('../models/Bonus.js');

// GET /api/bonuses
router.get('/', async (req, res) => {
  try {
    const bonuses = await Bonus.find()
      .populate('employeeId', 'name position')
      .populate('objectId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: bonuses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bonuses
router.post('/', async (req, res) => {
  try {
    const { employeeId, objectId, objectName, amount, reason, date, createdBy } = req.body;

    if (!employeeId) return res.status(400).json({ success: false, message: 'Xodim tanlanmadi' });
    if (!objectId) return res.status(400).json({ success: false, message: 'Obyekt tanlanmadi' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Summa kiritilmadi yoki noto‘g‘ri' });
    if (!reason || !reason.trim()) return res.status(400).json({ success: false, message: 'Sabab kiritilmadi' });
    if (!date) return res.status(400).json({ success: false, message: 'Sana kiritilmadi' });

    const bonus = await Bonus.create({
      employeeId,
      objectId,
      objectName: objectName ? String(objectName).trim() : '',
      amount: Number(amount),
      reason: reason.trim(),
      date: date.trim(),
      createdBy: createdBy || 'Admin',
      status: 'active',
    });

    res.status(201).json({ success: true, data: bonus });
  } catch (err) {
    console.error("Bonus yaratish xatosi:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/bonuses/:id/cancel — aniq yo‘l avval
router.patch('/:id/cancel', async (req, res) => {
  try {
    const bonus = await Bonus.findById(req.params.id);
    if (!bonus) return res.status(404).json({ success: false, message: 'Bonus topilmadi' });

    bonus.status = 'cancelled';
    await bonus.save();

    res.json({ success: true, data: bonus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/bonuses/:id — frontend api.updateBonus
router.put('/:id', async (req, res) => {
  try {
    const { amount, reason, date, status, objectId, objectName } = req.body;
    const bonus = await Bonus.findById(req.params.id);
    if (!bonus) return res.status(404).json({ success: false, message: 'Bonus topilmadi' });

    if (amount != null && !Number.isNaN(Number(amount))) {
      const n = Number(amount);
      if (n <= 0) return res.status(400).json({ success: false, message: "Summa noto'g'ri" });
      bonus.amount = n;
    }
    if (reason != null) bonus.reason = String(reason).trim();
    if (date != null) bonus.date = String(date).trim();
    if (objectId != null) bonus.objectId = objectId;
    if (objectName != null) bonus.objectName = String(objectName).trim();
    if (status != null && ['active', 'cancelled'].includes(String(status).toLowerCase())) {
      bonus.status = String(status).toLowerCase() === 'cancelled' ? 'cancelled' : 'active';
    }

    await bonus.save();
    res.json({ success: true, data: bonus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/bonuses/:id
router.delete('/:id', async (req, res) => {
  try {
    const bonus = await Bonus.findByIdAndDelete(req.params.id);
    if (!bonus) return res.status(404).json({ success: false, message: 'Bonus topilmadi' });
    res.json({ success: true, message: "Bonus o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;