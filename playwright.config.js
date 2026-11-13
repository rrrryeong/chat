import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.js/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  // 화면 폭 3종(TRD 6장): 데스크톱은 두 칸(840px 이상), 태블릿·모바일은 한 칸 전환.
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: /(auth|lobby|chat|layout|theme)\.spec\.js/,
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
      testMatch: /(auth|layout)\.spec\.js/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } },
      testMatch: /(auth|lobby|chat|layout|touch)\.spec\.js/,
    },
  ],
  webServer: {
    command: 'node tests/e2e/auth-server.js',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: String(PORT) },
  },
});
