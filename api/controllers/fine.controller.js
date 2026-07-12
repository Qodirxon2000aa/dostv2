const Fine = require('../models/Fine');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

/* GET /api/fines */
exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;

    const fines = await Fine.find(filter)
      .sort({ createdAt: -1 })
      .populate('employeeId', 'name position salaryRate');

    res.json({ success: true, data: fines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { employeeId, amount, comment } = req.body;

    if (!employeeId)
      return res.status(400).json({ success: false, message: 'Xodim tanlanmagan' });

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Summa 0 dan katta bo\'lishi kerak' });

    const emp = await Employee.findById(employeeId);
    if (!emp)
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });

    const fineAmount = Number(amount);

    // Hisoblash (eski logika)
    const daysWorked = await Attendance.countDocuments({ employeeId, status: 'PRESENT' });
    const salary = daysWorked * emp.salaryRate;
    const fines = await Fine.find({ employeeId, status: 'ACTIVE' });
    const totalFines = fines.reduce((sum, f) => sum + f.amount, 0);
    const balance = salary - totalFines;

    if (balance < fineAmount) {
      return res.status(400).json({
        success: false,
        message: `Balans yetarli emas. Hozirgi balans: ${balance}`
      });
    }

    // ✅ Jarimani saqlash
    const fine = await Fine.create({
      employeeId,
      employeeName: emp.name,
      amount: fineAmount,
      comment: comment?.trim() || '',
      appliedBy: 'admin',
      status: 'ACTIVE'
    });

    // ✅ Employee balansidan ayirish
    await Employee.findByIdAndUpdate(employeeId, {
      $inc: { balance: -fineAmount }
    });

    res.status(201).json({
      success: true,
      message: 'Jarima qo\'yildi',
      data: {
        fine,
        salary,
        totalFines,
        balanceBefore: balance,
        balanceAfter: balance - fineAmount
      }
    });

  } catch (err) {
    console.error('Jarima xatosi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PATCH /api/fines/:id/cancel */
exports.cancel = async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);

    if (!fine)
      return res.status(404).json({ success: false, message: 'Jarima topilmadi' });

    if (fine.status === 'CANCELLED')
      return res.status(400).json({ success: false, message: 'Allaqachon bekor qilingan' });

    fine.status = 'CANCELLED';
    await fine.save();

    await Employee.findByIdAndUpdate(fine.employeeId, {
      $inc: { balance: fine.amount },
    });

    res.json({ success: true, message: 'Jarima bekor qilindi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE /api/fines/:id */
exports.remove = async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine)
      return res.status(404).json({ success: false, message: 'Jarima topilmadi' });

    if (fine.status === 'ACTIVE') {
      await Employee.findByIdAndUpdate(fine.employeeId, {
        $inc: { balance: fine.amount },
      });
    }

    await Fine.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Jarima butunlay o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};