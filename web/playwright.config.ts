import { defineConfig } from '@playwright/test';

// Test QC: render mọi poster rồi tự chấm lỗi layout. Dùng Chrome sẵn có (channel 'chrome').
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3009',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3009',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
