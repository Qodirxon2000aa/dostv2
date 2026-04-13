import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { resolveEmployeeRecord, employeeTargetId } from '../../utils/employeeSelf';
import EmployeeSupportChatWidget from '../../components/EmployeeSupportChatWidget';

const EmployeeFinesPage = ({
  user,
  employees = [],
  fines = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  const myFines = useMemo(() => {
    if (!targetId) return [];
    return (fines || []).filter((f) => String(f.employeeId?._id || f.employeeId) === String(targetId));
  }, [fines, targetId]);

  const myActiveFines = useMemo(() => myFines.filter((f) => f.status === 'ACTIVE'), [myFines]);
  const totalFines = useMemo(
    () => myActiveFines.reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [myActiveFines]
  );

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
              <AlertTriangle className="text-rose-400 shrink-0" size={26} />
              Jarimalar
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Jarimalar tarixi</p>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            totalFines > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Aktiv jarimalar jami</p>
              <p className={`font-black text-2xl italic ${totalFines > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalFines > 0 ? `−${totalFines.toLocaleString()}` : '0'}
                <span className="text-sm not-italic ml-1 text-slate-500">UZS</span>
              </p>
              <p className="text-[8px] font-bold mt-1 text-slate-500">
                {myActiveFines.length} ta aktiv • {myFines.filter((f) => f.status === 'CANCELLED').length} ta bekor qilingan
              </p>
            </div>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                totalFines > 0 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <AlertTriangle className={totalFines > 0 ? 'text-rose-400' : 'text-emerald-400'} size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-black uppercase text-xs tracking-widest italic">Jarimalar tarixi</h2>
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myFines.length} ta</span>
          </div>
          <div className="divide-y divide-slate-900 max-h-[min(55vh,480px)] overflow-y-auto custom-scroll">
            {[...myFines].reverse().map((f) => (
              <div key={f._id || f.id} className="fine-row flex items-center justify-between px-4 py-3.5 hover:bg-slate-900/30">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`shrink-0 rounded-xl flex items-center justify-center border ${
                      f.status === 'ACTIVE'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                    style={{ width: 34, height: 34 }}
                  >
                    <AlertTriangle size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          f.status === 'ACTIVE'
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : 'text-slate-500 bg-slate-800 border-slate-700 line-through'
                        }`}
                      >
                        {f.status === 'ACTIVE' ? '● Aktiv' : '✕ Bekor'}
                      </span>
                      {f.createdAt && (
                        <span className="text-[7px] text-slate-600 font-bold">
                          {new Date(f.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                    {f.comment && <p className="text-slate-400 text-[9px] font-bold truncate">{f.comment}</p>}
                    <p className="text-slate-600 text-[7px] font-bold">Admin: {f.appliedBy || 'admin'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p
                    className={`font-black text-sm italic ${
                      f.status === 'ACTIVE' ? 'text-rose-400' : 'text-slate-600 line-through'
                    }`}
                  >
                    −{(Number(f.amount) || 0).toLocaleString()}
                  </p>
                  <p className="text-[7px] text-slate-600">UZS</p>
                </div>
              </div>
            ))}
            {myFines.length === 0 && (
              <div className="py-14 text-center">
                <p className="text-slate-600 font-black uppercase text-xs">Jarimalar yo‘q ✓</p>
                <p className="text-slate-700 text-[8px] font-bold mt-1">Yaxshi ishlayapsiz!</p>
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

export default EmployeeFinesPage;
