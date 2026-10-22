import { expect, Page } from '@playwright/test';

// Kiểm layout poster đang hiện trong preview:
// không lòi ra ngoài khung, khối chữ [data-b] không đè nhau, ô overflow:hidden không cắt chữ, ảnh load đủ.
export async function checkPosterLayout(page: Page, tag: string) {
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
    return { out, overlap, clipped, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src.slice(0, 60)) };
  });
  expect(res.broken, `ảnh lỗi (${tag})`).toEqual([]);
  expect(res.out, `tràn khung (${tag})`).toEqual([]);
  expect(res.overlap, `khối chữ đè nhau (${tag})`).toEqual([]);
  expect(res.clipped, `chữ tràn trong ô (${tag})`).toEqual([]);
}
