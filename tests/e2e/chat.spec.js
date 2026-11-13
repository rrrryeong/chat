import { enterRoom, expect, isWide, leaveRoom, test } from './fixtures.js';

const send = async (page, text) => {
  await page.getByTestId('message-input').fill(text);
  await page.getByTestId('message-input').press('Enter');
};
const messages = (page) => page.getByTestId('message-list').locator('li');

// 메시지 항목이 목록의 왼쪽/오른쪽 어디에 붙어 있는지 화면 좌표로 판단한다.
async function side(item) {
  return item.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const list = el.parentElement.getBoundingClientRect();
    const left = box.left - list.left;
    const right = list.right - box.right;
    return right < left ? 'right' : 'left';
  });
}

test.describe('채팅 화면', () => {
  test('헤더에 방 이름, 인원수, 내 이름을 보여 주고 인원수가 실시간으로 바뀐다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    const aName = await a.getByTestId('my-name').textContent();
    await enterRoom(a, '개발');

    await expect(a.getByTestId('chat-room-name')).toHaveText('개발');
    await expect(a.getByTestId('chat-count')).toHaveText('1명');
    await expect(a.getByTestId('chat-my-name')).toHaveText(aName);

    await enterRoom(b, '개발');
    await expect(a.getByTestId('chat-count')).toHaveText('2명');
    await expect(b.getByTestId('chat-count')).toHaveText('2명');
  });

  test('입장·퇴장은 가운데 시스템 메시지로 알린다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    const bName = await b.getByTestId('my-name').textContent();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');

    const joined = messages(a).filter({ hasText: `${bName}님이 입장했습니다.` });
    await expect(joined).toHaveClass(/system/);
    await expect(joined).toHaveCSS('align-self', 'center');

    await leaveRoom(b);
    await expect(messages(a).filter({ hasText: `${bName}님이 퇴장했습니다.` })).toHaveClass(/system/);
    await expect(a.getByTestId('chat-count')).toHaveText('1명');
  });

  test('같은 방에는 메시지가 오가고 다른 방에는 전달되지 않는다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    const c = await openUser();
    const aName = await a.getByTestId('my-name').textContent();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');
    await enterRoom(c, '잡담');

    await send(a, '  안녕하세요  ');
    await expect(a.getByTestId('message-input')).toHaveValue('');

    const mine = messages(a).filter({ hasText: '안녕하세요' });
    await expect(mine).toHaveClass(/mine/);
    expect(await side(mine)).toBe('right');

    const theirs = messages(b).filter({ hasText: '안녕하세요' });
    await expect(theirs).toHaveClass(/others/);
    await expect(theirs).toBeVisible();
    expect(await side(theirs)).toBe('left');
    await expect(theirs.locator('.name')).toHaveText(aName);
    await expect(theirs.locator('.time')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(theirs.locator('.bubble')).toHaveText('안녕하세요');

    // 잡담방 메시지가 도착할 때쯤이면 개발방 메시지도 이미 처리됐다.
    await send(c, '잡담방 메시지');
    await expect(messages(c).filter({ hasText: '잡담방 메시지' })).toBeVisible();
    await expect(messages(c).filter({ hasText: '안녕하세요' })).toHaveCount(0);
    await expect(messages(a).filter({ hasText: '잡담방 메시지' })).toHaveCount(0);
  });

  test('공백뿐인 메시지는 보내지 않는다', async ({ openUser }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    const before = await messages(a).count();
    await send(a, '    ');
    await send(a, '확인용');
    await expect(messages(a).filter({ hasText: '확인용' })).toBeVisible();
    expect(await messages(a).count()).toBe(before + 1);
  });

  test('HTML이 들어간 메시지는 실행되지 않고 글자 그대로 보인다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');
    const payload = '<img src=x onerror="window.__xss=1">';

    await send(a, payload);

    await expect(messages(b).locator('.bubble').filter({ hasText: payload })).toBeVisible();
    await expect(b.getByTestId('message-list').locator('img')).toHaveCount(0);
    expect(await b.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('새 메시지가 오면 맨 아래로 자동 스크롤한다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');
    for (let i = 1; i <= 30; i++) await send(a, `메시지 ${i}`);

    await expect(messages(b).filter({ hasText: /^.*메시지 30$/ })).toBeVisible();
    const list = b.getByTestId('message-list');
    await expect
      .poll(() => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight))
      .toBeLessThan(2);
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  });

  test('나가기를 누르면 입장 화면으로 돌아가고, 다시 들어가면 이전 메시지는 보이지 않는다', async ({
    openUser,
  }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');
    await send(a, '나가기 전 메시지');
    await expect(messages(b).filter({ hasText: '나가기 전 메시지' })).toBeVisible();

    await leaveRoom(b);
    await expect(b.getByTestId('room-input')).toBeVisible();
    await expect(b.getByTestId('room-item')).toHaveText([/개발\s*1명/]);

    await b.getByTestId('room-item').click();
    await expect(b.getByTestId('chat-count')).toHaveText('2명');
    await expect(messages(b).filter({ hasText: '나가기 전 메시지' })).toHaveCount(0);
  });

  test('말풍선은 M3 색이고 보낸 쪽 아래 모서리만 작다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');
    await send(a, '말풍선');

    const mine = messages(a).filter({ hasText: '말풍선' }).locator('.bubble');
    await expect(mine).toHaveCSS('background-color', 'rgb(234, 221, 255)');
    await expect(mine).toHaveCSS('border-bottom-right-radius', '4px');
    await expect(mine).toHaveCSS('border-top-left-radius', '20px');

    const theirs = messages(b).filter({ hasText: '말풍선' }).locator('.bubble');
    await expect(theirs).toHaveCSS('background-color', 'rgb(236, 230, 240)');
    await expect(theirs).toHaveCSS('border-bottom-left-radius', '4px');
  });

  test('전송 버튼은 입력이 비어 있으면 비활성화되고, 누르면 전송된다', async ({ openUser }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    const sendButton = a.getByTestId('send-button');
    await expect(sendButton).toBeDisabled();
    await expect(sendButton).toHaveAttribute('aria-label', '전송');

    await a.getByTestId('message-input').fill('   ');
    await expect(sendButton).toBeDisabled();
    await a.getByTestId('message-input').fill('버튼으로 전송');
    await expect(sendButton).toBeEnabled();

    await sendButton.click();
    await expect(messages(a).filter({ hasText: '버튼으로 전송' })).toBeVisible();
    await expect(a.getByTestId('message-input')).toHaveValue('');
    await expect(sendButton).toBeDisabled();
  });

  test('빠르게 연달아 보내도 메시지가 빠지거나 입력이 지워지지 않는다', async ({ openUser }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    for (let i = 1; i <= 10; i++) await send(a, `연속 ${i}`);

    const bubbles = messages(a).locator('.bubble');
    await expect(bubbles).toHaveText(Array.from({ length: 10 }, (_, i) => `연속 ${i + 1}`));
    await expect(a.getByTestId('message-input')).toHaveValue('');
  });

  test('전송에 실패하면 스낵바로 알리고 입력 내용을 지우지 않는다', async ({ openUser }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    const input = a.getByTestId('message-input');
    await input.evaluate((el) => el.removeAttribute('maxlength'));
    const tooLong = 'a'.repeat(501);

    await input.fill(tooLong);
    await input.press('Enter');

    const snackbar = a.getByTestId('snackbar');
    await expect(snackbar).toHaveText('메시지는 500자 이하로 입력하세요.');
    await expect(snackbar).toBeVisible();
    await expect(input).toHaveValue(tooLong);
    await expect(messages(a).locator('.bubble')).toHaveCount(0);
    await expect(snackbar).toBeHidden({ timeout: 6000 });
  });

  test('연결이 끊기면 띠로 알리고, 다시 연결되면 띠를 숨기고 입장 화면으로 돌아간다', async ({
    openUser,
  }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    const banner = a.getByTestId('connection-banner');
    await expect(banner).toBeHidden();

    await a.context().setOffline(true);
    await expect(banner).toHaveText('연결이 끊겼습니다. 다시 연결하는 중…', { timeout: 15000 });

    await a.context().setOffline(false);
    await expect(banner).toBeHidden({ timeout: 15000 });
    await expect(a.getByTestId('chat-room-name')).toBeHidden();
    await expect(a.getByTestId('room-input')).toBeVisible();
    if (isWide(a)) await expect(a.getByTestId('chat-placeholder')).toBeVisible();
  });
});
