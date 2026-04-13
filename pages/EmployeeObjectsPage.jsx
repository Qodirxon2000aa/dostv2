import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeDollarSign, Building2, ChevronDown, TrendingUp } from 'lucide-react';
import { resolveEmployeeRecord, employeeTargetId } from '../utils/employeeSelf';
import EmployeeSupportChatWidget from '../components/EmployeeSupportChatWidget';

const EmployeeObjectsPage = ({
  user,
  employees = [],
  payroll = [],
  supportChatEnabled = false,
}) => {
  const [expandedObj, setExpandedObj] = useState(null);
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter((p) => String(p.employeeId?._id || p.employeeId) === String(targetId));
  }, [payroll, targetId]);

  const approvedPayroll = useMemo(() => myPayroll.filter((p) => p.status === 'APPROVED'), [myPayroll]);

  const totalTaken = useMemo(
    () => approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
    [approvedPayroll]
  );

  const paymentsByObject = useMemo(() => {
    const map = {};
    approvedPayroll.forEach((p) => {
      const key = p.objectId ? String(p.objectId?._id || p.objectId) : '__none__';
      const name = p.objectName || 'Belgilanmagan';
      if (!map[key]) map[key] = { name, payments: [], total: 0, dates: [] };
      map[key].payments.push(p);
      map[key].total += Number(p.calculatedSalary) || 0;
      if (p.date) map[key].dates.push(p.date);
    });
    return Object.entries(map)
      .map(([id, d]) => {
        const sorted = [...d.dates].sort();
        return { id, ...d, firstDate: sorted[0] || null, lastDate: sorted[sorted.length - 1] || null };
      })
      .sort((a, b) => b.total - a.total);
  }, [approvedPayroll]);

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
              <Building2 className="text-blue-400 shrink-0" size={26} />
              Obyektlar
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Tasdiqlangan to‘lovlar obyekt bo‘yicha</p>
          </div>
        </div>

        {paymentsByObject.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-purple-400 shrink-0" size={14} />
              <h2 className="text-white font-black uppercase text-xs italic">Taqsimot xulosa</h2>
            </div>
            <div className="space-y-2.5">
              {paymentsByObject.map((obj) => {
                const pct = totalTaken > 0 ? Math.round((obj.total / totalTaken) * 100) : 0;
                return (
                  <div key={obj.id} className="flex items-center gap-2">
                    <div
                      className="bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0"
                      style={{ width: 26, height: 26 }}
                    >
                      <Building2 className="text-blue-400" size={11} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5 gap-1">
                        <span className="text-white font-black text-xs truncate">{obj.name}</span>
                        <span className="text-yellow-500 font-black text-xs shrink-0">{obj.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[7px] text-slate-600 font-bold mt-0.5">
                        {pct}% • {obj.payments.length} ta to‘lov
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {paymentsByObject.map((obj) => (
          <div key={obj.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedObj(expandedObj === obj.id ? null : obj.id)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-900/30 transition-colors"
            >
              <div
                className="bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0"
                style={{ width: 36, height: 36 }}
              >
                <Building2 className="text-blue-400" size={15} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white font-black text-sm truncate">{obj.name}</p>
                <p className="text-slate-500 font-bold" style={{ fontSize: 8 }}>
                  {obj.payments.length} ta to‘lov
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-yellow-500 font-black text-sm italic">{obj.total.toLocaleString()}</p>
                  <p className="text-slate-600 font-bold" style={{ fontSize: 7 }}>
                    UZS jami
                  </p>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandedObj === obj.id ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expandedObj === obj.id && (
              <div className="border-t border-slate-800">
                <div className="px-4 py-2 bg-slate-900/40">
                  <p className="text-slate-500 font-black uppercase tracking-widest" style={{ fontSize: 7 }}>
                    Qachon • Qancha
                  </p>
                </div>
                <div className="divide-y divide-slate-900 max-h-[280px] overflow-y-auto custom-scroll">
                  {[...obj.payments]
                    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                    .map((p) => (
                      <div key={p._id || p.id} className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/20">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ width: 30, height: 30 }}
                          >
                            <BadgeDollarSign className="text-emerald-500" size={13} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-black text-xs">{p.date || p.month}</p>
                            <p className="text-slate-500 font-bold" style={{ fontSize: 7 }}>
                              {p.type === 'QUICK_ADD' ? 'Avans' : 'Oylik'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-emerald-400 font-black text-sm italic">
                            {(Number(p.calculatedSalary) || 0).toLocaleString()}
                          </p>
                          <p className="text-slate-600 font-bold" style={{ fontSize: 7 }}>
                            UZS
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-slate-500 font-black uppercase" style={{ fontSize: 8 }}>
                    Jami:
                  </p>
                  <p className="text-yellow-500 font-black text-sm italic">
                    {obj.total.toLocaleString()}{' '}
                    <span className="text-slate-500 not-italic" style={{ fontSize: 8 }}>
                      UZS
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {paymentsByObject.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 py-14 text-center">
            <p className="text-slate-600 font-black uppercase text-xs">Hali hech qaysi obyektdan to‘lov yo‘q</p>
          </div>
        )}
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

export default EmployeeObjectsPage;
