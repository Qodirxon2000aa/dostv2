import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Trash2, Users, Search,
  ChevronDown, Ban, Clock, Filter
} from 'lucide-react';
import { api } from '../../utils/api';
import { filterWorkforceEmployees } from '../../utils/employeeRoles';

/* ─── So'mni formatlash ─── */
const fmt = n => Number(n || 0).toLocaleString('uz-UZ');

/* ═══════════════════════════════════════════
   FINES COMPONENT
═══════════════════════════════════════════ */
const Fines = ({ employees = [], fines: propFines = [], userRole, onLog, onRefresh, canMutate = true }) => {
  const workforce = useMemo(() => filterWorkforceEmployees(employees), [employees]);
  const [fines, setFines]           = useState(propFines);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId]     = useState(null);

  /* Form */
  const [empId,   setEmpId]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [comment, setComment] = useState('');

  /* Filter */
  const [search,     setSearch]     = useState('');
  const [filterEmp,  setFilterEmp]  = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  /* ── Jarimalarni yuklash ── */
  const loadFines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFines();
      setFines(res.data || []);
    } catch (e) {
      console.error('Jarimalar yuklanmadi:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFines(); }, [loadFines]);

  /* propFines o'zgarganda ham yangilash */
  useEffect(() => { setFines(propFines); }, [propFines]);

  /* ── Jarima qo'llash ── */
  const handleSubmit = async () => {
  if (!canMutate) return;
  if (!empId || !amount || Number(amount) <= 0) return alert("Ma'lumotlarni to'ldiring!");

  setSubmitting(true);
  try {
    await api.createFine({
      employeeId: empId,
      amount: Number(amount),
      comment: comment.trim(),
    });

    onLog?.(`Jarima qo'llandi: ${amount.toLocaleString()} UZS`);
    
    // FORMNI TOZALASH
    setEmpId('');
    setAmount('');
    setComment('');

    // ENG MUHIMI — HAMMASI YANGILANSIN
    await onRefresh?.();   

  } catch (e) {
    alert('Xatolik: ' + e.message);
  } finally {
    setSubmitting(false);
  }
};

  /* ── Bekor qilish ── */
  const handleCancel = async (id) => {
    if (!canMutate) return;
    if (!window.confirm("Bu jarimani bekor qilasizmi?")) return;
    setCancelId(id);
    try {
      await api.cancelFine(id);
      onLog?.('Jarima bekor qilindi');
      await loadFines();
      onRefresh?.();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setCancelId(null);
    }
  };

  /* ── O'chirish (SUPER_ADMIN) ── */
  const handleDelete = async (id) => {
    if (!canMutate || !isSuperAdmin) return;
    if (!window.confirm("Bu jarimani butunlay o'chirasizmi?")) return;
    setCancelId(id);
    try {
      await api.deleteFine(id);
      onLog?.("Jarima o'chirildi");
      await loadFines();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setCancelId(null);
    }
  };

  /* ── Filtrlanган jarimalar ── */
  const filtered = useMemo(() => {
    return fines.filter(f => {
      const matchStatus = filterStatus === 'ALL' || f.status === filterStatus;
      const matchEmp    = !filterEmp || String(f.employeeId?._id || f.employeeId) === filterEmp;
      const matchSearch = !search || f.employeeName?.toLowerCase().includes(search.toLowerCase())
                        || f.comment?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchEmp && matchSearch;
    });
  }, [fines, filterStatus, filterEmp, search]);

  /* ── Xodim bo'yicha statistika ── */
  const empFineStats = useMemo(() => {
    const map = {};
    fines.filter(f => f.status === 'ACTIVE').forEach(f => {
      const eid = String(f.employeeId?._id || f.employeeId);
      if (!map[eid]) map[eid] = { name: f.employeeName, total: 0, count: 0 };
      map[eid].total += Number(f.amount) || 0;
      map[eid].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [fines]);

  const totalActive    = fines.filter(f => f.status === 'ACTIVE').reduce((s, f) => s + Number(f.amount), 0);
  const totalCancelled = fines.filter(f => f.status === 'CANCELLED').reduce((s, f) => s + Number(f.amount), 0);
  const activeEmps     = workforce.filter(e => e.status === 'ACTIVE');

  /* ── Tanlangan xodim jami jarima ── */
  const selectedEmpFine = useMemo(() => {
    if (!empId) return 0;
    return fines.filter(f => String(f.employeeId?._id || f.employeeId) === empId && f.status === 'ACTIVE')
      .reduce((s, f) => s + Number(f.amount), 0);
  }, [fines, empId]);

  return (
    <div className="space-y-5 pb-10">

      {/* ══ SARLAVHA ══ */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'32px 32px'}}/>
        <div className="absolute top-3 right-5 text-[80px] leading-none opacity-5 select-none">⚠️</div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="text-rose-500" size={22}/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
                Jarimalar <span className="text-rose-500">Boshqaruvi</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Xodim hisobidan ayirish · Izoh · Tarix
              </p>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Jami faol jarimalar',   val: fmt(totalActive),         unit:'UZS',   color:'text-rose-400',    bg:'from-rose-500/10'    },
              { label:'Bekor qilingan',         val: fmt(totalCancelled),      unit:'UZS',   color:'text-slate-400',   bg:'from-slate-700/20'   },
              { label:"Jarimali xodimlar",      val: empFineStats.length,      unit:'kishi', color:'text-orange-400',  bg:'from-orange-500/10'  },
              { label:"Jami jarimalar soni",    val: fines.filter(f=>f.status==='ACTIVE').length, unit:'ta', color:'text-yellow-400', bg:'from-yellow-500/10' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.bg} to-slate-950 border border-slate-800 rounded-xl p-3 text-center`}>
                <p className="text-[8px] text-slate-500 font-black uppercase mb-1 leading-tight">{s.label}</p>
                <p className={`font-black text-lg leading-tight ${s.color}`}>{s.val}</p>
                <p className="text-[8px] text-slate-600 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ JARIMA QO'LLASH FORMASI ══ */}
      {canMutate && (
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-rose-500" size={14}/>
          </div>
          <p className="text-white font-black uppercase text-sm tracking-tight">Yangi jarima qo'llash</p>
        </div>

        {/* Xodim tanlash */}
        <div>
          <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
            Xodim tanlang
          </label>
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
            <select
              value={empId}
              onChange={e => setEmpId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 text-white pl-9 pr-4 py-3 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Xodimni tanlang —</option>
              {activeEmps.map(e => (
                <option key={e._id||e.id} value={e._id||e.id}>{e.name} ({e.position || '—'})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
          </div>
          {/* Tanlangan xodimning mavjud jarimlari */}
          {empId && selectedEmpFine > 0 && (
            <p className="text-[9px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
              <AlertTriangle size={9}/>
              Bu xodimning amaldagi jarimalar jami: {fmt(selectedEmpFine)} UZS
            </p>
          )}
        </div>

        {/* 2 ta input: Summa + Izoh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
              Jarima summasi (UZS)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Masalan: 50000"
              min={1}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
            />
          </div>
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
              Sabab / Izoh
            </label>
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Masalan: Kech kelish, tartib buzish..."
              maxLength={200}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
            />
          </div>
        </div>

        {/* Ko'rinish (preview) */}
        {empId && amount && Number(amount) > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Jarima qo'llanadi:</p>
              <p className="text-white font-black text-sm mt-0.5">
                {employees.find(e=>(e._id||e.id)===empId)?.name || '—'}
              </p>
              {comment && <p className="text-slate-500 text-[10px] font-bold mt-0.5">"{comment}"</p>}
            </div>
            <div className="text-right">
              <p className="text-rose-400 font-black text-xl italic">−{fmt(amount)}</p>
              <p className="text-[8px] text-slate-600 font-bold">UZS</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !empId || !amount}
          className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10"
        >
          {submitting
            ? <><Clock size={14} className="animate-spin"/> Qo'llanmoqda...</>
            : <><AlertTriangle size={14}/> Jarima Qo'llash</>
          }
        </button>
      </div>
      )}

      {/* ══ TOP JARIMALI XODIMLAR ══ */}
      {empFineStats.length > 0 && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={11} className="text-rose-500"/> Faol jarimalar (xodim bo'yicha)
          </p>
          <div className="space-y-2">
            {empFineStats.slice(0, 5).map((s, i) => {
              const pct = Math.round((s.total / (empFineStats[0]?.total || 1)) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-rose-400">{i+1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-white font-black text-xs truncate">{s.name}</span>
                      <span className="text-rose-400 font-black text-xs shrink-0 ml-2">−{fmt(s.total)} UZS</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{width:`${pct}%`}}/>
                    </div>
                    <p className="text-[7px] text-slate-600 font-bold mt-0.5">{s.count} ta jarima</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ FILTRLAR ══ */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
          <Filter size={11}/> Jarimalar filtri
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Qidiruv */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Xodim yoki izoh..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white pl-9 pr-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
            />
          </div>
          {/* Xodim filtri */}
          <div className="relative">
            <select
              value={filterEmp}
              onChange={e => setFilterEmp(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-3 py-2.5 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Barcha xodimlar —</option>
              {activeEmps.map(e => <option key={e._id||e.id} value={e._id||e.id}>{e.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"/>
          </div>
          {/* Status filtri */}
          <div className="flex gap-2">
            {[
              {val:'ACTIVE',    label:'Faol',    color:'bg-rose-500 text-white'},
              {val:'CANCELLED', label:'Bekor',   color:'bg-slate-700 text-white'},
              {val:'ALL',       label:'Barchasi', color:'bg-slate-600 text-white'},
            ].map(s => (
              <button key={s.val} onClick={() => setFilterStatus(s.val)}
                className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 ${
                  filterStatus === s.val ? s.color : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ JARIMALAR RO'YXATI ══ */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <p className="text-white font-black uppercase text-xs tracking-widest italic">Jarimalar ro'yxati</p>
          <div className="flex items-center gap-2">
            {loading && <Clock size={12} className="text-slate-600 animate-spin"/>}
            <span className="text-[8px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              {filtered.length} ta
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-900">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <AlertTriangle size={28} className="text-slate-800 mx-auto mb-3"/>
              <p className="text-slate-700 font-black uppercase text-xs">
                {search || filterEmp ? "Topilmadi" : "Jarimalar yo'q"}
              </p>
            </div>
          )}

          {filtered.map(fine => {
            const isCancelled = fine.status === 'CANCELLED';
            const isDeleting  = cancelId === (fine._id || fine.id);
            const date = fine.createdAt
              ? new Date(fine.createdAt).toLocaleDateString('uz-UZ', {day:'2-digit',month:'2-digit',year:'numeric'})
              : '—';

            return (
              <div key={fine._id||fine.id}
                className={`flex items-center gap-3 px-5 py-4 hover:bg-slate-900/30 transition-colors ${isCancelled?'opacity-50':''}`}>

                {/* Icon */}
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
                  isCancelled
                    ? 'bg-slate-800 border-slate-700 text-slate-600'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                  {isCancelled ? <Ban size={16}/> : <AlertTriangle size={16}/>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black text-sm">{fine.employeeName || '—'}</p>
                    {isCancelled
                      ? <span className="text-[7px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full font-black uppercase">Bekor</span>
                      : <span className="text-[7px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-black uppercase">Faol</span>
                    }
                  </div>
                  {fine.comment && (
                    <p className="text-slate-500 text-[10px] font-bold mt-0.5 truncate">"{fine.comment}"</p>
                  )}
                  <p className="text-slate-700 text-[8px] font-bold mt-0.5">{date} • {fine.appliedBy || 'admin'}</p>
                </div>

                {/* Summa */}
                <div className="text-right shrink-0">
                  <p className={`font-black text-base italic ${isCancelled ? 'text-slate-600 line-through' : 'text-rose-400'}`}>
                    −{fmt(fine.amount)}
                  </p>
                  <p className="text-[7px] text-slate-600 font-bold">UZS</p>
                </div>

                {/* Tugmalar */}
                {!isCancelled && canMutate && (
                  <div className="flex gap-1.5 shrink-0 ml-1">
                    {/* Bekor qilish */}
                    <button
                      onClick={() => handleCancel(fine._id||fine.id)}
                      disabled={!!cancelId}
                      className="w-8 h-8 bg-slate-800 hover:bg-yellow-500/10 hover:border-yellow-500/30 border border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                      title="Bekor qilish"
                    >
                      {isDeleting ? <Clock size={13} className="animate-spin text-slate-500"/> : <Ban size={13} className="text-yellow-500"/>}
                    </button>
                    {/* O'chirish (SUPER_ADMIN) */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(fine._id||fine.id)}
                        disabled={!!cancelId}
                        className="w-8 h-8 bg-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 border border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                        title="O'chirish"
                      >
                        <Trash2 size={13} className="text-rose-500"/>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Fines;