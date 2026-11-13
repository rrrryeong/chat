import { io as ioClient } from 'socket.io-client';
import { createChatServer } from '../../server/app.js';

// 빈 포트에 실제 서버를 띄운다.
export async function startServer({ auth = {
  config: { url: 'https://example.supabase.co', key: 'public-key' },
  async verify(token) {
    if (token !== 'test-token') throw new Error('invalid token');
    return { userId: 'test-account', expiresAt: Date.now() + 3600000 };
  },
}, token = 'test-token' } = {}) {
  const server = createChatServer({ auth });
  await new Promise((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = server.httpServer.address();
  const clients = [];

  // 클라이언트를 연결하고, 받은 이벤트를 종류별로 모아 둔다.
  async function connect() {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      autoConnect: false,
      reconnection: false,
      transports: ['websocket'],
      auth: { token },
    });
    const received = { 'rooms:list': [], 'room:info': [], 'chat:system': [], 'chat:message': [] };
    for (const event of Object.keys(received)) {
      socket.on(event, (payload) => received[event].push(payload));
    }
    const welcome = waitFor(socket, 'user:welcome');
    const firstList = waitFor(socket, 'rooms:list');
    socket.connect();
    const { name } = await welcome;
    await firstList;
    clients.push(socket);
    return { socket, name, received };
  }

  async function close() {
    for (const socket of clients) socket.disconnect();
    await new Promise((resolve) => server.io.close(resolve));
  }

  return { port, connect, close };
}

// 조건에 맞는 다음 이벤트를 기다린다.
export function waitFor(socket, event, predicate = () => true, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`${event} 이벤트를 ${timeout}ms 안에 받지 못했습니다.`));
    }, timeout);
    function handler(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });
}
