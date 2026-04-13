import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Search, Send, Users } from 'lucide-react';
import { api } from '../../utils/api';
import { filterWorkforceEmployees } from '../../utils/employeeRoles';
import { ensureRealtimeSocket } from '../../utils/realtime';
import SupportChatMessageBubble from '../../components/SupportChatMessageBubble';

const formatBubbleTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatRelativeShort = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daq`;
  if (hrs < 24) return `${hrs} soat`;
  if (days < 7) return `${days} kun`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
};

const AdminSupportChatPage = ({ employees = [], currentUser, canMutate = true }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editInput, setEditInput] = useState('');
  const [mutateLoading, setMutateLoading] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  const listRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  const adminName = currentUser?.name ? String(currentUser.name).trim() : 'Admin';

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const upd = () => setIsNarrow(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

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
    const onUpd = (doc) => {
      if (!doc) return;
      if (String(doc.employeeId) !== String(selectedIdRef.current)) return;
      const did = doc._id ?? doc.id;
      setMessages((prev) =>
        prev.map((p) => (String(p._id || p.id) === String(did) ? { ...p, ...doc } : p))
      );
      loadConversations();
    };
    const onDel = (payload) => {
      if (!payload) return;
      if (String(payload.employeeId) !== String(selectedIdRef.current)) return;
      const did = payload._id;
      setMessages((prev) => prev.filter((p) => String(p._id || p.id) !== String(did)));
      loadConversations();
    };
    if (s) s.on('support-chat:new', onNew);
    if (s) s.on('support-chat:update', onUpd);
    if (s) s.on('support-chat:delete', onDel);
    const iv = setInterval(loadConversations, 45000);
    return () => {
      clearInterval(iv);
      if (s) {
        s.off('support-chat:new', onNew);
        s.off('support-chat:update', onUpd);
        s.off('support-chat:delete', onDel);
      }
    };
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setMessages([]);
    setEditingId(null);
    setEditInput('');
  }, [selectedId, loadThread]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, selectedId]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditInput('');
  };

  const startEdit = (m) => {
    setEditingId(String(m._id || m.id));
    setEditInput(m.body != null ? String(m.body) : '');
  };

  const saveEdit = async (messageId) => {
    if (!selectedId || !canMutate) return;
    const text = editInput.trim();
    if (!text) {
      alert('Matn kiriting');
      return;
    }
    const orig = messages.find((x) => String(x._id || x.id) === messageId);
    setMutateLoading(true);
    try {
      const payload = { employeeId: selectedId, body: text };
      if (orig?.mediaType === 'image' && orig?.mediaUrl) {
        payload.clearMedia = true;
      }
      await api.updateSupportMessage(messageId, payload);
      cancelEdit();
      await loadThread(selectedId);
    } catch (err) {
      alert(err.message || 'Saqlanmadi');
    } finally {
      setMutateLoading(false);
    }
  };

  const removeMessage = async (messageId) => {
    if (!selectedId || !canMutate) return;
    if (!window.confirm('Bu xabar o‘chirilsinmi?')) return;
    setMutateLoading(true);
    try {
      await api.deleteSupportMessage(messageId, { employeeId: selectedId });
      cancelEdit();
      await loadThread(selectedId);
    } catch (err) {
      alert(err.message || 'O‘chirilmadi');
    } finally {
      setMutateLoading(false);
    }
  };

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

  const chatListRows = useMemo(() => {
    const byId = Object.fromEntries(conversations.map((c) => [String(c.employeeId), c]));
    return workforce
      .filter((e) => e._id)
      .map((e) => {
        const id = String(e._id);
        const c = byId[id];
        return {
          employeeId: id,
          employeeName: e.name || c?.employeeName || 'Xodim',
          email: e.email || c?.email || '',
          lastMessage: c?.lastMessage || '',
          lastAt: c?.lastAt || null,
          unreadForAdmin: c?.unreadForAdmin || 0,
        };
      })
      .sort((a, b) => {
        const ua = a.unreadForAdmin > 0 ? 1 : 0;
        const ub = b.unreadForAdmin > 0 ? 1 : 0;
        if (ub !== ua) return ub - ua;
        const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return String(a.employeeName).localeCompare(String(b.employeeName), 'uz');
      });
  }, [workforce, conversations]);

  const selectedEmployee = selectedId ? workforce.find((e) => e._id && String(e._id) === selectedId) : null;
  const threadTitle = selectedConv?.employeeName || selectedEmployee?.name || 'Xodim';
  const threadEmail = selectedConv?.email || selectedEmployee?.email || '';

  const showList = !isNarrow || !selectedId;
  const showThread = !isNarrow || !!selectedId;

  const listMobile = isNarrow ? 'rounded-none border-x-0 border-t-0 shadow-none' : '';
  const threadShell = `sc-thread-panel border overflow-hidden flex flex-col min-h-0 flex-1 ${
    isNarrow ? 'rounded-none border-0' : 'rounded-2xl shadow-sm'
  }`;

  const initial = (name) => {
    const s = String(name || '?').trim();
    return s ? s[0].toUpperCase() : '?';
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-none max-lg:gap-0 lg:gap-3">
      {!isNarrow && (
        <div className="shrink-0">
          <h1 className="text-xl sm:text-2xl font-black text-white italic tracking-tight">Xodimlar bilan chat</h1>
          <p className="text-xs text-slate-500 font-bold mt-1 max-w-xl">Matn xabarlari — mobil interfeys Telegram uslubida.</p>
        </div>
      )}

      <div
        className={`flex flex-col lg:flex-row gap-0 lg:gap-3 min-h-0 w-full min-w-0 flex-1 ${
          isNarrow ? 'min-h-0' : 'h-[calc(100dvh-11rem)] max-h-[920px]'
        }`}
      >
        {showList && (
          <div
            className={`sc-list-panel border flex flex-col min-h-0 shadow-sm rounded-2xl lg:rounded-2xl ${listMobile} lg:w-[min(100%,340px)] shrink-0 ${
              isNarrow && selectedId ? 'hidden' : ''
            } ${!isNarrow ? '' : 'flex-1 min-h-0'}`}
          >
            <div className="sc-list-header relative px-3 sm:px-4 py-3 border-b flex items-center gap-3 min-h-[52px]">
              {isNarrow && (
                <>
                  <h1 className="sc-list-header-title text-[17px] font-bold truncate flex-1 text-center px-10">
                    Xabarlar
                  </h1>
                  <button
                    type="button"
                    className="sc-search-btn absolute right-2 top-1/2 -translate-y-1/2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full"
                    aria-label="Qidiruv"
                  >
                    <Search size={22} strokeWidth={2} />
                  </button>
                </>
              )}
              {!isNarrow && (
                <>
                  <Users className="sc-list-header-muted shrink-0" size={20} />
                  <h2 className="sc-list-header-title text-[15px] font-bold tracking-tight">Xodimlar</h2>
                  {loadingList && <span className="sc-list-loading-dot text-xs ml-auto">…</span>}
                </>
              )}
              {isNarrow && loadingList && (
                <span className="sc-list-loading-dot absolute left-3 top-1/2 -translate-y-1/2 text-xs">…</span>
              )}
            </div>
            <div className="sc-list-scroll flex-1 min-h-0 overflow-y-auto custom-scroll">
              {chatListRows.length === 0 && !loadingList && (
                <p className="sc-list-empty p-6 text-sm text-center">Xodimlar ro‘yxati bo‘sh</p>
              )}
              {chatListRows.map((row) => (
                <button
                  key={row.employeeId}
                  type="button"
                  onClick={() => setSelectedId(row.employeeId)}
                  className={`sc-list-row w-full text-left px-3 py-3 flex gap-3 border-b min-h-[64px] ${
                    selectedId === row.employeeId ? 'sc-list-row--active' : ''
                  }`}
                >
                  <div className="sc-list-avatar shrink-0 w-[50px] h-[50px] rounded-full flex items-center justify-center text-lg font-bold">
                    {initial(row.employeeName)}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-2">
                      <p className="sc-list-name font-semibold text-[16px] truncate">{row.employeeName}</p>
                      <span className="sc-list-time shrink-0 text-[13px] tabular-nums">
                        {row.lastAt ? formatRelativeShort(row.lastAt) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="sc-list-preview text-[14px] truncate">
                        {row.lastMessage ? row.lastMessage : 'Suhbat boshlanmagan'}
                      </p>
                      {row.unreadForAdmin > 0 && (
                        <span className="sc-unread-badge shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center">
                          {row.unreadForAdmin > 9 ? '9+' : row.unreadForAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showThread && (
          <div className={`${threadShell} ${isNarrow ? 'flex-1' : ''}`}>
            {!selectedId ? (
              <div className="sc-thread-empty flex-1 flex flex-col items-center justify-center p-8">
                <MessageCircle size={40} className="mb-3 opacity-40 sc-thread-empty-title" />
                <p className="text-sm font-semibold text-center sc-thread-empty-title">Chapdan xodimni tanlang</p>
              </div>
            ) : (
              <>
                <div className="sc-thread-toolbar px-2 sm:px-3 py-2 border-b flex items-center gap-2 min-h-[56px] shrink-0">
                  {isNarrow && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="sc-thread-back shrink-0 w-10 h-10 rounded-full flex items-center justify-center -ml-1 min-w-[44px] min-h-[44px]"
                      aria-label="Orqaga"
                    >
                      <ArrowLeft size={26} strokeWidth={2} />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="sc-thread-title text-[16px] font-bold leading-tight truncate">{threadTitle}</p>
                    <p className="sc-thread-sub text-[13px] truncate">
                      {threadEmail ? `login: ${threadEmail}` : 'onlayn'}
                    </p>
                  </div>
                </div>
                <div
                  ref={listRef}
                  className="sc-msg-area flex-1 min-h-[120px] overflow-y-auto px-2 sm:px-3 py-3 space-y-2 custom-scroll"
                >
                  {loadingThread && messages.length === 0 && (
                    <p className="sc-msg-loading text-center text-sm py-8">Yuklanmoqda…</p>
                  )}
                  {messages.map((m) => {
                    const mid = String(m._id || m.id);
                    const outgoing = m.sender === 'ADMIN';
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
                          canMutate
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
                <form
                  onSubmit={handleSend}
                  className="sc-composer-wrap border-t p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0"
                >
                  <div className="sc-composer-inner flex gap-2 items-end rounded-[22px] border px-2 py-1.5 pl-3">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={canMutate ? 'Xabar' : 'Faqat ko‘rish'}
                      disabled={!canMutate}
                      rows={1}
                      className="sc-composer-field flex-1 min-w-0 min-h-[40px] max-h-28 bg-transparent border-0 rounded-xl px-1 py-2 text-[16px] focus:outline-none focus:ring-0 disabled:opacity-50 resize-y"
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
                      disabled={!canMutate || sending || !input.trim()}
                      className="sc-send-btn shrink-0 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center mb-0.5"
                      aria-label="Yuborish"
                    >
                      <Send size={18} className="-ml-0.5" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportChatPage;
