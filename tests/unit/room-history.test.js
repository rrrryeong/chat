import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomHistory } from '../../public/room-history.js';

// 브라우저 기록을 흉내 내는 가짜 window. back()은 실제 브라우저처럼 popstate를 비동기로 보낸다.
function fakeWindow() {
  const win = new EventTarget();
  const entries = [null];
  let index = 0;
  win.history = {
    get state() {
      return entries[index];
    },
    get length() {
      return index + 1;
    },
    pushState(state) {
      entries.splice(index + 1);
      entries.push(state);
      index += 1;
    },
    back() {
      setTimeout(() => {
        if (index === 0) return;
        index -= 1;
        win.dispatchEvent(new Event('popstate'));
      }, 5);
    },
  };
  // 사용자가 기기의 뒤로가기를 누른 것
  win.userBack = () => win.history.back();
  return win;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('createRoomHistory', () => {
  let win;
  let roomHistory;
  beforeEach(() => {
    win = fakeWindow();
    roomHistory = createRoomHistory(win);
  });

  it('enter는 방 상태 기록을 하나 쌓는다', async () => {
    await roomHistory.enter();
    expect(win.history.state).toEqual({ inRoom: true });
    expect(win.history.length).toBe(2);
  });

  it('방을 옮겨 enter를 다시 불러도 기록을 더 쌓지 않는다', async () => {
    await roomHistory.enter();
    await roomHistory.enter();
    expect(win.history.length).toBe(2);
  });

  it('exit는 기록을 되돌리고, 그 popstate는 onBack으로 알리지 않는다', async () => {
    const onBack = vi.fn();
    roomHistory.onBack(onBack);
    await roomHistory.enter();

    await roomHistory.exit();

    expect(win.history.state).toBeNull();
    await tick();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('방 상태가 아니면 exit는 아무것도 하지 않는다', async () => {
    const back = vi.spyOn(win.history, 'back');
    await roomHistory.exit();
    expect(back).not.toHaveBeenCalled();
  });

  it('사용자가 뒤로가기를 누르면 onBack을 부른다', async () => {
    const onBack = vi.fn();
    roomHistory.onBack(onBack);
    await roomHistory.enter();

    win.userBack();
    await tick();

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(win.history.state).toBeNull();
  });

  it('exit 직후 enter해도 늦게 온 back이 새 기록을 지우지 않는다', async () => {
    const onBack = vi.fn();
    roomHistory.onBack(onBack);
    await roomHistory.enter();

    roomHistory.exit(); // 기다리지 않고 바로 다른 방에 입장
    await roomHistory.enter();
    await tick();

    expect(win.history.state).toEqual({ inRoom: true });
    expect(onBack).not.toHaveBeenCalled();
  });
});
