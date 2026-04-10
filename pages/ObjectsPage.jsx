import React, { useState, useMemo } from 'react';
import { Building2, Plus, Trash2, ShieldCheck, ChevronDown } from 'lucide-react';
import { api } from '../utils/api';
import { filterWorkforceEmployees } from '../utils/employeeRoles';

const ObjectsManager = ({ objects, payroll, bonuses = [], attendance = [], employees = [], userRole, onRefresh, canMutate = true }) => {
  const workforceIds = useMemo(() => {
    const wf = filterWorkforceEmployees(employees || []);
    return new Set(wf.map((e) => String(e._id || e.id)));
  }, [employees]);
  const canEdit = canMutate !== false;
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [withdrawObjId, setWithdrawObjId] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawComment, setWithdrawComment] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [editWithdrawal, setEditWithdrawal] = useState({ objId: '', wid: '', amount: '', comment: '' });

  const handleAdd = async () => {
    if (!canEdit || !newName.trim()) return;
    try {
      await api.createObject({ name: newName.trim(), status: 'active' });
      setNewName('');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    if (!window.confirm("Obyektni o'chirishga aminmisiz?")) return;
    try {
      await api.deleteObject(id);
      setExpandedId(null);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const resetWithdrawalForm = () => {
    setWithdrawObjId(null);
    setWithdrawAmount('');
    setWithdrawComment('');
  };

  const handleAddWithdrawal = async (objId) => {
    if (!canEdit) return;
    const amount = Number(withdrawAmount);
    const comment = String(withdrawComment || '').trim();
    if (!amount || Number.isNaN(amount) || amount <= 0) return alert('Summani to\'g\'ri kiriting');
    if (!comment) return alert('Sabab (izoh) kiriting');
    const currentNeed = Number(getObjectLaborStats(objId).objectNeedToPay) || 0;
    const signedAmount = currentNeed < 0 ? -Math.abs(amount) : Math.abs(amount);
    setWithdrawLoading(true);
    try {
      await api.addObjectWithdrawal(objId, { amount: signedAmount, comment });
      resetWithdrawalForm();
      await onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleUpdateWithdrawal = async () => {
    if (!canEdit) return;
    const { objId, wid, amount, comment } = editWithdrawal;
    const num = Number(amount);
    if (!objId || !wid) return;
    if (!num || Number.isNaN(num)) return alert('Summani to\'g\'ri kiriting');
    if (!String(comment || '').trim()) return alert('Sabab (izoh) kiriting');
    setWithdrawLoading(true);
    try {
      await api.updateObjectWithdrawal(objId, wid, { amount: num, comment: String(comment).trim() });
      setEditWithdrawal({ objId: '', wid: '', amount: '', comment: '' });
      await onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleDeleteWithdrawal = async (objId, wid) => {
    if (!canEdit) return;
    if (!window.confirm("Bu yozuvni o'chirasizmi?")) return;
    setWithdrawLoading(true);
    try {
      await api.deleteObjectWithdrawal(objId, wid);
      if (editWithdrawal.wid === wid) setEditWithdrawal({ objId: '', wid: '', amount: '', comment: '' });
      await onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const payrollNeedSummary = useMemo(() => {
    const workedDaysByEmp = {};
    (attendance || []).forEach(a => {
      if (a.status !== 'PRESENT') return;
      const empId = String(a.employeeId?._id || a.employeeId || '');
      if (!empId || !workforceIds.has(empId)) return;
      workedDaysByEmp[empId] = (workedDaysByEmp[empId] || 0) + 1;
    });

    const totalEarned = filterWorkforceEmployees(employees || []).reduce((sum, emp) => {
      const empId = String(emp._id || emp.id || '');
      const days = workedDaysByEmp[empId] || 0;
      const rate = Number(emp.salaryRate) || 0;
      return sum + (days * rate);
    }, 0);

    const objectIdsSet = new Set((objects || []).map(o => String(o._id || o.id)));
    const totalPayrollPaid = (payroll || [])
      .filter(p => {
        if (p.status !== 'APPROVED') return false;
        const pid = String(p.objectId?._id || p.objectId || '');
        return pid && objectIdsSet.has(pid);
      })
      .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
    const totalBonusPaid = (bonuses || [])
      .filter(b => {
        if (String(b.status || '').toLowerCase() !== 'active') return false;
        const bid = String(b.objectId?._id || b.objectId || '');
        return bid && objectIdsSet.has(bid);
      })
      .reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const totalWithdrawn = (objects || []).reduce(
      (sum, obj) => sum + ((obj.withdrawalHistory || []).reduce((s, x) => s + (Number(x.amount) || 0), 0)),
      0
    );
    const totalPaid = totalPayrollPaid + totalBonusPaid;

    const totalNeedToPay = Math.abs(totalEarned - totalPaid + totalWithdrawn);
    return { totalEarned, totalPaid, totalNeedToPay };
  }, [attendance, employees, payroll, objects, bonuses, workforceIds]);

  const getObjectLaborStats = (objId) => {
    const daysByEmp = {};
    (attendance || []).forEach(a => {
      const aObjId = a.objectId?._id || a.objectId;
      if (String(aObjId) !== String(objId)) return;
      if (a.status !== 'PRESENT') return;
      const empId = String(a.employeeId?._id || a.employeeId || '');
      if (!empId || !workforceIds.has(empId)) return;
      daysByEmp[empId] = (daysByEmp[empId] || 0) + 1;
    });

    const perEmployee = Object.entries(daysByEmp)
      .map(([empId, days]) => {
        const emp = filterWorkforceEmployees(employees || []).find(e => String(e._id || e.id) === String(empId));
        const rate = Number(emp?.salaryRate) || 0;
        const shouldPay = days * rate;
        return { empId, empName: emp?.name || "Noma'lum", days, rate, shouldPay };
      })
      .sort((a, b) => b.days - a.days || b.shouldPay - a.shouldPay);

    const objectShouldPayTotal = perEmployee.reduce((s, x) => s + x.shouldPay, 0);
    const totalWorkedDays = perEmployee.reduce((s, x) => s + x.days, 0);
    const objectPayrollPaidTotal = (payroll || [])
      .filter(p => p.status === 'APPROVED' && String(p.objectId?._id || p.objectId) === String(objId))
      .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);

    const objectBonusRows = (bonuses || [])
      .filter(b => (String(b.status || '').toLowerCase() === 'active') && String(b.objectId?._id || b.objectId || '') === String(objId))
      .map(b => {
        const empId = String(b.employeeId?._id || b.employeeId || '');
        const emp = (employees || []).find(e => String(e._id || e.id) === empId);
        return { empId, empName: b.employeeName || emp?.name || "Noma'lum", amount: Number(b.amount) || 0 };
      });

    const bonusByEmployeeMap = {};
    objectBonusRows.forEach(r => {
      if (!bonusByEmployeeMap[r.empId]) bonusByEmployeeMap[r.empId] = { empId: r.empId, empName: r.empName, total: 0 };
      bonusByEmployeeMap[r.empId].total += r.amount;
    });
    const bonusByEmployee = Object.values(bonusByEmployeeMap).sort((a, b) => b.total - a.total);
    const objectBonusTotal = objectBonusRows.reduce((s, r) => s + r.amount, 0);
    const objectPaidTotal = objectPayrollPaidTotal + objectBonusTotal;
    const objectWithdrawalTotal = ((objects || []).find(o => String(o._id || o.id) === String(objId))?.withdrawalHistory || [])
      .reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const objectNeedRaw = objectShouldPayTotal - objectPaidTotal + objectWithdrawalTotal;

    return {
      perEmployee,
      totalWorkedDays,
      objectShouldPayTotal,
      objectPaidTotal,
      // Invert sign intentionally: debt/overpay directions are shown oppositely for this metric.
      objectNeedToPay: -objectNeedRaw,
      objectBonusTotal,
      bonusByEmployee,
      objectWithdrawalTotal,
    };
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
    resetWithdrawalForm();
    setEditWithdrawal({ objId: '', wid: '', amount: '', comment: '' });
  };
  const totalNeedFromObjectCards = useMemo(
    () => (objects || []).reduce((sum, obj) => sum + getObjectLaborStats(obj._id || obj.id).objectNeedToPay, 0),
    [objects, attendance, employees, payroll, bonuses, workforceIds]
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-white flex items-center gap-3 italic">
          <Building2 className="text-yellow-500 shrink-0" size={24} />
          OBYEKTLAR <span className="text-slate-700">|</span><span className="text-yellow-500">{objects.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {canEdit && userRole === 'SUPER_ADMIN' && <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit"><ShieldCheck size={12}/> Super Admin</span>}
          {!canEdit && <span className="px-3 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/25 rounded-xl text-[9px] font-black uppercase tracking-widest">Faqat ko‘rish</span>}
          {canEdit && <button onClick={() => setShowForm(f => !f)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all"><Plus size={14}/> Qo'shish</button>}
        </div>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-violet-500/20 p-4">
        <p className="text-[8px] text-violet-400 font-black uppercase tracking-widest mb-2">Ishchilar bo'yicha umumiy hisob (ish kunlariga qarab)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center"><p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Hisoblangan</p><p className="text-emerald-400 font-black text-xs">{payrollNeedSummary.totalEarned.toLocaleString()}</p></div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center"><p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Berilgan</p><p className="text-yellow-500 font-black text-xs">{payrollNeedSummary.totalPaid.toLocaleString()}</p></div>
          <div className={`p-2 rounded-xl border text-center ${payrollNeedSummary.totalNeedToPay < 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}><p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Berilishi kerak</p><p className={`font-black text-xs ${payrollNeedSummary.totalNeedToPay < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{payrollNeedSummary.totalNeedToPay.toLocaleString()}</p></div>
          <div className={`p-2 rounded-xl border text-center ${totalNeedFromObjectCards < 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}><p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Obyektdan olinishi kerak bo'lgan summa</p><p className={`font-black text-xs ${totalNeedFromObjectCards < 0 ? 'text-rose-500' : 'text-violet-300'}`}>{totalNeedFromObjectCards.toLocaleString()}</p></div>
        </div>
      </div>

      {canEdit && showForm && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Yangi obyekt ma'lumotlari</p>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Obyekt nomi (masalan: Tashkent City)" className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl font-bold text-sm outline-none border border-slate-800 focus:border-yellow-500 transition-all placeholder:text-slate-700"/>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newName.trim()} className="flex-1 py-3.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Plus size={16}/> Saqlash</button>
            <button onClick={() => { setShowForm(false); setNewName(''); }} className="px-5 py-3.5 bg-slate-900 text-slate-400 rounded-xl border border-slate-800 font-black text-xs active:scale-95 transition-all">Bekor</button>
          </div>
        </div>
      )}

      {objects.length === 0 ? (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center"><Building2 className="text-slate-800 mx-auto mb-3" size={40} /><p className="text-slate-700 font-black uppercase text-xs">Obyektlar yo'q</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {objects.map(obj => {
            const id = obj._id || obj.id;
            const laborStats = getObjectLaborStats(id);
            const isExpanded = expandedId === id;
            return (
              <div key={id} className={`bg-slate-950 border rounded-2xl transition-all ${isExpanded ? 'border-yellow-500/30' : 'border-slate-800'}`}>
                <button onClick={() => toggleExpand(id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border bg-slate-800 border-slate-700 text-yellow-500"><Building2 size={18}/></div>
                      <div className="min-w-0">
                        <p className="text-white font-black text-sm truncate">{obj.name}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">{obj.status === 'active' ? '🟢 Faol' : '🔴 Nofaol'}</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>
                  </div>
                  <div className="mt-2 bg-violet-500/10 border border-violet-500/20 rounded-xl p-2">
                    <p className="text-[7px] text-violet-300 font-black uppercase text-center">Shu obyekt bo'yicha ish haqi hisobi</p>
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 text-center"><p className="text-[6px] text-slate-500 font-black uppercase">Hisoblangan</p><p className="text-emerald-400 font-black text-[10px]">{laborStats.objectShouldPayTotal.toLocaleString()}</p></div>
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 text-center"><p className="text-[6px] text-slate-500 font-black uppercase">Berilgan</p><p className="text-yellow-500 font-black text-[10px]">{laborStats.objectPaidTotal.toLocaleString()}</p></div>
                      <div className={`p-1.5 rounded-lg border text-center ${laborStats.objectNeedToPay < 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}><p className="text-[6px] text-slate-500 font-black uppercase">Obyektdan olinishi kerak bo'lgan summa</p><p className={`font-black text-[10px] ${laborStats.objectNeedToPay < 0 ? 'text-rose-400' : 'text-violet-300'}`}>{laborStats.objectNeedToPay.toLocaleString()}</p></div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
                    <div className="flex gap-2">
                      {canEdit ? (
                        <>
                      <button
                        onClick={() => {
                          setWithdrawObjId(withdrawObjId === id ? null : id);
                          setWithdrawAmount('');
                          setWithdrawComment('');
                        }}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 ${
                          withdrawObjId === id
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                        }`}
                      >
                        Obyektga summa berish
                      </button>
                      <button onClick={() => handleDelete(id)} className="w-10 h-10 shrink-0 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white active:scale-95 transition-all"><Trash2 size={15}/></button>
                        </>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-500 py-2">Faqat ko‘rish</p>
                      )}
                    </div>

                    {withdrawObjId === id && canEdit && (
                      <div className="bg-slate-900 rounded-xl border border-blue-500/20 p-3 space-y-2">
                        <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">Obyektga summa berish</p>
                        <input
                          type="number"
                          min="1"
                          value={withdrawAmount}
                          onChange={e => setWithdrawAmount(e.target.value)}
                          placeholder="Summa"
                          className="w-full bg-slate-950 text-white px-3 py-3 rounded-xl font-black text-sm outline-none border border-slate-800 focus:border-blue-500 transition-all placeholder:text-slate-700"
                        />
                        <input
                          value={withdrawComment}
                          onChange={e => setWithdrawComment(e.target.value)}
                          placeholder="Sabab (komment) - nega berildi"
                          className="w-full bg-slate-950 text-white px-3 py-3 rounded-xl font-bold text-sm outline-none border border-slate-800 focus:border-blue-500 transition-all placeholder:text-slate-700"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddWithdrawal(id)}
                            disabled={withdrawLoading}
                            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 active:scale-95 disabled:opacity-40 text-white font-black rounded-xl text-[10px] uppercase transition-all"
                          >
                            {withdrawLoading ? 'Saqlanmoqda...' : "Saqlash"}
                          </button>
                          <button
                            onClick={resetWithdrawalForm}
                            className="px-4 py-2.5 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] active:scale-95 transition-all"
                          >
                            Bekor
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-900 rounded-xl border border-violet-500/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-[8px] text-violet-300 font-black uppercase tracking-widest">Shu obyektga chiqqan ishchilar bo'yicha aniq hisob</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Umumiy ish kunlari: <span className="text-yellow-500">{laborStats.totalWorkedDays}</span> kun</p>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-800">
                        {laborStats.perEmployee.length === 0 ? (
                          <div className="py-6 text-center text-slate-700 font-black uppercase text-[9px]">Bu obyekt bo'yicha davomat yo'q</div>
                        ) : laborStats.perEmployee.map((row, idx) => (
                          <div key={row.empId} className="px-3 py-2.5 grid grid-cols-3 gap-2 items-center">
                            <div className="min-w-0"><p className="text-white font-black text-xs truncate">#{idx + 1} {row.empName}</p><p className="text-[8px] text-slate-500 font-bold">{row.days} kun x {row.rate.toLocaleString()}</p></div>
                            <div className="text-right"><p className="text-[7px] text-slate-500 font-black uppercase">Ish kuni</p><p className="text-yellow-500 font-black text-xs">{row.days} kun</p></div>
                            <div className="text-right"><p className="text-[7px] text-slate-500 font-black uppercase">Berilishi kerak</p><p className="text-emerald-400 font-black text-xs">{row.shouldPay.toLocaleString()}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl border border-emerald-500/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Bonuslar (shu obyekt) — {laborStats.bonusByEmployee.length} xodim</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Jami bonus: <span className="text-emerald-400">{laborStats.objectBonusTotal.toLocaleString()}</span> UZS</p>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-800">
                        {laborStats.bonusByEmployee.length === 0 ? (
                          <div className="py-6 text-center text-slate-700 font-black uppercase text-[9px]">Bu obyekt bo'yicha faol bonus yo'q</div>
                        ) : laborStats.bonusByEmployee.map((b, i) => (
                          <div key={`${b.empId}_${i}`} className="flex items-center justify-between px-3 py-2.5">
                            <p className="text-white font-black text-xs truncate">{b.empName}</p>
                            <p className="text-emerald-400 font-black text-xs">+{b.total.toLocaleString()} UZS</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl border border-blue-500/20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">
                          Obyektga berilgan summalar — {(obj.withdrawalHistory || []).length} ta
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          Jami: <span className="text-blue-400">{laborStats.objectWithdrawalTotal.toLocaleString()}</span> UZS
                        </p>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-800">
                        {(obj.withdrawalHistory || []).length === 0 ? (
                          <div className="py-6 text-center text-slate-700 font-black uppercase text-[9px]">Hali yozuv yo&apos;q</div>
                        ) : [...(obj.withdrawalHistory || [])].reverse().map((w) => {
                          const wid = w._id;
                          const isEditing = editWithdrawal.objId === id && editWithdrawal.wid === String(wid);
                          return (
                            <div key={String(wid)} className="px-3 py-2.5 space-y-2">
                              {isEditing ? (
                                <>
                                  <input
                                    type="number"
                                    min="1"
                                    value={editWithdrawal.amount}
                                    onChange={e => setEditWithdrawal(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-lg font-black text-xs outline-none border border-slate-800 focus:border-blue-500"
                                  />
                                  <input
                                    value={editWithdrawal.comment}
                                    onChange={e => setEditWithdrawal(prev => ({ ...prev, comment: e.target.value }))}
                                    className="w-full bg-slate-950 text-white px-3 py-2 rounded-lg font-bold text-xs outline-none border border-slate-800 focus:border-blue-500"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={handleUpdateWithdrawal} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase">Saqlash</button>
                                    <button onClick={() => setEditWithdrawal({ objId: '', wid: '', amount: '', comment: '' })} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-black uppercase">Bekor</button>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-blue-400 font-black text-xs">
                                      {Number(w.amount || 0) >= 0 ? '+' : '-'}{Math.abs(Number(w.amount || 0)).toLocaleString()} UZS
                                    </p>
                                    <p className="text-slate-400 text-[10px] font-bold truncate">{w.comment || '-'}</p>
                                    <p className="text-slate-600 text-[9px] font-bold">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('uz-UZ') : '-'}</p>
                                  </div>
                                  {canEdit && (
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      onClick={() => setEditWithdrawal({ objId: id, wid: String(wid), amount: String(Math.abs(Number(w.amount) || 0)), comment: String(w.comment || '') })}
                                      className="px-2 py-1.5 bg-slate-800 text-yellow-400 rounded-lg text-[10px] font-black uppercase"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteWithdrawal(id, wid)}
                                      className="px-2 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-black uppercase"
                                    >
                                      O&apos;chirish
                                    </button>
                                  </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ObjectsManager;