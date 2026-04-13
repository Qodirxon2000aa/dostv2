import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, BadgeDollarSign, Wallet,
  Building2, ChevronRight, Clock, X,
  CalendarDays, CalendarClock, BarChart3, Banknote, Info, AlertTriangle, Gift, Bell,
} from 'lucide-react';
import { api } from '../../utils/api';
import { ensureRealtimeSocket } from '../../utils/realtime';
import { bonusIsActive } from '../../components/payroll/payrollBonusUtils';
import { resolveEmployeeRecord, employeeTargetId } from '../../utils/employeeSelf';
import EmployeeSupportChatWidget from '../../components/EmployeeSupportChatWidget';

const MONTH_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

/** Xabar qachon kelgani — daqiqa/soat (ishchi kabinet banneri) */
const formatMinutesAgoLabel = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 1) return 'Hozirgina kelgan';
  if (totalMins < 60) return `${totalMins} daqiqa oldin kelgan`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h < 24) {
    return m > 0 ? `${h} soat ${m} daqiqa oldin kelgan` : `${h} soat oldin kelgan`;
  }
  const days = Math.floor(h / 24);
  return `${days} kun oldin kelgan`;
};

const EmployeePortal = ({
  user,
  employees,
  attendance,
  payroll,
  objects,
  fines = [],
  bonuses = [],
  onRefresh,
  supportChatEnabled = false,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading]                   = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [myNotifications, setMyNotifications] = useState([]);
  const [incomingToast, setIncomingToast] = useState(null);
  const [cabinetUnreadBanner, setCabinetUnreadBanner] = useState(null);
  const [cabinetTimePulse, setCabinetTimePulse] = useState(0);
  const dismissedCabinetUnreadRef = useRef(new Set());

  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);

  useEffect(() => {
    dismissedCabinetUnreadRef.current = new Set();
    setCabinetUnreadBanner(null);
  }, [targetId]);

  const loadMyNotifications = useCallback(async () => {
    if (!targetId) {
      setMyNotifications([]);
      return;
    }
    try {
      const res = await api.getNotifications({ employeeId: targetId, limit: 200 });
      const raw = res.data ?? [];
      setMyNotifications(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Xabarnomalar yuklanmadi:', e);
    }
  }, [targetId]);

  useEffect(() => {
    loadMyNotifications();
  }, [loadMyNotifications]);

  useEffect(() => {
    if (!targetId) return;
    const t = setInterval(loadMyNotifications, 45000);
    return () => clearInterval(t);
  }, [targetId, loadMyNotifications]);

  useEffect(() => {
    if (!incomingToast) return undefined;
    const t = setTimeout(() => setIncomingToast(null), 7500);
    return () => clearTimeout(t);
  }, [incomingToast]);

  useEffect(() => {
    if (!targetId) return undefined;
    const s = ensureRealtimeSocket();
    if (!s) return undefined;
    s.emit('join-employee', { employeeId: String(targetId) });
    const onNew = (doc) => {
      if (!doc) return;
      setMyNotifications((prev) => {
        const id = doc._id ?? doc.id;
        if (id != null && prev.some((p) => String(p._id || p.id) === String(id))) return prev;
        return [doc, ...prev];
      });
      setIncomingToast({
        message: doc.message,
        createdBy: doc.createdBy,
      });
    };
    s.on('notification:new', onNew);
    return () => {
      s.off('notification:new', onNew);
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetId) {
      setCabinetUnreadBanner(null);
      return;
    }
    const unread = myNotifications.filter((n) => !n.read);
    if (unread.length === 0) {
      setCabinetUnreadBanner(null);
      return;
    }
    const latest = [...unread].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )[0];
    const nid = String(latest._id || latest.id);
    if (dismissedCabinetUnreadRef.current.has(nid)) {
      setCabinetUnreadBanner(null);
      return;
    }
    setCabinetUnreadBanner({
      id: nid,
      message: latest.message,
      createdBy: latest.createdBy,
      createdAt: latest.createdAt,
      raw: latest,
    });
  }, [myNotifications, targetId]);

  useEffect(() => {
    if (!cabinetUnreadBanner) return undefined;
    const t = setInterval(() => setCabinetTimePulse((p) => p + 1), 30000);
    return () => clearInterval(t);
  }, [cabinetUnreadBanner]);

  const cabinetTimeLabel = useMemo(
    () =>
      cabinetUnreadBanner
        ? formatMinutesAgoLabel(cabinetUnreadBanner.createdAt)
        : '',
    [cabinetUnreadBanner, cabinetTimePulse]
  );

  const unreadNotifications = useMemo(
    () => myNotifications.filter((n) => !n.read).length,
    [myNotifications]
  );

  const handleNotifRead = async (n) => {
    const id = n._id || n.id;
    if (!id || n.read) return;
    try {
      await api.markNotificationRead(id);
      setMyNotifications((prev) =>
        prev.map((x) => ((x._id || x.id) === id ? { ...x, read: true, readAt: new Date().toISOString() } : x))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const myAttendance = useMemo(() => {
    if (!targetId) return [];
    return attendance.filter(a => String(a.employeeId?._id || a.employeeId) === String(targetId));
  }, [attendance, targetId]);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(targetId));
  }, [payroll, targetId]);

  const approvedPayroll = useMemo(() => myPayroll.filter(p => p.status === 'APPROVED'), [myPayroll]);

  // ✅ Mening jarimalarim
  const myFines = useMemo(() => {
    if (!targetId) return [];
    return (fines || []).filter(f =>
      String(f.employeeId?._id || f.employeeId) === String(targetId)
    );
  }, [fines, targetId]);

  const myActiveFines = useMemo(() =>
    myFines.filter(f => f.status === 'ACTIVE'),
  [myFines]);

  const totalFines = useMemo(() =>
    myActiveFines.reduce((s, f) => s + (Number(f.amount) || 0), 0),
  [myActiveFines]);

  const myBonuses = useMemo(() => {
    if (!targetId) return [];
    return (bonuses || []).filter(b =>
      String(b.employeeId?._id || b.employeeId) === String(targetId)
    );
  }, [bonuses, targetId]);

  const myActiveBonuses = useMemo(() =>
    myBonuses.filter(b => bonusIsActive(b)),
  [myBonuses]);

  const totalBonuses = useMemo(() =>
    myActiveBonuses.reduce((s, b) => s + (Number(b.amount) || 0), 0),
  [myActiveBonuses]);

  // ✅ balanceInfo — jarima ayiriladi, bonus qo‘shiladi (Payroll bilan bir xil)
  const balanceInfo = useMemo(() => {
    const dailyRate   = Number(employeeData?.salaryRate) || 0;
    const workedDays  = myAttendance.filter(a => a.status === 'PRESENT').length;
    const totalEarned = workedDays * dailyRate;
    const totalTaken  = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
    const remaining   = totalEarned - totalTaken - totalFines + totalBonuses;
    return { dailyRate, workedDays, totalEarned, totalTaken, totalFines, totalBonuses, remaining };
  }, [myAttendance, approvedPayroll, employeeData, totalFines, totalBonuses]);

  const paymentsByObject = useMemo(() => {
    const map = {};
    approvedPayroll.forEach(p => {
      const key  = p.objectId ? String(p.objectId?._id || p.objectId) : '__none__';
      const name = p.objectName || 'Belgilanmagan';
      if (!map[key]) map[key] = { name, payments: [], total: 0, dates: [] };
      map[key].payments.push(p);
      map[key].total += Number(p.calculatedSalary) || 0;
      if (p.date) map[key].dates.push(p.date);
    });
    return Object.entries(map).map(([id, d]) => {
      const sorted = [...d.dates].sort();
      return { id, ...d, firstDate: sorted[0] || null, lastDate: sorted[sorted.length-1] || null };
    }).sort((a, b) => b.total - a.total);
  }, [approvedPayroll]);

  const paymentsByMonth = useMemo(() => {
    const map = {};
    approvedPayroll.forEach(p => {
      const m = p.month || (p.date ? p.date.slice(0,7) : null);
      if (!m) return;
      if (!map[m]) map[m] = 0;
      map[m] += Number(p.calculatedSalary) || 0;
    });
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
  }, [approvedPayroll]);

  const maxMonthVal  = Math.max(...paymentsByMonth.map(([,v])=>v), 1);
  const allDates     = approvedPayroll.map(p=>p.date).filter(Boolean).sort();
  const firstPayDate = allDates[0] || null;
  const lastPayDate  = allDates[allDates.length-1] || null;

  const handleCheckIn = async () => {
    if (!employeeData)     return alert("Xodim ma'lumotlari topilmadi!");
    if (!targetId)         return alert('Foydalanuvchi ID aniqlanmadi!');
    if (!selectedObjectId) return alert('Obyektni tanlang!');
    const today       = new Date().toISOString().split('T')[0];
    const todayRecord = myAttendance.find(a => a.date === today);
    if (todayRecord?.status === 'PENDING') return alert('Bugun allaqachon bildirdingiz! Admin tasdiqlashini kuting.');
    if (todayRecord?.status === 'PRESENT') return alert('Bugun allaqachon tasdiqlangansiz');
    setLoading(true);
    try {
      const objName = objects.find(o => (o._id || o.id) === selectedObjectId)?.name || "Noma'lum";
      await api.upsertAttendance({ employeeId: targetId, objectId: selectedObjectId, objectName: objName, date: today, status: 'PENDING', markedBy: 'employee' });
      alert('Ishga kelganingiz qayd etildi! Admin tasdiqlashini kuting.');
      onRefresh();
    } catch (err) { alert('Xatolik: ' + err.message); }
    finally { setLoading(false); }
  };

  if (!employeeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center gap-3">
        <div className="text-slate-600 font-black uppercase text-sm">Xodim topilmadi</div>
        <div className="text-slate-700 text-xs">{user?.email || user?.name}</div>
      </div>
    );
  }

  const today    = new Date().toISOString().split('T')[0];
  const todayRec = myAttendance.find(a => a.date === today);
  const takenPct = balanceInfo.totalEarned > 0
    ? Math.min(Math.round((balanceInfo.totalTaken / balanceInfo.totalEarned) * 100), 100) : 0;

  const css = `
    .ep-wrap{width:100%;max-width:480px;margin:0 auto;padding:12px 12px max(100px, calc(80px + env(safe-area-inset-bottom, 0px)));box-sizing:border-box;display:flex;flex-direction:column;gap:12px;}
    @media(max-width:360px){.ep-wrap{padding:8px 8px max(90px, calc(72px + env(safe-area-inset-bottom, 0px)));gap:8px;}.ep-amount{font-size:1.35rem!important;}.ep-statval{font-size:0.8rem!important;}.ep-empname{font-size:0.88rem!important;}.ep-padcard{padding:12px!important;}}
    @media(max-width:320px){.ep-wrap{padding-left:max(6px, env(safe-area-inset-left, 0px));padding-right:max(6px, env(safe-area-inset-right, 0px));}}
    @media(min-width:361px) and (max-width:480px){.ep-wrap{padding-left:max(10px, env(safe-area-inset-left, 0px));padding-right:max(10px, env(safe-area-inset-right, 0px));}}
    @media(min-width:481px){.ep-wrap{max-width:500px;padding:20px 16px max(80px, calc(64px + env(safe-area-inset-bottom, 0px)));gap:14px;}}
    .ep-wrap--banner-open{padding-top:max(7.5rem,calc(5.25rem + env(safe-area-inset-top, 0px)));}
    @media(max-width:420px){.ep-wrap--banner-open{padding-top:max(11.75rem,calc(8rem + env(safe-area-inset-top, 0px)));}}
    @media(max-height:520px) and (orientation:landscape){.ep-wrap{padding-bottom:max(1rem, env(safe-area-inset-bottom, 0px));}.ep-list{max-height:min(40vh, 280px);}}
    .ep-list{max-height:400px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
    .ep-list::-webkit-scrollbar{width:3px;} .ep-list::-webkit-scrollbar-thumb{background:#334155;border-radius:10px;}
    .bm-scroll{overflow-y:auto;-webkit-overflow-scrolling:touch;}
    .bm-scroll::-webkit-scrollbar{width:3px;} .bm-scroll::-webkit-scrollbar-thumb{background:#334155;border-radius:10px;}
    .olingan-tap{cursor:pointer;transition:all .15s;} .olingan-tap:active{transform:scale(0.95);opacity:0.8;}
    .fine-row,.bonus-row{transition:all .15s;}
  `;

  return (
    <>
      <style>{css}</style>
      {cabinetUnreadBanner && (
        <div
          className="rt-emp-banner-shell fixed inset-x-0 z-[164] flex justify-center pointer-events-none"
          style={{ top: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
          role="alert"
          aria-live="assertive"
        >
          <div className="pointer-events-auto rt-emp-banner-card rt-emp-banner-enter rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950/98 backdrop-blur-xl">
            <div className="flex gap-0 min-h-0">
              <div className="w-[3px] sm:w-1 shrink-0 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600" aria-hidden />
              <div className="flex-1 min-w-0 py-2.5 sm:py-3 pl-2.5 pr-2 sm:pl-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/30 shadow-[0_0_20px_-4px_rgba(251,191,36,0.35)]">
                      <Bell className="text-amber-300" size={17} strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300/95 leading-tight">
                        O‘qilmagan xabar
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-amber-100/75 font-semibold mt-0.5 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400/90 shrink-0" />
                        <span>{cabinetTimeLabel}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      dismissedCabinetUnreadRef.current.add(cabinetUnreadBanner.id);
                      setCabinetUnreadBanner(null);
                    }}
                    className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    aria-label="Yopish"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-slate-50 text-[13px] sm:text-[14px] leading-snug font-semibold pr-0.5 line-clamp-4 sm:line-clamp-none">
                  {cabinetUnreadBanner.message}
                </p>
                {cabinetUnreadBanner.createdBy && (
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-1.5 sm:mt-2">
                    Kimdan:{' '}
                    <span className="text-amber-200/90 font-semibold">{cabinetUnreadBanner.createdBy}</span>
                  </p>
                )}
                <div className="rt-emp-banner-actions mt-2.5 sm:mt-3">
                  <button
                    type="button"
                    onClick={() => handleNotifRead(cabinetUnreadBanner.raw)}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/30"
                  >
                    <CheckCircle2 size={14} />
                    O‘qilgan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dismissedCabinetUnreadRef.current.add(cabinetUnreadBanner.id);
                      setCabinetUnreadBanner(null);
                      navigate('/kabinet-xabarlar');
                    }}
                    className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/80 text-slate-100 text-[10px] sm:text-[11px] font-black uppercase tracking-wide active:scale-[0.98] transition-all"
                  >
                    Barchasini ko‘rish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {incomingToast && (
        <div
          className="rt-emp-toast-shell rt-emp-toast-shell--bottom fixed inset-x-0 z-[165] flex justify-center pointer-events-none"
          style={{ bottom: 'max(5.25rem, calc(68px + env(safe-area-inset-bottom, 0px)))' }}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto rt-emp-toast-card rt-emp-toast-enter ep-notif-card rounded-2xl overflow-hidden border border-yellow-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950/98 backdrop-blur-xl">
            <div className="flex gap-0 min-h-0">
              <div className="w-[3px] sm:w-1 shrink-0 bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-700" aria-hidden />
              <div className="flex-1 min-w-0 py-2.5 sm:py-3 pl-2.5 pr-2 sm:pl-3">
                <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/12 border border-yellow-500/25 shadow-[0_0_18px_-5px_rgba(234,179,8,0.35)]">
                      <Bell className="text-yellow-300" size={17} strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-yellow-300/95 leading-tight">
                        Yangi xabar
                      </p>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Rahbariyatdan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncomingToast(null)}
                    className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    aria-label="Yopish"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-slate-50 text-[14px] sm:text-[15px] leading-snug font-semibold pr-0.5 line-clamp-5 sm:line-clamp-none">
                  {incomingToast.message}
                </p>
                {incomingToast.createdBy && (
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-slate-600">Kimdan:</span>{' '}
                    <span className="text-yellow-200/90 font-semibold">{incomingToast.createdBy}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`ep-wrap${cabinetUnreadBanner ? ' ep-wrap--banner-open' : ''}`}>

        {/* 1. HEADER */}
        <div className="ep-padcard bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-500 rounded-xl flex items-center justify-center text-lg font-black text-slate-950 shadow-md shadow-yellow-500/20 shrink-0" style={{width:44,height:44,minWidth:44}}>
              {employeeData.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-yellow-500 font-black uppercase text-[8px] tracking-widest truncate">{employeeData.position}</p>
              <h1 className="ep-empname text-base font-black text-white italic uppercase truncate leading-tight">Salom, {employeeData.name.split(' ')[0]}!</h1>
            </div>
            <div className={`shrink-0 px-2 py-1 rounded-lg text-[7px] font-black uppercase border leading-none text-center ${
              todayRec?.status === 'PRESENT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : todayRec?.status === 'PENDING' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
              : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {todayRec?.status === 'PRESENT' ? 'Tasdiqlandi' : todayRec?.status === 'PENDING' ? 'Kutilmoqda' : "Yo'q"}
            </div>
          </div>
          <select value={selectedObjectId} onChange={e => setSelectedObjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-3 py-3 rounded-xl font-bold outline-none transition-all mb-2" style={{fontSize:14}}>
            <option value="">Obyektni tanlang</option>
            {objects.map(obj => <option key={obj._id||obj.id} value={obj._id||obj.id}>{obj.name}</option>)}
          </select>
          {todayRec?.status === 'PRESENT' ? (
            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black rounded-xl flex items-center justify-center gap-2 text-xs">
              Bugun tasdiqlandi{todayRec.objectName ? ` — ${todayRec.objectName}` : ''}
            </div>
          ) : todayRec?.status === 'PENDING' ? (
            <div className="w-full py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black rounded-xl flex items-center justify-center text-xs text-center px-3">
              Admin tasdiqlashini kutmoqda{todayRec.objectName ? ` — ${todayRec.objectName}` : ''}
            </div>
          ) : (
            <button onClick={handleCheckIn} disabled={loading || !selectedObjectId}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 text-white font-black rounded-xl transition-all uppercase tracking-wide shadow-lg" style={{fontSize:14}}>
              {loading ? 'Yuborilmoqda...' : 'Ishga Keldim'}
            </button>
          )}
        </div>

        {/* ✅ JARIMA BANNER — faqat aktiv jarima bo'lsa */}
        {totalFines > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="text-rose-400" size={18}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-rose-400 font-black text-xs uppercase tracking-wide">Aktiv jarimalar</p>
              <p className="text-rose-300 font-black text-lg italic leading-tight">
                −{totalFines.toLocaleString()} <span className="text-xs text-rose-500 not-italic">UZS</span>
              </p>
              <p className="text-rose-500/70 font-bold text-[8px] mt-0.5">{myActiveFines.length} ta jarima balansdan ayirildi</p>
            </div>
          </div>
        )}

        {totalBonuses > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <Gift className="text-emerald-400" size={18}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 font-black text-xs uppercase tracking-wide">Aktiv bonuslar</p>
              <p className="text-emerald-300 font-black text-lg italic leading-tight">
                +{totalBonuses.toLocaleString()} <span className="text-xs text-emerald-500 not-italic">UZS</span>
              </p>
              <p className="text-emerald-500/70 font-bold text-[8px] mt-0.5">{myActiveBonuses.length} ta bonus balansga qo&apos;shildi</p>
            </div>
          </div>
        )}

        {/* 2. BALANS KARTASI */}
        <div className="ep-padcard bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-yellow-500/20 shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 shrink-0" style={{width:36,height:36}}>
                <Wallet className="text-yellow-500" size={16}/>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Mavjud Balans</p>
                <p className={`ep-amount font-black italic leading-none ${balanceInfo.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'}`} style={{fontSize:'1.7rem'}}>
                  {balanceInfo.remaining.toLocaleString()}
                  <span className="text-xs text-slate-500 not-italic ml-1">UZS</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[7px] text-slate-600 font-black uppercase">Kunlik</p>
              <p className="text-white font-black text-sm">{balanceInfo.dailyRate.toLocaleString()}</p>
              <p className="text-[7px] text-slate-600">UZS/kun</p>
            </div>
          </div>

          {/* Ish kunlari, hisoblangan, olingan, jarima + bonus qatori */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-2 text-center">
              <p className="text-[7px] text-slate-500 font-black uppercase mb-1 leading-tight">Ish kunlari</p>
              <p className="font-black text-sm leading-tight text-white">{balanceInfo.workedDays}</p>
              <p className="text-[7px] text-slate-600 font-bold mt-0.5">kun</p>
            </div>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-2 text-center">
              <p className="text-[7px] text-slate-500 font-black uppercase mb-1 leading-tight">Hisoblangan</p>
              <p className="font-black text-sm leading-tight text-emerald-400">{balanceInfo.totalEarned.toLocaleString()}</p>
              <p className="text-[7px] text-slate-600 font-bold mt-0.5">UZS</p>
            </div>

            {/* Olingan — bosiladi */}
            <div className="olingan-tap bg-slate-900/60 rounded-xl border border-rose-500/30 p-2 text-center relative"
              onClick={() => setShowBalanceModal(true)}>
              <div className="absolute top-1.5 right-1.5 opacity-50">
                <Info size={8} className="text-rose-400"/>
              </div>
              <p className="text-[7px] text-rose-400/80 font-black uppercase mb-1 leading-tight">Olingan</p>
              <p className="font-black text-sm leading-tight text-rose-400">{balanceInfo.totalTaken.toLocaleString()}</p>
              <p className="text-[7px] text-rose-500/40 font-bold mt-0.5">UZS • batafsil</p>
            </div>

            {/* ✅ Jarima kartasi */}
            {balanceInfo.totalFines > 0 ? (
              <div className="bg-rose-500/10 rounded-xl border border-rose-500/30 p-2 text-center">
                <p className="text-[7px] text-rose-400 font-black uppercase mb-1 leading-tight">⚠ Jarima</p>
                <p className="font-black text-sm leading-tight text-rose-400">−{balanceInfo.totalFines.toLocaleString()}</p>
                <p className="text-[7px] text-rose-500/50 font-bold mt-0.5">UZS</p>
              </div>
            ) : (
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-2 text-center">
                <p className="text-[7px] text-slate-500 font-black uppercase mb-1 leading-tight">Jarima</p>
                <p className="font-black text-sm leading-tight text-slate-600">0</p>
                <p className="text-[7px] text-slate-700 font-bold mt-0.5">UZS</p>
              </div>
            )}

            {balanceInfo.totalBonuses > 0 ? (
              <div className="col-span-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-2 text-center">
                <p className="text-[7px] text-emerald-400 font-black uppercase mb-1 leading-tight flex items-center justify-center gap-1">
                  <Gift size={9} /> Bonus
                </p>
                <p className="font-black text-sm leading-tight text-emerald-400">+{balanceInfo.totalBonuses.toLocaleString()}</p>
                <p className="text-[7px] text-emerald-500/50 font-bold mt-0.5">UZS • balansga qo&apos;shilgan</p>
              </div>
            ) : (
              <div className="col-span-2 bg-slate-900/60 rounded-xl border border-slate-800 p-2 text-center">
                <p className="text-[7px] text-slate-500 font-black uppercase mb-1 leading-tight">Bonus</p>
                <p className="font-black text-sm leading-tight text-slate-600">0</p>
                <p className="text-[7px] text-slate-700 font-bold mt-0.5">UZS</p>
              </div>
            )}
          </div>

          {balanceInfo.totalEarned > 0 && (
            <>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full transition-all" style={{width:`${takenPct}%`}}/>
              </div>
              <p className="text-[7px] text-slate-600 font-bold mt-1 text-right">{takenPct}% olingan</p>
            </>
          )}
        </div>

        {/* Bo‘limlar — alohida sahifalar */}
        <div className="space-y-2">
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest px-1">Bo‘limlar</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { to: '/kabinet-tolovlar', label: "To'lovlar", sub: `${myPayroll.length} ta yozuv`, Icon: BadgeDollarSign, accent: 'text-yellow-500', badge: 0 },
              { to: '/kabinet-obyektlar', label: 'Obyektlar', sub: 'Tasdiqlangan to‘lovlar', Icon: Building2, accent: 'text-blue-400', badge: 0 },
              { to: '/kabinet-davomat', label: 'Davomat', sub: 'Kelish tarixi', Icon: CheckCircle2, accent: 'text-emerald-400', badge: 0 },
              { to: '/ish-kunlarim', label: 'Ish kunlarim', sub: 'Sana va summa', Icon: CalendarClock, accent: 'text-cyan-400', badge: 0 },
              { to: '/kabinet-xabarlar', label: 'Xabarlar', sub: 'Rahbariyatdan', Icon: Bell, accent: 'text-sky-400', badge: unreadNotifications },
              { to: '/kabinet-jarimalar', label: 'Jarimalar', sub: 'Tarix', Icon: AlertTriangle, accent: 'text-rose-400', badge: myActiveFines.length },
              { to: '/kabinet-bonuslar', label: 'Bonuslar', sub: 'Tarix', Icon: Gift, accent: 'text-emerald-400', badge: myActiveBonuses.length },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900/80 transition-colors active:scale-[0.99] shadow-sm"
              >
                <div className={`rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 ${item.accent}`} style={{ width: 40, height: 40 }}>
                  <item.Icon size={18} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-black text-sm leading-tight">{item.label}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">{item.sub}</p>
                </div>
                {item.badge > 0 ? (
                  <span
                    className={`absolute top-2 right-10 min-w-[1.125rem] h-5 px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center ${
                      item.to === '/kabinet-jarimalar'
                        ? 'bg-rose-500'
                        : item.to === '/kabinet-bonuslar'
                          ? 'bg-emerald-500'
                          : 'bg-sky-500'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
                <ChevronRight className="text-slate-600 shrink-0" size={18} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BALANS TO'LIQ MODAL ══ */}
      {supportChatEnabled && targetId && employeeData && (
        <EmployeeSupportChatWidget
          employeeId={targetId}
          requesterEmployeeId={targetId ? String(targetId) : ''}
          senderName={employeeData.name}
          enabled
        />
      )}

      {showBalanceModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
          style={{background:'rgba(2,6,23,0.92)',backdropFilter:'blur(10px)'}}
          onClick={e => { if(e.target===e.currentTarget) setShowBalanceModal(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md shadow-2xl flex flex-col" style={{maxHeight:'92vh'}}>

            {/* header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="text-yellow-500" size={18}/>
                </div>
                <div>
                  <p className="text-white font-black italic uppercase text-sm leading-tight">To'liq balans</p>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{employeeData.name}</p>
                </div>
              </div>
              <button onClick={() => setShowBalanceModal(false)}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                <X size={15} className="text-slate-400"/>
              </button>
            </div>

            {/* scroll content */}
            <div className="bm-scroll flex-1 p-4 space-y-4" style={{overflowY:'auto'}}>

              {/* 5 ta asosiy karta */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {label:'Ish kunlari',   val:balanceInfo.workedDays,                    unit:'kun', color:'text-white',       border:'border-slate-700'},
                  {label:'Kunlik stavka', val:balanceInfo.dailyRate.toLocaleString(),    unit:'UZS', color:'text-blue-400',    border:'border-blue-500/20'},
                  {label:'Hisoblangan',   val:balanceInfo.totalEarned.toLocaleString(),  unit:'UZS', color:'text-emerald-400', border:'border-emerald-500/20'},
                  {label:'Olingan',       val:balanceInfo.totalTaken.toLocaleString(),   unit:'UZS', color:'text-rose-400',    border:'border-rose-500/20'},
                  {label:'Jarima (aktiv)', val: balanceInfo.totalFines > 0 ? `−${balanceInfo.totalFines.toLocaleString()}` : '0', unit:'UZS', color: balanceInfo.totalFines > 0 ? 'text-rose-400' : 'text-slate-600', border:'border-rose-500/20'},
                  {label:'Bonus (aktiv)', val: balanceInfo.totalBonuses > 0 ? `+${balanceInfo.totalBonuses.toLocaleString()}` : '0', unit:'UZS', color: balanceInfo.totalBonuses > 0 ? 'text-emerald-400' : 'text-slate-600', border:'border-emerald-500/20'},
                ].map(s => (
                  <div key={s.label} className={`bg-slate-950 rounded-2xl border ${s.border} p-3 text-center`}>
                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`font-black text-base leading-tight ${s.color}`}>{s.val}</p>
                    <p className="text-[7px] text-slate-600 font-bold mt-0.5">{s.unit}</p>
                  </div>
                ))}
              </div>

              {/* ✅ Jarima bloki — modal ichida */}
              {balanceInfo.totalFines > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-rose-400" size={14}/>
                      <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest">Aktiv Jarimalar</p>
                    </div>
                    <span className="text-rose-400 font-black text-sm italic">−{balanceInfo.totalFines.toLocaleString()} UZS</span>
                  </div>
                  <div className="space-y-2">
                    {myActiveFines.map(f => (
                      <div key={f._id||f.id} className="flex justify-between items-center bg-rose-500/5 rounded-xl border border-rose-500/10 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-rose-300 font-black text-xs">{f.comment || "Sabab ko'rsatilmagan"}</p>
                          {f.createdAt && <p className="text-rose-500/60 text-[7px] font-bold">{new Date(f.createdAt).toLocaleDateString('uz-UZ')}</p>}
                        </div>
                        <span className="text-rose-400 font-black text-sm shrink-0 ml-3">−{(Number(f.amount)||0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {balanceInfo.totalBonuses > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="text-emerald-400" size={14}/>
                      <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Aktiv bonuslar</p>
                    </div>
                    <span className="text-emerald-400 font-black text-sm italic">+{balanceInfo.totalBonuses.toLocaleString()} UZS</span>
                  </div>
                  <div className="space-y-2">
                    {myActiveBonuses.map(b => (
                      <div key={b._id || b.id} className="flex justify-between items-center bg-emerald-500/5 rounded-xl border border-emerald-500/10 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-emerald-300 font-black text-xs">{b.reason || b.comment || "Sabab ko'rsatilmagan"}</p>
                          {(b.date || b.createdAt) && (
                            <p className="text-emerald-500/60 text-[7px] font-bold">
                              {b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('uz-UZ') : '')}
                            </p>
                          )}
                        </div>
                        <span className="text-emerald-400 font-black text-sm shrink-0 ml-3">+{(Number(b.amount) || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qoldiq */}
              <div className={`rounded-2xl border p-4 ${balanceInfo.remaining < 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Qoldiq balans</p>
                    <p className={`font-black text-2xl italic ${balanceInfo.remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {balanceInfo.remaining.toLocaleString()}
                      <span className="text-sm text-slate-500 not-italic ml-1">UZS</span>
                    </p>
                    {(balanceInfo.totalFines > 0 || balanceInfo.totalBonuses > 0) && (
                      <p className="text-[8px] text-slate-500 font-bold mt-1 leading-relaxed">
                        = {balanceInfo.totalEarned.toLocaleString()} − {balanceInfo.totalTaken.toLocaleString()}
                        {balanceInfo.totalFines > 0 && <> − {balanceInfo.totalFines.toLocaleString()} (jarima)</>}
                        {balanceInfo.totalBonuses > 0 && <> + {balanceInfo.totalBonuses.toLocaleString()} (bonus)</>}
                      </p>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${balanceInfo.remaining < 0 ? 'bg-rose-500/10 border-rose-500/20':'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <Banknote className={balanceInfo.remaining < 0 ? 'text-rose-400':'text-emerald-400'} size={20}/>
                  </div>
                </div>
                {balanceInfo.totalEarned > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${balanceInfo.remaining < 0 ? 'bg-rose-500':'bg-emerald-500'}`} style={{width:`${takenPct}%`}}/>
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-[7px] text-slate-600 font-bold">{takenPct}% olingan</p>
                      <p className="text-[7px] text-slate-600 font-bold">{100-takenPct}% qoldi</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sana oralig'i */}
              {(firstPayDate || lastPayDate) && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="text-purple-400" size={14}/>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">To'lov sana oralig'i</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-2.5 text-center">
                      <p className="text-[7px] text-slate-600 font-black uppercase mb-1">Birinchi</p>
                      <p className="text-white font-black text-xs">{firstPayDate}</p>
                    </div>
                    <span className="text-slate-600 font-black text-lg">→</span>
                    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-2.5 text-center">
                      <p className="text-[7px] text-slate-600 font-black uppercase mb-1">Oxirgi</p>
                      <p className="text-white font-black text-xs">{lastPayDate}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Oylar bo'yicha */}
              {paymentsByMonth.length > 0 && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="text-blue-400" size={14}/>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Oylar bo'yicha</p>
                  </div>
                  <div className="space-y-2.5">
                    {paymentsByMonth.map(([month, total]) => {
                      const [y, mo] = month.split('-');
                      const label   = `${MONTH_UZ[parseInt(mo)-1]} ${y}`;
                      const pct     = Math.round((total/maxMonthVal)*100);
                      return (
                        <div key={month}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white font-black text-xs">{label}</span>
                            <span className="text-yellow-500 font-black text-xs">{total.toLocaleString()} UZS</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Obyektlar bo'yicha */}
              {paymentsByObject.length > 0 && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="text-indigo-400" size={14}/>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Obyektlar bo'yicha</p>
                  </div>
                  <div className="space-y-2.5">
                    {paymentsByObject.map(obj => {
                      const pct = balanceInfo.totalTaken > 0 ? Math.round((obj.total/balanceInfo.totalTaken)*100) : 0;
                      return (
                        <div key={obj.id} className="bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <p className="text-white font-black text-xs">{obj.name}</p>
                              <p className="text-slate-500 font-bold" style={{fontSize:7}}>{obj.payments.length} ta to'lov{obj.firstDate ? ` • ${obj.firstDate}` : ''}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-yellow-500 font-black text-sm italic">{obj.total.toLocaleString()}</p>
                              <p className="text-slate-600 font-bold" style={{fontSize:7}}>{pct}% ulush</p>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{width:`${pct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {approvedPayroll.length === 0 && (
                <div className="py-10 text-center text-slate-700 font-black uppercase text-xs">
                  Hali hech qanday to'lov yo'q
                </div>
              )}
            </div>

            {/* footer */}
            <div className="p-4 border-t border-slate-800 shrink-0">
              <button onClick={() => setShowBalanceModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-black rounded-xl transition-all uppercase tracking-widest text-[10px]">
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeePortal;