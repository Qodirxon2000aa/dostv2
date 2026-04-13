import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { ensureRealtimeSocket } from '../utils/realtime';

/**
 * Admin uchun support-chat bo‘yicha jami o‘qilmagan xabarlar (xodimdan kelgan).
 */
export function useAdminSupportUnread(enabled) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.getSupportConversations();
      const raw = res.data ?? [];
      const rows = Array.isArray(raw) ? raw : [];
      const sum = rows.reduce((s, c) => s + (Number(c.unreadForAdmin) || 0), 0);
      setTotal(sum);
    } catch {
      /* tarmoq xatosi — oldingi qiymat */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setTotal(0);
      return undefined;
    }
    refresh();
    const s = ensureRealtimeSocket();
    if (s) s.emit('join-admin');
    const bump = () => refresh();
    if (s) {
      s.on('support-chat:new', bump);
      s.on('support-chat:update', bump);
      s.on('support-chat:delete', bump);
    }
    const iv = setInterval(refresh, 45000);
    return () => {
      clearInterval(iv);
      if (s) {
        s.off('support-chat:new', bump);
        s.off('support-chat:update', bump);
        s.off('support-chat:delete', bump);
      }
    };
  }, [enabled, refresh]);

  return total;
}
