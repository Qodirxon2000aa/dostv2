import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { api } from '../utils/api';
import { ensureRealtimeSocket } from '../utils/realtime';

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Xodim kabinetida pastda suzuvchi chat — xabarlar admin paneliga boradi.
 */
const EmployeeSupportChatWidget = ({ employeeId, senderName, enabled }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);
  const openRef = useRef(false);
  openRef.current = open;
  const idStr = employeeId != null ? String(employeeId) : '';

  const scrollBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const loadMessages = useCallback(async () => {
    if (!idStr) return;
    setLoading(true);
    try {
      const res = await api.getSupportMessages({ employeeId: idStr, limit: 200 });
      const raw = res.data ?? [];
      setMessages(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error('Chat yuklanmadi:', e);
    } finally {
      setLoading(false);
    }
  }, [idStr]);

  const refreshUnread = useCallback(async () => {
    if (!idStr) return;
    try {
      const res = await api.getSupportUnreadEmployee({ employeeId: idStr });
      const c = res.data?.count ?? 0;
      setUnread(typeof c === 'number' ? c : 0);
    } catch {
      setUnread(0);
    }
  }, [idStr]);

  useEffect(() => {
    if (!enabled || !idStr) return undefined;
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [enabled, idStr, refreshUnread]);

  useEffect(() => {
    if (!enabled || !idStr) return undefined;
    const s = ensureRealtimeSocket();
    if (!s) return undefined;
    s.emit('join-employee', { employeeId: idStr });
    const onNew = (doc) => {
      if (!doc || String(doc.employeeId) !== idStr) return;
      setMessages((prev) => {
        const mid = doc._id ?? doc.id;
        if (mid != null && prev.some((p) => String(p._id || p.id) === String(mid))) return prev;
        return [...prev, doc];
      });
      if (doc.sender === 'ADMIN') {
        if (openRef.current) {
          api.markSupportRead({ employeeId: idStr, as: 'employee' }).catch(() => {});
        } else {
          setUnread((u) => u + 1);
        }
      }
    };
    s.on('support-chat:new', onNew);
    return () => {
      s.off('support-chat:new', onNew);
    };
  }, [enabled, idStr]);

  useEffect(() => {
    if (!open || !idStr) return;
    loadMessages();
    api.markSupportRead({ employeeId: idStr, as: 'employee' }).catch(() => {});
    setUnread(0);
  }, [open, idStr, loadMessages]);

  useEffect(() => {
    scrollBottom();
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !idStr || sending) return;
    setSending(true);
    try {
      await api.sendSupportMessage({
        employeeId: idStr,
        body: text,
        sender: 'EMPLOYEE',
        senderName: senderName || 'Xodim',
      });
      setInput('');
      await loadMessages();
    } catch (err) {
      alert(err.message || 'Yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  if (!enabled || !idStr) return null;

  return (
    <div
      className="fixed z-[170] flex flex-col items-end gap-2 pointer-events-none"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))',
        maxWidth: 'min(100vw - 1.5rem, 22rem)',
      }}
    >
      {open && (
        <div className="pointer-events-auto w-full rounded-2xl border border-violet-500/35 bg-slate-950/98 backdrop-blur-xl shadow-2xl shadow-violet-900/20 overflow-hidden flex flex-col max-h-[min(70vh,520px)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-800 bg-gradient-to-r from-violet-950/80 to-slate-950">
            <div className="min-w-0 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
                <MessageCircle className="text-violet-300" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-300/90">Admin bilan chat</p>
                <p className="text-[9px] text-slate-500 font-bold truncate">Javob tez orada keladi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400"
              aria-label="Yopish"
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 min-h-[180px] max-h-[min(50vh,360px)] overflow-y-auto px-3 py-2 space-y-2 custom-scroll"
          >
            {loading && messages.length === 0 && (
              <p className="text-center text-slate-500 text-xs py-6">Yuklanmoqda…</p>
            )}
            {!loading && messages.length === 0 && (
              <p className="text-center text-slate-600 text-xs py-6 px-2">
                Salom! Savolingizni yozing — admin ko‘radi va javob beradi.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender === 'EMPLOYEE';
              return (
                <div key={m._id || m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      mine
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
                    }`}
                  >
                    {!mine && (
                      <p className="text-[9px] font-black uppercase text-violet-300/80 mb-0.5">{m.senderName || 'Admin'}</p>
                    )}
                    <p className="break-words font-medium">{m.body}</p>
                    <p className={`text-[9px] mt-1 tabular-nums ${mine ? 'text-violet-200/80' : 'text-slate-500'}`}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} className="p-2 border-t border-slate-800 flex gap-2 bg-slate-950/95">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Xabar yozing…"
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center text-white"
              aria-label="Yuborish"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto flex items-center gap-2 pl-4 pr-3 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-violet-900/40 border border-white/10 active:scale-[0.98] transition-transform"
      >
        <MessageCircle size={22} strokeWidth={2.5} />
        <span>Chat</span>
        {unread > 0 && !open && (
          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <ChevronDown size={16} className={`opacity-80 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};

export default EmployeeSupportChatWidget;
