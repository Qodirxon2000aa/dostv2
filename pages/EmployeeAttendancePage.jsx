import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, X } from 'lucide-react';
import { resolveEmployeeRecord, employeeTargetId } from '../utils/employeeSelf';
import EmployeeSupportChatWidget from '../components/EmployeeSupportChatWidget';

const EmployeeAttendancePage = ({
  user,
  employees = [],
  attendance = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  const myAttendance = useMemo(() => {
    if (!targetId) return [];
    return attendance.filter((a) => String(a.employeeId?._id || a.employeeId) === String(targetId));
  }, [attendance, targetId]);

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

  const presentCount = myAttendance.filter((a) => a.status === 'PRESENT').length;

  return (
    <>
      <div
        className={`max-w-2xl mx-auto px-4 pt-2 sm:pt-4 ${
          supportChatEnabled
            ? 'pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))]'
            : 'pb-8'
        }`}
      >
        <div className="flex flex-wrap items-start gap-3 mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} /> Orqaga
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400 shrink-0" size={26} />
              Davomat
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Kelish-ketish tarixi</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-black uppercase text-xs tracking-widest italic">Davomat tarixi</h2>
            <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              {presentCount} kun
            </span>
          </div>
          <div className="divide-y divide-slate-900 max-h-[min(70vh,560px)] overflow-y-auto custom-scroll">
            {[...myAttendance].reverse().map((a) => (
              <div key={a._id || a.id} className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 rounded-xl flex items-center justify-center ${
                      a.status === 'PRESENT'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : a.status === 'PENDING'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-slate-800 text-slate-500'
                    }`}
                    style={{ width: 34, height: 34 }}
                  >
                    {a.status === 'PRESENT' ? (
                      <CheckCircle2 size={14} />
                    ) : a.status === 'PENDING' ? (
                      <Clock size={14} />
                    ) : (
                      <X size={14} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm">{a.date}</p>
                    {a.objectName && (
                      <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {a.objectName}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 font-black uppercase px-2 py-1 rounded-lg border ${
                    a.status === 'PRESENT'
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      : a.status === 'PENDING'
                        ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                        : 'text-slate-500 bg-slate-800 border-slate-700'
                  }`}
                  style={{ fontSize: 7 }}
                >
                  {a.status === 'PRESENT' ? 'Keldi' : a.status === 'PENDING' ? 'Kutilmoqda' : 'Kelmadi'}
                </span>
              </div>
            ))}
            {myAttendance.length === 0 && (
              <div className="py-14 text-center text-slate-600 font-black uppercase text-xs">Davomat tarixi yo‘q</div>
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

export default EmployeeAttendancePage;
