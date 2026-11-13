import { afterEach, describe, expect, it } from 'vitest';
import { io } from 'socket.io-client';
import { startServer, waitFor } from './helpers.js';

describe('로그인 필수 소켓', () => {
  let server;
  let client;
  afterEach(async () => {
    client?.disconnect();
    await server?.close();
  });

  it.each([undefined, 'forged-token'])('미인증·위조 토큰은 방 목록도 받지 못한다: %s', async (token) => {
    server = await startServer();
    client = io(`http://127.0.0.1:${server.port}`, { auth: { token }, autoConnect: false, reconnection: false });
    const received = [];
    client.on('rooms:list', (rooms) => received.push(rooms));
    const rejected = waitFor(client, 'connect_error');
    client.connect();
    expect((await rejected).message).toBe('로그인이 필요합니다.');
    expect(received).toEqual([]);
  });

  it('같은 계정의 두 탭은 각각 익명 참가자로 입장하고 개인정보는 전송하지 않는다', async () => {
    server = await startServer();
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    expect(await b.socket.emitWithAck('room:join', '개발')).toMatchObject({ count: 2 });
    const message = waitFor(b.socket, 'chat:message');
    await a.socket.emitWithAck('chat:send', '안녕');
    expect((await message).from).toEqual({ id: a.socket.id, name: a.name });
    expect(a.name).toMatch(/^익명-\d{4}$/);
  });

  it('인증 설정이 없으면 닫힌 상태로 시작하고 설정 API가 503을 반환한다', async () => {
    server = await startServer({ auth: null });
    expect((await fetch(`http://127.0.0.1:${server.port}/auth/config`)).status).toBe(503);
    client = io(`http://127.0.0.1:${server.port}`, { auth: { token: 'anything' }, autoConnect: false, reconnection: false });
    const rejected = waitFor(client, 'connect_error');
    client.connect();
    expect((await rejected).message).toBe('로그인이 필요합니다.');
  });

  const expiringAuth = () => ({
    config: { url: 'https://example.supabase.co', key: 'public-key' },
    async verify(token) {
      if (!['test-token', 'renewed', 'other-user'].includes(token)) throw new Error('invalid');
      return { userId: token === 'other-user' ? 'other' : 'same', expiresAt: Date.now() + (token === 'test-token' ? 150 : 2000) };
    },
  });

  it('토큰 만료 시 연결을 끊어 방에서 퇴장시킨다', async () => {
    server = await startServer({ auth: expiringAuth() });
    const a = await server.connect();
    await a.socket.emitWithAck('room:join', '만료');
    await Promise.all([waitFor(a.socket, 'auth:required'), waitFor(a.socket, 'disconnect')]);
    expect(a.socket.connected).toBe(false);
    const b = await server.connect();
    expect(b.received['rooms:list'].at(-1)).toEqual([]);
  });

  it('같은 사용자의 갱신 토큰은 방과 익명 이름을 유지한다', async () => {
    server = await startServer({ auth: expiringAuth() });
    const a = await server.connect();
    await a.socket.emitWithAck('room:join', '유지');
    expect(await a.socket.emitWithAck('auth:refresh', 'renewed')).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const message = waitFor(a.socket, 'chat:message');
    expect(await a.socket.emitWithAck('chat:send', '유지됨')).toEqual({ ok: true });
    expect((await message).from.name).toBe(a.name);
  });

  it.each(['forged', 'other-user'])('갱신 시 위조 토큰이나 다른 계정으로 바꿀 수 없다: %s', async (token) => {
    server = await startServer({ auth: expiringAuth() });
    const a = await server.connect();
    const rejected = waitFor(a.socket, 'auth:required');
    expect(await a.socket.emitWithAck('auth:refresh', token)).toEqual({ ok: false });
    await rejected;
  });
});
