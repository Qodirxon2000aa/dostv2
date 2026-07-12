const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const fromAuth = socket.handshake?.auth?.token;
      const fromHeader = socket.handshake?.headers?.authorization;
      const fromQuery = socket.handshake?.query?.token;
      const raw = String(fromAuth || fromQuery || fromHeader || '');
      const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = {
        uid: String(payload.uid || ''),
        role: String(payload.role || 'EMPLOYEE'),
      };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-employee', ({ employeeId } = {}) => {
      const id = employeeId != null ? String(employeeId).trim() : '';
      if (id && /^[a-f\d]{24}$/i.test(id) && (socket.data.user?.uid === id || socket.data.user?.role === 'SUPER_ADMIN' || socket.data.user?.role === 'ADMIN')) {
        socket.join(`employee:${id}`);
      }
    });
    socket.on('join-admin', () => {
      if (socket.data.user?.role === 'SUPER_ADMIN' || socket.data.user?.role === 'ADMIN') {
        socket.join('admins');
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
