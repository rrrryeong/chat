import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { randomName } from './names.js';
import { createRoomRegistry } from './registry.js';
import { validateMessage, validateRoomName } from './validation.js';
import { createAuth } from './auth.js';

const here = dirname(fileURLToPath(import.meta.url));

// 모든 소켓은 자기 id 이름의 socket.io 방에 들어 있으므로, 사용자 방에는 접두사를 붙여 겹치지 않게 한다.
const channel = (room) => `room:${room}`;

export function createChatServer({ auth = createAuth({
  url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY,
}) } = {}) {
  const app = express();
  app.use(express.static(join(here, '..', 'public')));
  app.get('/shared/validation.js', (_req, res) => res.sendFile(join(here, 'validation.js')));
  app.get('/vendor/supabase.js', (_req, res) => res.sendFile(join(here, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')));
  app.get('/auth/config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!auth) return res.status(503).json({ error: '로그인 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.' });
    res.json(auth.config);
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const registry = createRoomRegistry();

  io.use(async (socket, next) => {
    try {
      if (!auth) throw new Error('missing auth');
      socket.data.identity = await auth.verify(socket.handshake.auth.token);
      next();
    } catch {
      const error = new Error('로그인이 필요합니다.');
      error.data = { code: 'AUTH_REQUIRED' };
      next(error);
    }
  });

  const broadcastRooms = () => io.emit('rooms:list', registry.list());

  function leaveCurrentRoom(socket) {
    const left = registry.leave(socket.id);
    if (!left) return;
    socket.leave(channel(left.room));
    if (left.count > 0) {
      const target = io.to(channel(left.room));
      target.emit('chat:system', { text: `${socket.data.name}님이 퇴장했습니다.`, time: Date.now() });
      target.emit('room:info', { room: left.room, count: left.count });
    }
    broadcastRooms();
  }

  io.on('connection', (socket) => {
    let expiryTimer;
    const requireLogin = () => {
      socket.emit('auth:required');
      socket.disconnect(true);
    };
    const scheduleExpiry = () => {
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(requireLogin, Math.min(socket.data.identity.expiresAt - Date.now(), 2147483647));
      expiryTimer.unref();
    };
    scheduleExpiry();
    // 만료 타이머보다 먼저 도착한 패킷도 기한이 지났으면 실행하지 않는다.
    socket.use((_packet, next) => {
      if (socket.data.identity.expiresAt <= Date.now()) return requireLogin();
      next();
    });
    socket.on('auth:refresh', async (token, ack = () => {}) => {
      try {
        const identity = await auth.verify(token);
        if (!socket.connected) return;
        if (identity.userId !== socket.data.identity.userId) throw new Error('account changed');
        socket.data.identity = identity;
        scheduleExpiry();
        ack({ ok: true });
      } catch {
        ack({ ok: false });
        requireLogin();
      }
    });
    socket.data.name = randomName();
    socket.emit('user:welcome', { name: socket.data.name });
    socket.emit('rooms:list', registry.list());

    socket.on('room:join', (roomName, ack = () => {}) => {
      const result = validateRoomName(roomName);
      if (!result.ok) return ack({ ok: false, error: result.error });
      const room = result.value;

      if (registry.roomOf(socket.id) === room) {
        return ack({ ok: true, room, count: registry.count(room), name: socket.data.name });
      }
      leaveCurrentRoom(socket);

      const count = registry.join(room, socket.id);
      socket.join(channel(room));
      ack({ ok: true, room, count, name: socket.data.name });

      const target = io.to(channel(room));
      target.emit('chat:system', { text: `${socket.data.name}님이 입장했습니다.`, time: Date.now() });
      target.emit('room:info', { room, count });
      broadcastRooms();
    });

    socket.on('room:leave', (ack = () => {}) => {
      leaveCurrentRoom(socket);
      ack({ ok: true });
    });

    socket.on('chat:send', (text, ack = () => {}) => {
      const room = registry.roomOf(socket.id);
      if (room === null) {
        return ack({ ok: false, error: '방에 입장한 뒤 메시지를 보낼 수 있습니다.' });
      }
      const result = validateMessage(text);
      if (!result.ok) return ack({ ok: false, error: result.error });

      io.to(channel(room)).emit('chat:message', {
        from: { id: socket.id, name: socket.data.name },
        text: result.value,
        time: Date.now(),
      });
      ack({ ok: true });
    });

    socket.on('disconnect', () => {
      clearTimeout(expiryTimer);
      leaveCurrentRoom(socket);
    });
  });

  return { app, httpServer, io, registry };
}
