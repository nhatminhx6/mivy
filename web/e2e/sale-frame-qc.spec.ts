import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC tab "Khung sale" (/studio/image?tab=frame): 6 kiểu khung × đợt sale vẽ ra nội dung, giá từng sản phẩm,
// chữ dài không vỡ, ZIP cả loạt đúng số ảnh + 1080×1080. Xuất 1 tấm tổng hợp để anh duyệt.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'sale-frame');
const jpegWH = (b: Uint8Array) => { for (let i = 2; i < b.length - 9; i++) if (b[i] === 0xff && (b[i + 1] === 0xc0 || b[i + 1] === 0xc2)) return [b[i + 7] * 256 + b[i + 8], b[i + 5] * 256 + b[i + 6]]; return [0, 0]; };
const preview = (page: Page) => page.evaluate(() => (document.querySelector('[data-testid="frame-preview"]') as HTMLCanvasElement).toDataURL('image/jpeg', 0.85));
const colorsOf = (page: Page, sel: string) => page.$$eval(sel, (cs) => (cs as HTMLCanvasElement[]).map((c) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; const seen = new Set<number>();
  for (let i = 0; i < d.length; i += 4 * 31) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
  return seen.size;
}));

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('khung sale: đủ kiểu, giá từng sản phẩm, ZIP cả loạt', async ({ page }) => {
  await page.goto('/studio/image');
  await page.evaluate(() => { indexedDB.deleteDatabase('mivy'); localStorage.removeItem('mivy-sale-frame'); });
  await page.goto('/studio/image?tab=frame');
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click();
  await expect(page.getByTestId('frame-panel')).toBeVisible();
  await page.waitForTimeout(500);
  for (const n of await colorsOf(page, '[data-testid="frame-styles"] canvas')) expect(n).toBeGreaterThan(8);

  // giá sản phẩm 1 → khung đổi
  const before = await preview(page);
  await page.getByTestId('frame-price').fill('199000');
  await page.getByTestId('frame-old').fill('299000');
  await page.getByTestId('frame-extra').fill('Mua 2 giảm 10%');
  await expect.poll(() => preview(page)).not.toBe(before);

  // tấm tổng hợp: 3 đợt sale × 6 kiểu
  const tiles: string[] = [];
  for (const ev of ['11.11', 'Tết', 'Black Friday']) {
    await page.getByTestId('frame-events').getByRole('button', { name: ev, exact: true }).click();
    for (let i = 0; i < 6; i++) { await page.getByTestId('frame-styles').locator('button').nth(i).click(); await page.waitForTimeout(80); tiles.push(await preview(page)); }
  }
  const sheet = await page.evaluate(async (urls) => {
    const T = 360, c = document.createElement('canvas'); c.width = T * 6; c.height = T * Math.ceil(urls.length / 6);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#222'; ctx.fillRect(0, 0, c.width, c.height);
    for (const [i, u] of urls.entries()) { const im = new Image(); im.src = u; await im.decode(); ctx.drawImage(im, (i % 6) * T + 6, Math.floor(i / 6) * T + 6, T - 12, T - 12); }
    return c.toDataURL('image/jpeg', 0.88);
  }, tiles);
  fs.writeFileSync(path.join(OUT, 'khung-sale-tong-hop.jpg'), Buffer.from(sheet.split(',')[1], 'base64'));

  // chữ rất dài + sản phẩm 2 chưa có giá: vẫn vẽ ra nội dung
  await page.getByTestId('frame-label').fill('SIÊU SALE SINH NHẬT 10 NĂM CỰC LỚN NHẤT NĂM');
  await page.getByTestId('studio-product-strip').locator('button').nth(1).click();
  await expect(page.getByTestId('frame-price')).toHaveValue('');
  for (const n of await colorsOf(page, '[data-testid="frame-preview"]')) expect(n).toBeGreaterThan(20);

  // ZIP cả loạt: 2 ảnh 1080×1080
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('frame-download-all').click()]);
  const files = unzipSync(new Uint8Array(fs.readFileSync((await dl.path())!)));
  const names = Object.keys(files);
  expect(names).toHaveLength(2);
  for (const n of names) expect(jpegWH(files[n])).toEqual([1080, 1080]);

  // tự lưu giá đã nhập
  await page.reload();
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click({ timeout: 3000 }).catch(() => {});
  await page.getByTestId('studio-product-strip').locator('button').first().click();
  await expect(page.getByTestId('frame-price')).toHaveValue('199000');
});

test('khung sale: điện thoại không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio/image?tab=frame');
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click();
  await expect(page.getByTestId('frame-panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
