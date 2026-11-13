import { test, expect } from '@playwright/test';
import { loginUser, enterRoom } from './fixtures.js';

test('로그인 전에는 방과 채팅을 숨긴다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByTestId('room-input')).toBeHidden();
  await expect(page.getByTestId('room-item')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
});

test('매직 링크로 로그인하고 새로고침해도 유지되며 로그아웃하면 채팅을 숨긴다', async ({ page, request }) => {
  await page.goto('/');
  await page.getByLabel('이메일').fill('magic@example.com');
  await page.getByRole('button', { name: '로그인 링크 보내기' }).click();
  await expect(page.getByTestId('auth-status')).toContainText('이메일');
  const { link } = await (await request.get('/test/mail?email=magic@example.com')).json();
  await page.goto(link);
  await expect(page.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).not.toContainText('magic@example.com');
  await expect(page.locator('body')).not.toContainText('비공개 이름');
  await page.reload();
  await expect(page.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
  await enterRoom(page, '로그아웃 테스트');
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByTestId('room-input')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
});

test('Google OAuth를 거쳐 익명 이름으로 채팅에 연결한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Google로 계속하기' }).click();
  await expect(page).toHaveURL(/\/auth-provider\/auth\/v1\/authorize\?/);
  await page.getByRole('link', { name: 'Google 계정으로 계속' }).click();
  await expect(page.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
  await expect(page.locator('body')).not.toContainText('google@example.com');
});

test('사용한 매직 링크나 인증 취소는 로그인 오류를 안내한다', async ({ page }) => {
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Expired+link');
  await expect(page.getByTestId('auth-status')).toContainText('링크');
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('이메일 발송 제한과 네트워크 오류를 안내하고 다시 시도할 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('이메일').fill('fail@example.com');
  await page.getByRole('button', { name: '로그인 링크 보내기' }).click();
  await expect(page.getByTestId('auth-status')).toContainText('잠시 후');
  await expect(page.getByRole('button', { name: '로그인 링크 보내기' })).toBeEnabled();
});

test('설정 누락 시 채팅을 열지 않고 안내한다', async ({ page }) => {
  await page.route('**/auth/config', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: '로그인 서비스가 설정되지 않았습니다.' }) }));
  await page.goto('/');
  await expect(page.getByTestId('auth-status')).toContainText('설정되지');
  await expect(page.getByTestId('room-input')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeDisabled();
});

test('같은 브라우저의 탭은 각각 참가자로 세고 로그아웃은 함께 반영한다', async ({ page, context, browser }) => {
  await loginUser(page, 'tabs@example.com');
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
  await enterRoom(page, '동일 계정');
  await enterRoom(other, '동일 계정');
  await expect(page.getByTestId('chat-count')).toHaveText('2명');
  const watcherContext = await browser.newContext();
  try {
    const watcher = await watcherContext.newPage();
    await loginUser(watcher);
    await expect(watcher.getByTestId('room-item')).toContainText('2명');
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(other.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(watcher.getByTestId('room-item')).toHaveCount(0);
  } finally { await watcherContext.close(); }
});

test('로컬 저장소의 위조 세션으로 채팅에 들어갈 수 없다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('chat-auth', JSON.stringify({
    access_token: `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ sub: 'forged', exp: 2000000000 }))}.Zm9yZ2Vk`,
    refresh_token: 'forged', expires_at: 2000000000,
    user: { id: 'forged' }, token_type: 'bearer',
  })));
  await page.reload();
  await expect(page.getByTestId('auth-status')).toContainText('다시 로그인');
  await expect(page.getByTestId('room-input')).toBeHidden();
});

test('세션 만료 시 SDK가 갱신하여 새로고침 후에도 로그인한다', async ({ page }) => {
  await loginUser(page);
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('chat-auth'));
    session.expires_at = 1;
    localStorage.setItem('chat-auth', JSON.stringify(session));
  });
  const refreshed = page.waitForResponse((response) => response.url().includes('/auth/v1/token?grant_type=refresh_token') && response.ok());
  await page.reload();
  await refreshed;
  await expect(page.getByTestId('my-name')).toHaveText(/^익명-\d{4}$/);
});

test('로그아웃 요청이 실패해도 로컬 세션을 지우고 다시 접속하면 로그인을 요구한다', async ({ page }) => {
  await loginUser(page);
  await page.route('**/auth/v1/logout*', (route) => route.abort());
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chat-auth'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
});

test('로그인 화면에도 가로 스크롤이 없고 터치 대상은 48px 이상이다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const tooSmall = await page.locator('input:visible, button:visible').evaluateAll((elements) =>
    elements.filter((element) => { const box = element.getBoundingClientRect(); return box.width < 48 || box.height < 48; }).map((element) => element.id));
  expect(tooSmall).toEqual([]);
});
