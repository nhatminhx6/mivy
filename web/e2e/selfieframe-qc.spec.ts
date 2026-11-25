import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Khung check-in cầm tay: mọi mẫu × khổ — chữ nằm trong khung (trong đường cắt ngoài, không lấn ô cửa sổ),
// không chồng nhau, đủ to; chữ dài vẫn gọn; logo; tải PNG / PDF / SVG in–cắt (In + CutContour, chữ outline); 3D chụp được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'selfieframe');

// PNG 1×1 đỏ (logo giả)
const LOGO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(150);
  const r = await page.locator('[data-testid="sf-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const paths = svg.querySelectorAll('#CutPreview path');
    const outline = paths[0] as SVGPathElement, win = (svg.getAttribute('data-window') || '0,0,0,0').split(',').map(Number);
    const texts = Array.from(svg.querySelectorAll('text')) as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox();
      return { role: t.getAttribute('data-role') || '', text: t.textContent || '', x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(t.getAttribute('font-size') || '0') };
    });
    const pt = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return outline.isPointInFill(p); };
    const errs: string[] = [];
    const [wx, wy, ww, wh] = win;
    for (const b of boxes) {
      // chữ thật thường nhỏ hơn hộp font → co hộp 8% chiều cao mỗi bên cho phép chạm mép hộp
      const ix = b.x + 0.5, iy = b.y + b.h * 0.08, iw = b.w - 1, ih = b.h * 0.84;
      for (const [x, y] of [[ix, iy], [ix + iw, iy], [ix, iy + ih], [ix + iw, iy + ih], [ix + iw / 2, iy], [ix + iw / 2, iy + ih]]) {
        if (!pt(x, y)) { errs.push(`ngoài khung: ${b.role} "${b.text}"`); break; }
      }
      if (ix < wx + ww && ix + iw > wx && iy < wy + wh && iy + ih > wy) errs.push(`lấn ô cửa sổ: ${b.role} "${b.text}"`);
      if (b.fs < 7 && b.role !== 'avatar') errs.push(`chữ nhỏ ${b.fs.toFixed(1)}mm: ${b.role} "${b.text}"`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h * 0.9, c.y + c.h * 0.9) - Math.max(a.y + a.h * 0.1, c.y + c.h * 0.1);
      if (ox > 1 && oy > 1) errs.push(`chồng chữ: "${a.text}" × "${c.text}"`);
    }
    return { errs, n: boxes.length, cut: paths.length };
  });
  expect(r.cut, `${label}: có đường cắt viền + ô cửa sổ`).toBe(2);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(1);
  expect(r.errs, label).toEqual([]);
}

test('Khung check-in: mọi mẫu × khổ, chữ dài, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/selfieframe');
  const tpls = page.getByTestId('sf-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  // 3D mặc định dựng được
  const snap = async (name: string) => {
    const u = await page.evaluate(async () => {
      const w = window as unknown as { __sfSnap?: (w: number, h: number) => Promise<string> };
      for (let k = 0; k < 80 && !w.__sfSnap; k++) await new Promise((r) => setTimeout(r, 200));
      await new Promise((r) => setTimeout(r, 1200));
      return w.__sfSnap!(1000, 750);
    });
    expect(u.length, `3D ${name}`).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${name}.png`), Buffer.from(u.split(',')[1], 'base64'));
  };
  await snap('mac-dinh');

  await page.getByTestId('tab-flat').click();
  const sizes = page.locator('[data-testid="sf-sizes"] button');
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      await audit(page, `mẫu ${i} khổ ${s}`);
    }
    await page.getByTestId('sf-preview').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
  }

  // chữ rất dài × mọi bố cục × mọi ô cửa sổ (khổ nhỏ nhất)
  await sizes.first().click();
  await page.getByTestId('sf-field-kicker').fill('Chúc mừng ngày trọng đại nhất của hai bạn');
  await page.getByTestId('sf-field-title').fill('Nguyễn Hoàng Quốc Bảo & Trần Ngọc Thu Hà Tiệc Báo Hỷ');
  await page.getByTestId('sf-field-hashtag').fill('#QuocBaoThuHaTramNamHanhPhuc2026');
  await page.getByTestId('sf-field-extra').fill('Trung tâm tiệc cưới White Palace, Phạm Văn Đồng, TP.HCM');
  const layouts = page.locator('[data-testid="sf-layouts"] button'), wins = page.locator('[data-testid="sf-windows"] button'), outs = page.locator('[data-testid="sf-outlines"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (let w = 0; w < await wins.count(); w++) {
      await wins.nth(w).click();
      await audit(page, `chữ dài · bố cục ${l} · ô ${w}`);
    }
  }
  for (let o = 0; o < await outs.count(); o++) { await outs.nth(o).click(); await audit(page, `chữ dài · viền ${o}`); }
  await page.getByTestId('sf-preview').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // logo
  await tpls.first().click();
  await page.getByTestId('sf-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO });
  await expect(page.locator('[data-testid="sf-preview"] svg image[data-role="logo"]')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'có logo');
  await layouts.nth(3).click();
  await expect(page.locator('[data-testid="sf-preview"] svg image[data-role="logo"]')).toHaveCount(1);
  await audit(page, 'logo · MXH');
  await layouts.first().click();

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const png = fs.readFileSync(await grab('sf-png'));
  expect(png.readUInt32BE(16)).toBe(1800);
  const pdf = fs.readFileSync(await grab('sf-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('sf-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect((svg.match(/data-cut="(outline|window)"/g) || []).length).toBe(2);
  expect(svg).toContain('width="606mm"');
  expect((svg.match(/<text/g) || []).length).toBe(0);

  // 3D vài mẫu
  await page.getByTestId('tab-3d').click();
  for (const i of [3, 5, 10]) { await tpls.nth(i).click(); await page.waitForTimeout(800); await snap(`mau-${i}`); }
  const [d3] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId('sf-3d').click()]);
  const p3 = path.join(OUT, d3.suggestedFilename()); await d3.saveAs(p3);
  expect(fs.readFileSync(p3).readUInt32BE(16)).toBe(1600);

  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
