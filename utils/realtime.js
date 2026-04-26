import { io } from 'socket.io-client';

export function getSocketOrigin() {
  const fromEnv = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
  if (!fromEnv && import.meta.env.DEV) {
    return window.location.origin;
  }
  const base = fromEnv || 'https://nodirkhanov.uz/api';
  const withoutApi = base.replace(/\/api\/?$/i, '');
  return withoutApi || base;
}

let socket = null;
function getAuthToken() {
  try {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return user?.token ? String(user.token) : '';
  } catch {
    return '';
  }
}

/**
 * Bitta umumiy Socket.io ulanishi (xodim / admin roomlariga alohida join qilinadi).
 */
export function ensureRealtimeSocket() {
  if (typeof window === 'undefined') return null;
  const token = getAuthToken();
  if (!token) return null;
  if (socket?.connected) return socket;
  const origin = getSocketOrigin();
  socket = io(origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    auth: { token },
  });
  return socket;
}

export function getRealtimeSocket() {
  return socket;
}
