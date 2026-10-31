import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

// QC tab "Bộ ảnh chi tiết" (/studio/image?tab=detail): bật/tắt slide, đổi sàn đổi khổ, chữ dài không vỡ, ZIP đúng số ảnh + kích thước.

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'detail-set');
const jpegWH = (b: Uint8Array) => { for (let i = 2; i < b.length - 9; i++) if (b[i] === 0xff && (b[i + 1] === 0xc0 || b[i + 1] === 0xc2)) return [b[i + 7] * 256 + b[i + 8], b[i + 5] * 256 + b[i + 6]]; return [0, 0]; };

async function slideColors(page: Page) {
  return page.$$eval('[data-testid="detail-preview"] canvas', (cs) => (cs as HTMLCanvasElement[]).map((c) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 53) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
    return { slide: c.dataset.slide, w: c.width, h: c.height, colors: seen.size };
  }));
}

async function zipOf(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('detail-download').click()]);
  return unzipSync(new Uint8Array(fs.readFileSync((await dl.path())!)));
}

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('bộ ảnh chi tiết: đủ slide, đổi sàn, chữ dài, ZIP đúng', async ({ page }) => {
  await page.goto('/studio/image');
  await page.evaluate(() => { indexedDB.deleteDatabase('mivy'); localStorage.removeItem('mivy-detail-set'); });
  await page.goto('/studio/image?tab=detail');
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();

  // mặc định 4 slide, mỗi slide có nội dung thật
  await expect(page.locator('[data-testid="detail-preview"] canvas')).toHaveCount(4);
  for (const s of await slideColors(page)) expect(s.colors, `slide ${s.slide} trống`).toBeGreaterThan(12);

  // bật bảng size + hướng dẫn → 6 slide
  const chips = page.getByTestId('detail-slides');
  await chips.getByRole('button', { name: 'Bảng size' }).click();
  await chips.getByRole('button', { name: 'Hướng dẫn dùng' }).click();
  await expect(page.locator('[data-testid="detail-preview"] canvas')).toHaveCount(6);

  // chữ rất dài không làm hỏng render
  await page.getByTestId('detail-name').fill('Áo thun cotton 100% form rộng unisex in hình mèo dễ thương phiên bản giới hạn mùa hè 2026');
  await page.waitForTimeout(300);
  for (const s of await slideColors(page)) expect(s.colors, `slide ${s.slide} trống sau chữ dài`).toBeGreaterThan(12);

  // Shopee: 6 ảnh 1080×1080
  let files = await zipOf(page);
  let names = Object.keys(files).sort();
  expect(names).toHaveLength(6);
  expect(names[0]).toMatch(/^01-anh-bia\.jpg$/);
  for (const n of names) { expect(jpegWH(files[n])).toEqual([1080, 1080]); fs.writeFileSync(path.join(OUT, `shopee-${n}`), files[n]); }

  // Facebook: khổ 4:5
  await page.getByTestId('detail-platform').getByRole('button', { name: /Facebook/ }).click();
  const prev = await slideColors(page);
  expect(prev[0].h / prev[0].w).toBeCloseTo(1.25, 2);
  files = await zipOf(page);
  names = Object.keys(files).sort();
  for (const n of names) { expect(jpegWH(files[n])).toEqual([1080, 1350]); fs.writeFileSync(path.join(OUT, `facebook-${n}`), files[n]); }

  // tự lưu: tải lại trang vẫn giữ nội dung
  await page.reload();
  // ảnh mẫu đã được trang tự lưu → chỉ bấm lại nếu chưa khôi phục
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click({ timeout: 3000 }).catch(() => {});
  await expect(page.getByTestId('detail-name')).toHaveValue(/Áo thun cotton/);
});

test('bộ ảnh chi tiết: điện thoại không tràn ngang', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio/image?tab=detail');
  await page.getByRole('button', { name: 'Dùng ảnh mẫu' }).first().click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
});
