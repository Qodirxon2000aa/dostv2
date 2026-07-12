const Log = require('../models/Log');

exports.getAll = async (req, res) => {
  try {
    const raw = req.query.limit;
    const limit = Math.min(Math.max(parseInt(raw, 10) || 2000, 1), 5000);
    const data = await Log.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const log = await Log.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};