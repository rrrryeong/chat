import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, waitFor } from './helpers.js';

describe('소켓 서버: 접속·방 목록·입장·퇴장', () => {
  let server;
  beforeEach(async () => {
    server = await startServer();
  });
  afterEach(async () => {
    await server.close();
  });

  it('접속하면 익명 이름과 빈 방 목록을 받는다', async () => {
    const a = await server.connect();
    expect(a.name).toMatch(/^익명-\d{4}$/);
    expect(a.received['rooms:list']).toEqual([[]]);
  });

  it('정적 페이지와 공용 검증 모듈을 제공한다', async () => {
    const page = await fetch(`http://127.0.0.1:${server.port}/`);
    expect(page.status).toBe(200);
    const shared = await fetch(`http://127.0.0.1:${server.port}/shared/validation.js`);
    expect(shared.status).toBe(200);
    expect(await shared.text()).toContain('validateRoomName');
  });

  it('잘못된 방 이름은 오류로 응답하고 방을 만들지 않는다', async () => {
    const a = await server.connect();
    expect(await a.socket.emitWithAck('room:join', '   ')).toEqual({
      ok: false,
      error: '방 이름을 입력하세요.',
    });
    expect(await a.socket.emitWithAck('room:join', 'x'.repeat(31))).toEqual({
      ok: false,
      error: '방 이름은 30자 이하로 입력하세요.',
    });
    expect(a.received['rooms:list']).toEqual([[]]);
  });

  it('입장하면 ack, 입장 알림, 인원 정보, 전체 방 목록 갱신을 받는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    const bList = waitFor(b.socket, 'rooms:list');
    const aSystem = waitFor(a.socket, 'chat:system');
    const aInfo = waitFor(a.socket, 'room:info');

    const ack = await a.socket.emitWithAck('room:join', '  개발  ');

    expect(ack).toEqual({ ok: true, room: '개발', count: 1, name: a.name });
    expect((await aSystem).text).toBe(`${a.name}님이 입장했습니다.`);
    expect(typeof (await aSystem).time).toBe('number');
    expect(await aInfo).toEqual({ room: '개발', count: 1 });
    expect(await bList).toEqual([{ name: '개발', count: 1 }]);
  });

  it('두 번째 사람이 입장하면 기존 사람이 알림과 인원 2를 받는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    const aSystem = waitFor(a.socket, 'chat:system', (m) => m.text.includes(b.name));
    const aInfo = waitFor(a.socket, 'room:info', (i) => i.count === 2);

    const ack = await b.socket.emitWithAck('room:join', '개발');

    expect(ack.count).toBe(2);
    expect((await aSystem).text).toBe(`${b.name}님이 입장했습니다.`);
    expect(await aInfo).toEqual({ room: '개발', count: 2 });
  });

  it('입장 알림과 인원 정보는 다른 방에 전달되지 않는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    const before = a.received['chat:system'].length;
    const aList = waitFor(a.socket, 'rooms:list', (l) => l.length === 2);

    await b.socket.emitWithAck('room:join', '잡담');

    expect(await aList).toEqual([
      { name: '개발', count: 1 },
      { name: '잡담', count: 1 },
    ]);
    expect(a.received['chat:system']).toHaveLength(before);
    expect(a.received['room:info'].every((i) => i.room === '개발')).toBe(true);
  });

  it('나가면 남은 사람에게 퇴장 알림과 인원 정보를 보내고, 빈 방은 목록에서 지운다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '개발');
    const aSystem = waitFor(a.socket, 'chat:system', (m) => m.text.includes('퇴장'));
    const aInfo = waitFor(a.socket, 'room:info', (i) => i.count === 1);

    expect(await b.socket.emitWithAck('room:leave')).toEqual({ ok: true });
    expect((await aSystem).text).toBe(`${b.name}님이 퇴장했습니다.`);
    expect(await aInfo).toEqual({ room: '개발', count: 1 });

    const bList = waitFor(b.socket, 'rooms:list', (l) => l.length === 0);
    await a.socket.emitWithAck('room:leave');
    expect(await bList).toEqual([]);
  });

  it('연결이 끊기면 나가기와 똑같이 처리한다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '개발');
    const aSystem = waitFor(a.socket, 'chat:system', (m) => m.text.includes('퇴장'));
    const aList = waitFor(a.socket, 'rooms:list', (l) => l[0]?.count === 1);

    b.socket.disconnect();

    expect((await aSystem).text).toBe(`${b.name}님이 퇴장했습니다.`);
    expect(await aList).toEqual([{ name: '개발', count: 1 }]);
  });

  it('다른 방으로 입장하면 이전 방에서 퇴장 처리된다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await a.socket.emitWithAck('room:join', '개발');
    await b.socket.emitWithAck('room:join', '개발');
    const aSystem = waitFor(a.socket, 'chat:system', (m) => m.text.includes('퇴장'));
    const aList = waitFor(a.socket, 'rooms:list', (l) => l.length === 2 && l[0].count === 1);

    await b.socket.emitWithAck('room:join', '잡담');

    expect((await aSystem).text).toBe(`${b.name}님이 퇴장했습니다.`);
    expect(await aList).toEqual([
      { name: '개발', count: 1 },
      { name: '잡담', count: 1 },
    ]);
  });

  it('소켓 id와 같은 방 이름을 써도 그 소켓에게 방 이벤트가 새지 않는다', async () => {
    const a = await server.connect();
    const b = await server.connect();
    await b.socket.emitWithAck('room:join', a.socket.id);
    await b.socket.emitWithAck('room:leave');
    await a.socket.emitWithAck('room:leave');
    expect(a.received['chat:system']).toEqual([]);
    expect(a.received['room:info']).toEqual([]);
  });
});
