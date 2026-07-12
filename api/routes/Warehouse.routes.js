const express   = require('express');
const mongoose  = require('mongoose');
const router    = express.Router();
const Warehouse = require('../models/Warehouse.js');
const Supplier  = require('../models/Supplier.js');

const parseAmount = (v) => {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || Number.isNaN(n) || n < 0) return null;
  return n;
};

// GET /api/warehouse?objectId=xxx  — obyektga tegishli materiallar
router.get('/', async (req, res) => {
  try {
    const { objectId } = req.query;
    const filter = objectId ? { objectId } : {};
    const items = await Warehouse.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/warehouse  — yangi material
// body: { objectId, supplierId, name, unit, supplied, amount, date, note }
router.post('/', async (req, res) => {
  try {
    const { objectId, supplierId: sidRaw, name, unit, supplied, amount, date, note } = req.body;
    const sum = parseAmount(amount);
    if (!objectId)                    return res.status(400).json({ success: false, message: 'objectId kiritilmadi' });
    if (!sidRaw || !mongoose.Types.ObjectId.isValid(String(sidRaw))) {
      return res.status(400).json({ success: false, message: 'Beruvchi tanlanmadi' });
    }
    const supplierDoc = await Supplier.findById(sidRaw);
    if (!supplierDoc) {
      return res.status(400).json({ success: false, message: 'Beruvchi topilmadi' });
    }
    if (!name || !name.trim())        return res.status(400).json({ success: false, message: 'Nom kiritilmadi' });
    if (!supplied || supplied <= 0)   return res.status(400).json({ success: false, message: "Miqdor noto'g'ri" });
    if (sum === null)                 return res.status(400).json({ success: false, message: "Summa noto'g'ri" });
    if (!date || !date.trim())        return res.status(400).json({ success: false, message: 'Sana kiritilmadi' });

    const item = await Warehouse.create({
      objectId,
      name:      name.trim(),
      supplierId: supplierDoc._id,
      supplierName: supplierDoc.name.trim(),
      supplierPhone: supplierDoc.phone.trim(),
      unit:      unit || 'm',
      supplied:  Number(supplied),
      used:      0,
      remaining: Number(supplied),
      totalAmount: sum,
      usages:    [],
      restocks:  [{
        date: date.trim(),
        quantity: Number(supplied),
        amount: sum,
        note: note ? String(note).trim() : 'Dastlabki kirim'
      }],
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/warehouse/:id/use  — ishlatish
// body: { quantity, note }
router.patch('/:id/use', async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: "Miqdor noto'g'ri" });

    const item = await Warehouse.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Material topilmadi' });

    if (qty > item.remaining) {
      return res.status(400).json({
        success: false,
        message: `Qoldiq yetarli emas. Mavjud: ${item.remaining} ${item.unit}`,
      });
    }

    item.usages.push({
      date:     new Date().toISOString().split('T')[0],
      quantity: qty,
      note:     req.body.note ? String(req.body.note).trim() : '',
    });
    item.used      += qty;
    item.remaining -= qty;
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/warehouse/:id/restock  — tovar qo'shish
// body: { quantity, amount, date, note }
router.patch('/:id/restock', async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    const sum = parseAmount(req.body.amount);
    const { date, note } = req.body;
    
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: "Miqdor noto'g'ri" });
    if (sum === null) return res.status(400).json({ success: false, message: "Summa noto'g'ri" });
    if (!date || !date.trim()) return res.status(400).json({ success: false, message: 'Sana kiritilmadi' });

    const item = await Warehouse.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Material topilmadi' });

    item.restocks.push({
      date: date.trim(),
      quantity: qty,
      amount: sum,
      note: note ? String(note).trim() : ''
    });
    
    item.supplied  += qty;
    item.remaining += qty;
    item.totalAmount = Number(item.totalAmount || 0) + sum;
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/warehouse/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Warehouse.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Material topilmadi' });
    res.json({ success: true, message: "Material o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;