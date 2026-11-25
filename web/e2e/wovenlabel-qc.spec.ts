import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Mác áo dệt · nhãn may: mọi loại × mẫu × khổ — chữ nằm trong mặt mác, không chồng nhau, có đường gấp/cắt đúng kiểu,
// mác dệt ≤ 6 màu chỉ, cảnh báo chữ nhỏ, bộ size ra đủ mác trong file sản xuất, logo 1 màu, tải PNG/PDF/SVG, 3D mọi loại.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'wovenlabel');

async function audit(page: Page, label: string) {
  const r = await page.locator('[data-testid="wl-face"] svg').evaluate((svg: SVGSVGElement) => {
    const W = +svg.getAttribute('data-w')!, H = +svg.getAttribute('data-h')!;
    const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('[data-deco]')) as SVGTextElement[];
    const boxes = texts.map((t) => { const b = t.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height, s: t.textContent || '', fs: parseFloat(t.getAttribute('font-size') || '0') }; });
    const out = boxes.filter((b) => b.w > 0 && (b.x < -0.06 || b.y < -0.06 || b.x + b.w > W + 0.06 || b.y + b.h > H + 0.06)).map((b) => b.s);
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0.05 && iy > 0.05) overlaps.push(`${a.s} × ${b.s}`);
    }
    return { n: boxes.length, out, overlaps, minFs: Math.min(...boxes.map((b) => b.fs).filter((v) => v > 0)) };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.out, `${label}: chữ lòi ra ngoài mác`).toEqual([]);
  expect(r.overlaps, `${label}: chữ chồng nhau`).toEqual([]);
  expect(r.minFs, `${label}: cỡ chữ`).toBeGreaterThan(0.5);
  return r;
}

test('Mác áo dệt: mọi loại × mẫu × khổ, màu chỉ, bộ size, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/wovenlabel');
  await expect(page.getByTestId('wl-tpl').first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();

  let n = 0;
  for (const kind of ['main', 'size', 'care', 'patch']) {
    await page.getByTestId(`wl-kind-${kind}`).click();
    await page.waitForTimeout(300);
    const tpls = page.getByTestId('wl-tpl');
    const tc = await tpls.count();
    for (let i = 0; i < tc; i++) {
      await tpls.nth(i).click();
      const sizes = page.locator('[data-testid="wl-sizes"] button');
      const sc = await sizes.count();
      for (let s = 0; s < sc; s++) {
        await sizes.nth(s).click();
        await page.waitForTimeout(120);
        await audit(page, `${kind} mẫu ${i} khổ ${s}`);
        // đường cắt luôn có; kiểu gấp 2 đầu / gấp đôi có đường gấp
        const geo = await page.locator('[data-testid="wl-flatgeom"] svg').evaluate((svg) => ({
          cut: svg.querySelectorAll('[data-layer="CutContour"]').length,
          fold: svg.querySelectorAll('[data-layer="Fold"] line').length,
        }));
        expect(geo.cut, `${kind} ${i}/${s}: có CutContour`).toBe(1);
        const fold = await page.locator('[data-testid="wl-folds"] button[class*="indigo"]').innerText();
        if (/Gấp/.test(fold)) expect(geo.fold, `${kind} ${i}/${s}: có đường gấp`).toBeGreaterThan(0);
        n++;
      }
      if (kind === 'main' || kind === 'size') {
        const colors = Number(await page.getByTestId('wl-colors').getAttribute('data-count'));
        expect(colors, `${kind} mẫu ${i}: ≤ 6 màu chỉ`).toBeLessThanOrEqual(6);
      }
      await page.getByTestId('wl-flat').screenshot({ path: path.join(OUT, `${kind}-${i}.png`) });
    }
    // mọi kiểu gấp hợp lệ của loại này
    const folds = page.locator('[data-testid="wl-folds"] button');
    for (let f = 0; f < await folds.count(); f++) { await folds.nth(f).click(); await page.waitForTimeout(100); await audit(page, `${kind} gấp ${f}`); }
  }
  expect(n).toBeGreaterThanOrEqual(25);

  // chữ quá dài trên mác damask 50×15 → co nhỏ, vẫn trong mác + hiện cảnh báo
  await page.getByTestId('wl-kind-main').click();
  await page.getByTestId('wl-tpl').first().click();
  await page.locator('[data-testid="wl-sizes"] button').first().click();
  await page.getByTestId('wl-in-brand').fill('CÔNG TY TNHH THỜI TRANG VÀ PHỤ KIỆN QUỐC BẢO & THU HÀ VIỆT NAM');
  await page.getByTestId('wl-in-tagline').fill('Thiết kế, may đo và sản xuất thủ công tại Việt Nam từ năm 2020 — chính hãng');
  await page.waitForTimeout(250);
  await audit(page, 'chữ dài');
  await expect(page.getByTestId('wl-warning').first()).toBeVisible();
  await page.getByTestId('wl-in-brand').fill('AN KHANG');
  await page.getByTestId('wl-in-tagline').fill('Made in Vietnam');

  // logo → 1 màu (mask), nằm trong mác
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 120;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 120, 120);
    x.fillStyle = '#c0392b'; x.beginPath(); x.arc(60, 60, 44, 0, Math.PI * 2); x.fill(); x.fillStyle = '#1a1a1a'; x.fillRect(40, 40, 40, 40);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-testid="wl-layouts"] button').nth(1).click(); // Logo + chữ
  await page.getByTestId('wl-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="wl-face"] [data-logo]')).toHaveCount(1, { timeout: 15_000 });
  await audit(page, 'có logo');
  expect(Number(await page.getByTestId('wl-colors').getAttribute('data-count'))).toBeLessThanOrEqual(6);

  // bộ size 6 cỡ → file sản xuất đủ 6 mác
  await page.getByTestId('wl-kind-size').click();
  await page.getByTestId('wl-in-sizes').fill('XS, S, M, L, XL, XXL');
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="wl-sheet"] [data-wl-item]')).toHaveCount(6);
  await expect(page.locator('[data-testid="wl-size-pick"] button')).toHaveCount(6);
  await page.locator('[data-testid="wl-size-pick"] button').nth(5).click();
  await expect(page.locator('[data-testid="wl-face"] text').first()).toHaveText('XXL');
  await audit(page, 'size XXL');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pngFile = fs.readFileSync(await grab('wl-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1600);
  const pdf = fs.readFileSync(await grab('wl-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('wl-svg'), 'utf8');
  expect((svg.match(/<text/g) || []).length, 'SVG đã outline').toBe(0);
  expect(svg).toContain('data-layer="Fold"');
  expect(svg).toContain('data-layer="CutContour"');
  expect((svg.match(/data-wl-item/g) || []).length).toBe(6);

  // 3D từng loại
  await page.getByTestId('tab-3d').click();
  for (const kind of ['main', 'size', 'care', 'patch']) {
    await page.getByTestId(`wl-kind-${kind}`).click();
    await page.waitForTimeout(400);
    const u = await page.evaluate(() => (window as unknown as { __wlSnap: (w: number, h: number) => Promise<string> }).__wlSnap(1200, 900));
    expect(u.length, `3D ${kind}`).toBeGreaterThan(30_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  const d3 = fs.readFileSync(await grab('wl-3d-png'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
