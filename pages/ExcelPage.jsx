import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet, Download, Users, CreditCard, Building2,
  CalendarCheck, TrendingUp, Filter, CheckCircle, Zap,
  BarChart3, FileText, Clock, Star, Package, Sparkles, History,
} from 'lucide-react';
import { api } from '../utils/api';
import {
  createWorkbook,
  appendSheetStyled,
  writeWorkbook,
  downloadStyledTable,
} from '../utils/excelExportStyled';
import { filterWorkforceEmployees } from '../utils/employeeRoles';

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const now = () => new Date().toLocaleDateString('uz-UZ');

const materialTotalAmount = (mat) => {
  const t = mat?.totalAmount;
  if (t != null && !Number.isNaN(Number(t))) return Number(t);
  return (mat?.restocks ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
};

const STORAGE_HISTORY = 'excel_export_history';

const readExportHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
const Excel = ({ employees = [], attendance = [], payroll = [], objects = [] }) => {
  const workforce = useMemo(() => filterWorkforceEmployees(employees), [employees]);
  const workforceIds = useMemo(
    () => new Set(workforce.map((e) => String(e._id || e.id))),
    [workforce]
  );
  const [activeCategory, setActiveCategory] = useState('all');
  const [downloading, setDownloading]       = useState(null);
  const [filterMonth, setFilterMonth]       = useState(new Date().toISOString().slice(0, 7));
  const [filterObj, setFilterObj]           = useState('');
  const [warehouseBundles, setWarehouseBundles] = useState([]);
  const [whLoading, setWhLoading]           = useState(false);
  const [exportHistory, setExportHistory]   = useState(readExportHistory);

  const approvedPayroll = useMemo(() => payroll.filter(p => p.status === 'APPROVED'), [payroll]);

  const loadWarehouses = useCallback(async () => {
    if (!objects?.length) {
      setWarehouseBundles([]);
      return;
    }
    setWhLoading(true);
    try {
      const results = await Promise.all(
        objects.map(async (o) => {
          const id = o._id || o.id;
          try {
            const res = await api.getWarehouse(id);
            const raw = res.data ?? res;
            const materials = Array.isArray(raw) ? raw : [];
            return { objectId: id, objectName: o.name, materials };
          } catch {
            return { objectId: id, objectName: o.name, materials: [] };
          }
        })
      );
      setWarehouseBundles(results);
    } finally {
      setWhLoading(false);
    }
  }, [objects]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const warehouseStats = useMemo(() => {
    let materialRows = 0;
    let totalValue = 0;
    let objectsWithStock = 0;
    warehouseBundles.forEach((b) => {
      const mats = b.materials || [];
      if (mats.length) objectsWithStock += 1;
      mats.forEach((m) => {
        materialRows += 1;
        totalValue += materialTotalAmount(m);
      });
    });
    return { materialRows, totalValue, objectsWithStock };
  }, [warehouseBundles]);

  // ── HISOBOT GENERATORLARI ──────────────────────────

  const reports = useMemo(() => [

    // ══ XODIMLAR ══
    {
      id: 'employees_full', category: 'employees',
      title: "Xodimlar to'liq ma'lumoti",
      desc:  'Barcha xodimlar: ism, lavozim, stavka, holat',
      icon:  <Users size={18}/>, color: 'blue', format: 'XLSX',
      count: workforce.length,
      rows: () => {
        const headers = ['#', 'Ism', 'Lavozim', 'Login', 'Kunlik stavka (UZS)', 'Tur', 'Holat', "Qo'shilgan sana"];
        const rows    = workforce.map((e, i) => [
          i + 1, e.name, e.position || '—', e.email || '—',
          e.salaryRate || 0,
          e.salaryType === 'DAILY' ? 'Kunlik' : 'Oylik',
          e.status === 'ACTIVE' ? 'Faol' : 'Nofaol',
          e.createdAt ? new Date(e.createdAt).toLocaleDateString('uz-UZ') : '—',
        ]);
        return [headers, ...rows];
      },
      generate() {
        downloadStyledTable(this.rows(), `xodimlar_${now()}.xlsx`, 'Xodimlar', { headerRowIndex: 0 });
      },
    },

    {
      id: 'employees_salary_summary', category: 'employees',
      title: 'Xodimlar ish haqi xulosasi',
      desc:  'Kim qancha ishladi, qancha oldi, qancha qoldi',
      icon:  <TrendingUp size={18}/>, color: 'emerald', format: 'XLSX',
      count: workforce.filter(e => e.status === 'ACTIVE').length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Lavozim', 'Ish kunlari', 'Kunlik stavka', 'Hisoblangan (UZS)', 'Olingan (UZS)', 'Qoldiq (UZS)', 'Obyektlar'];
        const rows = workforce.filter(e => e.status === 'ACTIVE').map((emp, i) => {
          const empId    = emp._id || emp.id;
          const worked   = attendance.filter(
            (a) => String(a.employeeId?._id || a.employeeId) === String(empId) && a.status === 'PRESENT'
          ).length;
          const earned   = worked * (Number(emp.salaryRate) || 0);
          const taken    = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(empId)).reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
          const objNames = [...new Set(approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(empId)).map(p => p.objectName).filter(Boolean))].join(', ');
          return [i+1, emp.name, emp.position || '—', worked, emp.salaryRate || 0, earned, taken, earned - taken, objNames || '—'];
        });
        return [headers, ...rows];
      },
      generate() {
        downloadStyledTable(this.rows(), `xodimlar_xulosa_${now()}.xlsx`, 'Xulosa', { headerRowIndex: 0 });
      },
    },

    // ══ TO'LOVLAR ══
    {
      id: 'payroll_all', category: 'payroll',
      title: "Barcha to'lovlar tarixi",
      desc:  "Barcha vaqt davomida amalga oshirilgan to'lovlar",
      icon:  <CreditCard size={18}/>, color: 'yellow', format: 'XLSX',
      count: approvedPayroll.length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Oy', 'Tur'];
        const rows    = approvedPayroll.map((p, i) => [
          i+1, p.employeeName || '—', Number(p.calculatedSalary) || 0,
          p.objectName || '—', p.date || '—', p.month || '—',
          p.type === 'DAILY_PAY' ? 'Oylik' : p.type === 'QUICK_ADD' ? 'Avans' : p.type || '—',
        ]);
        const total = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
        return [headers, ...rows, [], ['', 'JAMI SUMMA', total]];
      },
      generate() {
        downloadStyledTable(this.rows(), `tolovlar_tarix_${now()}.xlsx`, 'Tolovlar', { headerRowIndex: 0 });
      },
    },

    {
      id: 'payroll_monthly', category: 'payroll',
      title: `${filterMonth} oyi to'lovlari`,
      desc:  "Tanlangan oy uchun to'lovlar ro'yxati",
      icon:  <CalendarCheck size={18}/>, color: 'orange', format: 'XLSX',
      count: approvedPayroll.filter(p => p.month === filterMonth).length,
      rows: () => {
        const monthly = approvedPayroll.filter(p => p.month === filterMonth);
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Tur'];
        const rows    = monthly.map((p, i) => [i+1, p.employeeName, Number(p.calculatedSalary)||0, p.objectName||'—', p.date||'—', p.type === 'DAILY_PAY' ? 'Oylik' : 'Avans']);
        const total   = monthly.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'OY JAMI', total]];
      },
      generate() {
        downloadStyledTable(this.rows(), `tolovlar_${filterMonth}_${now()}.xlsx`, 'Oy', { headerRowIndex: 0 });
      },
    },

    {
      id: 'payroll_by_object', category: 'payroll',
      title: "Obyektlar bo'yicha to'lovlar",
      desc:  "Har bir obyekt uchun xarajatlar xulosasi",
      icon:  <Building2 size={18}/>, color: 'purple', format: 'XLSX',
      count: objects.length,
      rows: () => {
        const headers    = ['#', 'Obyekt', "Jami to'lovlar", 'Xarajat (UZS)', 'Byudjet (UZS)', 'Qoldiq (UZS)', 'Xodimlar soni'];
        const rows       = objects.map((obj, i) => {
          const objId  = obj._id || obj.id;
          const objPay = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId));
          const total  = objPay.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
          const empCnt = new Set(objPay.map(p => String(p.employeeId?._id || p.employeeId))).size;
          const budget = Number(obj.totalBudget) || 0;
          return [i+1, obj.name, objPay.length, total, budget, budget - total, empCnt];
        });
        const grandTotal = objects.reduce((s, obj) => {
          const objId = obj._id || obj.id;
          return s + approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).reduce((ss, p) => ss + (Number(p.calculatedSalary)||0), 0);
        }, 0);
        return [headers, ...rows, [], ['', 'JAMI', '', grandTotal]];
      },
      generate() {
        downloadStyledTable(this.rows(), `obyektlar_xarajat_${now()}.xlsx`, 'Obyektlar', { headerRowIndex: 0 });
      },
    },

    // ══ DAVOMAT ══
    {
      id: 'attendance_full', category: 'attendance',
      title: "Davomat to'liq ro'yxat",
      desc:  'Barcha tasdiqlangan davomat yozuvlari',
      icon:  <CheckCircle size={18}/>, color: 'teal', format: 'XLSX',
      count: attendance.filter(
        (a) => a.status === 'PRESENT' && workforceIds.has(String(a.employeeId?._id || a.employeeId))
      ).length,
      rows: () => {
        const present = attendance.filter(
          (a) => a.status === 'PRESENT' && workforceIds.has(String(a.employeeId?._id || a.employeeId))
        );
        const headers = ['#', 'Xodim', 'Sana', 'Obyekt', 'Holat'];
        const rows    = present.map((a, i) => {
          const emp = employees.find(e => String(e._id || e.id) === String(a.employeeId?._id || a.employeeId));
          return [i+1, emp?.name || a.employeeName || '—', a.date || '—', a.objectName || '—', 'KELDI'];
        });
        return [headers, ...rows];
      },
      generate() {
        downloadStyledTable(this.rows(), `davomat_${now()}.xlsx`, 'Davomat', { headerRowIndex: 0 });
      },
    },

    {
      id: 'attendance_by_employee', category: 'attendance',
      title: "Xodimlar davomat xulosasi",
      desc:  "Har bir xodim uchun ish kunlari statistikasi",
      icon:  <BarChart3 size={18}/>, color: 'cyan', format: 'XLSX',
      count: workforce.filter((e) => e.status === 'ACTIVE').length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Lavozim', 'Ish kunlari', 'Keldi', 'Kelmadi', 'Davomat %'];
        const rows    = workforce.filter((e) => e.status === 'ACTIVE').map((emp, i) => {
          const empId  = emp._id || emp.id;
          const empAtt = attendance.filter(a => String(a.employeeId?._id || a.employeeId) === String(empId));
          const came   = empAtt.filter(a => a.status === 'PRESENT').length;
          const total  = empAtt.length;
          return [i+1, emp.name, emp.position || '—', total, came, total - came, total > 0 ? Math.round((came / total) * 100) + '%' : '0%'];
        });
        return [headers, ...rows];
      },
      generate() {
        downloadStyledTable(this.rows(), `davomat_xulosa_${now()}.xlsx`, 'Xulosa', { headerRowIndex: 0 });
      },
    },

    // ══ OBYEKTLAR ══
    {
      id: 'objects_budget', category: 'objects',
      title: "Obyektlar byudjet hisoboti",
      desc:  'Barcha obyektlar byudjet va xarajatlar holati',
      icon:  <Building2 size={18}/>, color: 'rose', format: 'XLSX',
      count: objects.length,
      rows: () => {
        const headers = ['#', 'Obyekt', 'Holat', 'Byudjet (UZS)', 'Xarajat (UZS)', 'Qoldiq (UZS)', "Foydalanish %", "To'lovlar soni"];
        const rows    = objects.map((obj, i) => {
          const objId = obj._id || obj.id;
          const spent = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
          const budget= Number(obj.totalBudget) || 0;
          const pct   = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          const cnt   = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).length;
          return [i+1, obj.name, obj.status === 'active' ? 'Faol' : 'Nofaol', budget, spent, budget - spent, `${pct}%`, cnt];
        });
        return [headers, ...rows];
      },
      generate() {
        downloadStyledTable(this.rows(), `obyektlar_byudjet_${now()}.xlsx`, 'Byudjet', { headerRowIndex: 0 });
      },
    },

    // ══ YIG'MA ══
    {
      id: 'full_summary', category: 'summary',
      title: "Umumiy moliya xulosasi",
      desc:  "Kompaniya bo'yicha to'liq moliyaviy hisobot",
      icon:  <Star size={18}/>, color: 'amber', format: 'XLSX', badge: 'PRO',
      count: null,
      rows: () => {
        const totalEmp    = workforce.filter(e => e.status === 'ACTIVE').length;
        const totalPay    = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        const totalBudget = objects.reduce((s, o) => s + (Number(o.totalBudget)||0), 0);
        const totalDays   = attendance.filter(
          (a) =>
            a.status === 'PRESENT' &&
            workforceIds.has(String(a.employeeId?._id || a.employeeId))
        ).length;
        return [
          ['UMUMIY MOLIYA XULOSASI', '', now()], [],
          ["ASOSIY KO'RSATKICHLAR", 'Qiymat', ''],
          ['Faol xodimlar', totalEmp, 'kishi'],
          ["Jami to'lovlar", totalPay, 'UZS'],
          ['Jami byudjet', totalBudget, 'UZS'],
          ["Umumiy davomat", totalDays, 'kun-kishi'],
          ['Faol obyektlar', objects.filter(o => o.status === 'active').length, 'ta'],
          [], ["OBYEKTLAR BO'YICHA"],
          ['Obyekt', "Byudjet", 'Xarajat', 'Qoldiq', 'Holat'],
          ...objects.map(obj => {
            const oid   = obj._id || obj.id;
            const spent = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(oid)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
            const bal   = (Number(obj.totalBudget)||0) - spent;
            return [obj.name, Number(obj.totalBudget)||0, spent, bal, bal < 0 ? 'LIMIT OSHDI' : 'OK'];
          }),
          [], ["XODIMLAR REYTINGI (ENG KO'P OLGAN)"],
          ["Xodim", "Jami olingan (UZS)", "To'lovlar soni"],
          ...workforce.map(emp => {
            const eid   = emp._id || emp.id;
            const taken = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(eid)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
            const cnt   = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(eid)).length;
            return [emp.name, taken, cnt];
          }).sort((a, b) => b[1] - a[1]),
        ];
      },
      generate() {
        downloadStyledTable(this.rows(), `umumiy_xulosa_${now()}.xlsx`, 'Xulosa', { headerRowIndex: -1 });
      },
    },

    {
      id: 'full_json', category: 'summary',
      title: "To'liq JSON eksport",
      desc:  "Barcha ma'lumotlar JSON formatida (developer uchun)",
      icon:  <FileText size={18}/>, color: 'slate', format: 'JSON', badge: 'DEV',
      count: null,
      rows: () => null,
      generate() {
        downloadJSON({
          exportDate: new Date().toISOString(),
          summary: { employees: workforce.length, attendance: attendance.length, payroll: approvedPayroll.length, objects: objects.length },
          employees, attendance, payroll: approvedPayroll, objects,
        }, `full_export_${now()}.json`);
      },
    },

    // ══ FILTRLI ══
    {
      id: 'payroll_by_obj_filter', category: 'filtered',
      title: "Obyekt bo'yicha to'lovlar",
      desc:  "Tanlangan obyekt uchun barcha to'lovlar",
      icon:  <Filter size={18}/>, color: 'indigo', format: 'XLSX',
      count: filterObj ? approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(filterObj)).length : null,
      rows: () => {
        if (!filterObj) return null;
        const obj     = objects.find(o => (o._id || o.id) === filterObj);
        const data    = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(filterObj));
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Sana', 'Oy'];
        const rows    = data.map((p, i) => [i+1, p.employeeName||'—', Number(p.calculatedSalary)||0, p.date||'—', p.month||'—']);
        const total   = data.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'JAMI', total]];
      },
      generate() {
        if (!filterObj) return alert("Yuqoridagi filtrdan obyektni tanlang!");
        const obj = objects.find(o => (o._id || o.id) === filterObj);
        downloadStyledTable(this.rows(), `${obj?.name || 'obyekt'}_tolovlar_${now()}.xlsx`, 'Tolovlar', { headerRowIndex: 0 });
      },
    },

    {
      id: 'monthly_obj_filter', category: 'filtered',
      title: "Oy + Obyekt kombinatsiyasi",
      desc:  "Tanlangan oy va obyekt kesishmasidagi to'lovlar",
      icon:  <Filter size={18}/>, color: 'pink', format: 'XLSX',
      count: filterObj
        ? approvedPayroll.filter(p => p.month === filterMonth && String(p.objectId?._id || p.objectId) === String(filterObj)).length
        : approvedPayroll.filter(p => p.month === filterMonth).length,
      rows: () => {
        const data    = approvedPayroll.filter(p => p.month === filterMonth && (!filterObj || String(p.objectId?._id || p.objectId) === String(filterObj)));
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana'];
        const rows    = data.map((p, i) => [i+1, p.employeeName||'—', Number(p.calculatedSalary)||0, p.objectName||'—', p.date||'—']);
        const total   = data.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'JAMI', total]];
      },
      generate() {
        const obj = filterObj ? objects.find(o => (o._id || o.id) === filterObj) : null;
        downloadStyledTable(
          this.rows(),
          `${filterMonth}_${obj?.name || 'barchasi'}_${now()}.xlsx`,
          'Filtr',
          { headerRowIndex: 0 }
        );
      },
    },

    // ══ OMBOR ══
    {
      id: 'warehouse_by_object',
      category: 'warehouse',
      title: "Ombor — obyektlar bo'yicha",
      desc: 'Har bir obyekt omboridagi mahsulotlar soni va jami summa',
      icon: <Package size={18} />,
      color: 'violet',
      format: 'XLSX',
      count: warehouseStats.materialRows,
      rows: () => {
        const headers = ['#', 'Obyekt', 'Mahsulotlar', 'Jami summa (UZS)', 'Jami qoldiq (birlik)'];
        const body = warehouseBundles.map((b, i) => {
          const mats = b.materials || [];
          const sum = mats.reduce((s, m) => s + materialTotalAmount(m), 0);
          const rem = mats.reduce((s, m) => s + (Number(m.remaining) || 0), 0);
          return [i + 1, b.objectName, mats.length, sum, rem];
        });
        const grand = warehouseBundles.reduce(
          (s, b) => s + (b.materials || []).reduce((ss, m) => ss + materialTotalAmount(m), 0),
          0
        );
        return [headers, ...body, [], ['', 'JAMI (UZS)', '', grand, '']];
      },
      generate() {
        downloadStyledTable(this.rows(), `ombor_obyektlar_${now()}.xlsx`, 'Ombor', { headerRowIndex: 0 });
      },
    },

    {
      id: 'warehouse_materials_all',
      category: 'warehouse',
      title: 'Ombor — barcha mahsulotlar',
      desc: 'Barcha obyektlar bo‘yicha bitta jadval: mahsulot, beruvchi, miqdor, summa',
      icon: <Package size={18} />,
      color: 'lime',
      format: 'XLSX',
      count: warehouseStats.materialRows,
      rows: () => {
        const headers = [
          '#',
          'Obyekt',
          'Mahsulot',
          'Birlik',
          'Beruvchi',
          'Kirim (jami)',
          'Qoldiq',
          'Summa (UZS)',
        ];
        let n = 0;
        const rows = [];
        warehouseBundles.forEach((b) => {
          (b.materials || []).forEach((m) => {
            n += 1;
            rows.push([
              n,
              b.objectName,
              m.name || '—',
              m.unit || '—',
              m.supplierName || '—',
              Number(m.supplied) || 0,
              Number(m.remaining) || 0,
              materialTotalAmount(m),
            ]);
          });
        });
        const grand = rows.reduce((s, r) => s + (Number(r[7]) || 0), 0);
        return [headers, ...rows, [], ['', '', '', '', '', '', 'JAMI', grand]];
      },
      generate() {
        downloadStyledTable(this.rows(), `ombor_mahsulotlar_${now()}.xlsx`, 'Mahsulotlar', { headerRowIndex: 0 });
      },
    },

    {
      id: 'warehouse_finance_summary',
      category: 'warehouse',
      title: 'Ombor — moliyaviy xulosa',
      desc: 'Umumiy ombor qiymati va obyektlar taqqoslashi',
      icon: <Sparkles size={18} />,
      color: 'amber',
      format: 'XLSX',
      count: warehouseStats.materialRows,
      rows: () => {
        const total = warehouseStats.totalValue;
        const byObj = warehouseBundles
          .map((b) => {
            const sum = (b.materials || []).reduce((s, m) => s + materialTotalAmount(m), 0);
            return [b.objectName, (b.materials || []).length, sum];
          })
          .sort((a, b) => b[2] - a[2]);
        return [
          ['DOST ELECTRIC — OMBOR MOLIYAVIY XULOSA', '', now()],
          [],
          ['Umumiy ombor bo‘yicha jami summa (UZS)', total, ''],
          ['Faol mahsulot Maxsulotlar', warehouseStats.materialRows, 'ta'],
          ['Obyektlar (omborda yozuv bor)', warehouseStats.objectsWithStock, 'ta'],
          [],
          ['Obyekt', 'Mahsulotlar soni', 'Summa (UZS)'],
          ...byObj,
          [],
          ['JAMI', warehouseStats.materialRows, total],
        ];
      },
      generate() {
        downloadStyledTable(this.rows(), `ombor_moliya_${now()}.xlsx`, 'Xulosa', { headerRowIndex: -1 });
      },
    },

  ], [employees, workforce, workforceIds, attendance, approvedPayroll, objects, filterMonth, filterObj, warehouseBundles, warehouseStats]);

  /* ── Barcha hisobotlarni BITTA uslubli XLSX ga ── */
  const downloadAllAsOneXLSX = async () => {
    setDownloading('all');
    try {
      const wb = createWorkbook();
      const add = (name, rows, opts) => appendSheetStyled(wb, name, rows, opts || { headerRowIndex: 0 });

      add('Xodimlar', [
        ['#', 'Ism', 'Lavozim', 'Login', 'Kunlik stavka (UZS)', 'Tur', 'Holat', "Qo'shilgan sana"],
        ...workforce.map((e, i) => [
          i + 1,
          e.name || '—',
          e.position || '—',
          e.email || '—',
          Number(e.salaryRate) || 0,
          e.salaryType === 'DAILY' ? 'Kunlik' : 'Oylik',
          e.status === 'ACTIVE' ? 'Faol' : 'Nofaol',
          e.createdAt ? new Date(e.createdAt).toLocaleDateString('uz-UZ') : '—',
        ]),
      ], { headerRowIndex: 0 });

      const salaryRows = workforce
        .filter((e) => e.status === 'ACTIVE')
        .map((emp, i) => {
          const eid = String(emp._id || emp.id || '');
          const worked = attendance.filter(
            (a) => String(a.employeeId?._id || a.employeeId) === eid && a.status === 'PRESENT'
          ).length;
          const earned = worked * (Number(emp.salaryRate) || 0);
          const taken = approvedPayroll
            .filter((p) => String(p.employeeId?._id || p.employeeId) === eid)
            .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
          const objNames = [
            ...new Set(
              approvedPayroll
                .filter((p) => String(p.employeeId?._id || p.employeeId) === eid)
                .map((p) => p.objectName)
                .filter(Boolean)
            ),
          ].join(', ');
          return [
            i + 1,
            emp.name,
            emp.position || '—',
            worked,
            Number(emp.salaryRate) || 0,
            earned,
            taken,
            earned - taken,
            objNames || '—',
          ];
        });
      add(
        'Ish haqi xulosasi',
        [
          [
            '#',
            'Xodim',
            'Lavozim',
            'Ish kunlari',
            'Kunlik stavka',
            'Hisoblangan (UZS)',
            'Olingan (UZS)',
            'Qoldiq (UZS)',
            'Obyektlar',
          ],
          ...salaryRows,
          [],
          [
            '',
            'JAMI HISOBLANGAN',
            '',
            '',
            '',
            salaryRows.reduce((s, r) => s + (Number(r[5]) || 0), 0),
            salaryRows.reduce((s, r) => s + (Number(r[6]) || 0), 0),
            salaryRows.reduce((s, r) => s + (Number(r[7]) || 0), 0),
          ],
        ],
        { headerRowIndex: 0 }
      );

      const allPayTotal = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
      add(
        'Barcha tolovlar',
        [
          ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Oy', 'Tur'],
          ...approvedPayroll.map((p, i) => [
            i + 1,
            p.employeeName || '—',
            Number(p.calculatedSalary) || 0,
            p.objectName || '—',
            p.date || '—',
            p.month || '—',
            p.type === 'DAILY_PAY' ? 'Oylik' : p.type === 'QUICK_ADD' ? 'Avans' : p.type || '—',
          ]),
          [],
          ['', 'JAMI SUMMA (UZS)', allPayTotal],
        ],
        { headerRowIndex: 0 }
      );

      const monthMap = {};
      approvedPayroll.forEach((p) => {
        const m = p.month || (p.date ? p.date.slice(0, 7) : null);
        if (!m) return;
        if (!monthMap[m]) monthMap[m] = { total: 0, count: 0, emps: new Set() };
        monthMap[m].total += Number(p.calculatedSalary) || 0;
        monthMap[m].count += 1;
        monthMap[m].emps.add(String(p.employeeId?._id || p.employeeId));
      });
      add(
        'Oylar boyicha',
        [
          ['Oy', "Jami to'lovlar (UZS)", "To'lovlar soni", 'Xodimlar soni'],
          ...Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([m, d]) => [m, d.total, d.count, d.emps.size]),
          [],
          [
            'JAMI',
            approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
            approvedPayroll.length,
          ],
        ],
        { headerRowIndex: 0 }
      );

      const objRows = objects.map((obj, i) => {
        const oid = String(obj._id || obj.id || '');
        const objPay = approvedPayroll.filter((p) => String(p.objectId?._id || p.objectId) === oid);
        const total = objPay.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
        const empCnt = new Set(objPay.map((p) => String(p.employeeId?._id || p.employeeId))).size;
        const budget = Number(obj.totalBudget) || 0;
        const pct = budget > 0 ? Math.round((total / budget) * 100) : 0;
        return [
          i + 1,
          obj.name,
          obj.status === 'active' ? 'Faol' : 'Nofaol',
          budget,
          total,
          budget - total,
          `${pct}%`,
          objPay.length,
          empCnt,
          budget > 0 && total > budget ? 'LIMIT OSHDI' : 'OK',
        ];
      });
      add(
        'Obyektlar xarajat',
        [
          [
            '#',
            'Obyekt',
            'Holat',
            'Byudjet (UZS)',
            'Xarajat (UZS)',
            'Qoldiq (UZS)',
            'Foydalanish %',
            "To'lovlar soni",
            'Xodimlar soni',
            'Status',
          ],
          ...objRows,
          [],
          [
            '',
            'JAMI',
            '',
            objects.reduce((s, o) => s + (Number(o.totalBudget) || 0), 0),
            objRows.reduce((s, r) => s + (Number(r[4]) || 0), 0),
          ],
        ],
        { headerRowIndex: 0 }
      );

      const presentAtt = attendance.filter(
        (a) =>
          a.status === 'PRESENT' &&
          workforceIds.has(String(a.employeeId?._id || a.employeeId))
      );
      add(
        'Davomat toliq',
        [
          ['#', 'Xodim', 'Lavozim', 'Sana', 'Obyekt', 'Belgilagan'],
          ...presentAtt.map((a, i) => {
            const emp = employees.find(
              (e) => String(e._id || e.id) === String(a.employeeId?._id || a.employeeId)
            );
            return [
              i + 1,
              emp?.name || a.employeeName || '—',
              emp?.position || '—',
              a.date || '—',
              a.objectName || '—',
              a.markedBy === 'admin' ? 'Admin' : 'Xodim',
            ];
          }),
          [],
          ['JAMI:', presentAtt.length, 'ta yozuv'],
        ],
        { headerRowIndex: 0 }
      );

      add(
        'Davomat xulosasi',
        [
          ['#', 'Xodim', 'Lavozim', 'Jami kunlar', 'Keldi', 'Kelmadi', 'Davomat %'],
          ...workforce
            .filter((e) => e.status === 'ACTIVE')
            .map((emp, i) => {
              const eid = String(emp._id || emp.id || '');
              const empAtt = attendance.filter((a) => String(a.employeeId?._id || a.employeeId) === eid);
              const came = empAtt.filter((a) => a.status === 'PRESENT').length;
              const tot = empAtt.length;
              return [
                i + 1,
                emp.name,
                emp.position || '—',
                tot,
                came,
                tot - came,
                tot > 0 ? `${Math.round((came / tot) * 100)}%` : '0%',
              ];
            }),
        ],
        { headerRowIndex: 0 }
      );

      const totalEmp = workforce.filter((e) => e.status === 'ACTIVE').length;
      const totalPayAll = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
      const totalBudgetAll = objects.reduce((s, o) => s + (Number(o.totalBudget) || 0), 0);
      const totalDays = attendance.filter(
        (a) =>
          a.status === 'PRESENT' &&
          workforceIds.has(String(a.employeeId?._id || a.employeeId))
      ).length;
      add(
        'Umumiy xulosa',
        [
          ['UMUMIY MOLIYA XULOSASI', '', now()],
          [],
          ["KO'RSATKICH", 'QIYMAT', 'BIRLIK'],
          ['Faol xodimlar', totalEmp, 'kishi'],
          ["Jami to'lovlar", totalPayAll, 'UZS'],
          ['Jami byudjet', totalBudgetAll, 'UZS'],
          ["Byudjet qoldig'i", totalBudgetAll - totalPayAll, 'UZS'],
          ['Davomat kunlari', totalDays, 'kun'],
          ['Faol obyektlar', objects.filter((o) => o.status === 'active').length, 'ta'],
          ["To'lovlar soni", approvedPayroll.length, 'ta'],
          [],
          ["OBYEKTLAR BO'YICHA"],
          ['Obyekt', 'Byudjet', 'Xarajat', 'Qoldiq', 'Holat'],
          ...objects.map((obj) => {
            const oid = String(obj._id || obj.id || '');
            const spent = approvedPayroll
              .filter((p) => String(p.objectId?._id || p.objectId) === oid)
              .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
            const bal = (Number(obj.totalBudget) || 0) - spent;
            return [obj.name, Number(obj.totalBudget) || 0, spent, bal, bal < 0 ? 'LIMIT OSHDI' : 'OK'];
          }),
          [],
          ["XODIMLAR REYTINGI (ENG KO'P OLGAN)"],
          ['Xodim', 'Lavozim', 'Jami olingan (UZS)', "To'lovlar soni", 'Ish kunlari'],
          ...workforce
            .map((emp) => {
              const eid = String(emp._id || emp.id || '');
              const taken = approvedPayroll
                .filter((p) => String(p.employeeId?._id || p.employeeId) === eid)
                .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
              const cnt = approvedPayroll.filter(
                (p) => String(p.employeeId?._id || p.employeeId) === eid
              ).length;
              const days = attendance.filter(
                (a) => String(a.employeeId?._id || a.employeeId) === eid && a.status === 'PRESENT'
              ).length;
              return [emp.name, emp.position || '—', taken, cnt, days];
            })
            .sort((a, b) => b[2] - a[2]),
        ],
        { headerRowIndex: -1 }
      );

      const monthlyPay = approvedPayroll.filter((p) => p.month === filterMonth);
      const monthlyTotal = monthlyPay.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
      add(
        `${filterMonth} oy`,
        [
          [`OY: ${filterMonth}`, `Jami: ${monthlyTotal.toLocaleString()} UZS`],
          [],
          ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Tur'],
          ...monthlyPay.map((p, i) => [
            i + 1,
            p.employeeName || '—',
            Number(p.calculatedSalary) || 0,
            p.objectName || '—',
            p.date || '—',
            p.type === 'DAILY_PAY' ? 'Oylik' : 'Avans',
          ]),
          [],
          ['', 'OY JAMI (UZS)', monthlyTotal],
        ],
        { headerRowIndex: 2, titleRowIndexes: [0] }
      );

      const whObjRows = warehouseBundles.map((b, i) => {
        const mats = b.materials || [];
        const sum = mats.reduce((s, m) => s + materialTotalAmount(m), 0);
        const rem = mats.reduce((s, m) => s + (Number(m.remaining) || 0), 0);
        return [i + 1, b.objectName, mats.length, sum, rem];
      });
      const whGrand = warehouseBundles.reduce(
        (s, b) => s + (b.materials || []).reduce((ss, m) => ss + materialTotalAmount(m), 0),
        0
      );
      add(
        'Ombor obyekt',
        [
          ['#', 'Obyekt', 'Mahsulotlar', 'Jami summa (UZS)', 'Jami qoldiq'],
          ...whObjRows,
          [],
          ['', 'JAMI (UZS)', '', whGrand, ''],
        ],
        { headerRowIndex: 0 }
      );

      let n = 0;
      const flatMats = [];
      warehouseBundles.forEach((b) => {
        (b.materials || []).forEach((m) => {
          n += 1;
          flatMats.push([
            n,
            b.objectName,
            m.name || '—',
            m.unit || '—',
            m.supplierName || '—',
            Number(m.supplied) || 0,
            Number(m.remaining) || 0,
            materialTotalAmount(m),
          ]);
        });
      });
      const flatGrand = flatMats.reduce((s, r) => s + (Number(r[7]) || 0), 0);
      add(
        'Ombor mahsulotlar',
        [
          ['#', 'Obyekt', 'Mahsulot', 'Birlik', 'Beruvchi', 'Kirim', 'Qoldiq', 'Summa (UZS)'],
          ...flatMats,
          [],
          ['', '', '', '', '', '', 'JAMI', flatGrand],
        ],
        { headerRowIndex: 0 }
      );

      add(
        'Ombor moliya',
        [
          ['DOST ELECTRIC — OMBOR', '', now()],
          [],
          ['Umumiy summa (UZS)', warehouseStats.totalValue, ''],
          ['Mahsulot Turlari', warehouseStats.materialRows, 'ta'],
          ['Obyektlar (yozuv bor)', warehouseStats.objectsWithStock, 'ta'],
        ],
        { headerRowIndex: -1 }
      );

      writeWorkbook(wb, `Barcha_Hisobotlar_${now().replace(/\./g, '-')}.xlsx`);

      const hist = {
        at: new Date().toISOString(),
        label: 'Barcha hisobotlar (XLSX)',
        totals: {
          employees: workforce.filter((e) => e.status === 'ACTIVE').length,
          payrollSum: approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
          warehouseSum: warehouseStats.totalValue,
          materials: warehouseStats.materialRows,
        },
      };
      const next = [hist, ...readExportHistory()].slice(0, 20);
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(next));
      setExportHistory(next);
    } catch (e) {
      alert('Xatolik: ' + e.message);
      console.error(e);
    }
    setDownloading(null);
  };

  const categories = [
    { key: 'all',        label: 'Barchasi',  icon: <Zap size={13}/>           },
    { key: 'employees',  label: 'Xodimlar',  icon: <Users size={13}/>         },
    { key: 'payroll',    label: "To'lovlar", icon: <CreditCard size={13}/>    },
    { key: 'attendance', label: 'Davomat',   icon: <CalendarCheck size={13}/> },
    { key: 'objects',    label: 'Obyektlar', icon: <Building2 size={13}/>     },
    { key: 'warehouse',  label: 'Ombor',     icon: <Package size={13}/>       },
    { key: 'summary',    label: 'Xulosa',    icon: <Star size={13}/>          },
    { key: 'filtered',   label: 'Filtrli',   icon: <Filter size={13}/>        },
  ];

  const filtered = activeCategory === 'all' ? reports : reports.filter(r => r.category === activeCategory);

  const colorMap = {
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    yellow:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    orange:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
    teal:    'bg-teal-500/10 border-teal-500/20 text-teal-400',
    cyan:    'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    slate:   'bg-slate-700/30 border-slate-600/30 text-slate-400',
    indigo:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    pink:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-400',
    lime:    'bg-lime-500/10 border-lime-500/20 text-lime-400',
  };
  const btnColor = {
    blue:    'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20',
    emerald: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20',
    yellow:  'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/20 !text-slate-950',
    orange:  'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20',
    purple:  'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20',
    teal:    'bg-teal-500 hover:bg-teal-400 shadow-teal-500/20',
    cyan:    'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20',
    rose:    'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20',
    amber:   'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20 !text-slate-950',
    slate:   'bg-slate-600 hover:bg-slate-500 shadow-slate-500/20',
    indigo:  'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20',
    pink:    'bg-pink-500 hover:bg-pink-400 shadow-pink-500/20',
    violet:  'bg-violet-500 hover:bg-violet-400 shadow-violet-500/20',
    lime:    'bg-lime-500 hover:bg-lime-400 shadow-lime-500/20 !text-slate-950',
  };

  const dotByColor = {
    blue: 'bg-blue-400', emerald: 'bg-emerald-400', yellow: 'bg-yellow-400',
    orange: 'bg-orange-400', purple: 'bg-purple-400', teal: 'bg-teal-400',
    cyan: 'bg-cyan-400', rose: 'bg-rose-400', amber: 'bg-amber-400',
    slate: 'bg-slate-400', indigo: 'bg-indigo-400', pink: 'bg-pink-400',
    violet: 'bg-violet-400', lime: 'bg-lime-400',
  };

  const handleDownload = async (report) => {
    setDownloading(report.id);
    await new Promise(r => setTimeout(r, 400));
    try { report.generate(); } catch (e) { alert('Xatolik: ' + e.message); }
    setDownloading(null);
  };

  const totalPaid   = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
  const totalBudget = objects.reduce((s, o) => s + (Number(o.totalBudget)||0), 0);

  return (
    <div className="space-y-6 pb-10">

      {/* ── SARLAVHA ── */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
        <div className="absolute top-3 right-5 text-[80px] leading-none opacity-5 select-none">📊</div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet className="text-yellow-500" size={22}/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
                Hisobotlar <span className="text-yellow-500">&</span> Eksport
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Uslubli XLSX · JSON · bitta faylda barcha sheetlar
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Xodimlar',     val: workforce.filter(e=>e.status==='ACTIVE').length, unit: 'ta faol',   color: 'text-blue-400'    },
              { label: "To'lovlar",    val: approvedPayroll.length,                           unit: 'ta amalga', color: 'text-yellow-400'  },
              { label: 'Jami berildi', val: totalPaid.toLocaleString(),                        unit: 'UZS',       color: 'text-emerald-400' },
              { label: 'Jami byudjet', val: totalBudget.toLocaleString(),                      unit: 'UZS',       color: 'text-purple-400'  },
              { label: 'Ombor (summa)', val: warehouseStats.totalValue.toLocaleString(),      unit: 'UZS',       color: 'text-amber-400'   },
              { label: 'Mahsulotlar',   val: warehouseStats.materialRows,                     unit: 'ta maxsulot', color: 'text-cyan-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[8px] text-slate-500 font-black uppercase mb-1">{s.label}</p>
                <p className={`font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                <p className="text-[8px] text-slate-600 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── UMUMIY KO‘RINISH ── */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black text-emerald-400/90 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={14} /> Umumiy ko‘rinish
          </p>
          {whLoading && (
            <span className="text-[10px] font-bold text-slate-500">Ombor yuklanmoqda...</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Moliya + obyektlar</p>
            <p className="text-slate-300 font-bold leading-relaxed">
              Faol xodimlar:{' '}
              <span className="text-white">{workforce.filter((e) => e.status === 'ACTIVE').length}</span> ·
              Tasdiqlangan to‘lovlar:{' '}
              <span className="text-yellow-400">{approvedPayroll.length}</span> · Jami:{' '}
              <span className="text-emerald-400">{totalPaid.toLocaleString()} UZS</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Ombor (barcha obyektlar)</p>
            <p className="text-slate-300 font-bold leading-relaxed">
              Jami mahsulot qiymati:{' '}
              <span className="text-amber-400">{warehouseStats.totalValue.toLocaleString()} UZS</span> ·
              Maxsulotlar: <span className="text-cyan-400">{warehouseStats.materialRows}</span> · Obyektlar:{' '}
              <span className="text-white">{warehouseStats.objectsWithStock}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── FILTRLAR ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
          <Filter size={11}/> Hisobot filtrlari
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase block mb-1.5">Oy filtri</label>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"/>
          </div>
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase block mb-1.5">Obyekt filtri</label>
            <select value={filterObj} onChange={e => setFilterObj(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all">
              <option value="">— Barcha obyektlar —</option>
              {objects.map(o => <option key={o._id||o.id} value={o._id||o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── KATEGORIYALAR ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[9px] uppercase whitespace-nowrap transition-all active:scale-95 shrink-0 ${
              activeCategory === cat.key
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600'
            }`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* ── HISOBOTLAR GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(report => {
          const isLoading = downloading === report.id;
          const iconCls   = colorMap[report.color] || colorMap.slate;
          const btnCls    = btnColor[report.color]  || btnColor.slate;
          return (
            <div key={report.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${iconCls}`}>
                  {report.icon}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {report.badge && (
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${
                      report.badge === 'PRO' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-700/50 border-slate-600 text-slate-400'
                    }`}>{report.badge}</span>
                  )}
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-500">
                    {report.format}
                  </span>
                </div>
              </div>
              <h3 className="text-white font-black text-sm mb-1">{report.title}</h3>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed mb-3">{report.desc}</p>
              {report.count !== null && (
                <div className="mb-3 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotByColor[report.color] || 'bg-slate-500'}`} />
                  <span className="text-[9px] text-slate-500 font-bold">{report.count} ta yozuv</span>
                </div>
              )}
              <button onClick={() => handleDownload(report)} disabled={!!downloading}
                className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg text-white ${btnCls}`}>
                {isLoading
                  ? <><Clock size={13} className="animate-spin"/> Tayyorlanmoqda...</>
                  : <><Download size={13}/> Yuklab olish</>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* ── HAMMASINI BITTA XLSX GA ── */}
      <div className="bg-gradient-to-r from-yellow-500/5 via-slate-950 to-slate-950 border border-yellow-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-white font-black text-sm mb-0.5">
              🗂 Barcha hisobotlarni yuklab olish
            </h3>
            <p className="text-slate-500 text-[10px] font-bold">
              {reports.filter(r => r.format !== 'JSON').length} ta hisobot •{' '}
              <span className="text-emerald-400 font-black">bitta XLSX</span> • rangli sarlavha va jadvallar •
              ombor sheetlari qo‘shilgan
            </p>
          </div>
          <button
            onClick={downloadAllAsOneXLSX}
            disabled={!!downloading}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20 shrink-0"
          >
            {downloading === 'all'
              ? <><Clock size={14} className="animate-spin"/> Yuklanmoqda...</>
              : <><Download size={14}/> Barcha_Hisobotlar.xlsx</>
            }
          </button>
        </div>
        {exportHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-yellow-500/15">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <History size={12} /> Brauzerda saqlangan eksportlar (oxirgisi birinchi)
            </p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scroll">
              {exportHistory.slice(0, 10).map((h, i) => (
                <li
                  key={`${h.at}-${i}`}
                  className="text-[11px] text-slate-400 font-bold flex flex-wrap gap-x-3 gap-y-0.5 rounded-lg bg-slate-900/60 px-3 py-2 border border-slate-800"
                >
                  <span className="text-slate-500 shrink-0">
                    {new Date(h.at).toLocaleString('uz-UZ')}
                  </span>
                  <span className="text-slate-200">{h.label}</span>
                  {h.totals && (
                    <span className="text-emerald-500/90">
                      to‘lov {Number(h.totals.payrollSum || 0).toLocaleString()} · ombor{' '}
                      {Number(h.totals.warehouseSum || 0).toLocaleString()} UZS
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Excel;