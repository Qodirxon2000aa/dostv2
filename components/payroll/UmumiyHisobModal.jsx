import React, { useState, useMemo } from 'react';
import {
  Calculator, X, Wallet, Users, AlertTriangle, ChevronRight, Gift,
} from 'lucide-react';

const UmumiyHisobModal = ({ employeeStats, onClose, onSelectEmp }) => {
  const [sortBy, setSortBy] = useState('remaining');

  const sorted = useMemo(() => {
    return [...employeeStats].sort((a, b) => {
      if (sortBy === 'remaining') return b.remaining - a.remaining;
      if (sortBy === 'earned') return b.totalEarned - a.totalEarned;
      if (sortBy === 'taken') return b.totalTaken - a.totalTaken;
      return 0;
    });
  }, [employeeStats, sortBy]);

  const grandTotalEarned = employeeStats.reduce((s, e) => s + e.totalEarned, 0);
  const grandTotalTaken = employeeStats.reduce((s, e) => s + e.totalTaken, 0);
  const grandTotalFines = employeeStats.reduce((s, e) => s + e.totalFines, 0);
  const grandTotalBonuses = employeeStats.reduce((s, e) => s + (e.totalBonuses || 0), 0);
  const grandRemaining = employeeStats.reduce((s, e) => s + e.remaining, 0);
  const positiveCount = employeeStats.filter(e => e.remaining > 0).length;
  const negativeCount = employeeStats.filter(e => e.remaining < 0).length;
  const maxRemaining = Math.max(...employeeStats.map(e => Math.abs(e.remaining)), 1);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/90"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-5 pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 bg-violet-500/10 border border-violet-500/30 rounded-2xl flex items-center justify-center">
                <Calculator className="text-violet-400" size={22} />
              </div>
              <div>
                <h3 className="text-white font-black italic uppercase text-base leading-tight">Umumiy Hisob</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Barcha xodimlar qoldiqlari</p>
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

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-emerald-500/15 to-slate-950 border border-emerald-500/25 rounded-2xl p-3 text-center">
              <p className="text-[7px] text-emerald-400 font-black uppercase tracking-widest mb-1">Jami Hisoblangan</p>
              <p className="text-emerald-400 font-black text-lg leading-tight">{grandTotalEarned.toLocaleString()}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">UZS</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/15 to-slate-950 border border-yellow-500/25 rounded-2xl p-3 text-center">
              <p className="text-[7px] text-yellow-500 font-black uppercase tracking-widest mb-1">Jami Berilgan</p>
              <p className="text-yellow-500 font-black text-lg leading-tight">{grandTotalTaken.toLocaleString()}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">UZS</p>
            </div>
            {grandTotalFines > 0 && (
              <div className="bg-gradient-to-br from-rose-500/15 to-slate-950 border border-rose-500/25 rounded-2xl p-3 text-center">
                <p className="text-[7px] text-rose-400 font-black uppercase tracking-widest mb-1">Jami Jarimalar</p>
                <p className="text-rose-400 font-black text-lg leading-tight">−{grandTotalFines.toLocaleString()}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">UZS</p>
              </div>
            )}
            {grandTotalBonuses > 0 && (
              <div className="bg-gradient-to-br from-emerald-500/15 to-slate-950 border border-emerald-500/25 rounded-2xl p-3 text-center">
                <p className="text-[7px] text-emerald-400 font-black uppercase tracking-widest mb-1">Jami Bonuslar</p>
                <p className="text-emerald-400 font-black text-lg leading-tight">+{grandTotalBonuses.toLocaleString()}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">UZS</p>
              </div>
            )}
            <div
              className={`bg-gradient-to-br border rounded-2xl p-3 text-center col-span-2 ${
                grandRemaining >= 0
                  ? 'from-violet-500/15 to-slate-950 border-violet-500/25'
                  : 'from-rose-500/15 to-slate-950 border-rose-500/25'
              }`}
            >
              <p
                className={`text-[7px] font-black uppercase tracking-widest mb-1 ${
                  grandRemaining >= 0 ? 'text-violet-400' : 'text-rose-400'
                }`}
              >
                Umumiy Qoldiq
              </p>
              <p
                className={`font-black text-lg leading-tight ${
                  grandRemaining >= 0 ? 'text-violet-400' : 'text-rose-400'
                }`}
              >
                {grandRemaining.toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">UZS</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[8px] text-emerald-400 font-black uppercase">
                {positiveCount} ta — berilishi kerak
              </span>
            </div>
            {negativeCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                <div className="w-2 h-2 bg-rose-500 rounded-full" />
                <span className="text-[8px] text-rose-400 font-black uppercase">
                  {negativeCount} ta — ortiqcha berilgan
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Users size={10} className="text-slate-400" />
              <span className="text-[8px] text-slate-400 font-black uppercase">{employeeStats.length} ta xodim</span>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {[
              { key: 'remaining', label: 'Qoldiq' },
              { key: 'earned', label: 'Hisoblangan' },
              { key: 'taken', label: 'Berilgan' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`flex-1 py-2 rounded-lg font-black text-[8px] uppercase transition-all ${
                  sortBy === key
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:text-white hover:bg-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-2">
          {sorted.map(stats => {
            const { emp, totalTaken, totalEarned, totalFines, totalBonuses = 0, remaining, workedDays } = stats;
            const isNegative = remaining < 0;
            const barPct = maxRemaining > 0 ? Math.min(Math.round((Math.abs(remaining) / maxRemaining) * 100), 100) : 0;
            const earnedPct = totalEarned > 0 ? Math.min(Math.round((totalTaken / totalEarned) * 100), 100) : 0;

            return (
              <button
                key={stats.empId}
                type="button"
                onClick={() => {
                  onSelectEmp(stats);
                  onClose();
                }}
                className="w-full bg-slate-950 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-900/40 active:scale-[0.99] rounded-2xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-base border transition-all ${
                      isNegative
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : remaining === 0
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-black italic uppercase text-sm truncate">{emp.name}</p>
                      {isNegative && <AlertTriangle size={11} className="text-rose-400 shrink-0" />}
                    </div>
                    <p className="text-slate-500 text-[9px] font-bold uppercase">
                      {emp.position} • {workedDays} kun
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-black text-base italic leading-tight ${
                        isNegative ? 'text-rose-400' : remaining === 0 ? 'text-slate-500' : 'text-violet-400'
                      }`}
                    >
                      {isNegative ? '−' : ''}
                      {Math.abs(remaining).toLocaleString()}
                    </p>
                    <p className="text-[8px] text-slate-600">UZS qoldiq</p>
                  </div>
                </div>

                {totalFines > 0 && (
                  <div className="mb-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-rose-400 font-black uppercase">⚠ Jarimalar</span>
                    <span className="text-rose-400 font-black text-xs">−{totalFines.toLocaleString()} UZS</span>
                  </div>
                )}
                {totalBonuses > 0 && (
                  <div className="mb-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[8px] text-emerald-400 font-black uppercase flex items-center gap-1">
                      <Gift size={10} /> Bonuslar
                    </span>
                    <span className="text-emerald-400 font-black text-xs">+{totalBonuses.toLocaleString()} UZS</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    { label: 'Hisoblangan', val: totalEarned.toLocaleString(), color: 'text-emerald-400' },
                    { label: 'Berilgan', val: totalTaken.toLocaleString(), color: 'text-yellow-500' },
                    {
                      label: `${earnedPct}% olindi`,
                      val: isNegative ? '⚠ Oshdi' : remaining === 0 ? '✅ Tugadi' : '📤 Kerak',
                      color: isNegative ? 'text-rose-400' : remaining === 0 ? 'text-emerald-400' : 'text-violet-400',
                    },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 text-center">
                      <p className="text-[6px] text-slate-600 font-black uppercase mb-0.5">{s.label}</p>
                      <p className={`font-black text-[10px] ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNegative
                          ? 'bg-gradient-to-r from-rose-700 to-rose-400'
                          : 'bg-gradient-to-r from-violet-700 to-violet-400'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-600 font-bold">
                    <span>{isNegative ? '⚠ Ortiqcha berilgan' : 'Berilishi kerak'}</span>
                    <span className="text-slate-500 group-hover:text-violet-400 transition-colors flex items-center gap-1">
                      Batafsil <ChevronRight size={9} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4">
          <div className="bg-gradient-to-r from-violet-500/10 to-slate-950 border border-violet-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="text-violet-400" size={16} />
                <div>
                  <p className="text-[8px] text-violet-400 font-black uppercase tracking-widest">Jami Berilishi Kerak</p>
                  <p className="text-[8px] text-slate-500 font-bold">Barcha ijobiy qoldiqlar yig&apos;indisi</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-violet-400 font-black text-xl italic">
                  {employeeStats.filter(e => e.remaining > 0).reduce((s, e) => s + e.remaining, 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500 font-bold">UZS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UmumiyHisobModal;
