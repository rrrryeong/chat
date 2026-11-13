import { expect, test, loginUser } from './fixtures.js';

const bodyBackground = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('Material 3 테마', () => {
  test('라이트 모드는 M3 surface 배경과 primary 버튼 색을 쓴다', async ({ openUser }) => {
    const page = await openUser();
    expect(await bodyBackground(page)).toBe('rgb(254, 247, 255)');
    await expect(page.getByTestId('room-submit')).toHaveCSS('background-color', 'rgb(103, 80, 164)');
  });

  test('시스템이 다크 모드면 M3 다크 색으로 바뀐다', async ({ openUser }) => {
    const page = await openUser();
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await bodyBackground(page)).toBe('rgb(20, 18, 24)');
    await expect(page.getByTestId('room-submit')).toHaveCSS('background-color', 'rgb(208, 188, 255)');
  });

  test('누름 효과는 200ms이고, 동작 줄이기 설정이면 꺼진다', async ({ openUser }) => {
    const page = await openUser();
    const duration = () =>
      page.getByTestId('room-submit').evaluate((el) => getComputedStyle(el, '::before').transitionDuration);
    expect(await duration()).toBe('0.2s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await duration()).toBe('0s');
  });

  test('더블탭 확대와 탭 지연을 없앤다', async ({ openUser }) => {
    const page = await openUser();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe(
      'manipulation',
    );
  });

  test('SDK·CSS·웹 글꼴을 외부 CDN에서 불러오지 않는다', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const hosts = new Set();
    page.on('request', (request) => hosts.add(new URL(request.url()).host));
    await loginUser(page);
    expect([...hosts]).toEqual(['127.0.0.1:3100']);
    await context.close();
  });
});
