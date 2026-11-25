import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bộ văn phòng: mọi mẫu → tiêu đề thư + các mặt kẹp file + card: chữ nằm trong khổ, không đè nhau;
// tải đủ file (PDF in, PDF A4, header/footer Word, khuôn bế PDF/SVG, ảnh 3D); logo tải lên hiện đúng; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'stationery');

async function audit(page: Page, label: string) {
  const res = await page.evaluate(() => {
    const keys = ['lhPlain', 'front', 'back', 'spine', 'pocket', 'cardF', 'cardB'];
    const host = document.querySelector('[data-testid="sf-hidden"]')!;
    const svgs = Array.from(host.children).map((c) => c.querySelector('svg') as SVGSVGElement);
    // thứ tự trong DOM: lhBleed, lhPlain, lhHead, lhFoot, net, front, back, spine, pocket, inside, letter, cardF, cardB
    const order = ['lhBleed', 'lhPlain', 'lhHead', 'lhFoot', 'net', 'front', 'back', 'spine', 'pocket', 'inside', 'letter', 'cardF', 'cardB'];
    const issues: string[] = [];
    let nText = 0;
    for (const k of keys) {
      const svg = svgs[order.indexOf(k)];
      const box = svg.getBoundingClientRect();
      const tol = Math.max(1, box.width * 0.002);
      const rects: { r: DOMRect; t: string }[] = [];
      for (const t of Array.from(svg.querySelectorAll('text'))) {
        let deco = false;
        for (let a: Element | null = t; a && a !== svg; a = a.parentElement) { const o = a.getAttribute('opacity'); if (o && +o < 0.5) deco = true; }
        if (deco || !(t.textContent || '').trim()) continue;
        nText++;
        const r = t.getBoundingClientRect();
        if (r.left < box.left - tol || r.right > box.right + tol || r.top < box.top - tol || r.bottom > box.bottom + tol) issues.push(`${k}: "${t.textContent}" tràn khổ`);
        const fs = parseFloat(getComputedStyle(t).fontSize || '0');
        const vbW = svg.viewBox.baseVal.width;
        if (k === 'lhPlain' && fs / vbW * 210 < 1.9) issues.push(`${k}: "${t.textContent}" chữ quá nhỏ (${(fs / vbW * 210).toFixed(2)}mm)`);
        // hộp chữ thu theo chiều cao chữ hoa (bbox gồm cả khoảng dấu) để không báo nhầm
        const sh = r.height * 0.22;
        rects.push({ r: new DOMRect(r.left, r.top + sh, r.width, r.height - sh * 2), t: t.textContent || '' });
      }
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) issues.push(`${k}: "${rects[i].t}" đè "${rects[j].t}"`);
      }
    }
    return { issues, nText };
  });
  expect(res.nText, `${label}: có chữ`).toBeGreaterThan(20);
  expect(res.issues, `${label}`).toEqual([]);
}

test('Bộ văn phòng: mọi mẫu, chữ gọn, tải đủ file', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/stationery');
  const tpls = page.getByTestId('sf-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('sf-doc-letter').click();
    await page.getByTestId('sf-letter').screenshot({ path: path.join(OUT, `thu-${String(i + 1).padStart(2, '0')}.png`) });
    await page.getByTestId('sf-doc-folder').click();
    await page.getByTestId('sf-folder').screenshot({ path: path.join(OUT, `kep-${String(i + 1).padStart(2, '0')}.png`) });
  }

  // nội dung dài + đổi font/màu vẫn gọn
  await tpls.nth(0).click();
  await page.getByTestId('sf-brand').fill('TẬP ĐOÀN XÂY DỰNG PHÚ THỊNH');
  await page.getByTestId('sf-company').fill('CÔNG TY CỔ PHẦN ĐẦU TƯ XÂY DỰNG VÀ THƯƠNG MẠI PHÚ THỊNH');
  await page.getByTestId('sf-address').fill('Tầng 12, Toà nhà Sài Gòn Center, 65 Lê Lợi, P. Bến Nghé, Q.1, TP. Hồ Chí Minh');
  await page.getByTestId('sf-email').fill('chamsockhachhang@phuthinhgroup.com.vn');
  for (let i = 0; i < n; i++) { await tpls.nth(i).click(); await page.waitForTimeout(150); await audit(page, `dài · mẫu ${i}`); }
  await page.getByTestId('sf-fonts').locator('button').nth(4).click();
  await page.getByTestId('sf-palettes').locator('button').nth(7).click();
  await audit(page, 'dài · đổi font/màu');
  await page.getByTestId('sf-doc-letter').click();
  await page.getByTestId('sf-letter').screenshot({ path: path.join(OUT, 'thu-dai.png') });

  // logo khách
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d')!; x.fillStyle = '#E8731A'; x.beginPath(); x.arc(100, 100, 90, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.fillText('PT', 40, 132); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('sf-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="sf-letter"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await page.getByTestId('sf-letter').screenshot({ path: path.join(OUT, 'thu-logo.png') });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return [p];
  };
  const [lhPdf] = await grab('sf-lh-pdf');
  expect(fs.readFileSync(lhPdf).subarray(0, 4).toString()).toBe('%PDF');
  const [a4] = await grab('sf-lh-a4');
  expect(fs.readFileSync(a4).subarray(0, 4).toString()).toBe('%PDF');
  // Word: 2 ảnh header + footer
  const got: string[] = [];
  page.on('download', async (d) => { const p = path.join(OUT, d.suggestedFilename()); await d.saveAs(p); got.push(p); });
  await page.getByTestId('sf-word').click();
  await expect.poll(() => got.length, { timeout: 60_000 }).toBe(2);
  expect(got.some((g) => g.endsWith('header-word.png')) && got.some((g) => g.endsWith('footer-word.png'))).toBe(true);
  for (const g of got) expect(fs.readFileSync(g).readUInt32BE(16)).toBe(2480);
  got.length = 0;
  await page.getByTestId('sf-fd-pdf').click();
  await expect.poll(() => got.length, { timeout: 90_000 }).toBe(1);
  expect(fs.readFileSync(got[0]).subarray(0, 4).toString()).toBe('%PDF');
  expect(fs.statSync(got[0]).size).toBeGreaterThan(80_000);
  got.length = 0;
  await page.getByTestId('sf-fd-svg').click();
  await expect.poll(() => got.length, { timeout: 60_000 }).toBe(1);
  const svg = fs.readFileSync(got[0], 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Fold"');
  expect(svg).not.toMatch(/<text[\s>]/);
  got.length = 0;
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.getByTestId('sf-png3d').click();
  await expect.poll(() => got.length, { timeout: 60_000 }).toBe(1);
  expect(fs.readFileSync(got[0]).readUInt32BE(16)).toBe(1600);
  await page.locator('[data-testid="mockup-3d"]').screenshot({ path: path.join(OUT, '3d-logo-dai.png') });

  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
