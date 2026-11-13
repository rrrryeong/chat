import { test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

export async function loginUser(page, email = `${randomUUID()}@example.com`) {
  await page.goto('/');
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '로그인 링크 보내기' }).click();
  await expect(page.getByTestId('auth-status')).toContainText('이메일로 보낸');
  const { link } = await (await page.request.get(`/test/mail?email=${encodeURIComponent(email)}`)).json();
  await page.goto(link);
  await page.getByTestId('my-name').filter({ hasText: /익명-/ }).waitFor();
}

// 사용자마다 독립된 브라우저 컨텍스트(=소켓 연결)를 열고, 테스트가 끝나면 모두 닫는다.
// 닫지 않으면 앞 테스트의 방이 서버에 남아 다음 테스트의 방 목록에 섞인다.
export const test = base.extend({
  openUser: async ({ browser }, use) => {
    const contexts = [];
    await use(async () => {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      await loginUser(page);
      return page;
    });
    for (const context of contexts) await context.close();
  },
});

export async function enterRoom(page, name) {
  await page.getByTestId('room-input').fill(name);
  await page.getByTestId('room-submit').click();
  await page.getByTestId('chat-room-name').filter({ hasText: name }).waitFor();
}

// 840px 이상이면 두 칸 배치다.
export function isWide(page) {
  return page.viewportSize().width >= 840;
}

// 폭에 따라 "나가기" 글자 버튼(넓은 화면) 또는 뒤로 화살표(좁은 화면) 중 보이는 쪽을 누른다.
export async function leaveRoom(page) {
  await page.getByTestId(isWide(page) ? 'leave-button' : 'back-button').click();
}

export { expect } from '@playwright/test';
