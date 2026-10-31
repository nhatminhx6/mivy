import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng hiệu (/studio/signage): mọi loại × mọi mẫu — chữ không lọt ra ngoài tấm, tường phủ kín ô xem trước.
// Chụp lưới mẫu từng loại để anh duyệt (QC_OUT, mặc định test-results/signage). SHOT_TAG đặt tiền tố tên ảnh (vd before/after).

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'signage');
const TAG = process.env.SHOT_TAG || 'signage';
const KINDS = ['Cắt CNC', 'Đèn neon', 'Hộp đèn', 'Chữ nổi LED', 'Khắc laser', 'Bảng phấn', 'In màu'];

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('bảng hiệu: chữ nằm trong tấm, tường phủ kín, chụp lưới mẫu', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/signage');
  const grid = page.locator('[data-testid="sign-tpl"]').first().locator('..');
  await expect(grid).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);

  const problems: string[] = [];
  for (const k of KINDS) {
    await page.getByTestId('sign-kind').filter({ hasText: k }).click();
    await page.waitForTimeout(400);
    // chữ phải nằm trong khung tấm (data-plate); bỏ qua nếu bản cũ chưa có đánh dấu
    const bad = await page.$$eval('[data-testid="sign-tpl"]', (btns) => btns.flatMap((b) => {
      const plate = b.querySelector('[data-plate]'); if (!plate) return [];
      const P = plate.getBoundingClientRect(), tol = Math.max(P.width, P.height) * 0.01;
      const name = b.textContent || '';
      return Array.from(b.querySelectorAll('svg text')).map((t) => t.getBoundingClientRect())
        .filter((r) => r.width > 0 && (r.left < P.left - tol || r.right > P.right + tol || r.top < P.top - tol || r.bottom > P.bottom + tol))
        .map(() => name);
    }));
    problems.push(...[...new Set(bad)].map((n) => `${k}: ${n}`));
    // tường phủ kín ô 4:3 (svg cao bằng ô)
    const gaps = await page.$$eval('[data-testid="sign-tpl"] > div > svg', (ss) => ss.filter((s) => {
      const r = s.getBoundingClientRect(), p = s.parentElement!.getBoundingClientRect();
      return Math.abs(r.height - p.height) > 2 || Math.abs(r.width - p.width) > 2;
    }).length);
    expect(gaps, `${k}: ô mẫu hở tường`).toBe(0);
    await grid.screenshot({ path: path.join(OUT, `${TAG}-${k.replace(/\s+/g, '-')}.png`) });
  }
  console.log('chữ lọt ngoài tấm:', problems);
  expect(problems).toEqual([]);
});
