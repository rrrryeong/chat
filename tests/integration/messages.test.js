import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, waitFor } from './helpers.js';

describe('소켓 서버: 메시지', () => {
  let server;
  beforeEach(async () => {
    server = await startServer();
  });
  afterEach(async () => {
    await server.close();
  });

  it('방에 없으면 메시지를 보낼 수 없다', async () => {
    const a = await server.connect();
    expect(await a.socket.emitWithAck('chat:send', '안녕')).toEqual({
      ok: false,
      error: '방에 입장한 뒤 메시지를 보낼 수 있습니다.',
    });
  });

  it('같은 방 사람(보낸 사람 포함)에게 trim된 메시지를 전달한다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '개발');
    const aMsg = waitFor(a.socket, 'chat:message');
    const bMsg = waitFor(b.socket, 'chat:message');

    expect(await a.socket.emitWithAck('chat:send', '  안녕하세요  ')).toEqual({ ok: true });

    const expected = { from: { id: a.socket.id, name: a.name }, text: '안녕하세요' };
    expect(await aMsg).toMatchObject(expected);
    expect(await bMsg).toMatchObject(expected);
    expect(typeof (await bMsg).time).toBe('number');
  });

  it('다른 방에는 메시지가 전달되지 않는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    const c = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '잡담');
    await c.socket.emitWithAck('room:join', '잡담');

    await a.socket.emitWithAck('chat:send', '개발방 메시지');
    // 같은 서버에서 순서대로 처리되므로, 잡담방 메시지를 받은 시점에는 개발방 메시지가 이미 처리됐다.
    const bMsg = waitFor(b.socket, 'chat:message');
    await c.socket.emitWithAck('chat:send', '잡담방 메시지');
    await bMsg;

    expect(b.received['chat:message'].map((m) => m.text)).toEqual(['잡담방 메시지']);
    expect(a.received['chat:message'].map((m) => m.text)).toEqual(['개발방 메시지']);
  });

  it('잘못된 메시지는 오류로 응답하고 전달하지 않는다', async () => {
    const a = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');

    expect(await a.socket.emitWithAck('chat:send', '   ')).toEqual({
      ok: false,
      error: '메시지를 입력하세요.',
    });
    expect(await a.socket.emitWithAck('chat:send', 'a'.repeat(501))).toEqual({
      ok: false,
      error: '메시지는 500자 이하로 입력하세요.',
    });
    expect(a.received['chat:message']).toEqual([]);
  });

  it('나간 뒤에는 그 방 메시지를 받지 않는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:leave');

    await a.socket.emitWithAck('chat:send', '아무도 없나요');

    expect(b.received['chat:message']).toEqual([]);
  });
});
