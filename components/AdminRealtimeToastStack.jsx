import React, { useEffect, useState } from 'react';
import { Bell, X, Radio } from 'lucide-react';
import { ensureRealtimeSocket } from '../utils/realtime';

const formatWhen = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const AdminRealtimeToastStack = ({ active }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!active) return undefined;
    const s = ensureRealtimeSocket();
    if (!s) return undefined;
    s.emit('join-admin');

    const onSent = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const key = `${String(payload._id || '')}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => {
        const id = payload._id != null ? String(payload._id) : '';
        if (id && prev.some((t) => String(t._id) === id)) return prev;
        return [{ key, ...payload }, ...prev].slice(0, 8);
      });
      const lifeMs = 8000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.key !== key));
      }, lifeMs);
    };

    const onSupport = (doc) => {
      if (!doc || doc.sender !== 'EMPLOYEE') return;
      const key = `sc_${String(doc._id || '')}_${Date.now()}`;
      const payload = {
        key,
        _id: doc._id,
        employeeName: doc.senderName || 'Xodim',
        message: doc.body,
        createdAt: doc.createdAt,
        createdBy: 'Chat',
        kind: 'support-chat',
      };
      setToasts((prev) => {
        const id = doc._id != null ? String(doc._id) : '';
        if (id && prev.some((t) => String(t._id) === id && t.kind === 'support-chat')) return prev;
        return [payload, ...prev].slice(0, 8);
      });
      const lifeMs = 9000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.key !== key));
      }, lifeMs);
    };

    s.on('notification:sent', onSent);
    s.on('support-chat:new', onSupport);
    return () => {
      s.off('notification:sent', onSent);
      s.off('support-chat:new', onSupport);
    };
  }, [active]);

  if (!active || toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[220] flex flex-col gap-2 pointer-events-none px-3 sm:px-4"
      style={{
        top: 'max(5.5rem, calc(env(safe-area-inset-top, 0px) + 4.5rem))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        maxWidth: 'min(22rem, calc(100vw - 1.5rem))',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.key}
          className="pointer-events-auto rt-admin-toast rounded-2xl border border-sky-500/40 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-sky-500/15 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/5 pointer-events-none rt-toast-shimmer" />
          <div className="relative p-3.5 pr-10">
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.key !== t.key))}
              className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
              aria-label="Yopish"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30">
                <Bell className="text-sky-300" size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-sky-400/90 flex items-center gap-1">
                  <Radio size={10} className="text-emerald-400 animate-pulse" />
                  Real-time xabar
                </p>
                <p className="text-white font-black text-sm truncate">
                  {t.kind === 'support-chat' ? `Chat: ${t.employeeName || 'Xodim'}` : t.employeeName || 'Xodim'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-1">
              {formatWhen(t.createdAt)}
            </p>
            <p className="text-slate-200 text-xs font-bold leading-snug line-clamp-4">{t.message}</p>
            {t.createdBy && (
              <p className="text-[9px] text-slate-600 font-bold mt-2">
                Yuboruvchi: <span className="text-yellow-500/90">{t.createdBy}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminRealtimeToastStack;
