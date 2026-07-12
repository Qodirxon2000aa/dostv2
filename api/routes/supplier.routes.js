const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();
const Supplier = require('../models/Supplier');

const normalizeLinkedObjectIds = (raw) => {
  if (!raw || !Array.isArray(raw)) return [];
  return [...new Set(
    raw
      .map((id) => String(id || '').trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
  )];
};

// Barcha beruvchilar (barcha omborlar uchun umumiy)
router.get('/', async (req, res) => {
  try {
    const items = await Supplier.find({}).sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, linkedObjectIds: linkedRaw } = req.body;
    const nm = name != null ? String(name).trim() : '';
    const ph = phone != null ? String(phone).trim() : '';
    if (!nm) return res.status(400).json({ success: false, message: 'Ism kiritilmadi' });
    if (!ph) return res.status(400).json({ success: false, message: 'Telefon kiritilmadi' });
    const linkedObjectIds = normalizeLinkedObjectIds(linkedRaw);

    const item = await Supplier.create({ name: nm, phone: ph, linkedObjectIds });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID noto'g'ri" });
    }
    const nm = req.body.name != null ? String(req.body.name).trim() : '';
    const ph = req.body.phone != null ? String(req.body.phone).trim() : '';
    if (!nm) return res.status(400).json({ success: false, message: 'Ism kiritilmadi' });
    if (!ph) return res.status(400).json({ success: false, message: 'Telefon kiritilmadi' });

    const update = { name: nm, phone: ph };
    if (req.body.linkedObjectIds !== undefined) {
      update.linkedObjectIds = normalizeLinkedObjectIds(req.body.linkedObjectIds);
    }

    const item = await Supplier.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Beruvchi topilmadi' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Supplier.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Beruvchi topilmadi' });
    res.json({ success: true, message: "Beruvchi o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
