import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import { checkPosterLayout } from './poster-check';

// QC 3 tính năng poster:
// 1) Bộ nhận diện (localStorage) tự áp: tên shop, logo, liên hệ, màu thương hiệu — kể cả khi đổi mẫu
// 2) Ảnh sản phẩm thật làm hình chính + nút "✂ Tách nền" (user bấm) chạy được
// 3) "Tải trọn bộ đa sàn" ra .zip đúng 3 ảnh 1080×1080 / 1080×1350 / 1080×1920

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'brand-product-export');
const LOGO = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><rect width="200" height="80" rx="16" fill="#b91c1c"/><text x="100" y="53" font-size="34" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">CÔ BA</text></svg>',
).toString('base64');
const KIT = {
  name: 'Bánh Mì Cô Ba', logo: LOGO, colorPrimary: '#3a0d0d', colorSecondary: '#7a1f1f', colorAccent: '#e23d28',
  colorInk: '#1a0e0e', colorSurface: '#fdf1ef', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam', voice: 'than-thien',
  contact: { phone: '0909 000 111', zalo: '0909 000 111' },
};
const pngSize = (b: Uint8Array) => { const dv = new DataView(b.buffer, b.byteOffset); return `${dv.getUint32(16)}x${dv.getUint32(20)}`; };

test('Bộ nhận diện + ảnh sản phẩm + xuất đa sàn', async ({ page }) => {
  test.setTimeout(400_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.addInitScript((kit) => localStorage.setItem('mivy-brand-v1', JSON.stringify(kit)), KIT);
  await page.goto('/studio/infographic');
  const preview = page.locator('[data-testid="ad-preview"]');
  await expect(preview).toBeVisible({ timeout: 30_000 });

  // 1) Bộ nhận diện tự áp, đổi mẫu vẫn giữ
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Poster BST thời trang', exact: true }).click();
  await expect(preview).toContainText('Bánh Mì Cô Ba');
  await expect(preview).toContainText('📞 0909 000 111');
  await expect(preview.locator('img[src^="data:image/svg+xml"]')).toHaveCount(1);

  // 2) Ảnh sản phẩm → hình chính; tách nền khi bấm
  await page.getByRole('button', { name: 'Sân khấu', exact: true }).click();
  await page.getByTestId('hero-upload').setInputFiles(path.join(__dirname, '..', 'public', 'sample-products', '04-sneaker.png'));
  const blobImg = preview.locator('img[src^="blob:"]');
  await expect(blobImg).toHaveCount(1, { timeout: 15_000 });
  const before = await blobImg.getAttribute('src');
  await page.getByRole('button', { name: '✂ Tách nền' }).click();
  await expect(page.getByText('Đang tách…')).toBeVisible();
  await expect(page.getByText('Đang tách…')).toBeHidden({ timeout: 240_000 });
  await expect.poll(() => blobImg.getAttribute('src')).not.toBe(before);

  for (const s of ['Dọc 4:5', 'Vuông 1:1', 'Story 9:16']) {
    await page.getByRole('button', { name: s, exact: true }).click();
    await checkPosterLayout(page, `brand+sản phẩm ${s}`);
  }

  // 3) Xuất đa sàn
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByRole('button', { name: /Tải trọn bộ đa sàn/ }).click(),
  ]);
  const zipPath = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(zipPath);
  const files = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
  const sizes = Object.values(files).map(pngSize).sort();
  expect(sizes).toEqual(['1080x1080', '1080x1350', '1080x1920']);
  for (const [n, b] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), b);
  console.log('ZIP', dl.suggestedFilename(), Object.keys(files));
});
