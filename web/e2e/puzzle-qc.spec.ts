import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Puzzle ghép hình in ảnh: mọi mẫu × số mảnh × dáng — chữ nằm trong bảng (trong tim), không đè nhau, đủ cỡ;
// file cắt có đúng số mảnh / số đoạn cắt jigsaw; ảnh nhỏ → cảnh báo dpi; tải PDF/SVG/nắp hộp/ảnh 3D; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'puzzle');

const EXPECT: Record<string, { n: number; cols: number; rows: number }> = {
  '30': { n: 30, cols: 6, rows: 5 }, '120': { n: 120, cols: 12, rows: 10 }, '300': { n: 300, cols: 20, rows: 15 }, '500': { n: 500, cols: 25, rows: 20 },
};

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="pz-face"] svg') as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const heartPath = svg.querySelector('path[stroke="#00000033"]') as SVGPathElement | null;
    const boxes = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox();
      return { t: t.textContent || '', x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(t.getAttribute('font-size') || '0') };
    });
    const out: string[] = [];
    for (const b of boxes) {
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > vb.width + 0.5 || b.y + b.h > vb.height + 0.5) out.push(`lòi khung: "${b.t}"`);
      if (b.fs < 3) out.push(`chữ nhỏ ${b.fs.toFixed(2)}mm: "${b.t}"`);
      if (heartPath) {
        const m = 1.2;
        for (const [px, py] of [[b.x + m, b.y + b.h * 0.3], [b.x + b.w - m, b.y + b.h * 0.3], [b.x + m, b.y + b.h - m], [b.x + b.w - m, b.y + b.h - m]]) {
          const pt = svg.createSVGPoint(); pt.x = px; pt.y = py;
          if (!heartPath.isPointInFill(pt)) { out.push(`ra ngoài tim: "${b.t}"`); break; }
        }
      }
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      // vùng lõi chữ (bỏ phần dấu/đuôi chữ ~18% trên-dưới) không được chồng nhau
      const ay0 = a.y + a.h * 0.18, ay1 = a.y + a.h * 0.82, cy0 = c.y + c.h * 0.18, cy1 = c.y + c.h * 0.82;
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(ay1, cy1) - Math.max(ay0, cy0);
      if (ox > 0.5 && oy > 0.5) out.push(`chồng chữ: "${a.t}" × "${c.t}"`);
    }
    return { errs: out, n: boxes.length };
  });
  expect(r.errs, `${label}: ${r.errs.join(' | ')}`).toEqual([]);
}

async function cutInfo(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="pz-cutfile"] svg') as SVGSVGElement;
    const inner = svg.querySelector('[data-cut="inner"]')!.getAttribute('d') || '';
    const ib = (svg.querySelector('[data-cut="inner"]') as SVGPathElement).getBBox();
    const ob = (svg.querySelector('[data-cut="outline"]') as SVGPathElement).getBBox();
    return { pieces: +svg.getAttribute('data-pieces')!, innerAttr: +svg.getAttribute('data-inner')!, subpaths: (inner.match(/M/g) || []).length, ib: [ib.x, ib.y, ib.width, ib.height], ob: [ob.x, ob.y, ob.width, ob.height] };
  });
}

test('Puzzle: mẫu × số mảnh × dáng, file cắt đúng số mảnh, ảnh mờ, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/puzzle');
  const tpls = page.getByTestId('pz-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(8);
  await page.getByTestId('tab-flat').click();

  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    const shape = await page.evaluate(() => (document.querySelector('[data-testid="pz-face"] svg path[stroke="#00000033"]') ? 'heart' : 'rect'));
    for (const size of ['30', '120', '300', '500']) {
      await page.locator(`[data-size="${size}"]`).click();
      await page.waitForTimeout(120);
      await audit(page, `mẫu ${i} · ${size} mảnh · ${shape}`);
      const c = await cutInfo(page);
      const e = EXPECT[size];
      if (shape === 'rect') {
        expect(c.pieces, `mẫu ${i} ${size}: số mảnh`).toBe(e.n);
        expect(c.subpaths, `mẫu ${i} ${size}: số đoạn cắt trong`).toBe((e.rows - 1) * e.cols + (e.cols - 1) * e.rows);
        expect(c.innerAttr).toBe(c.subpaths);
      } else {
        expect(c.pieces, `tim ${size}: số mảnh gần đúng`).toBeGreaterThan(e.n * 0.7);
        expect(c.pieces).toBeLessThan(e.n * 1.35);
        expect(c.subpaths).toBeGreaterThan(0);
        // đường cắt trong nằm gọn trong viền tim
        expect(c.ib[0]).toBeGreaterThanOrEqual(c.ob[0] - 0.5);
        expect(c.ib[0] + c.ib[2]).toBeLessThanOrEqual(c.ob[0] + c.ob[2] + 0.5);
        expect(c.ib[1] + c.ib[3]).toBeLessThanOrEqual(c.ob[1] + c.ob[3] + 0.5);
      }
    }
    await page.getByTestId('pz-face').screenshot({ path: path.join(OUT, `pz-${String(i).padStart(2, '0')}.png`) });
  }

  // đổi dáng tim + chữ rất dài trên mọi bố cục
  const long = 'Chúc mừng kỷ niệm mười năm ngày cưới của bố mẹ yêu';
  for (let l = 0; l < 8; l++) {
    await page.locator('[data-testid="pz-layouts"] button').nth(l).click();
    for (const shape of ['rect', 'heart']) {
      await page.locator(`[data-shape="${shape}"]`).click();
      for (const key of ['title', 'sub', 'badge', 'box']) {
        const f = page.getByTestId(`pz-field-${key}`);
        if (await f.count()) await f.fill(key === 'badge' ? 'Phú Quốc 2026' : long);
      }
      await page.waitForTimeout(150);
      await audit(page, `bố cục ${l} · chữ dài · ${shape}`);
    }
  }
  await page.getByTestId('pz-face').screenshot({ path: path.join(OUT, 'pz-chu-dai.png') });

  // ảnh nhỏ → cảnh báo dpi
  const small = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 420; c.height = 300;
    const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 420, 300); g.addColorStop(0, '#4a8'); g.addColorStop(1, '#fc6'); x.fillStyle = g; x.fillRect(0, 0, 420, 300);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-shape="rect"]').click();
  await page.locator('[data-size="300"]').click();
  await page.getByTestId('pz-photo').setInputFiles({ name: 'anh-nho.png', mimeType: 'image/png', buffer: Buffer.from(small, 'base64') });
  await expect(page.getByTestId('pz-dpi-warn')).toBeVisible({ timeout: 10_000 });
  expect(+(await page.getByTestId('pz-dpi').getAttribute('data-dpi'))!).toBeLessThan(100);

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  await page.locator('[data-size="120"]').click();
  const pdf = fs.readFileSync(await grab('pz-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const cut = fs.readFileSync(await grab('pz-cut'), 'utf8');
  expect(cut).toContain('id="CutContour"');
  expect(cut).not.toContain('<text');
  const lid = fs.readFileSync(await grab('pz-lid'));
  expect(lid.subarray(0, 4).toString()).toBe('%PDF');

  // 3D: chữ nhật + tim
  await page.getByTestId('tab-3d').click();
  for (const shape of ['rect', 'heart']) {
    await page.locator(`[data-shape="${shape}"]`).click();
    await page.waitForTimeout(600);
    const u = await page.evaluate(() => (window as unknown as { __pzSnap: (w: number, h: number) => Promise<string> }).__pzSnap(1200, 900));
    expect(u.length).toBeGreaterThan(80_000);
    fs.writeFileSync(path.join(OUT, `pz-3d-${shape}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  const shot = fs.readFileSync(await grab('pz-shot'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
