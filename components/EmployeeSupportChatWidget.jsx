import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../utils/api';
import { ensureRealtimeSocket } from '../utils/realtime';
import SupportChatMessageBubble from './SupportChatMessageBubble';

const formatBubbleTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Xodim kabineti — mobil Telegram uslubi, faqat matn.
 */
const EmployeeSupportChatWidget = ({ employeeId, requesterEmployeeId, senderName, enabled }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [mutateLoading, setMutateLoading] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  const listRef = useRef(null);
  const openRef = useRef(false);
  openRef.current = open;
  const idStr = employeeId != null ? String(employeeId) : '';
  const requesterId = String(requesterEmployeeId || idStr).trim();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const upd = () => setIsNarrow(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

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
    const onUpd = (doc) => {
      if (!doc || String(doc.employeeId) !== idStr) return;
      const did = doc._id ?? doc.id;
      setMessages((prev) =>
        prev.map((p) => (String(p._id || p.id) === String(did) ? { ...p, ...doc } : p))
      );
    };
    const onDel = (payload) => {
      if (!payload || String(payload.employeeId) !== idStr) return;
      const did = payload._id;
      setMessages((prev) => prev.filter((p) => String(p._id || p.id) !== String(did)));
    };
    s.on('support-chat:new', onNew);
    s.on('support-chat:update', onUpd);
    s.on('support-chat:delete', onDel);
    return () => {
      s.off('support-chat:new', onNew);
      s.off('support-chat:update', onUpd);
      s.off('support-chat:delete', onDel);
    };
  }, [enabled, idStr]);

  useEffect(() => {
    if (!open || !idStr) return;
    loadMessages();
    api.markSupportRead({ employeeId: idStr, as: 'employee' }).catch(() => {});
    setUnread(0);
    setEditingId(null);
    setEditInput('');
  }, [open, idStr, loadMessages]);

  useEffect(() => {
    scrollBottom();
  }, [messages, open]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditInput('');
  };

  const startEdit = (m) => {
    setEditingId(String(m._id || m.id));
    setEditInput(m.body != null ? String(m.body) : '');
  };

  const saveEdit = async (messageId) => {
    if (!idStr || !requesterId) return;
    const text = editInput.trim();
    if (!text) {
      alert('Matn kiriting');
      return;
    }
    const orig = messages.find((x) => String(x._id || x.id) === messageId);
    setMutateLoading(true);
    try {
      const payload = {
        employeeId: idStr,
        requesterEmployeeId: requesterId,
        body: text,
      };
      if (orig?.mediaType === 'image' && orig?.mediaUrl) {
        payload.clearMedia = true;
      }
      await api.updateSupportMessage(messageId, payload);
      cancelEdit();
      await loadMessages();
    } catch (err) {
      alert(err.message || 'Saqlanmadi');
    } finally {
      setMutateLoading(false);
    }
  };

  const removeMessage = async (messageId) => {
    if (!idStr || !requesterId) return;
    if (!window.confirm('Bu xabar o‘chirilsinmi?')) return;
    setMutateLoading(true);
    try {
      await api.deleteSupportMessage(messageId, {
        employeeId: idStr,
        requesterEmployeeId: requesterId,
      });
      cancelEdit();
      await loadMessages();
    } catch (err) {
      alert(err.message || 'O‘chirilmadi');
    } finally {
      setMutateLoading(false);
    }
  };

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

  const messageArea = (
    <div
      ref={listRef}
      className="sc-msg-area flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2 custom-scroll"
    >
      {loading && messages.length === 0 && (
        <p className="sc-msg-loading text-center text-xs py-6">Yuklanmoqda…</p>
      )}
      {!loading && messages.length === 0 && (
        <p className="sc-msg-empty-hint text-center text-sm py-6 px-2">
          Salom! Savolingizni yozing — admin javob beradi.
        </p>
      )}
      {messages.map((m) => {
        const mid = String(m._id || m.id);
        const outgoing = m.sender === 'EMPLOYEE';
        if (editingId === mid) {
          return (
            <div key={mid} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
              <div className="sc-edit-card max-w-[min(88vw,18rem)] rounded-2xl border p-3 space-y-2">
                <p className="sc-edit-label text-[11px] font-bold uppercase tracking-wide">Tahrirlash</p>
                <textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  rows={3}
                  className="sc-edit-textarea w-full min-h-[72px] border rounded-xl px-3 py-2 text-[16px] resize-y"
                  maxLength={4000}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={mutateLoading}
                    className="sc-btn-neutral px-3 py-2 rounded-xl text-xs font-bold min-h-[40px]"
                  >
                    Bekor
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(mid)}
                    disabled={mutateLoading}
                    className="sc-btn-primary px-3 py-2 rounded-xl text-xs font-bold min-h-[40px]"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <SupportChatMessageBubble
            key={mid}
            message={m}
            outgoing={outgoing}
            formatTime={formatBubbleTime}
            actions={
              m.sender === 'EMPLOYEE'
                ? {
                    onEdit: () => startEdit(m),
                    onDelete: () => removeMessage(mid),
                    disabled: mutateLoading,
                  }
                : null
            }
          />
        );
      })}
    </div>
  );

  const composer = (
    <form
      onSubmit={handleSend}
      className="sc-composer-wrap border-t p-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="sc-composer-inner flex gap-2 items-end rounded-[22px] border px-2 py-1.5 pl-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Xabar"
          rows={1}
          className="sc-composer-field flex-1 min-w-0 min-h-[40px] max-h-28 bg-transparent border-0 rounded-xl px-1 py-2 text-[16px] focus:outline-none focus:ring-0 resize-y"
          maxLength={4000}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey) {
              ev.preventDefault();
              handleSend(ev);
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="sc-send-btn shrink-0 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center mb-0.5"
          aria-label="Yuborish"
        >
          <Send size={18} className="-ml-0.5" />
        </button>
      </div>
    </form>
  );

  const header = (
    <div
      className={`sc-widget-header flex items-center justify-between gap-2 px-3 py-2.5 border-b shrink-0 ${
        isNarrow ? 'pt-[max(0.5rem,env(safe-area-inset-top))]' : ''
      }`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <span className="sc-widget-avatar flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0">
          A
        </span>
        <div className="min-w-0">
          <p className="sc-widget-title text-[16px] font-bold truncate">Admin</p>
          <p className="sc-widget-sub text-[13px] font-medium truncate">javob tez orada</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="sc-widget-close shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center"
        aria-label="Yopish"
      >
        <X size={22} strokeWidth={2} />
      </button>
    </div>
  );

  if (open && isNarrow) {
    return (
      <div className="sc-widget-screen fixed inset-0 z-[180] flex flex-col pointer-events-auto">
        {header}
        {messageArea}
        {composer}
      </div>
    );
  }

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
        <div className="sc-widget-popover pointer-events-auto w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[min(70dvh,520px)]">
          {header}
          {messageArea}
          {composer}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sc-fab pointer-events-auto flex items-center gap-2 pl-4 pr-3 py-3 min-h-[48px] rounded-full font-bold text-sm shadow-lg border active:scale-[0.98] transition-transform"
      >
        <MessageCircle size={22} strokeWidth={2.2} />
        <span>Chat</span>
        {unread > 0 && !open && (
          <span className="sc-fab-badge min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <ChevronDown size={16} className={`opacity-90 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};

export default EmployeeSupportChatWidget;
