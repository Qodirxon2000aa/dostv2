import { io } from 'socket.io-client';

export function getSocketOrigin() {
  const fromEnv = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
  const base = fromEnv || 'https://nodirkhanov.uz/api';
  const withoutApi = base.replace(/\/api\/?$/i, '');
  return withoutApi || base;
}

let socket = null;

/**
 * Bitta umumiy Socket.io ulanishi (xodim / admin roomlariga alohida join qilinadi).
 */
export function ensureRealtimeSocket() {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;
  const origin = getSocketOrigin();
  socket = io(origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getRealtimeSocket() {
  return socket;
}
