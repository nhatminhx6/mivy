import { test, expect, Page } from '@playwright/test';
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

async function check(page: Page, tag: string) {
  await page.waitForTimeout(400);
  await page.evaluate(() => (document as any).fonts.ready);
  const res = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="ad-preview"] > div') as HTMLElement;
    const r = root.getBoundingClientRect();
    const name = (el: Element) => (el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const out = Array.from(root.querySelectorAll('*')).filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && (b.bottom > r.bottom + 1 || b.right > r.right + 2 || b.left < r.left - 2 || b.top < r.top - 2);
    }).map(name);
    const blocks = Array.from(root.querySelectorAll('[data-b]')) as HTMLElement[];
    const overlap: string[] = [];
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
      const ix = Math.min(p.right, q.right) - Math.max(p.left, q.left);
      const iy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (ix > 2 && iy > 2) overlap.push(`${name(a)} ✕ ${name(b)}`);
    }
    // chỉ ô overflow:hidden mới thật sự CẮT chữ (ô thường: phần xoay/notch lòi ra là cố ý)
    const clipped = blocks.filter((el) => getComputedStyle(el).overflow !== 'visible' && el.scrollHeight > el.clientHeight + 2).map(name);
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
    return { out, overlap, clipped, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src) };
  });
  expect(res.broken, `ảnh lỗi (${tag})`).toEqual([]);
  expect(res.out, `tràn khung (${tag})`).toEqual([]);
  expect(res.overlap, `khối chữ đè nhau (${tag})`).toEqual([]);
  expect(res.clipped, `chữ tràn trong ô (${tag})`).toEqual([]);
}

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
