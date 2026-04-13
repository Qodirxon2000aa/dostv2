import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Bell, Send, Users, ChevronDown, Sparkles, Clock, History, Radio, Megaphone } from 'lucide-react';
import { api } from '../utils/api';
import { filterWorkforceEmployees } from '../utils/employeeRoles';
import { ensureRealtimeSocket } from '../utils/realtime';

/** Barcha faol ishchi xodimlarga bir xil matn */
const RECIPIENT_ALL_ACTIVE = '__ALL_ACTIVE__';

const QUICK_MESSAGES = [
  { label: 'Yaxshi ish!', text: 'Yaxshi ish! Davom eting.' },
  { label: 'Rahmat', text: 'Rahmat, zo‘r ishlayapsiz.' },
  { label: 'Strike', text: 'Strike! Bugungi ish juda salbiy!.' },
  { label: 'Tabrik', text: 'Tabriklaymiz — yuqori natija ko‘rsatdingiz.' },
  { label: 'Diqqat', text: 'Diqqat: iltimos, ish vaqtida va xavfsizlik qoidalariga rioya qiling.' },
  { label: 'Kelish', text: 'Ertaga ishga vaqtida keling, muhim uchrashuv bor.' },
];

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

const NotificationsSendPage = ({ employees = [], currentUser, onLog, onRefresh, canMutate = true }) => {
  const [empId, setEmpId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentFeed, setRecentFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [socketOk, setSocketOk] = useState(false);

  const activeEmps = useMemo(() => {
    return filterWorkforceEmployees(employees || []).filter((e) => e.status === 'ACTIVE');
  }, [employees]);

  const selectedName = useMemo(() => {
    if (empId === RECIPIENT_ALL_ACTIVE) {
      return activeEmps.length ? `Barcha faol xodimlar (${activeEmps.length} ta)` : 'Barcha faol xodimlar';
    }
    const e = activeEmps.find((x) => String(x._id || x.id) === String(empId));
    return e?.name || '';
  }, [activeEmps, empId]);

  const pushFeed = useCallback((item) => {
    if (!item || typeof item !== 'object') return;
    setRecentFeed((prev) => {
      const id = item._id != null ? String(item._id) : '';
      if (id && prev.some((p) => String(p._id) === id)) return prev;
      return [item, ...prev].slice(0, 50);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeedLoading(true);
      try {
        const res = await api.getNotifications({ all: 1, limit: 300 });
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : [];
        if (!cancelled) setRecentFeed(list);
      } catch (e) {
        console.error('Xabarlar tarixi yuklanmadi:', e);
        if (!cancelled) setRecentFeed([]);
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const s = ensureRealtimeSocket();
    if (!s) return undefined;
    s.emit('join-admin');
    const onSent = (payload) => pushFeed(payload);
    const onConnect = () => setSocketOk(true);
    const onDisconnect = () => setSocketOk(false);
    s.on('notification:sent', onSent);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setSocketOk(s.connected);
    return () => {
      s.off('notification:sent', onSent);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [pushFeed]);

  const applyTemplate = (text) => {
    setMessage(text);
  };

  const handleSend = async () => {
    if (!canMutate) return;
    if (!empId) return alert('Qabul qiluvchini tanlang');
    const text = String(message || '').trim();
    if (!text) return alert('Xabar matnini kiriting yoki shablon tanlang');
    setSubmitting(true);
    try {
      const performer = currentUser?.name ? String(currentUser.name).trim() : 'Admin';
      if (empId === RECIPIENT_ALL_ACTIVE) {
        if (!activeEmps.length) {
          alert('Faol ishchi xodimlar ro‘yxati bo‘sh');
          return;
        }
        const res = await api.createNotificationBroadcast({
          message: text,
          createdBy: performer,
        });
        const payload = res?.data;
        const n = payload && typeof payload.count === 'number' ? payload.count : 0;
        onLog?.(
          `Xabarnoma ${n} ta xodimga yuborildi (bir xil matn) — ${text.slice(0, 100)}${text.length > 100 ? '…' : ''}`
        );
        setMessage('');
        try {
          const feedRes = await api.getNotifications({ all: 1, limit: 300 });
          const list = Array.isArray(feedRes?.data) ? feedRes.data : [];
          setRecentFeed(list);
        } catch (feedErr) {
          console.error('Tarix yangilanmadi:', feedErr);
        }
        await onRefresh?.();
        return;
      }

      const res = await api.createNotification({
        employeeId: empId,
        message: text,
        createdBy: performer,
      });
      const doc = res?.data;
      if (doc) {
        pushFeed({
          ...doc,
          employeeName: doc.employeeName || selectedName,
        });
      }
      onLog?.(`Xabarnoma yuborildi: ${selectedName || empId} — ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
      setMessage('');
      await onRefresh?.();
    } catch (e) {
      alert('Xatolik: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center">
              <Bell className="text-sky-400" size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight leading-tight">
                Xabarnoma <span className="text-sky-400">yuborish</span>
              </h1>
              <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                Real-time · bitta yoki hammaga · shablon yoki o‘z matningiz
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest w-fit ${
              socketOk
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-500'
            }`}
          >
            <Radio size={12} className={socketOk ? 'animate-pulse' : ''} />
            {socketOk ? 'Real-time ulangan' : 'Ulanmoqda...'}
          </div>
        </div>
      </div>

      {canMutate && (
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
        <div>
          <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
            Qabul qiluvchi
          </label>
          <div className="relative">
            {empId === RECIPIENT_ALL_ACTIVE ? (
              <Megaphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
            ) : (
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            )}
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-white pl-9 pr-4 py-3 rounded-xl font-bold text-sm outline-none transition-all appearance-none"
            >
              <option value="">— Tanlang —</option>
              <option value={RECIPIENT_ALL_ACTIVE}>
                Hammaga (barcha faol xodimlarga bir xil xabar)
              </option>
              {activeEmps.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.name} ({e.position || '—'})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        </div>

        <div>
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
            <Sparkles size={10} className="text-sky-500" /> Tez shablonlar
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => applyTemplate(q.text)}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500/40 hover:text-sky-300 transition-all active:scale-[0.98]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
            Xabar matni
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Masalan: Bugungi smenada juda yaxshi ishladingiz, rahmat!"
            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all placeholder-slate-700 resize-y min-h-[100px]"
          />
          <p className="text-[9px] text-slate-600 font-bold mt-1 text-right">{message.length}/2000</p>
        </div>

        {empId && message.trim() && (
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3">
            <p className="text-[9px] text-slate-500 font-black uppercase">Qabul qiluvchi</p>
            <p className="text-white font-black text-sm mt-0.5 leading-snug">{selectedName}</p>
            <p className="text-slate-400 text-xs font-bold mt-2 leading-snug">&quot;{message.trim()}&quot;</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={submitting || !empId || !message.trim()}
          className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10"
        >
          {submitting ? (
            'Yuborilmoqda...'
          ) : empId === RECIPIENT_ALL_ACTIVE ? (
            <>
              <Megaphone size={14} /> Hammaga yuborish
            </>
          ) : (
            <>
              <Send size={14} /> Yuborish (real-time)
            </>
          )}
        </button>
      </div>
      )}

      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg shadow-black/20">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <History className="text-sky-500 shrink-0" size={16} />
            <div className="min-w-0">
              <p className="text-white font-black uppercase text-[11px] sm:text-xs tracking-widest italic truncate">
                Yuborilgan xabarlar
              </p>
              <p className="text-[8px] sm:text-[9px] text-slate-600 font-bold leading-tight">
                Bazadan (oxirgi 300) · jadval
              </p>
            </div>
          </div>
          <span className="text-[8px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg shrink-0 tabular-nums">
            {feedLoading ? '…' : `${recentFeed.length} ta`}
          </span>
        </div>
        <div className="max-h-[min(55vh,28rem)] sm:max-h-[min(50vh,24rem)] overflow-auto custom-scroll">
          {feedLoading ? (
            <div className="py-14 text-center text-slate-500 font-black uppercase text-[11px] px-4">
              Yuklanmoqda…
            </div>
          ) : recentFeed.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-bold text-xs px-4 leading-relaxed">
              Hozircha yozuv yo‘q. Xabar yuboring — bu yerda vaqt, xodim va matn jadval ko‘rinishida saqlanadi.
            </div>
          ) : (
            <>
              {/* Telefon: kartalar */}
              <div className="md:hidden divide-y divide-slate-800/90">
                {recentFeed.map((row, idx) => (
                  <article
                    key={String(row._id || row.id || idx)}
                    className="px-3 py-3 space-y-2 bg-slate-950/80 even:bg-slate-900/25"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sky-400/95 font-black text-[11px] tabular-nums flex items-center gap-1 min-w-0">
                        <Clock size={12} className="text-slate-600 shrink-0" />
                        <span className="truncate">{formatWhen(row.createdAt)}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                      <p>
                        <span className="text-slate-600 font-black uppercase text-[8px] tracking-wider">Kimga</span>
                        <span className="block text-white font-bold leading-snug mt-0.5">{row.employeeName || '—'}</span>
                      </p>
                      <p>
                        <span className="text-slate-600 font-black uppercase text-[8px] tracking-wider">Yuboruvchi</span>
                        <span className="block text-amber-400/95 font-black uppercase mt-0.5">{row.createdBy || '—'}</span>
                      </p>
                      <p>
                        <span className="text-slate-600 font-black uppercase text-[8px] tracking-wider">Xabar</span>
                        <span className="block text-slate-200 font-semibold leading-snug mt-0.5 whitespace-pre-wrap break-words">
                          {row.message}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              {/* Planshet+ : jadval */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-0">
                  <thead className="sticky top-0 z-10 bg-slate-900/98 backdrop-blur-sm border-b border-slate-800">
                    <tr>
                      <th className="text-left text-[9px] font-black uppercase text-slate-500 px-3 py-2.5 w-[1%] whitespace-nowrap">
                        Vaqt
                      </th>
                      <th className="text-left text-[9px] font-black uppercase text-slate-500 px-3 py-2.5 w-[18%]">
                        Kimga
                      </th>
                      <th className="text-left text-[9px] font-black uppercase text-slate-500 px-3 py-2.5 w-[14%]">
                        Yuboruvchi
                      </th>
                      <th className="text-left text-[9px] font-black uppercase text-slate-500 px-3 py-2.5">
                        Xabar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFeed.map((row, idx) => (
                      <tr
                        key={String(row._id || row.id || idx)}
                        className="border-b border-slate-800/80 hover:bg-slate-900/40 even:bg-slate-900/15"
                      >
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">
                          <span className="text-sky-400/90 font-black text-xs tabular-nums flex items-center gap-1">
                            <Clock size={11} className="text-slate-600 shrink-0" />
                            {formatWhen(row.createdAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top text-white font-bold text-xs">{row.employeeName || '—'}</td>
                        <td className="px-3 py-2.5 align-top text-amber-400/95 font-black text-[10px] uppercase">
                          {row.createdBy || '—'}
                        </td>
                        <td className="px-3 py-2.5 align-top text-slate-300 text-xs font-semibold leading-snug max-w-[min(28vw,20rem)] break-words">
                          {row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 font-bold px-1">
        Xabar xodimning kabinetida darhol ko‘rinadi (Socket.io + toast).
      </p>
    </div>
  );
};

export default NotificationsSendPage;
