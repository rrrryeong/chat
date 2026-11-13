import { enterRoom, expect, test } from './fixtures.js';

test.describe('입장 화면', () => {
  test('내 익명 이름과 빈 목록 안내를 보여 준다', async ({ openUser }) => {
    const page = await openUser();
    await expect(page.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
    await expect(page.getByTestId('room-empty')).toBeVisible();
    await expect(page.getByTestId('room-item')).toHaveCount(0);
  });

  test('빈 방 이름은 빨간 오류 문구를 보여 주고 입장하지 않는다', async ({ openUser }) => {
    const page = await openUser();
    await page.getByTestId('room-input').fill('   ');
    await page.getByTestId('room-submit').click();
    const error = page.getByTestId('room-error');
    await expect(error).toHaveText('방 이름을 입력하세요.');
    await expect(error).toHaveCSS('color', 'rgb(179, 38, 30)');
    await expect(page.getByTestId('chat-room-name')).toBeHidden();
  });

  test('방 이름 입력란은 30자까지만 입력된다', async ({ openUser }) => {
    const page = await openUser();
    await expect(page.getByTestId('room-input')).toHaveAttribute('maxlength', '30');
  });

  test('새 방을 만들면 입장하고, 다른 사용자의 목록에 실시간으로 나타나 클릭해 입장할 수 있다', async ({
    openUser,
  }) => {
    const a = await openUser();
    const b = await openUser();
    await expect(b.getByTestId('room-empty')).toBeVisible();

    await a.getByTestId('room-input').fill('  개발  ');
    await a.getByTestId('room-input').press('Enter');
    await expect(a.getByTestId('chat-room-name')).toHaveText('개발');

    const item = b.getByTestId('room-item');
    await expect(item).toHaveCount(1);
    await expect(item).toContainText('개발');
    await expect(item).toContainText('1명');
    await expect(b.getByTestId('room-empty')).toBeHidden();

    await item.click();
    await expect(b.getByTestId('chat-room-name')).toHaveText('개발');
  });

  test('방 목록은 가나다순이고 인원수가 실시간으로 바뀐다', async ({ openUser }) => {
    const watcher = await openUser();
    const p1 = await openUser();
    const p2 = await openUser();
    const p3 = await openUser();
    await enterRoom(p1, '하늘');
    await enterRoom(p2, '가나');
    await enterRoom(p3, '가나');

    const items = watcher.getByTestId('room-item');
    await expect(items).toHaveText([/가나\s*2명/, /하늘\s*1명/]);

    await p3.close();
    await expect(items).toHaveText([/가나\s*1명/, /하늘\s*1명/]);
  });
});
