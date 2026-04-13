import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { api } from '../utils/api';
import { ensureRealtimeSocket } from '../utils/realtime';
import { resolveEmployeeRecord, employeeTargetId } from '../utils/employeeSelf';
import EmployeeSupportChatWidget from '../components/EmployeeSupportChatWidget';

const EmployeeMessagesPage = ({
  user,
  employees = [],
  supportChatEnabled = false,
}) => {
  const employeeData = useMemo(() => resolveEmployeeRecord(user, employees), [user, employees]);
  const targetId = employeeTargetId(employeeData);
  const [myNotifications, setMyNotifications] = useState([]);

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
    if (!targetId) return undefined;
    const t = setInterval(loadMyNotifications, 45000);
    return () => clearInterval(t);
  }, [targetId, loadMyNotifications]);

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
    };
    s.on('notification:new', onNew);
    return () => {
      s.off('notification:new', onNew);
    };
  }, [targetId]);

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
              <Bell className="text-sky-400 shrink-0" size={26} />
              Xabarlar
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Rahbariyat xabarnomalari</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="text-sky-400 shrink-0" size={16} />
              <h2 className="text-white font-black uppercase text-xs tracking-widest italic truncate">Ro‘yxat</h2>
            </div>
            <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg shrink-0">
              {unreadNotifications > 0 ? `${unreadNotifications} o‘qilmagan` : `${myNotifications.length} ta`}
            </span>
          </div>
          <div className="divide-y divide-slate-900 max-h-[min(70vh,560px)] overflow-y-auto custom-scroll">
            {myNotifications.length === 0 ? (
              <div className="py-14 text-center px-4">
                <Bell className="text-slate-700 mx-auto mb-2" size={28} />
                <p className="text-slate-600 font-black uppercase text-xs">Hozircha xabar yo‘q</p>
              </div>
            ) : (
              myNotifications.map((n) => {
                const nid = n._id || n.id;
                const when = n.createdAt
                  ? new Date(n.createdAt).toLocaleString('uz-UZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })
                  : '—';
                return (
                  <button
                    key={nid}
                    type="button"
                    onClick={() => handleNotifRead(n)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      n.read ? 'hover:bg-slate-900/30' : 'bg-sky-500/5 hover:bg-sky-500/10 border-l-2 border-sky-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span
                        className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          n.read
                            ? 'text-slate-500 bg-slate-800 border-slate-700'
                            : 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                        }`}
                      >
                        {n.read ? 'O‘qilgan' : 'Yangi'}
                      </span>
                      <span className="text-[7px] text-slate-600 font-bold tabular-nums shrink-0">{when}</span>
                    </div>
                    <p className="text-white text-sm font-bold leading-snug break-words">{n.message}</p>
                    {(n.createdBy || n.employeeName) && (
                      <p className="text-[7px] text-slate-600 font-bold mt-1">
                        {n.createdBy ? `Kimdan: ${n.createdBy}` : ''}
                      </p>
                    )}
                  </button>
                );
              })
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

export default EmployeeMessagesPage;
