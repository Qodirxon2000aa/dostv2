import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeDollarSign } from 'lucide-react';
import { resolveEmployeeRecord, employeeTargetId } from '../utils/employeeSelf';
import EmployeeSupportChatWidget from '../components/EmployeeSupportChatWidget';

const EmployeePaymentsPage = ({
  user,
  employees = [],
  payroll = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter((p) => String(p.employeeId?._id || p.employeeId) === String(targetId));
  }, [payroll, targetId]);

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
              <BadgeDollarSign className="text-yellow-500 shrink-0" size={26} />
              To‘lovlar
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Barcha to‘lov yozuvlari</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-black uppercase text-xs tracking-widest italic">To‘lovlar tarixi</h2>
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myPayroll.length} ta</span>
          </div>
          <div className="divide-y divide-slate-900 max-h-[min(70vh,560px)] overflow-y-auto custom-scroll">
            {[...myPayroll].reverse().map((p) => (
              <div key={p._id || p.id} className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`shrink-0 rounded-xl flex items-center justify-center ${
                      p.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                    style={{ width: 34, height: 34 }}
                  >
                    <BadgeDollarSign size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm leading-tight truncate">{p.date || p.month}</p>
                    {p.objectName && (
                      <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {p.objectName}
                      </span>
                    )}
                    <p
                      className={`text-[7px] font-black uppercase mt-0.5 ${
                        p.status === 'PENDING' ? 'text-yellow-500' : 'text-emerald-500'
                      }`}
                    >
                      {p.status === 'PENDING' ? 'Kutilmoqda' : 'Tasdiqlandi'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-black text-white italic">{(Number(p.calculatedSalary) || 0).toLocaleString()}</p>
                  <p className="text-[7px] text-slate-600">UZS</p>
                </div>
              </div>
            ))}
            {myPayroll.length === 0 && (
              <div className="py-14 text-center text-slate-600 font-black uppercase text-xs">To‘lovlar tarixi yo‘q</div>
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

export default EmployeePaymentsPage;
