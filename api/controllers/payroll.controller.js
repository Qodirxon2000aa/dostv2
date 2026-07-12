const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Fine = require('../models/Fine');

exports.getAll = async (req, res) => {
  try {
    const { status, month, employeeId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month) filter.month = month;
    if (employeeId) filter.employeeId = employeeId;

    const data = await Payroll.find(filter)
      .populate('employeeId', 'name position')
      .populate('objectId', 'name totalBudget')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body;

    // Oylik berish (obyekt tanlangan) — frontend DAILY_PAY, objectId saqlanadi, byudjet tekshiriladi
    if (body.type === 'DAILY_PAY') {
      if (!body.employeeId) {
        return res.status(400).json({ success: false, message: 'employeeId kerak' });
      }

      const emp = await Employee.findById(body.employeeId);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
      }

      const amount = Number(body.calculatedSalary ?? body.amount);
      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        return res.status(400).json({ success: false, message: "Summa noto'g'ri" });
      }

      const record = await Payroll.create({
        employeeId: body.employeeId,
        employeeName: body.employeeName || emp.name,
        calculatedSalary: amount,
        amount,
        month: body.month || new Date().toISOString().slice(0, 7),
        date: body.date,
        type: 'DAILY_PAY',
        status: body.status || 'APPROVED',
        paymentStatus: body.paymentStatus || 'paid',
        paidAt: new Date(),
        objectId: null,
        objectName: String(body.objectName || 'UMUMIY QOZON'),
      });

      return res.status(201).json({
        success: true,
        data: {
          record,
          daysWorked: null,
          salary: amount,
          totalFines: 0,
          finalAmount: amount,
        },
      });
    }

    // Tezkor to‘lov (obyektsiz)
    if (body.type === 'QUICK_ADD') {
      if (!body.employeeId) {
        return res.status(400).json({ success: false, message: 'employeeId kerak' });
      }
      const emp = await Employee.findById(body.employeeId);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
      }
      const amount = Number(body.calculatedSalary ?? body.amount);
      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        return res.status(400).json({ success: false, message: "Summa noto'g'ri" });
      }
      const record = await Payroll.create({
        employeeId: body.employeeId,
        employeeName: body.employeeName || emp.name,
        calculatedSalary: amount,
        amount,
        month: body.month || new Date().toISOString().slice(0, 7),
        date: body.date,
        type: 'QUICK_ADD',
        status: body.status || 'APPROVED',
        paymentStatus: body.paymentStatus || 'paid',
        paidAt: new Date(),
      });
      return res.status(201).json({
        success: true,
        data: {
          record,
          daysWorked: null,
          salary: amount,
          totalFines: 0,
          finalAmount: amount,
        },
      });
    }

    // Oylik hisoblash (davomat + jarima) — MONTHLY
    const { employeeId, month } = body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId kerak' });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }

    const daysWorked = await Attendance.countDocuments({
      employeeId,
      status: 'PRESENT',
    });

    const salary = daysWorked * emp.salaryRate;

    const fines = await Fine.find({
      employeeId,
      status: 'ACTIVE',
    });

    const totalFines = fines.reduce((sum, f) => sum + f.amount, 0);

    const finalAmount = salary - totalFines;

    if (finalAmount < 0) {
      return res.status(400).json({
        success: false,
        message:
          'Jarimalar ish haqidan oshib ketdi — jarimalarni yoki davomatni tekshiring',
      });
    }

    const record = await Payroll.create({
      employeeId,
      employeeName: emp.name,
      calculatedSalary: salary,
      amount: finalAmount,
      month: month || new Date().toISOString().slice(0, 7),
      type: 'MONTHLY',
      status: 'PENDING',
      paymentStatus: 'unpaid',
    });

    res.status(201).json({
      success: true,
      data: {
        record,
        daysWorked,
        salary,
        totalFines,
        finalAmount,
      },
    });
  } catch (err) {
    console.error('Payroll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const record = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', paymentStatus: 'paid', paidAt: new Date() },
      { new: true }
    );
    if (!record) {
      return res.status(404).json({ success: false, message: 'Yozuv topilmadi' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** To'lovni bekor qilish — yozuv saqlanadi, hisoblarda ishtirok etmaydi (faqat APPROVED/PENDING) */
exports.cancelPayment = async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Yozuv topilmadi' });
    }
    if (record.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Allaqachon bekor qilingan' });
    }
    if (record.status !== 'APPROVED' && record.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: "Bu holatdagi to'lovni bekor qilib bo'lmaydi" });
    }

    record.status = 'CANCELLED';
    record.paymentStatus = 'unpaid';
    record.paidAt = null;
    await record.save();

    const data = await Payroll.findById(record._id)
      .populate('employeeId', 'name position')
      .populate('objectId', 'name totalBudget');

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Xatolik yoki tuzatish — summani yangilash (calculatedSalary va amount bir xil saqlanadi) */
exports.update = async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Yozuv topilmadi' });
    }

    if (record.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: "Faqat tasdiqlangan (APPROVED) to'lovni tahrirlash mumkin",
      });
    }

    const body = req.body;
    const raw =
      body.calculatedSalary != null
        ? Number(body.calculatedSalary)
        : body.amount != null
          ? Number(body.amount)
          : NaN;
    if (Number.isNaN(raw) || raw < 0) {
      return res.status(400).json({ success: false, message: "Summa noto'g'ri (0 yoki undan katta bo'lishi kerak)" });
    }

    record.calculatedSalary = raw;
    record.amount = raw;
    if (body.date != null && String(body.date).trim()) {
      record.date = String(body.date).trim();
    }
    if (body.month != null && String(body.month).trim()) {
      record.month = String(body.month).trim();
    }

    await record.save();

    const data = await Payroll.findById(record._id)
      .populate('employeeId', 'name position')
      .populate('objectId', 'name totalBudget');

    res.json({ success: true, data });
  } catch (err) {
    console.error('Payroll update:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const deleted = await Payroll.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Yozuv topilmadi' });
    }
    res.json({ success: true, message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
