// 방 입장·퇴장을 브라우저 기록과 연동해, 방 안에서 뒤로가기를 누르면 나가기가 되게 한다.
// URL은 바꾸지 않고 state({ inRoom: true })만 쌓는다.
export function createRoomHistory(win = window) {
  let pendingExit = Promise.resolve();
  let selfBack = false; // exit()가 일으킨 popstate인지

  const inRoom = () => win.history.state?.inRoom === true;

  return {
    // 늦게 도착한 back()이 새 기록을 지우지 않도록, 진행 중인 exit()를 먼저 기다린다.
    async enter() {
      await pendingExit;
      if (!inRoom()) win.history.pushState({ inRoom: true }, '');
    },

    exit() {
      if (selfBack || !inRoom()) return pendingExit;
      selfBack = true;
      pendingExit = new Promise((resolve) => {
        win.addEventListener(
          'popstate',
          () => {
            selfBack = false;
            resolve();
          },
          { once: true },
        );
        win.history.back();
      });
      return pendingExit;
    },

    // 사용자가 뒤로가기를 눌러 생긴 popstate에만 handler를 부른다.
    onBack(handler) {
      win.addEventListener('popstate', () => {
        if (!selfBack) handler();
      });
    },
  };
}
