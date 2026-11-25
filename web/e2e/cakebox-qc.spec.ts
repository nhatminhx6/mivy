import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp bánh kem · cupcake · tráng miệng: 3 loại × mọi khổ × mọi mẫu (+ mọi hình cửa sổ) → khuôn bế đủ số mảnh
// (mỗi mảnh 1 đường cắt kín), có nét gấp, lỗ cửa sổ / lỗ khay đúng số; chữ nằm gọn trong từng tấm, KHÔNG đè vùng
// cửa sổ, không chồng nhau, không quá nhỏ; chữ dài + logo vẫn gọn; tải PDF / SVG (outline, CutContour, Fold) / ảnh 3D;
// ?kind= mở đúng loại; chụp 3D từng loại × đóng/mở nắp để soi. Không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cakebox');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(100);
  const r = await page.locator('[data-testid="cb-flat"] svg').evaluate((svg: SVGSVGElement) => {
    const outer = svg.querySelector('[data-cut="outer"]')?.getAttribute('d') || '';
    const holes = svg.querySelector('[data-cut="holes"]')?.getAttribute('d') || '';
    const folds = svg.querySelector('#Fold path')?.getAttribute('d') || '';
    const bad: string[] = [];
    let n = 0, winPanels = 0, minSize = 99, minText = '';
    svg.querySelectorAll('[data-panel]').forEach((g) => {
      const rr = g.querySelector('[data-panel-rect]')!.getBoundingClientRect();
      const wr = g.querySelector('[data-win-rect]')?.getBoundingClientRect();
      if (wr) winPanels++;
      const vert = /rotate\((-?90)\)/.test(g.querySelector('g[transform]')?.getAttribute('transform') || '');
      const boxes: { b: DOMRect; s: string }[] = [];
      g.querySelectorAll('text').forEach((t) => {
        const b = t.getBoundingClientRect();
        if (!b.width || !(t.textContent || '').trim()) return;
        n++;
        const fs = parseFloat(t.getAttribute('font-size') || '99');
        if (fs < minSize) { minSize = fs; minText = `${g.getAttribute('data-panel')}: ${t.textContent}`; }
        if (b.left < rr.left - 0.5 || b.right > rr.right + 0.5 || b.top < rr.top - 0.5 || b.bottom > rr.bottom + 0.5) bad.push(`${g.getAttribute('data-panel')}: lấn ra ngoài "${t.textContent}"`);
        const core = (r: DOMRect) => vert
          ? { l: r.left + r.width * 0.2, r: r.right - r.width * 0.2, t: r.top, b: r.bottom }
          : { l: r.left, r: r.right, t: r.top + r.height * 0.2, b: r.bottom - r.height * 0.2 };
        if (wr) {
          const A = core(b);
          const ix = Math.min(A.r, wr.right) - Math.max(A.l, wr.left), iy = Math.min(A.b, wr.bottom) - Math.max(A.t, wr.top);
          if (ix > 0.5 && iy > 0.5) bad.push(`${g.getAttribute('data-panel')}: đè cửa sổ "${t.textContent}"`);
        }
        boxes.push({ b, s: t.textContent || '' });
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const core = (r: DOMRect) => vert
          ? { l: r.left + r.width * 0.2, r: r.right - r.width * 0.2, t: r.top, b: r.bottom }
          : { l: r.left, r: r.right, t: r.top + r.height * 0.2, b: r.bottom - r.height * 0.2 };
        const A = core(boxes[i].b), C = core(boxes[j].b);
        const ix = Math.min(A.r, C.r) - Math.max(A.l, C.l), iy = Math.min(A.b, C.b) - Math.max(A.t, C.t);
        if (ix > 0.5 && iy > 0.5) bad.push(`${g.getAttribute('data-panel')}: chồng "${boxes[i].s}" × "${boxes[j].s}"`);
      }
    });
    return {
      loops: (outer.match(/M/g) || []).length, closed: outer.trim().endsWith('Z'), holeLoops: (holes.match(/M/g) || []).length,
      folds: (folds.match(/M/g) || []).length, bad, n, minSize, minText, winPanels,
      pieces: +(svg.getAttribute('data-pieces') || 0), insertHoles: +(svg.getAttribute('data-insert-holes') || 0), win: svg.getAttribute('data-win'),
      wmm: parseFloat(svg.getAttribute('width') || '0'),
    };
  });
  expect(r.loops, `${label}: mỗi mảnh 1 đường cắt kín`).toBe(r.pieces);
  expect(r.closed, `${label}: đường cắt khép kín`).toBe(true);
  expect(r.folds, `${label}: có nét gấp`).toBeGreaterThan(6);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(4);
  expect(r.bad, `${label}: chữ lỗi`).toEqual([]);
  expect(r.minSize, `${label}: chữ quá nhỏ (${r.minText})`).toBeGreaterThanOrEqual(1.5);
  if (r.win !== 'none') {
    expect(r.winPanels, `${label}: có 1 mặt cửa sổ`).toBe(1);
    expect(r.holeLoops, `${label}: lỗ cửa sổ + lỗ khay`).toBe(1 + r.insertHoles);
  } else {
    expect(r.winPanels, `${label}: không cửa sổ`).toBe(0);
    expect(r.holeLoops).toBe(r.insertHoles);
  }
  return r;
}

test('Hộp bánh: mọi loại × khổ × mẫu × cửa sổ, file in, 3D', async ({ page }) => {
  test.setTimeout(900_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/cakebox');
  const kinds = page.getByTestId('cb-kind');
  await expect(kinds.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('cb-tpl').first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  let combos = 0;
  const tpls = page.getByTestId('cb-tpl'), wins = page.getByTestId('cb-win');
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('cb-size');
    expect(await sizes.count()).toBe(3);
    for (let s = 0; s < 3; s++) {
      await sizes.nth(s).click();
      const nt = await tpls.count();
      expect(nt).toBeGreaterThanOrEqual(10);
      for (let i = 0; i < nt; i++) {
        await tpls.nth(i).click();
        const r = await audit(page, `loại ${k} khổ ${s} mẫu ${i}`);
        expect(r.wmm).toBeGreaterThan(200);
        if (k === 1) expect(r.insertHoles, 'khay cupcake đủ lỗ').toBe([2, 4, 6][s]);
        combos++;
      }
      // mọi hình cửa sổ trên 3 mẫu khác font
      for (const i of [0, 4, 8]) {
        await tpls.nth(i).click();
        for (let w = 0; w < 4; w++) { await wins.nth(w).click(); await audit(page, `loại ${k} khổ ${s} mẫu ${i} cửa sổ ${w}`); combos++; }
        await wins.nth(k === 0 ? 0 : 1).click();
      }
    }
    await page.locator('[data-testid="cb-flat"] svg').screenshot({ path: path.join(OUT, `khuon-${k}.png`) });
  }
  expect(combos).toBeGreaterThanOrEqual(200);

  // chữ rất dài + logo
  await page.getByTestId('cb-brand').fill('Tiệm Bánh Kem Handmade Thu Hà Chi Nhánh Thủ Đức');
  await page.getByTestId('cb-tagline').fill('Bánh kem bắp, bánh kem trái cây, bánh mousse và bánh sinh nhật theo yêu cầu');
  await page.getByTestId('cb-note').fill('Làm bằng cả trái tim — ngọt vừa, tươi mỗi ngày');
  await page.getByTestId('cb-hotline').fill('0909 123 456 - 028 3812 3456');
  await page.getByTestId('cb-website').fill('facebook.com/tiembanhkemthuha.thuduc');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d')!; x.fillStyle = '#E0598B'; x.beginPath(); x.arc(60, 60, 56, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.fillText('TH', 14, 82); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('cb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="cb-flat"] svg image').first()).toBeAttached({ timeout: 10_000 });
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('cb-size');
    for (let s = 0; s < 3; s++) {
      await sizes.nth(s).click();
      for (let i = 0; i < await tpls.count(); i++) { await tpls.nth(i).click(); await audit(page, `chữ dài loại ${k} khổ ${s} mẫu ${i}`); }
    }
  }
  await page.locator('[data-testid="cb-flat"] svg').screenshot({ path: path.join(OUT, 'khuon-chu-dai-logo.png') });

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  await kinds.nth(0).click();
  const pdf = fs.readFileSync(await grab('cb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab('cb-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Fold"');
  expect(svg).not.toMatch(/<text[\s>]/);
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(3000);
  const shot = fs.readFileSync(await grab('cb-png'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();

  // ?kind= mở đúng loại
  await page.goto('/studio/cakebox?kind=dessert');
  await expect(page.locator('[data-testid="cb-kind"][data-active="true"]')).toHaveText(/tráng miệng/, { timeout: 90_000 });
  await page.goto('/studio/cakebox?kind=cupcake');
  await expect(page.locator('[data-testid="cb-kind"][data-active="true"]')).toHaveText(/cupcake/, { timeout: 90_000 });

  // chụp 3D từng loại × đóng/mở (góc mặc định) để soi
  await page.goto('/studio/cakebox');
  await expect(kinds.first()).toBeVisible({ timeout: 90_000 });
  await page.waitForFunction(() => !!(window as unknown as { __cbSnap?: unknown }).__cbSnap, null, { timeout: 60_000 });
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    await page.waitForTimeout(400);
    for (const pose of ['closed', 'open'] as const) {
      const url = await page.evaluate((p) => (window as unknown as { __cbSnap: (w: number, h: number, p: string) => Promise<string> }).__cbSnap(1200, 900, p), pose);
      fs.writeFileSync(path.join(OUT, `3d-${k}-${pose}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  expect(errors).toEqual([]);
});
