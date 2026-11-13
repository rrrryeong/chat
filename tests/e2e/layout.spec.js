import { enterRoom, expect, isWide, leaveRoom, test } from './fixtures.js';

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test.describe('반응형 배치', () => {
  test('처음 화면: 넓으면 목록과 안내 화면 두 칸, 좁으면 입장 화면 한 칸', async ({ openUser }) => {
    const page = await openUser();
    await expect(page.getByTestId('my-name')).toBeVisible();
    await expect(page.getByTestId('room-input')).toBeVisible();
    if (isWide(page)) {
      await expect(page.getByTestId('chat-placeholder')).toHaveText('방을 고르거나 새로 만들어 보세요.');
    } else {
      await expect(page.getByTestId('chat-placeholder')).toBeHidden();
    }
    await expect(page.getByTestId('chat-room-name')).toBeHidden();
  });

  test('입장 후: 넓으면 목록이 남고 나가기 글자 버튼, 좁으면 채팅만 보이고 뒤로 화살표', async ({
    openUser,
  }) => {
    const page = await openUser();
    await enterRoom(page, '개발');
    await expect(page.getByTestId('chat-room-name')).toBeVisible();
    await expect(page.getByTestId('chat-placeholder')).toBeHidden();

    if (isWide(page)) {
      await expect(page.getByTestId('room-input')).toBeVisible();
      await expect(page.getByTestId('leave-button')).toBeVisible();
      await expect(page.getByTestId('back-button')).toBeHidden();
      await expect(page.getByTestId('room-item').filter({ hasText: '개발' })).toHaveAttribute(
        'aria-current',
        'true',
      );
    } else {
      await expect(page.getByTestId('room-input')).toBeHidden();
      await expect(page.getByTestId('my-name')).toBeHidden();
      await expect(page.getByTestId('back-button')).toBeVisible();
      await expect(page.getByTestId('back-button')).toHaveAttribute('aria-label', '나가기');
      await expect(page.getByTestId('leave-button')).toBeHidden();
    }
  });

  test('나가면: 넓으면 안내 화면, 좁으면 입장 화면으로 돌아간다', async ({ openUser }) => {
    const page = await openUser();
    await enterRoom(page, '개발');
    await leaveRoom(page);
    await expect(page.getByTestId('chat-room-name')).toBeHidden();
    await expect(page.getByTestId('room-input')).toBeVisible();
    if (isWide(page)) await expect(page.getByTestId('chat-placeholder')).toBeVisible();
  });

  test('넓은 화면에서 방에 있는 동안 목록의 다른 방을 누르면 그 방으로 옮겨 간다', async ({ openUser }) => {
    const a = await openUser();
    test.skip(!isWide(a), '두 칸 배치 전용');
    const b = await openUser();
    const aName = await a.getByTestId('my-name').textContent();
    await enterRoom(b, '잡담');
    await enterRoom(a, '개발');
    await a.getByTestId('message-input').fill('개발방 메시지');
    await a.getByTestId('message-input').press('Enter');
    await expect(a.getByTestId('message-list')).toContainText('개발방 메시지');

    await a.getByTestId('room-item').filter({ hasText: '잡담' }).click();

    await expect(a.getByTestId('chat-room-name')).toHaveText('잡담');
    await expect(a.getByTestId('chat-count')).toHaveText('2명');
    await expect(a.getByTestId('message-list')).not.toContainText('개발방 메시지');
    await expect(a.getByTestId('room-item').filter({ hasText: '잡담' })).toHaveAttribute('aria-current', 'true');
    await expect(a.getByTestId('room-item')).toHaveCount(1); // 혼자 있던 개발방은 사라진다
    await expect(b.getByTestId('message-list')).toContainText(`${aName}님이 입장했습니다.`);
  });

  test('창 크기가 바뀌어도 방과 메시지를 유지한 채 배치만 바뀐다', async ({ openUser }) => {
    const page = await openUser();
    const original = page.viewportSize();
    await enterRoom(page, '개발');
    await page.getByTestId('message-input').fill('크기 변경 전 메시지');
    await page.getByTestId('message-input').press('Enter');
    await expect(page.getByTestId('message-list')).toContainText('크기 변경 전 메시지');

    const toggled = isWide(page) ? { width: 600, height: 800 } : { width: 1100, height: 800 };
    await page.setViewportSize(toggled);

    await expect(page.getByTestId('chat-room-name')).toHaveText('개발');
    await expect(page.getByTestId('message-list')).toContainText('크기 변경 전 메시지');
    if (isWide(page)) {
      await expect(page.getByTestId('room-input')).toBeVisible();
      await expect(page.getByTestId('leave-button')).toBeVisible();
    } else {
      await expect(page.getByTestId('room-input')).toBeHidden();
      await expect(page.getByTestId('back-button')).toBeVisible();
    }
    await page.setViewportSize(original);
  });

  test('방 안에서 브라우저 뒤로가기를 누르면 나가기와 같다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    const bName = await b.getByTestId('my-name').textContent();
    const url = a.url();
    await enterRoom(a, '개발');
    await enterRoom(b, '개발');

    await b.goBack();

    await expect(b.getByTestId('chat-room-name')).toBeHidden();
    await expect(b.getByTestId('room-input')).toBeVisible();
    expect(b.url()).toBe(url);
    await expect(a.getByTestId('message-list')).toContainText(`${bName}님이 퇴장했습니다.`);
    await expect(a.getByTestId('chat-count')).toHaveText('1명');
  });

  test('나가기 직후 다시 입장해도 방에서 튕겨 나가지 않는다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    await enterRoom(b, '개발'); // 목록에 남겨 둘 방
    await enterRoom(a, '개발');
    await leaveRoom(a);
    await a.getByTestId('room-item').click();
    await expect(a.getByTestId('chat-room-name')).toHaveText('개발');
    await a.waitForTimeout(500);
    await expect(a.getByTestId('chat-room-name')).toBeVisible();
    await expect(b.getByTestId('chat-count')).toHaveText('2명');
  });

  test('긴 방 이름과 긴 메시지에도 가로 스크롤이 생기지 않는다', async ({ openUser }) => {
    const a = await openUser();
    const b = await openUser();
    const longRoom = 'W'.repeat(30);
    await enterRoom(b, longRoom);

    await expect(a.getByTestId('room-item')).toHaveCount(1);
    expect(await hasHorizontalScroll(a)).toBe(false);

    await a.getByTestId('room-item').click();
    await expect(a.getByTestId('chat-room-name')).toHaveText(longRoom);
    await a.getByTestId('message-input').fill('W'.repeat(500));
    await a.getByTestId('message-input').press('Enter');
    await expect(a.getByTestId('message-input')).toHaveValue('');
    expect(await hasHorizontalScroll(a)).toBe(false);
  });

  test('아이콘(SVG)이 자기 영역 안에 실제로 그려진다', async ({ openUser }) => {
    const page = await openUser();
    await enterRoom(page, '개발');
    // 보이는 아이콘마다, 안에서 참조한 도형(<use>)이 아이콘 영역과 겹쳐야 한다.
    const offscreen = await page.evaluate(() =>
      [...document.querySelectorAll('svg.icon')]
        .filter((svg) => svg.checkVisibility())
        .map((svg) => {
          const box = svg.getBoundingClientRect();
          const shape = svg.querySelector('use').getBoundingClientRect();
          const overlaps =
            shape.width > 0 &&
            shape.left < box.right &&
            shape.right > box.left &&
            shape.top < box.bottom &&
            shape.bottom > box.top;
          return overlaps ? null : svg.closest('[data-testid]')?.dataset.testid ?? svg.parentElement.className;
        })
        .filter(Boolean),
    );
    expect(offscreen).toEqual([]);
  });
});
