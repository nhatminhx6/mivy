import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC 3D thiệp: tab 3D mặc định dựng được cảnh (cưới: phong bì + dấu sáp; sinh nhật: đế gỗ + confetti),
// chụp ảnh 3D tải về đúng 1600px, chuyển tab phẳng vẫn còn bản thiết kế, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cards-3d');

test('Thiệp: 3D cưới + sinh nhật, tải ảnh 3D', async ({ page }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('/studio/cards');
  await expect(page.getByTestId('card-tpl')).toHaveCount(28, { timeout: 60_000 });
  await expect(page.getByTestId('tab-3d')).toBeVisible();
  const snap = async (name: string) => {
    await expect.poll(() => page.evaluate(() => typeof (window as any).__cdSnap === 'function'), { timeout: 30_000 }).toBe(true);
    await page.waitForTimeout(2500);
    const url: string = await page.evaluate(() => (window as any).__cdSnap(1200, 900));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(60_000); // cảnh có nội dung, không trắng trơn
    fs.writeFileSync(path.join(OUT, name), buf);
  };
  for (const i of [0, 5, 9]) { await page.getByTestId('card-tpl').nth(i).click(); await snap(`wd-3d-${i}.png`); }
  // tải ảnh 3D
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('card-3d').click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p);
  expect(fs.readFileSync(p).readUInt32BE(16)).toBe(1600);
  // sinh nhật
  await page.getByRole('button', { name: 'Sinh nhật', exact: true }).click();
  for (const i of [0, 4]) { await page.getByTestId('card-tpl').nth(i).click(); await snap(`bd-3d-${i}.png`); }
  // tab phẳng vẫn có thiết kế
  await page.getByTestId('tab-flat').click();
  await expect(page.locator('[data-testid="card-preview"] svg')).toBeVisible();
  expect(errors).toEqual([]);
});
