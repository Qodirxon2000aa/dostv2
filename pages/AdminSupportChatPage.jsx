import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Users } from 'lucide-react';
import { api } from '../utils/api';
import { filterWorkforceEmployees } from '../utils/employeeRoles';
import { ensureRealtimeSocket } from '../utils/realtime';

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const AdminSupportChatPage = ({ employees = [], currentUser, canMutate = true }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  const adminName = currentUser?.name ? String(currentUser.name).trim() : 'Admin';

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.getSupportConversations();
      const raw = res.data ?? [];
      setConversations(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(
    async (employeeId) => {
      if (!employeeId) return;
      setLoadingThread(true);
      try {
        const res = await api.getSupportMessages({ employeeId, limit: 300 });
        const raw = res.data ?? [];
        setMessages(Array.isArray(raw) ? raw : []);
        if (canMutate) {
          await api.markSupportRead({ employeeId, as: 'admin' });
        }
        await loadConversations();
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingThread(false);
      }
    },
    [loadConversations, canMutate]
  );

  useEffect(() => {
    loadConversations();
    const s = ensureRealtimeSocket();
    if (s) s.emit('join-admin');
    const onNew = (doc) => {
      if (!doc) return;
      const eid = String(doc.employeeId);
      setMessages((prev) => {
        if (String(selectedIdRef.current) !== eid) return prev;
        const mid = doc._id ?? doc.id;
        if (mid != null && prev.some((p) => String(p._id || p.id) === String(mid))) return prev;
        return [...prev, doc];
      });
      loadConversations();
    };
    if (s) s.on('support-chat:new', onNew);
    const iv = setInterval(loadConversations, 45000);
    return () => {
      clearInterval(iv);
      if (s) s.off('support-chat:new', onNew);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setMessages([]);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, selectedId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!canMutate) return;
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      await api.sendSupportMessage({
        employeeId: selectedId,
        body: text,
        sender: 'ADMIN',
        senderName: adminName,
      });
      setInput('');
      await loadThread(selectedId);
    } catch (err) {
      alert(err.message || 'Yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.employeeId === selectedId);
  const workforce = filterWorkforceEmployees(employees);
  const employeesWithoutMsg = workforce.filter(
    (e) => e._id && !conversations.some((c) => c.employeeId === String(e._id))
  );

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white italic tracking-tight">Xodimlar bilan chat</h1>
        <p className="text-xs text-slate-500 font-bold mt-1 max-w-xl">
          O‘ng pastdagi kabi suhbat: xodimlar kabinetidagi tugma orqali yozadi, siz bu yerda javob berasiz.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 min-h-0 h-[calc(100dvh-11rem)] max-h-[920px]">
      <div className="lg:w-[min(100%,320px)] shrink-0 flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
          <Users className="text-violet-400" size={18} />
          <h2 className="text-white font-black text-sm uppercase tracking-wide">Suhbatlar</h2>
          {loadingList && <span className="text-[10px] text-slate-500 ml-auto">…</span>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll">
          {conversations.length === 0 && !loadingList && (
            <p className="p-4 text-slate-600 text-xs text-center">Hali xabar yo‘q</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.employeeId}
              type="button"
              onClick={() => setSelectedId(c.employeeId)}
              className={`w-full text-left px-4 py-3 border-b border-slate-900 hover:bg-slate-900/80 transition-colors ${
                selectedId === c.employeeId ? 'bg-violet-950/40 border-l-2 border-l-violet-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-bold text-sm truncate">{c.employeeName}</p>
                {c.unreadForAdmin > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {c.unreadForAdmin > 9 ? '9+' : c.unreadForAdmin}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.lastMessage || '—'}</p>
              <p className="text-[9px] text-slate-600 mt-1">{formatTime(c.lastAt)}</p>
            </button>
          ))}
        </div>
        {employeesWithoutMsg.length > 0 && (
          <div className="border-t border-slate-800 p-2 max-h-36 overflow-y-auto">
            <p className="text-[9px] font-black uppercase text-slate-500 px-2 py-1">Yoki xodim tanlang</p>
            {employeesWithoutMsg.slice(0, 30).map((e) => (
              <button
                key={e._id}
                type="button"
                onClick={() => setSelectedId(String(e._id))}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-900 hover:text-white truncate"
              >
                {e.name || e.email}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8">
            <MessageCircle size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-bold text-center">Chapdan xodimni tanlang yoki yangi suhbat boshlang</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
              <p className="text-white font-black text-sm">{selectedConv?.employeeName || 'Xodim'}</p>
              {selectedConv?.email && (
                <p className="text-[10px] text-slate-500 truncate">
                  <span className="text-slate-600">Login: </span>
                  {selectedConv.email}
                </p>
              )}
            </div>
            <div ref={listRef} className="flex-1 min-h-[200px] overflow-y-auto px-4 py-3 space-y-2 custom-scroll">
              {loadingThread && messages.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-8">Yuklanmoqda…</p>
              )}
              {messages.map((m) => {
                const admin = m.sender === 'ADMIN';
                return (
                  <div key={m._id || m.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                        admin
                          ? 'bg-violet-600 text-white rounded-br-md'
                          : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
                      }`}
                    >
                      {!admin && (
                        <p className="text-[9px] font-black uppercase text-amber-200/80 mb-0.5">{m.senderName || 'Xodim'}</p>
                      )}
                      <p className="break-words">{m.body}</p>
                      <p className={`text-[9px] mt-1 ${admin ? 'text-violet-200/80' : 'text-slate-500'}`}>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-950">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canMutate ? 'Javob yozing…' : 'Faqat ko‘rish — javob faqat super admin'}
                disabled={!canMutate}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
                maxLength={4000}
              />
              <button
                type="submit"
                disabled={!canMutate || sending || !input.trim()}
                className="shrink-0 w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center text-white"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
    </div>
  );
};

export default AdminSupportChatPage;
