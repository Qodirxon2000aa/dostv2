import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Gift, Trash2, Users, Search,
  ChevronDown, Ban, Clock, Filter, Building2,
} from 'lucide-react';
import { api } from '../../utils/api';
import { filterWorkforceEmployees } from '../../utils/employeeRoles';

const fmt = n => Number(n || 0).toLocaleString('uz-UZ');

const rowStatus = b => {
  const u = String(b?.status ?? 'ACTIVE').toUpperCase();
  return u === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE';
};

const Bonuses = ({ employees = [], objects = [], bonuses: propBonuses = [], userRole, onLog, onRefresh, canMutate = true }) => {
  const workforce = useMemo(() => filterWorkforceEmployees(employees), [employees]);
  const [bonuses, setBonuses]           = useState(propBonuses);
  const [loading, setLoading]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [cancelId, setCancelId]         = useState(null);

  const [empId,   setEmpId]   = useState('');
  const [objectId, setObjectId] = useState('');
  const [amount,  setAmount]  = useState('');
  const [comment, setComment] = useState('');

  const [search,        setSearch]        = useState('');
  const [filterEmp,     setFilterEmp]     = useState('');
  const [filterObject,  setFilterObject]  = useState('');
  const [filterStatus,  setFilterStatus]  = useState('ACTIVE');

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const loadBonuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBonuses();
      const raw = res.data ?? res.bonuses ?? res;
      setBonuses(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Bonuslar yuklanmadi:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBonuses(); }, [loadBonuses]);
  useEffect(() => { setBonuses(propBonuses); }, [propBonuses]);

  const handleSubmit = async () => {
    if (!canMutate) return;
    if (!empId || !objectId || !amount || Number(amount) <= 0) return alert("Ma'lumotlarni to'ldiring!");

    setSubmitting(true);
    try {
      const emp = employees.find(e => String(e._id || e.id) === String(empId));
      const obj = objects.find(o => String(o._id || o.id) === String(objectId));
      await api.createBonus({
        employeeId: empId,
        objectId,
        objectName: obj?.name || '',
        amount: Number(amount),
        reason: comment.trim(),
        date: new Date().toISOString().split('T')[0],
        createdBy: 'Admin',
      });

      onLog?.(`Bonus qo'llandi: ${fmt(amount)} UZS — ${emp?.name || ''}`);

      setEmpId('');
      setObjectId('');
      setAmount('');
      setComment('');

      await onRefresh?.();
      await loadBonuses();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async id => {
    if (!canMutate) return;
    if (!window.confirm("Bu bonusni bekor qilasizmi?")) return;
    setCancelId(id);
    try {
      await api.cancelBonus(id);
      onLog?.('Bonus bekor qilindi');
      await loadBonuses();
      onRefresh?.();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setCancelId(null);
    }
  };

  const handleDelete = async id => {
    if (!canMutate || !isSuperAdmin) return;
    if (!window.confirm("Bu bonusni butunlay o'chirasizmi?")) return;
    setCancelId(id);
    try {
      await api.deleteBonus(id);
      onLog?.("Bonus o'chirildi");
      await loadBonuses();
      onRefresh?.();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setCancelId(null);
    }
  };

  const filtered = useMemo(() => {
    return bonuses.filter(b => {
      const st = rowStatus(b);
      const matchStatus = filterStatus === 'ALL' || st === filterStatus;
      const matchEmp    = !filterEmp || String(b.employeeId?._id || b.employeeId) === filterEmp;
      const matchObj    = !filterObject || String(b.objectId?._id || b.objectId) === filterObject;
      const name        = b.employeeName || employees.find(e => String(e._id || e.id) === String(b.employeeId?._id || b.employeeId))?.name || '';
      const reason      = b.reason || b.comment || '';
      const matchSearch = !search
        || name.toLowerCase().includes(search.toLowerCase())
        || reason.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchEmp && matchObj && matchSearch;
    });
  }, [bonuses, filterStatus, filterEmp, filterObject, search, employees]);

  const empBonusStats = useMemo(() => {
    const map = {};
    bonuses.filter(b => rowStatus(b) === 'ACTIVE').forEach(b => {
      const eid = String(b.employeeId?._id || b.employeeId);
      const name = b.employeeName || employees.find(e => String(e._id || e.id) === eid)?.name || '—';
      if (!map[eid]) map[eid] = { name, total: 0, count: 0 };
      map[eid].total += Number(b.amount) || 0;
      map[eid].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [bonuses, employees]);

  const totalActive = bonuses
    .filter(b => rowStatus(b) === 'ACTIVE')
    .reduce((s, b) => s + Number(b.amount), 0);
  const totalCancelled = bonuses
    .filter(b => rowStatus(b) === 'CANCELLED')
    .reduce((s, b) => s + Number(b.amount), 0);
  const activeEmps = workforce.filter(e => e.status === 'ACTIVE');

  const selectedEmpBonus = useMemo(() => {
    if (!empId) return 0;
    return bonuses
      .filter(b => String(b.employeeId?._id || b.employeeId) === empId && rowStatus(b) === 'ACTIVE')
      .reduce((s, b) => s + Number(b.amount), 0);
  }, [bonuses, empId]);

  return (
    <div className="space-y-5 pb-10">
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-3 right-5 text-[80px] leading-none opacity-5 select-none">🎁</div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Gift className="text-emerald-400" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
                Bonuslar <span className="text-emerald-400">Boshqaruvi</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Xodim hisobiga qo&apos;shish · Sabab · Tarix
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Jami faol bonuslar', val: fmt(totalActive), unit: 'UZS', color: 'text-emerald-400', bg: 'from-emerald-500/10' },
              { label: 'Bekor qilingan', val: fmt(totalCancelled), unit: 'UZS', color: 'text-slate-400', bg: 'from-slate-700/20' },
              { label: 'Bonusli xodimlar', val: empBonusStats.length, unit: 'kishi', color: 'text-teal-400', bg: 'from-teal-500/10' },
              {
                label: 'Jami bonuslar soni',
                val: bonuses.filter(b => rowStatus(b) === 'ACTIVE').length,
                unit: 'ta',
                color: 'text-yellow-400',
                bg: 'from-yellow-500/10',
              },
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

      {canMutate && (
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Gift className="text-emerald-400" size={14} />
          </div>
          <p className="text-white font-black uppercase text-sm tracking-tight">Yangi bonus qo&apos;llash</p>
        </div>

        <div>
          <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
            Xodim tanlang
          </label>
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <select
              value={empId}
              onChange={e => setEmpId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white pl-9 pr-4 py-3 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Xodimni tanlang —</option>
              {activeEmps.map(e => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.name} ({e.position || '—'})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
          {empId && selectedEmpBonus > 0 && (
            <p className="text-[9px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
              <Gift size={9} />
              Bu xodimning amaldagi bonuslar jami: {fmt(selectedEmpBonus)} UZS
            </p>
          )}
        </div>

        <div>
          <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
            Obyekt tanlang
          </label>
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <select
              value={objectId}
              onChange={e => setObjectId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white pl-9 pr-4 py-3 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Obyektni tanlang —</option>
              {objects.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
              Bonus summasi (UZS)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Masalan: 100000"
              min={1}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
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
              placeholder="Masalan: Loyihani vaqtida tugatdi..."
              maxLength={200}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
            />
          </div>
        </div>

        {empId && amount && Number(amount) > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Bonus qo&apos;llanadi:</p>
              <p className="text-white font-black text-sm mt-0.5">
                {employees.find(e => (e._id || e.id) === empId)?.name || '—'}
              </p>
              {comment && <p className="text-slate-500 text-[10px] font-bold mt-0.5">&quot;{comment}&quot;</p>}
            </div>
            <div className="text-right">
              <p className="text-emerald-400 font-black text-xl italic">+{fmt(amount)}</p>
              <p className="text-[8px] text-slate-600 font-bold">UZS</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !empId || !objectId || !amount}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
        >
          {submitting
            ? <><Clock size={14} className="animate-spin" /> Qo&apos;llanmoqda...</>
            : <><Gift size={14} /> Bonus Qo&apos;llash</>}
        </button>
      </div>
      )}

      {empBonusStats.length > 0 && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <Gift size={11} className="text-emerald-500" /> Faol bonuslar (xodim bo&apos;yicha)
          </p>
          <div className="space-y-2">
            {empBonusStats.slice(0, 5).map((s, i) => {
              const pct = Math.round((s.total / (empBonusStats[0]?.total || 1)) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-black text-emerald-400">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-white font-black text-xs truncate">{s.name}</span>
                      <span className="text-emerald-400 font-black text-xs shrink-0 ml-2">+{fmt(s.total)} UZS</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[7px] text-slate-600 font-bold mt-0.5">{s.count} ta bonus</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
          <Filter size={11} /> Bonuslar filtri
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Xodim yoki izoh..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white pl-9 pr-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700"
            />
          </div>
          <div className="relative">
            <select
              value={filterEmp}
              onChange={e => setFilterEmp(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-3 py-2.5 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Barcha xodimlar —</option>
              {activeEmps.map(e => (
                <option key={e._id || e.id} value={e._id || e.id}>{e.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterObject}
              onChange={e => setFilterObject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-3 py-2.5 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Barcha obyektlar —</option>
              {objects.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
          <div className="flex gap-2">
            {[
              { val: 'ACTIVE', label: 'Faol', color: 'bg-emerald-500 text-white' },
              { val: 'CANCELLED', label: 'Bekor', color: 'bg-slate-700 text-white' },
              { val: 'ALL', label: 'Barchasi', color: 'bg-slate-600 text-white' },
            ].map(s => (
              <button
                key={s.val}
                type="button"
                onClick={() => setFilterStatus(s.val)}
                className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 ${
                  filterStatus === s.val ? s.color : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <p className="text-white font-black uppercase text-xs tracking-widest italic">Bonuslar ro&apos;yxati</p>
          <div className="flex items-center gap-2">
            {loading && <Clock size={12} className="text-slate-600 animate-spin" />}
            <span className="text-[8px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              {filtered.length} ta
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-900">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Gift size={28} className="text-slate-800 mx-auto mb-3" />
              <p className="text-slate-700 font-black uppercase text-xs">
                {search || filterEmp ? 'Topilmadi' : "Bonuslar yo'q"}
              </p>
            </div>
          )}

          {filtered.map(b => {
            const isCancelled = rowStatus(b) === 'CANCELLED';
            const isDeleting  = cancelId === (b._id || b.id);
            const date = b.date || (b.createdAt
              ? new Date(b.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : '—');
            const reason = b.reason || b.comment || '';
            const bid = b._id || b.id;
            const displayName = b.employeeName
              || employees.find(e => String(e._id || e.id) === String(b.employeeId?._id || b.employeeId))?.name
              || '—';
            const objectDisplayName = b.objectName
              || objects.find(o => String(o._id || o.id) === String(b.objectId?._id || b.objectId))?.name
              || '—';

            return (
              <div
                key={bid}
                className={`flex items-center gap-3 px-5 py-4 hover:bg-slate-900/30 transition-colors ${isCancelled ? 'opacity-50' : ''}`}
              >
                <div
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
                    isCancelled
                      ? 'bg-slate-800 border-slate-700 text-slate-600'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  }`}
                >
                  {isCancelled ? <Ban size={16} /> : <Gift size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black text-sm">{displayName}</p>
                    {isCancelled
                      ? <span className="text-[7px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full font-black uppercase">Bekor</span>
                      : <span className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-black uppercase">Faol</span>}
                  </div>
                  {reason && (
                    <p className="text-slate-500 text-[10px] font-bold mt-0.5 truncate">&quot;{reason}&quot;</p>
                  )}
                  <p className="text-slate-700 text-[8px] font-bold mt-0.5">
                    {date} • {b.createdBy || b.appliedBy || 'admin'}
                  </p>
                  <p className="text-emerald-500 text-[8px] font-black uppercase mt-0.5">
                    Obyekt: {objectDisplayName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-black text-base italic ${isCancelled ? 'text-slate-600 line-through' : 'text-emerald-400'}`}>
                    +{fmt(b.amount)}
                  </p>
                  <p className="text-[7px] text-slate-600 font-bold">UZS</p>
                </div>

                {!isCancelled && canMutate && (
                  <div className="flex gap-1.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => handleCancel(bid)}
                      disabled={!!cancelId}
                      className="w-8 h-8 bg-slate-800 hover:bg-yellow-500/10 hover:border-yellow-500/30 border border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                      title="Bekor qilish"
                    >
                      {isDeleting ? <Clock size={13} className="animate-spin text-slate-500" /> : <Ban size={13} className="text-yellow-500" />}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(bid)}
                        disabled={!!cancelId}
                        className="w-8 h-8 bg-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 border border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                        title="O'chirish"
                      >
                        <Trash2 size={13} className="text-rose-500" />
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

export default Bonuses;
