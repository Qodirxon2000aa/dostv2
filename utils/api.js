// api.js — Vite: .env da VITE_API_URL=http://localhost:5000/api (oxirida bo'sh joy bo'lmasin)
const BASE_URL = (() => {
  const fromEnv = String(import.meta.env.VITE_API_URL ?? '').trim();
  return fromEnv || 'https://nodirkhanov.uz/api';
})();

const getToken = () => {
  try {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user).token : null;
  } catch {
    return null;
  }
};

/** Admin panel read-only tekshiruvi uchun (server X-User-Role bilan) */
const getRoleHeaders = () => {
  try {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return {};
    const u = JSON.parse(raw);
    if (!u?.role) return {};
    return { 'X-User-Role': String(u.role) };
  } catch {
    return {};
  }
};

const request = async (method, path, body = null) => {
  const token = getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getRoleHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server javobi noto'g'ri");
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Server xatosi: ${res.status}`);
  }

  return data;
};

export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  login: (body) => request('POST', '/auth/login', body),

  // ── Employees ─────────────────────────────────────────────────
  getEmployees:   ()         => request('GET',    '/employees'),
  createEmployee: (body)     => request('POST',   '/employees', body),
  updateEmployee: (id, body) => request('PUT',    `/employees/${id}`, body),
  deleteEmployee: (id)       => request('DELETE', `/employees/${id}`),

  // ── Attendance ────────────────────────────────────────────────
  getAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/attendance${q ? '?' + q : ''}`);
  },
  upsertAttendance:  (body) => request('POST',   '/attendance', body),
  approveAttendance: (id)   => request('PATCH',  `/attendance/${id}/approve`),
  deleteAttendance:  (id)   => request('DELETE', `/attendance/${id}`),

  // ── Payroll ───────────────────────────────────────────────────
  getPayroll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/payroll${q ? '?' + q : ''}`);
  },
  createPayroll:  (body) => request('POST',   '/payroll', body),
  updatePayroll:  (id, body) => request('PUT', `/payroll/${id}`, body),
  approvePayroll: (id)   => request('PATCH',  `/payroll/${id}/approve`),
  cancelPayroll:  (id)   => request('PATCH',  `/payroll/${id}/cancel`),
  deletePayroll:  (id)   => request('DELETE', `/payroll/${id}`),

  // ── Objects ───────────────────────────────────────────────────
  getObjects:      ()         => request('GET',    '/objects'),
  createObject:    (body)     => request('POST',   '/objects', body),
  deleteObject:    (id)       => request('DELETE', `/objects/${id}`),
  addObjectIncome: (id, body) => request('PATCH',  `/objects/${id}/income`, body),
  addObjectWithdrawal: (id, body) => request('PATCH', `/objects/${id}/withdrawal`, body),
  updateObjectWithdrawal: (id, wid, body) => request('PUT', `/objects/${id}/withdrawal/${wid}`, body),
  deleteObjectWithdrawal: (id, wid) => request('DELETE', `/objects/${id}/withdrawal/${wid}`),

  // ── Fines (Jarimalar) ─────────────────────────────────────────
  getFines:   ()     => request('GET',    '/fines'),
  createFine: (body) => request('POST',   '/fines', body),
  cancelFine: (id)   => request('PATCH',  `/fines/${id}/cancel`),
  deleteFine: (id)   => request('DELETE', `/fines/${id}`),

  // ── Suppliers (Beruvchilar) ───────────────────────────────────
  getSuppliers:    ()         => request('GET',    '/suppliers'),
  createSupplier:  (body)     => request('POST',   '/suppliers', body),
  updateSupplier:  (id, body) => request('PUT',    `/suppliers/${id}`, body),
  deleteSupplier:  (id)       => request('DELETE', `/suppliers/${id}`),

  // ── Warehouse ─────────────────────────────────────────────────
  getWarehouse:     (objectId)  => request('GET',    `/warehouse${objectId ? '?objectId=' + objectId : ''}`),
  createWarehouse:  (body)      => request('POST',   '/warehouse', body),
  useWarehouse:     (id, body)  => request('PATCH',  `/warehouse/${id}/use`, body),
  restockWarehouse: (id, body)  => request('PATCH',  `/warehouse/${id}/restock`, body),
  deleteWarehouse:  (id)        => request('DELETE', `/warehouse/${id}`),

  // ── Bonuses (Mukofotlar) ──────────────────────────────────────
  getBonuses:     ()         => request('GET',    '/bonuses'),
  createBonus:    (body)     => request('POST',   '/bonuses', body),
  cancelBonus:    (id)       => request('PATCH',  `/bonuses/${id}/cancel`),
  updateBonus:    (id, body) => request('PUT',    `/bonuses/${id}`, body),
  deleteBonus:    (id)       => request('DELETE', `/bonuses/${id}`),

  // Agar kerak bo'lsa qo'shimcha metodlar:
  // approveBonus:   (id)       => request('PATCH',  `/bonuses/${id}/approve`),

  // ── Notifications (Xabarnomalar) ────────────────────────────
  getNotifications: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/notifications${q ? '?' + q : ''}`);
  },
  createNotification: (body) => request('POST', '/notifications', body),
  markNotificationRead: (id) => request('PATCH', `/notifications/${id}/read`),

  // ── Support chat (xodim ↔ admin) ───────────────────────────────
  getSupportMessages: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/support-chat/messages${q ? '?' + q : ''}`);
  },
  sendSupportMessage: (body) => request('POST', '/support-chat/messages', body),
  markSupportRead: (body) => request('PATCH', '/support-chat/read', body),
  getSupportConversations: () => request('GET', '/support-chat/conversations'),
  getSupportUnreadEmployee: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/support-chat/unread-employee${q ? '?' + q : ''}`);
  },

  // ── Logs ──────────────────────────────────────────────────────
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/logs${q ? '?' + q : ''}`);
  },
  createLog: (action, performer = 'Sistema') => {
    if (!action || !String(action).trim()) {
      console.warn("createLog: action bo'sh — yuborilmadi");
      return Promise.resolve();
    }
    return request('POST', '/logs', {
      action:    String(action).trim(),
      performer: String(performer).trim(),
    });
  },
};