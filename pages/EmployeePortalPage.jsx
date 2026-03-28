import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, BadgeDollarSign, Wallet,
  Building2, ChevronDown, Clock, X, TrendingUp,
  CalendarDays, BarChart3, Banknote, Info, AlertTriangle, Gift,
} from 'lucide-react';
import { api } from '../utils/api';
import { bonusIsActive } from '../components/payroll/payrollBonusUtils';

const MONTH_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

const EmployeePortal = ({ user, employees, attendance, payroll, objects, fines = [], bonuses = [], onRefresh }) => {
  const [loading, setLoading]                   = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [activeTab, setActiveTab]               = useState('history');
  const [expandedObj, setExpandedObj]           = useState(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  const employeeData = useMemo(() => {
    if (!user || !employees.length) return null;
    return employees.find(e =>
      e._id === user._id || e._id === user.uid ||
      e.uid === user._id || e.uid === user.uid ||
      e.email === user.email
    ) || null;
  }, [employees, user]);

  const targetId = employeeData?._id || employeeData?.uid || null;

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

  const cancelledBonusesCount = useMemo(() =>
    myBonuses.filter(b => !bonusIsActive(b)).length,
  [myBonuses]);

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
    .ep-wrap{width:100%;max-width:480px;margin:0 auto;padding:12px 12px 100px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;}
    @media(max-width:360px){.ep-wrap{padding:8px 8px 90px;gap:8px;}.ep-amount{font-size:1.4rem!important;}.ep-statval{font-size:0.8rem!important;}.ep-empname{font-size:0.9rem!important;}.ep-padcard{padding:12px!important;}}
    @media(min-width:481px){.ep-wrap{max-width:500px;padding:20px 16px 80px;gap:14px;}}
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
      <div className="ep-wrap">

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

        {/* 3. TABS */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
          {[
            { key:'history', label:"To'lovlar",  icon:<BadgeDollarSign size={13}/> },
            { key:'objects', label:'Obyektlar',  icon:<Building2 size={13}/> },
            { key:'days',    label:'Davomat',    icon:<CheckCircle2 size={13}/> },
            { key:'fines',   label:'Jarimalar',  icon:<AlertTriangle size={13}/>, badge: myActiveFines.length, accent: 'fines' },
            { key:'bonuses', label:'Bonuslar',   icon:<Gift size={13}/>, badge: myActiveBonuses.length, accent: 'bonuses' },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex-1 min-w-[3.25rem] flex items-center justify-center gap-0.5 py-2 px-0.5 rounded-lg font-black uppercase transition-all active:scale-95 relative ${
                activeTab === tab.key
                  ? tab.accent === 'fines' ? 'bg-rose-600 text-white'
                    : tab.accent === 'bonuses' ? 'bg-emerald-600 text-white'
                    : 'bg-yellow-500 text-slate-950'
                  : tab.accent === 'fines' && myActiveFines.length > 0 ? 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
                  : tab.accent === 'bonuses' && myActiveBonuses.length > 0 ? 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`} style={{fontSize:8}}>
              {tab.icon}<span className="truncate max-w-[4.2rem] sm:max-w-none">{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-0.5 rounded-full text-[7px] font-black flex items-center justify-center ${
                  activeTab === tab.key
                    ? 'bg-white/30 text-white'
                    : tab.accent === 'bonuses' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 4A. TO'LOVLAR */}
        {activeTab === 'history' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-xs tracking-widest italic">To'lovlar Tarixi</h3>
              <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myPayroll.length} ta</span>
            </div>
            <div className="ep-list divide-y divide-slate-900">
              {[...myPayroll].reverse().map(p => (
                <div key={p._id||p.id} className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 rounded-xl flex items-center justify-center ${p.status==='PENDING'?'bg-yellow-500/10 text-yellow-500':'bg-emerald-500/10 text-emerald-500'}`} style={{width:34,height:34}}>
                      <BadgeDollarSign size={14}/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm leading-tight truncate">{p.date||p.month}</p>
                      {p.objectName && <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.objectName}</span>}
                      <p className={`text-[7px] font-black uppercase mt-0.5 ${p.status==='PENDING'?'text-yellow-500':'text-emerald-500'}`}>
                        {p.status==='PENDING'?'Kutilmoqda':'Tasdiqlandi'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-black text-white italic">{(Number(p.calculatedSalary)||0).toLocaleString()}</p>
                    <p className="text-[7px] text-slate-600">UZS</p>
                  </div>
                </div>
              ))}
              {myPayroll.length === 0 && <div className="py-14 text-center text-slate-700 font-black uppercase text-xs">To'lovlar tarixi yo'q</div>}
            </div>
          </div>
        )}

        {/* 4B. OBYEKTLAR */}
        {activeTab === 'objects' && (
          <div className="space-y-3">
            {paymentsByObject.length > 0 && (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="text-purple-400 shrink-0" size={14}/>
                  <h3 className="text-white font-black uppercase text-xs italic">Taqsimot xulosa</h3>
                </div>
                <div className="space-y-2.5">
                  {paymentsByObject.map(obj => {
                    const pct = balanceInfo.totalTaken > 0 ? Math.round((obj.total/balanceInfo.totalTaken)*100) : 0;
                    return (
                      <div key={obj.id} className="flex items-center gap-2">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0" style={{width:26,height:26}}>
                          <Building2 className="text-blue-400" size={11}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5 gap-1">
                            <span className="text-white font-black text-xs truncate">{obj.name}</span>
                            <span className="text-yellow-500 font-black text-xs shrink-0">{obj.total.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}}/>
                          </div>
                          <p className="text-[7px] text-slate-600 font-bold mt-0.5">{pct}% • {obj.payments.length} ta to'lov</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {paymentsByObject.map(obj => (
              <div key={obj.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedObj(expandedObj===obj.id?null:obj.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-900/30 transition-colors">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0" style={{width:36,height:36}}>
                    <Building2 className="text-blue-400" size={15}/>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-black text-sm truncate">{obj.name}</p>
                    <p className="text-slate-500 font-bold" style={{fontSize:8}}>{obj.payments.length} ta to'lov</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-yellow-500 font-black text-sm italic">{obj.total.toLocaleString()}</p>
                      <p className="text-slate-600 font-bold" style={{fontSize:7}}>UZS jami</p>
                    </div>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandedObj===obj.id?'rotate-180':''}`}/>
                  </div>
                </button>
                {expandedObj === obj.id && (
                  <div className="border-t border-slate-800">
                    <div className="px-4 py-2 bg-slate-900/40">
                      <p className="text-slate-500 font-black uppercase tracking-widest" style={{fontSize:7}}>Qachon • Qancha</p>
                    </div>
                    <div className="ep-list divide-y divide-slate-900" style={{maxHeight:280}}>
                      {[...obj.payments].sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt)).map(p => (
                        <div key={p._id||p.id} className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0" style={{width:30,height:30}}>
                              <BadgeDollarSign className="text-emerald-500" size={13}/>
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-black text-xs">{p.date||p.month}</p>
                              <p className="text-slate-500 font-bold" style={{fontSize:7}}>{p.type==='QUICK_ADD'?'Avans':'Oylik'}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-emerald-400 font-black text-sm italic">{(Number(p.calculatedSalary)||0).toLocaleString()}</p>
                            <p className="text-slate-600 font-bold" style={{fontSize:7}}>UZS</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center">
                      <p className="text-slate-500 font-black uppercase" style={{fontSize:8}}>Jami:</p>
                      <p className="text-yellow-500 font-black text-sm italic">{obj.total.toLocaleString()} <span className="text-slate-500 not-italic" style={{fontSize:8}}>UZS</span></p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {paymentsByObject.length === 0 && (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 py-14 text-center">
                <p className="text-slate-700 font-black uppercase text-xs">Hali hech qaysi obyektdan to'lov yo'q</p>
              </div>
            )}
          </div>
        )}

        {/* 4C. DAVOMAT */}
        {activeTab === 'days' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Davomat Tarixi</h3>
              <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                {myAttendance.filter(a=>a.status==='PRESENT').length} kun
              </span>
            </div>
            <div className="ep-list divide-y divide-slate-900">
              {[...myAttendance].reverse().map(a => (
                <div key={a._id||a.id} className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 rounded-xl flex items-center justify-center ${
                      a.status==='PRESENT'?'bg-emerald-500/10 text-emerald-500':a.status==='PENDING'?'bg-yellow-500/10 text-yellow-500':'bg-slate-800 text-slate-500'
                    }`} style={{width:34,height:34}}>
                      {a.status==='PRESENT'?<CheckCircle2 size={14}/>:a.status==='PENDING'?<Clock size={14}/>:<X size={14}/>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm">{a.date}</p>
                      {a.objectName && <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">{a.objectName}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 font-black uppercase px-2 py-1 rounded-lg border ${
                    a.status==='PRESENT'?'text-emerald-500 bg-emerald-500/10 border-emerald-500/20':a.status==='PENDING'?'text-yellow-500 bg-yellow-500/10 border-yellow-500/20':'text-slate-500 bg-slate-800 border-slate-700'
                  }`} style={{fontSize:7}}>
                    {a.status==='PRESENT'?'Keldi':a.status==='PENDING'?'Kutilmoqda':'Kelmadi'}
                  </span>
                </div>
              ))}
              {myAttendance.length === 0 && <div className="py-14 text-center text-slate-700 font-black uppercase text-xs">Davomat tarixi yo'q</div>}
            </div>
          </div>
        )}

        {/* ✅ 4D. JARIMALAR TAB */}
        {activeTab === 'fines' && (
          <div className="space-y-3">
            {/* Xulosa */}
            <div className={`rounded-2xl border p-4 ${totalFines > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-500">Aktiv jarimalar jami</p>
                  <p className={`font-black text-2xl italic ${totalFines > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {totalFines > 0 ? `−${totalFines.toLocaleString()}` : '0'}
                    <span className="text-sm not-italic ml-1 text-slate-500">UZS</span>
                  </p>
                  <p className="text-[8px] font-bold mt-1 text-slate-500">
                    {myActiveFines.length} ta aktiv • {myFines.filter(f=>f.status==='CANCELLED').length} ta bekor qilingan
                  </p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${totalFines > 0 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <AlertTriangle className={totalFines > 0 ? 'text-rose-400' : 'text-emerald-400'} size={24}/>
                </div>
              </div>
            </div>

            {/* Jarimalar ro'yxati */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Jarimalar Tarixi</h3>
                <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myFines.length} ta</span>
              </div>
              <div className="ep-list divide-y divide-slate-900">
                {[...myFines].reverse().map(f => (
                  <div key={f._id||f.id} className="fine-row flex items-center justify-between px-4 py-3.5 hover:bg-slate-900/30">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`shrink-0 rounded-xl flex items-center justify-center border ${
                        f.status === 'ACTIVE'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`} style={{width:34,height:34}}>
                        <AlertTriangle size={14}/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            f.status === 'ACTIVE'
                              ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                              : 'text-slate-500 bg-slate-800 border-slate-700 line-through'
                          }`}>
                            {f.status === 'ACTIVE' ? '● Aktiv' : '✕ Bekor'}
                          </span>
                          {f.createdAt && (
                            <span className="text-[7px] text-slate-600 font-bold">
                              {new Date(f.createdAt).toLocaleDateString('uz-UZ')}
                            </span>
                          )}
                        </div>
                        {f.comment && (
                          <p className="text-slate-400 text-[9px] font-bold truncate">{f.comment}</p>
                        )}
                        <p className="text-slate-600 text-[7px] font-bold">Admin: {f.appliedBy || 'admin'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`font-black text-sm italic ${f.status === 'ACTIVE' ? 'text-rose-400' : 'text-slate-600 line-through'}`}>
                        −{(Number(f.amount)||0).toLocaleString()}
                      </p>
                      <p className="text-[7px] text-slate-600">UZS</p>
                    </div>
                  </div>
                ))}
                {myFines.length === 0 && (
                  <div className="py-14 text-center">
                    <p className="text-slate-700 font-black uppercase text-xs">Jarimalar yo'q ✓</p>
                    <p className="text-slate-800 text-[8px] font-bold mt-1">Yaxshi ishlayapsiz!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4E. BONUSLAR TAB */}
        {activeTab === 'bonuses' && (
          <div className="space-y-3">
            <div className={`rounded-2xl border p-4 ${totalBonuses > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/40 border-slate-800'}`}>
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${totalBonuses > 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
                  <Gift className={totalBonuses > 0 ? 'text-emerald-400' : 'text-slate-600'} size={24}/>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Bonuslar tarixi</h3>
                <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{myBonuses.length} ta</span>
              </div>
              <div className="ep-list divide-y divide-slate-900">
                {[...myBonuses].reverse().map(b => {
                  const active = bonusIsActive(b);
                  const reason = b.reason || b.comment || '';
                  const bDate = b.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('uz-UZ') : null);
                  return (
                    <div key={b._id || b.id} className="bonus-row flex items-center justify-between px-4 py-3.5 hover:bg-slate-900/30">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`shrink-0 rounded-xl flex items-center justify-center border ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`} style={{ width: 34, height: 34 }}>
                          <Gift size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              active
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-slate-500 bg-slate-800 border-slate-700 line-through'
                            }`}>
                              {active ? '● Aktiv' : '✕ Bekor'}
                            </span>
                            {bDate && (
                              <span className="text-[7px] text-slate-600 font-bold">{bDate}</span>
                            )}
                          </div>
                          {reason && (
                            <p className="text-slate-400 text-[9px] font-bold truncate">{reason}</p>
                          )}
                          <p className="text-slate-600 text-[7px] font-bold">
                            {b.createdBy || b.appliedBy || 'admin'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-black text-sm italic ${active ? 'text-emerald-400' : 'text-slate-600 line-through'}`}>
                          +{(Number(b.amount) || 0).toLocaleString()}
                        </p>
                        <p className="text-[7px] text-slate-600">UZS</p>
                      </div>
                    </div>
                  );
                })}
                {myBonuses.length === 0 && (
                  <div className="py-14 text-center">
                    <p className="text-slate-700 font-black uppercase text-xs">Bonuslar hozircha yo&apos;q</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ BALANS TO'LIQ MODAL ══ */}
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