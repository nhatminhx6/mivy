import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Túi giấy đựng đồ ăn: mọi mẫu × mọi khổ (4 loại túi) — chữ mặt trước nằm trong vùng in an toàn (dưới miệng răng cưa,
// tránh cửa sổ), không chồng nhau, không quá nhỏ; số màu mực ≤ số màu khách chọn; khuôn có đường cắt + nếp gấp
// (+ cửa sổ); logo; chữ dài; tải PNG/PDF/SVG; 3D dựng được cả 4 loại.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'foodbag');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="fbg-face"] svg') as SVGSVGElement;
    const rect = (s: string | null) => (s ? s.split(' ').map(Number) : null);
    const [ax, ay, aw, ah] = rect(svg.getAttribute('data-area'))!;
    const band = rect(svg.getAttribute('data-band'));
    const texts = [...svg.querySelectorAll('[data-fbt]')] as SVGTextElement[];
    const sm = svg.getCTM();
    const boxes = texts.map((t) => {
      const b = t.getBBox(); const m = t.getCTM();
      const k = m && sm ? m.a / sm.a : 1, ox = m && sm ? (m.e - sm.e) / sm.a : 0, oy = m && sm ? (m.f - sm.f) / sm.d : 0;
      return { t: t.textContent || '', x: b.x * k + ox, y: b.y * k + oy, w: b.width * k, h: b.height * k, fs: parseFloat(t.getAttribute('font-size') || '0') * k, masked: !!t.closest('mask') };
    });
    const inR = (b: { x: number; y: number; w: number; h: number }, r: number[]) => b.x >= r[0] - 0.8 && b.y >= r[1] - 0.8 && b.x + b.w <= r[0] + r[2] + 0.8 && b.y + b.h <= r[1] + r[3] + 0.8;
    const out = boxes.filter((b) => b.w > 0 && !inR(b, [ax, ay, aw, ah]) && !(band && inR(b, band))).map((b) => `${b.t} [${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}×${b.h.toFixed(1)}]`);
    const small = boxes.filter((b) => b.fs < 1.8).map((b) => `${b.t}:${b.fs.toFixed(2)}`);
    const vis = boxes.filter((b) => !b.masked && b.w > 0);
    const overlaps: string[] = [];
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i], b = vis[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0.5 && iy > 0.4 * Math.min(a.h, b.h)) overlaps.push(`${a.t} × ${b.t}`);
    }
    const pr = document.querySelector('[data-testid="fbg-print"] svg') as SVGSVGElement;
    const inks = new Set<string>();
    pr.querySelectorAll('#In *').forEach((el) => {
      if (el.closest('mask,clipPath,defs')) return;
      for (const at of ['fill', 'stroke']) { const v = el.getAttribute(at); if (v && v !== 'none' && !v.startsWith('url(')) inks.add(v.toUpperCase()); }
    });
    const nInk = document.querySelectorAll('[data-testid="fbg-inks"] > div').length;
    return {
      n: texts.length, out, small, overlaps, inks: [...inks], nInk,
      cuts: pr.querySelectorAll('#CutContour path').length, folds: pr.querySelectorAll('#Fold path').length,
      win: !!band,
    };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(3);
  expect(r.out, `${label}: chữ lòi khỏi vùng in`).toEqual([]);
  expect(r.small, `${label}: chữ quá nhỏ`).toEqual([]);
  expect(r.overlaps, `${label}: chữ chồng nhau`).toEqual([]);
  expect(r.inks.length, `${label}: số màu mực ${r.inks.join(',')} > ${r.nInk}`).toBeLessThanOrEqual(r.nInk);
  expect(r.cuts, `${label}: đường cắt (+ cửa sổ)`).toBe(r.win ? 2 : 1);
  expect(r.folds, `${label}: nếp gấp`).toBeGreaterThanOrEqual(6);
  return r;
}

test('Túi giấy đựng đồ ăn: mọi mẫu × khổ, mực, logo, chữ dài, tải file, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/foodbag');
  const tpls = page.getByTestId('fbg-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  // mọi mẫu × mọi khổ của loại túi
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    const sizes = page.locator('[data-testid="fbg-sizes"] button');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      await audit(page, `mẫu ${i} khổ ${s}`);
    }
    await page.getByTestId('fbg-flat').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
  }

  // 1 màu mực → đúng 1 màu
  await tpls.nth(2).click();
  await page.locator('[data-testid="fbg-inkcount"] button').first().click();
  const one = await audit(page, '1 màu');
  expect(one.inks.length).toBe(1);

  // chữ rất dài ở mọi bố cục × 4 loại túi
  await page.locator('[data-testid="fbg-inkcount"] button').nth(1).click();
  await page.getByTestId('fbg-brand').fill('CƠM TẤM SƯỜN NƯỚNG BÌ CHẢ GIA KHÁNH QUẬN BÌNH THẠNH');
  await page.getByTestId('fbg-tag').fill('CƠM TẤM · BÚN THỊT NƯỚNG · NƯỚC SÂM · GIAO TẬN NƠI');
  await page.getByTestId('fbg-slogan').fill('Sườn nướng than hồng thơm lừng, bì chả nhà làm, nước mắm pha đúng vị miền Nam');
  await page.getByTestId('fbg-net').fill('KHỐI LƯỢNG TỊNH 500g');
  await page.getByTestId('fbg-address').fill('123/45 Nguyễn Văn Thương, Phường 25, Quận Bình Thạnh, TP.HCM');
  const layouts = page.locator('[data-testid="fbg-layouts"] button');
  for (const k of ['sos', 'banhmi', 'window', 'handle']) {
    await page.getByTestId(`fbg-kind-${k}`).click();
    for (let l = 0; l < await layouts.count(); l++) { await layouts.nth(l).click(); await audit(page, `chữ dài ${k} bố cục ${l}`); }
  }
  await page.getByTestId('fbg-flat').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // logo (PNG tạo trong trình duyệt) → mask 1 màu xuất hiện
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 120); x.fillStyle = '#000'; x.beginPath(); x.arc(60, 60, 45, 0, Math.PI * 2); x.fill(); x.fillRect(110, 20, 70, 80); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('fbg-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="fbg-face"] mask image')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('fbg-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svgTxt = fs.readFileSync(await grab('fbg-svg'), 'utf8');
  expect(svgTxt).toContain('id="CutContour"');
  expect(svgTxt).toContain('id="Fold"');
  expect((svgTxt.match(/<text/g) || []).length).toBe(0);
  const pngF = fs.readFileSync(await grab('fbg-png'));
  expect(pngF.readUInt32BE(16)).toBe(1600);

  // 3D cả 4 loại (ảnh góc mặc định) + tải ảnh 3D
  await page.getByTestId('tab-3d').click();
  for (const k of ['sos', 'banhmi', 'window', 'handle']) {
    await page.getByTestId(`fbg-kind-${k}`).click();
    await page.waitForTimeout(500);
    const u = await page.evaluate(() => (window as unknown as { __fbgSnap: (w: number, h: number) => Promise<string> }).__fbgSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${k}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const d3 = fs.readFileSync(await grab('fbg-3d'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
