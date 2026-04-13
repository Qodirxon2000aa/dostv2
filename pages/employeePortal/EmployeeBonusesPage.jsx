import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';
import { bonusIsActive } from '../../components/payroll/payrollBonusUtils';
import { resolveEmployeeRecord, employeeTargetId } from '../../utils/employeeSelf';
import EmployeeSupportChatWidget from '../../components/EmployeeSupportChatWidget';

const EmployeeBonusesPage = ({
  user,
  employees = [],
  bonuses = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  const myBonuses = useMemo(() => {
    if (!targetId) return [];
    return (bonuses || []).filter((b) => String(b.employeeId?._id || b.employeeId) === String(targetId));
  }, [bonuses, targetId]);

  const myActiveBonuses = useMemo(() => myBonuses.filter((b) => bonusIsActive(b)), [myBonuses]);
  const totalBonuses = useMemo(
    () => myActiveBonuses.reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [myActiveBonuses]
  );
  const cancelledBonusesCount = useMemo(() => myBonuses.filter((b) => !bonusIsActive(b)).length, [myBonuses]);

  if (!employeeData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} /> Orqaga
        </Link>
        <p className="text-slate-500 text-center mt-8 font-bold text-sm">Xodim topilmadi</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`max-w-2xl mx-auto px-4 pt-2 sm:pt-4 space-y-3 ${
          supportChatEnabled
            ? 'pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))]'
            : 'pb-8'
        }`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} /> Orqaga
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Gift className="text-emerald-400 shrink-0" size={26} />
              Bonuslar
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Bonuslar tarixi</p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            totalBonuses > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/40 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Aktiv bonuslar jami</p>
              <p className={`font-black text-2xl italic ${totalBonuses > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {totalBonuses > 0 ? `+${totalBonuses.toLocaleString()}` : '0'}
                <span className="text-sm not-italic ml-1 text-slate-500">UZS</span>
              </p>
              <p className="text-[8px] font-bold mt-1 text-slate-500">
                {myActiveBonuses.length} ta aktiv • {cancelledBonusesCount} ta bekor qilingan
              </p>
            </div>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                totalBonuses > 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Gift className={totalBonuses > 0 ? 'text-emerald-400' : 'text-slate-600'} size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-black uppercase text-xs tracking-widest italic">Bonuslar tarixi</h2>
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myBonuses.length} ta</span>
          </div>
          <div className="divide-y divide-slate-900 max-h-[min(55vh,480px)] overflow-y-auto custom-scroll">
            {[...myBonuses].reverse().map((b) => {
              const active = bonusIsActive(b);
              const reason = b.reason || b.comment || '';
              const bDate = b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('uz-UZ') : null);
              return (
                <div key={b._id || b.id} className="bonus-row flex items-center justify-between px-4 py-3.5 hover:bg-slate-900/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`shrink-0 rounded-xl flex items-center justify-center border ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                      style={{ width: 34, height: 34 }}
                    >
                      <Gift size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            active
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-slate-500 bg-slate-800 border-slate-700 line-through'
                          }`}
                        >
                          {active ? '● Aktiv' : '✕ Bekor'}
                        </span>
                        {bDate && <span className="text-[7px] text-slate-600 font-bold">{bDate}</span>}
                      </div>
                      {reason && <p className="text-slate-400 text-[9px] font-bold truncate">{reason}</p>}
                      <p className="text-slate-600 text-[7px] font-bold">{b.createdBy || b.appliedBy || 'admin'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p
                      className={`font-black text-sm italic ${active ? 'text-emerald-400' : 'text-slate-600 line-through'}`}
                    >
                      +{(Number(b.amount) || 0).toLocaleString()}
                    </p>
                    <p className="text-[7px] text-slate-600">UZS</p>
                  </div>
                </div>
              );
            })}
            {myBonuses.length === 0 && (
              <div className="py-14 text-center">
                <p className="text-slate-600 font-black uppercase text-xs">Bonuslar hozircha yo‘q</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {supportChatEnabled && targetId && employeeData && (
        <EmployeeSupportChatWidget
          employeeId={targetId}
          requesterEmployeeId={String(targetId)}
          senderName={employeeData.name}
          enabled
        />
      )}
    </>
  );
};

export default EmployeeBonusesPage;
