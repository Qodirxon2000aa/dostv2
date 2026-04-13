import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarClock, CalendarDays } from 'lucide-react';
import EmployeeSupportChatWidget from '../../components/EmployeeSupportChatWidget';

const MONTH_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const formatDateUzLong = (iso) => {
  if (!iso || typeof iso !== 'string') return '';
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  const mi = MONTH_UZ[m - 1];
  return mi ? `${d} ${mi} ${y}` : iso;
};

/**
 * Xodim kabineti — tasdiqlangan ish kunlari: obyekt, sana, summa (alohida sahifa, Sozlamalar kabi).
 */
const EmployeeWorkDaysPage = ({
  user,
  employees = [],
  attendance = [],
  payroll = [],
  objects = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => {
    if (!user || !employees.length) return null;
    const uid = user._id != null ? String(user._id) : '';
    const uu = user.uid != null ? String(user.uid) : '';
    const mail = user.email ? String(user.email).toLowerCase() : '';
    return (
      employees.find((e) => {
        const eid = e._id != null ? String(e._id) : '';
        const euid = e.uid != null ? String(e.uid) : '';
        const em = e.email ? String(e.email).toLowerCase() : '';
        return (
          (uid && (eid === uid || euid === uid)) ||
          (uu && (eid === uu || euid === uu)) ||
          (mail && em === mail)
        );
      }) || null
    );
  }, [employees, user]);

  const targetId = employeeData?._id || employeeData?.uid || null;

  const myAttendance = useMemo(() => {
    if (!targetId) return [];
    return attendance.filter((a) => String(a.employeeId?._id || a.employeeId) === String(targetId));
  }, [attendance, targetId]);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter((p) => String(p.employeeId?._id || p.employeeId) === String(targetId));
  }, [payroll, targetId]);

  const approvedPayroll = useMemo(() => myPayroll.filter((p) => p.status === 'APPROVED'), [myPayroll]);

  const workDaysByObject = useMemo(() => {
    const dailyRate = Number(employeeData?.salaryRate) || 0;
    const present = myAttendance
      .filter((a) => a.status === 'PRESENT')
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const payrollForDayObject = (dateStr, objectIdStr) =>
      approvedPayroll.filter((p) => {
        if (p.status !== 'APPROVED' || !p.date || p.date !== dateStr) return false;
        const pid = String(p.objectId?._id || p.objectId || '');
        if (objectIdStr) return pid === objectIdStr;
        return !pid;
      });

    const groups = {};
    for (const a of present) {
      const oid = String(a.objectId?._id || a.objectId || '');
      const key = oid || '__none__';
      const name =
        (a.objectName && String(a.objectName).trim()) ||
        objects.find((o) => String(o._id || o.id) === oid)?.name ||
        'Obyekt ko‘rsatilmagan';

      const matched = payrollForDayObject(a.date, oid);
      const amount =
        matched.length > 0
          ? matched.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0)
          : dailyRate;

      if (!groups[key]) {
        groups[key] = { key, name, rows: [], total: 0 };
      }
      groups[key].rows.push({ date: a.date, amount });
      groups[key].total += amount;
    }

    return Object.values(groups).sort((x, y) => y.total - x.total);
  }, [myAttendance, approvedPayroll, employeeData, objects]);

  const workDaysGrandTotal = useMemo(
    () => workDaysByObject.reduce((s, g) => s + g.total, 0),
    [workDaysByObject]
  );
  const workDaysCount = useMemo(
    () => workDaysByObject.reduce((s, g) => s + g.rows.length, 0),
    [workDaysByObject]
  );

  if (!employeeData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} /> Orqaga
        </Link>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center">
          <p className="text-slate-500 font-black uppercase text-sm">Xodim topilmadi</p>
          <p className="text-slate-600 text-xs mt-2">{user?.email || user?.name}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`max-w-2xl mx-auto space-y-5 sm:space-y-6 px-4 pt-2 sm:pt-4 ${
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
              <CalendarClock className="text-emerald-400 shrink-0" size={26} />
              Ish kunlarim
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">
              Tasdiqlangan kunlar — obyekt, sana va summa
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-emerald-500/25 p-4 sm:p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="bg-emerald-500/15 rounded-xl flex items-center justify-center border border-emerald-500/25 shrink-0"
                  style={{ width: 40, height: 40 }}
                >
                  <CalendarClock className="text-emerald-400" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
                    Jami (tasdiqlangan ish kunlari)
                  </p>
                  <p className="text-white font-black text-lg sm:text-xl italic leading-tight mt-0.5">
                    {workDaysGrandTotal.toLocaleString()}
                    <span className="text-xs text-slate-500 not-italic ml-1">UZS</span>
                  </p>
                  <p className="text-[8px] text-slate-600 font-bold mt-1">{workDaysCount} ta ish kuni</p>
                </div>
              </div>
            </div>
            <p className="text-[7px] sm:text-[8px] text-slate-600 font-bold mt-3 leading-snug border-t border-slate-800/80 pt-2">
              Summa: shu kunda tasdiqlangan to‘lov (obyekt va sana mos bo‘lsa) ko‘rsatiladi; aks holda joriy kunlik
              stavkangiz.
            </p>
          </div>

          {workDaysByObject.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 py-14 text-center px-4">
              <p className="text-slate-500 font-black uppercase text-xs">Hali tasdiqlangan ish kuni yo‘q</p>
              <p className="text-slate-600 text-[8px] font-bold mt-2">Davomatda &quot;Keldi&quot; bo‘lgach, bu yerda chiqadi</p>
            </div>
          ) : (
            workDaysByObject.map((grp) => (
              <div
                key={grp.key}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl"
              >
                <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      <Building2 className="text-blue-400" size={16} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-white font-black text-sm truncate leading-tight">{grp.name}</h2>
                      <p className="text-[7px] text-slate-500 font-bold">{grp.rows.length} kun</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-yellow-500 font-black text-sm italic tabular-nums">{grp.total.toLocaleString()}</p>
                    <p className="text-[7px] text-slate-600 font-bold">UZS</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-900 max-h-[min(60vh,480px)] overflow-y-auto custom-scroll">
                  {grp.rows.map((row) => (
                    <div
                      key={`${grp.key}-${row.date}`}
                      className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/30 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="shrink-0 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center"
                          style={{ width: 34, height: 34 }}
                        >
                          <CalendarDays size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-sm leading-tight">{formatDateUzLong(row.date)}</p>
                          <p className="text-[7px] text-slate-600 font-bold tabular-nums">{row.date}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-emerald-400 font-black text-sm italic tabular-nums">
                          {row.amount.toLocaleString()}
                        </p>
                        <p className="text-[7px] text-slate-600 font-bold">UZS</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {supportChatEnabled && targetId && employeeData && (
        <EmployeeSupportChatWidget
          employeeId={targetId}
          requesterEmployeeId={targetId ? String(targetId) : ''}
          senderName={employeeData.name}
          enabled
        />
      )}
    </>
  );
};

export default EmployeeWorkDaysPage;
