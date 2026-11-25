import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC 3D Bảng giá: tab 3D mặc định dựng được; đổi cảnh (để bàn / treo tường), đổi khung, đổi khổ → vẫn chụp được;
// tải ảnh 3D 1600px; tab phẳng vẫn xuất PNG/PDF như cũ; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pricelist-3d');
const pngWH = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

test('Bảng giá 3D: cảnh để bàn + treo tường, mọi khổ, tải ảnh 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/pricelist');
  await expect(page.locator('[data-testid="pl-3d"] canvas')).toBeVisible({ timeout: 90_000 });
  // bản thiết kế phẳng vẫn được dựng (đo tự vừa khổ) dù đang ở tab 3D
  await expect(page.locator('[data-testid="pl-preview"] [data-pl-body]')).toHaveCount(1);

  const snap = async (name: string) => {
    await page.waitForTimeout(1500);
    const u = await page.evaluate(() => (window as unknown as { __plSnap: (w: number, h: number) => Promise<string> }).__plSnap(800, 600));
    const buf = Buffer.from(u.split(',')[1], 'base64');
    expect(pngWH(buf), name).toEqual([800, 600]);
    expect(buf.length, `${name}: ảnh 3D không rỗng`).toBeGreaterThan(40_000);
    fs.writeFileSync(path.join(OUT, name), buf);
  };

  for (const a of ['Dọc 4:5', 'Story 9:16', 'Vuông 1:1', 'A4 in']) {
    await page.getByRole('button', { name: a, exact: true }).click();
    for (const sc of ['Để bàn · kệ mica', 'Treo tường · có khung']) {
      await page.getByRole('button', { name: sc }).click();
      await snap(`${a.replace(/[^\w]+/g, '-')}-${sc.startsWith('Để') ? 'ban' : 'tuong'}.png`);
    }
  }
  for (const f of ['Khung nhôm đen', 'Khung gỗ sồi', 'Khung trắng']) {
    await page.getByRole('button', { name: f }).click();
    await snap(`khung-${f.split(' ').pop()}.png`);
  }
  await page.getByRole('button', { name: 'Spa / Nail', exact: true }).click();
  await snap('spa-tuong.png');

  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('pl-3d-png').click()]);
  const f3 = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(f3);
  expect(pngWH(fs.readFileSync(f3))).toEqual([1600, 1200]);

  // tab phẳng: xuất PNG + PDF như cũ
  await page.getByTestId('tab-flat').click();
  await expect(page.locator('[data-testid="pl-preview"] [data-pl-body]')).toBeVisible();
  const [dp] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải ảnh PNG/ }).click()]);
  const fp = path.join(OUT, dp.suggestedFilename()); await dp.saveAs(fp);
  expect(pngWH(fs.readFileSync(fp))).toEqual([2480, 3508]);
  const [dpdf] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('pl-pdf').click()]);
  const fpdf = path.join(OUT, dpdf.suggestedFilename()); await dpdf.saveAs(fpdf);
  expect(fs.readFileSync(fpdf).subarray(0, 4).toString()).toBe('%PDF');
  await expect(page.getByTestId("print-request")).toBeVisible();
  expect(errors).toEqual([]);
});
