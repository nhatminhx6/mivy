import { test } from '@playwright/test';
import { checkPosterLayout as check } from './poster-check';
import path from 'path';

// QC poster minh hoạ (infographic layout 'poster'):
// 1) không phần tử nào lòi ra ngoài khung  2) các khối chữ chính [data-b] không đè nhau, không tràn trong ô
// 3) ảnh 3D load được  4) xuất PNG thật ra QC_OUT để anh duyệt (mỗi mẫu × mỗi khổ)
// + chạy MỌI bố cục với cùng 1 nội dung (user đổi bố cục tự do).

const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'poster-infographic');
const TEMPLATES = [
  'Poster khai trương / Sale', 'Poster tuyển dụng / Tech', 'Poster Flash Sale', 'Poster mỹ phẩm',
  'Poster trà sữa / quán', 'Poster BST thời trang', 'Poster minigame / giveaway',
];
const VARIANTS = ['Cổ điển', 'Sân khấu', 'Số to', 'Menu', 'Bento', 'Các bước', 'Collage'];
const SIZES = [
  { label: 'Dọc 4:5', key: '4x5' },
  { label: 'Vuông 1:1', key: '1x1' },
  { label: 'Story 9:16', key: '9x16' },
];

test('Poster minh hoạ: mọi mẫu × mọi khổ — sạch layout + xuất PNG', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/studio/infographic');
  await page.waitForSelector('[data-testid="ad-preview"]', { timeout: 30_000 });

  for (const [ti, name] of TEMPLATES.entries()) {
    await page.getByRole('button', { name, exact: true }).click();
    for (const s of SIZES) {
      await page.getByRole('button', { name: s.label, exact: true }).click();
      await check(page, `${name} ${s.key}`);
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Tải ảnh PNG/ }).click(),
      ]);
      await dl.saveAs(path.join(OUT, `poster-${ti + 1}-${s.key}.png`));
    }
  }
});

test('Poster minh hoạ: đổi MỌI bố cục với cùng nội dung vẫn sạch', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/studio/infographic');
  await page.waitForSelector('[data-testid="ad-preview"]', { timeout: 30_000 });

  for (const name of [TEMPLATES[0], TEMPLATES[1]]) {
    await page.getByRole('button', { name, exact: true }).click();
    for (const variant of VARIANTS) {
      await page.getByRole('button', { name: variant, exact: true }).click();
      for (const s of SIZES) {
        await page.getByRole('button', { name: s.label, exact: true }).click();
        await check(page, `${name} · ${variant} ${s.key}`);
      }
    }
  }
});
