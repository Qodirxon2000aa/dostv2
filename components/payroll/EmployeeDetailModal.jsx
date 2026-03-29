import React, { useState, useMemo } from 'react';
import {
  X, Calendar, TrendingUp, Hash, Clock, Layers, BarChart3, Gift, Pencil, Ban,
} from 'lucide-react';
import { MONTH_LABELS } from './constants';
import { payrollDateLabel } from './payrollBonusUtils';

const EmployeeDetailModal = ({ empStats, onClose, onEditPayment, onCancelPayment }) => {
  if (!empStats) return null;
  const { emp, totalTaken, totalEarned, totalFines, totalBonuses = 0, remaining, workedDays, payments } = empStats;
  const allDates = payments.map(p => p.date).filter(Boolean).sort();
  const minDate = allDates[0] || '';
  const maxDate = allDates[allDates.length - 1] || '';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const isFiltered = dateFrom || dateTo;
  const filteredPayments = useMemo(() => {
    if (!isFiltered) return payments;
    return payments.filter(p => {
      const d = p.date || '';
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [payments, dateFrom, dateTo, isFiltered]);
  const filtTotal = filteredPayments.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
  const filtCount = filteredPayments.length;
  const filtEarnedPct = totalEarned > 0 ? Math.min(Math.round((filtTotal / totalEarned) * 100), 100) : 0;
  const byObject = useMemo(() => {
    const map = {};
    filteredPayments.forEach(p => {
      const key = p.objectName || 'Belgilanmagan';
      if (!map[key]) map[key] = { total: 0, count: 0, dates: [] };
      map[key].total += Number(p.calculatedSalary) || 0;
      map[key].count += 1;
      if (p.date) map[key].dates.push(p.date);
    });
    return Object.entries(map)
      .map(([name, data]) => {
        const ds = [...data.dates].sort();
        return { name, total: data.total, count: data.count, firstDate: ds[0] || '—', lastDate: ds[ds.length - 1] || '—' };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments]);
  const byMonth = useMemo(() => {
    const map = {};
    filteredPayments.forEach(p => {
      const key = p.month || (p.date ? p.date.slice(0, 7) : "Noma'lum");
      if (!map[key]) map[key] = 0;
      map[key] += Number(p.calculatedSalary) || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 8);
  }, [filteredPayments]);
  const maxMonthVal = byMonth[0]?.[1] || 1;
  const recentPayments = [...filteredPayments]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 10);
  const firstPayDate = allDates[0] || '—';
  const lastPayDate = allDates[allDates.length - 1] || '—';
  const earnedPctAll = totalEarned > 0 ? Math.min(Math.round((totalTaken / totalEarned) * 100), 100) : 0;
  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/85"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center text-yellow-500 font-black text-xl">
                {emp.name[0]}
              </div>
              <div>
                <h3 className="text-white font-black italic uppercase text-base leading-tight">{emp.name}</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-wider">{emp.position}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="text-slate-400" size={16} />
            </button>
          </div>
          <div className="bg-slate-950 rounded-2xl border border-violet-500/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="text-violet-400" size={12} />
                <span className="text-[8px] text-violet-400 font-black uppercase tracking-widest">Sana Oralig&apos;i</span>
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-[8px] text-rose-400 font-black uppercase bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-1"
                >
                  <X size={9} /> Tozalash
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Dan</p>
                <input
                  type="date"
                  value={dateFrom}
                  min={minDate || undefined}
                  max={dateTo || maxDate || undefined}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl font-bold text-xs outline-none transition-colors"
                />
              </div>
              <div>
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Gacha</p>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || minDate || undefined}
                  max={maxDate || undefined}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl font-bold text-xs outline-none transition-colors"
                />
              </div>
            </div>
            {isFiltered && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="text-[8px] text-violet-300 font-black bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-lg">
                  🔍 {dateFrom || '...'} → {dateTo || '...'}
                </span>
                <span className="text-[8px] text-slate-400 font-bold">{filtCount} ta to&apos;lov topildi</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: isFiltered ? "Oraliq to'lovlar" : 'Ish kunlari',
                val: isFiltered ? filtCount.toString() : `${workedDays}`,
                unit: isFiltered ? 'ta' : 'kun',
                color: 'text-white',
                bg: 'bg-slate-800/60 border-slate-700',
              },
              {
                label: isFiltered ? 'Oraliq jami' : 'Jami olgan',
                val: (isFiltered ? filtTotal : totalTaken).toLocaleString(),
                unit: 'UZS',
                color: 'text-yellow-500',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
              },
              {
                label: 'Umumiy summa',
                val: totalEarned.toLocaleString(),
                unit: 'UZS — barcha vaqt',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
              },
              {
                label: 'Qoldiq',
                val: remaining.toLocaleString(),
                unit: 'UZS',
                color: remaining >= 0 ? 'text-emerald-400' : 'text-rose-400',
                bg:
                  remaining >= 0
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20',
              },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-xl border text-center ${s.bg}`}>
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-tight">{s.label}</p>
                <p className={`font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                <p className="text-[8px] text-slate-600 mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>
          {totalFines > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">⚠ Jarimalar</span>
              <span className="text-rose-400 font-black text-sm">−{totalFines.toLocaleString()} UZS</span>
            </div>
          )}
          {totalBonuses > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                <Gift size={12} /> Bonuslar
              </span>
              <span className="text-emerald-400 font-black text-sm">+{totalBonuses.toLocaleString()} UZS</span>
            </div>
          )}
        </div>
        <div className="p-5 space-y-5">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
                {isFiltered ? "Oraliq to'lov / Umumiy hisoblangan" : "To'lov Progressi"}
              </span>
              <span className="text-[9px] text-white font-black">{isFiltered ? filtEarnedPct : earnedPctAll}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              {isFiltered ? (
                <div className="relative h-full w-full">
                  <div className="absolute h-full bg-slate-700 rounded-full" style={{ width: `${earnedPctAll}%` }} />
                  <div
                    className="absolute h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                    style={{ width: `${filtEarnedPct}%` }}
                  />
                </div>
              ) : (
                <div
                  className={`h-full rounded-full ${
                    remaining < 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                  }`}
                  style={{ width: `${earnedPctAll}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[8px] font-bold text-slate-600">
              {isFiltered ? (
                <>
                  <span className="text-violet-400">Oraliq: {filtTotal.toLocaleString()} UZS</span>
                  <span>Jami olgan: {totalTaken.toLocaleString()} UZS</span>
                </>
              ) : (
                <>
                  <span>Olingan: {totalTaken.toLocaleString()} UZS</span>
                  <span>Hisoblangan: {totalEarned.toLocaleString()} UZS</span>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                icon: <TrendingUp size={12} />,
                label: 'Kunlik stavka',
                val: `${(Number(emp.salaryRate) || 0).toLocaleString()} UZS`,
                color: 'text-blue-400',
                accent: 'text-blue-400',
              },
              {
                icon: <Hash size={12} />,
                label: "Jami to'lovlar",
                val: `${payments.length} ta`,
                color: 'text-purple-400',
                accent: 'text-purple-400',
              },
              {
                icon: <Clock size={12} />,
                label: "Birinchi to'lov",
                val: firstPayDate,
                color: 'text-slate-300',
                accent: 'text-slate-400',
              },
              {
                icon: <Clock size={12} />,
                label: "Oxirgi to'lov",
                val: lastPayDate,
                color: 'text-slate-300',
                accent: 'text-slate-400',
              },
            ].map(s => (
              <div key={s.label} className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                <div className={`flex items-center gap-1.5 mb-1 ${s.accent}`}>
                  {s.icon}
                  <span className="text-[7px] font-black uppercase tracking-widest">{s.label}</span>
                </div>
                <p className={`font-black text-sm ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
          {byObject.length > 0 && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="text-blue-400" size={13} />
                  <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">Obyektlar Bo&apos;yicha Taqsimot</p>
                </div>
                {isFiltered && (
                  <span className="text-[7px] text-violet-400 font-black bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                    Filterlangan
                  </span>
                )}
              </div>
              <div className="p-4 space-y-4">
                {byObject.map(obj => {
                  const pct = filtTotal > 0 ? Math.round((obj.total / filtTotal) * 100) : 0;
                  return (
                    <div key={obj.name}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-black text-sm truncate">{obj.name}</span>
                            <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {obj.count} ta to&apos;lov
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-500 font-bold mt-0.5 block">
                            📅 {obj.firstDate} — {obj.lastDate}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-yellow-500 font-black text-sm">{obj.total.toLocaleString()}</p>
                          <p className="text-[8px] text-slate-600">
                            UZS • {pct}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {byMonth.length > 0 && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-emerald-400" size={13} />
                  <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Oylar Bo&apos;yicha Tarix</p>
                </div>
                {isFiltered && (
                  <span className="text-[7px] text-violet-400 font-black bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                    Filterlangan
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2.5">
                {byMonth.map(([month, amount]) => {
                  const pct = Math.round((amount / maxMonthVal) * 100);
                  const [y, m] = month.split('-');
                  const label = `${MONTH_LABELS[Number(m) - 1] || m} ${y}`;
                  return (
                    <div key={month} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-black text-[10px]">{label}</span>
                        <span className="text-emerald-400 font-black text-[10px]">{amount.toLocaleString()} UZS</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {recentPayments.length > 0 ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="text-yellow-500" size={13} />
                  <p className="text-[8px] text-yellow-500 font-black uppercase tracking-widest">
                    {isFiltered ? "Oraliq To'lovlar" : "So'nggi To'lovlar"}
                  </p>
                </div>
                {isFiltered && (
                  <span className="text-[8px] text-yellow-500 font-black">
                    {filtCount} ta • {filtTotal.toLocaleString()} UZS
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-900 max-h-[320px] overflow-y-auto">
                {recentPayments.map(p => (
                  <div
                    key={p._id || p.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-slate-500 font-bold leading-snug">{payrollDateLabel(p)}</p>
                      {p.objectName && (
                        <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
                          {p.objectName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-2">
                      <span className="text-yellow-500 font-black text-sm">
                        {(Number(p.calculatedSalary) || 0).toLocaleString()} UZS
                      </span>
                      {typeof onEditPayment === 'function' && p.status === 'APPROVED' && (
                        <button
                          type="button"
                          title="Tahrirlash"
                          onClick={() => onEditPayment(p)}
                          className="p-1.5 text-slate-600 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {typeof onCancelPayment === 'function' && p.status === 'APPROVED' && (
                        <button
                          type="button"
                          title="Bekor qilish"
                          onClick={() => onCancelPayment(p)}
                          className="p-1.5 text-slate-600 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isFiltered ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-10 text-center">
              <p className="text-slate-600 font-black uppercase text-xs">Bu oraliqda to&apos;lovlar yo&apos;q</p>
              <button
                type="button"
                onClick={clearFilter}
                className="mt-3 text-[9px] text-violet-400 font-black bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/20 active:scale-95 transition-all"
              >
                Filterni tozalash
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;
