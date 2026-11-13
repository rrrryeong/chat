import { enterRoom, expect, test } from './fixtures.js';

test.describe('모바일 터치', () => {
  test('탭만으로 방 만들기, 입장, 전송, 나가기를 할 수 있다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    expect(await a.evaluate(() => navigator.maxTouchPoints > 0)).toBe(true);

    await a.getByTestId('room-input').tap();
    await a.getByTestId('room-input').fill('터치방');
    await a.getByTestId('room-submit').tap();
    await expect(a.getByTestId('chat-room-name')).toHaveText('터치방');

    await b.getByTestId('room-item').filter({ hasText: '터치방' }).tap();
    await expect(b.getByTestId('chat-count')).toHaveText('2명');

    await a.getByTestId('message-input').tap();
    await a.getByTestId('message-input').fill('탭으로 보냄');
    await a.getByTestId('send-button').tap();
    await expect(b.getByTestId('message-list')).toContainText('탭으로 보냄');

    await b.getByTestId('back-button').tap();
    await expect(b.getByTestId('room-input')).toBeVisible();
    await expect(a.getByTestId('chat-count')).toHaveText('1명');
  });

  test('보이는 모든 터치 대상은 48×48px 이상이다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(b, '개발');
    await expect(a.getByTestId('room-item')).toHaveCount(1);

    const smallTargets = (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll('button, input, a')]
          .filter((el) => el.checkVisibility())
          .map((el) => {
            const box = el.getBoundingClientRect();
            return { id: el.dataset.testid ?? el.className, width: box.width, height: box.height };
          })
          .filter((box) => box.width < 48 || box.height < 48),
      );

    expect(await smallTargets(a)).toEqual([]);
    await a.getByTestId('room-item').tap();
    await expect(a.getByTestId('chat-room-name')).toBeVisible();
    expect(await smallTargets(a)).toEqual([]);
  });

  test('키보드가 열려 화면 높이가 줄어도 맨 아래 메시지가 보인다', async ({ openUser }) => {
    const a = await openUser();
    await enterRoom(a, '개발');
    for (let i = 1; i <= 25; i++) {
      await a.getByTestId('message-input').fill(`메시지 ${i}`);
      await a.getByTestId('message-input').press('Enter');
    }
    const list = a.getByTestId('message-list');
    await expect(list.locator('.bubble').last()).toHaveText('메시지 25');
    const distance = () => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
    await expect.poll(distance).toBeLessThan(2);

    await a.setViewportSize({ width: 360, height: 420 }); // 가상 키보드가 올라온 상황

    await expect.poll(distance).toBeLessThan(2);
    await expect(list.locator('.bubble').last()).toBeInViewport();
    await expect(a.getByTestId('message-input')).toBeInViewport();
  });
});
