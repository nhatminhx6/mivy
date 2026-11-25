import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Giấy gói quà: mọi mẫu → ô lặp LIỀN MẠCH (ghép 2 ô không lộ đường nối, cả ngang lẫn dọc), số màu mực đúng
// (kraft/pelure 1 màu, couche ≤ số màu chọn), chữ không quá nhỏ, đổi cỡ ô / mật độ / góc / loại giấy, logo, tải file, 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'giftwrap');

// ghép ô lặp 2×2 trên canvas → so độ lệch pixel qua đường nối với độ lệch giữa 2 cột/hàng kề nhau bên trong ô
async function seam(page: Page) {
  return page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="gw-tile-src"] svg') as SVGSVGElement;
    const N = 256;
    const c = svg.cloneNode(true) as SVGSVGElement;
    c.setAttribute('width', String(N)); c.setAttribute('height', String(N)); c.removeAttribute('style');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml' }));
    const im = new Image(); im.src = url; await im.decode();
    const cv = document.createElement('canvas'); cv.width = cv.height = N * 2;
    const x = cv.getContext('2d', { willReadFrequently: true })!;
    for (const [dx, dy] of [[0, 0], [N, 0], [0, N], [N, N]]) x.drawImage(im, dx, dy, N, N);
    URL.revokeObjectURL(url);
    const d = x.getImageData(0, 0, N * 2, N * 2).data, W = N * 2;
    const px = (i: number, j: number, k: number) => d[(j * W + i) * 4 + k];
    const colDiff = (i: number) => { let s = 0; for (let j = 0; j < N * 2; j++) for (let k = 0; k < 3; k++) s += Math.abs(px(i, j, k) - px(i + 1, j, k)); return s / (N * 2 * 3); };
    const rowDiff = (j: number) => { let s = 0; for (let i = 0; i < N * 2; i++) for (let k = 0; k < 3; k++) s += Math.abs(px(i, j, k) - px(i, j + 1, k)); return s / (N * 2 * 3); };
    const inner: number[] = [], innerR: number[] = [];
    for (let i = 4; i < N - 5; i++) { inner.push(colDiff(i)); innerR.push(rowDiff(i)); }
    const p = (a: number[]) => a.sort((m, n) => m - n)[Math.floor(a.length * 0.97)];
    return { seamX: colDiff(N - 1), seamY: rowDiff(N - 1), refX: p(inner), refY: p(innerR) };
  });
}

test('Giấy gói quà: mọi mẫu liền mạch, đúng số màu, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/giftwrap');
  const tpls = page.getByTestId('gw-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  const audit = async (label: string) => {
    await page.waitForTimeout(150);
    const s = await seam(page);
    expect(s.seamX, `${label}: lộ đường nối dọc (${s.seamX.toFixed(1)} > ${s.refX.toFixed(1)})`).toBeLessThanOrEqual(Math.max(s.refX * 1.3, 10));
    expect(s.seamY, `${label}: lộ đường nối ngang (${s.seamY.toFixed(1)} > ${s.refY.toFixed(1)})`).toBeLessThanOrEqual(Math.max(s.refY * 1.3, 10));
    const r = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="gw-print-tile"] svg') as SVGSVGElement;
      const cols = new Set<string>();
      svg.querySelectorAll('[fill],[stroke]').forEach((el) => {
        if (el.closest('clipPath')) return;
        for (const a of ['fill', 'stroke']) { const v = (el.getAttribute(a) || '').toUpperCase(); if (/^#[0-9A-F]{6}$/.test(v)) cols.add(v); }
      });
      const sizes = [...svg.querySelectorAll('text')].map((t) => parseFloat(t.getAttribute('font-size') || '0'));
      const bg = svg.querySelector(':scope > rect');
      return { cols: [...cols], minText: sizes.length ? Math.min(...sizes) : 99, tile: parseFloat(svg.getAttribute('data-tile-mm') || '0'), bg: bg?.getAttribute('fill')?.toUpperCase() || null };
    });
    return r;
  };

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    const kind = await page.locator('[data-testid="gw-kinds"] button.border-indigo-400').getAttribute('data-testid');
    const r = await audit(`mẫu ${i}`);
    const ink = r.cols.filter((c) => c !== r.bg);
    if (kind !== 'gw-kind-couche') {
      expect(r.bg, `mẫu ${i}: kraft/pelure không in nền`).toBeNull();
      expect(ink.length, `mẫu ${i}: in 1 màu`).toBe(1);
    } else {
      expect(r.bg, `mẫu ${i}: couche in nền`).not.toBeNull();
      expect(ink.length, `mẫu ${i}: couche ≤ 3 màu hoạ tiết`).toBeLessThanOrEqual(3);
    }
    expect(r.minText, `mẫu ${i}: chữ quá nhỏ`).toBeGreaterThanOrEqual(1.2);
    await page.getByTestId('gw-flat').screenshot({ path: path.join(OUT, `gw-${String(i + 1).padStart(2, '0')}.png`) });
  }

  // couche: chọn 1 màu → hoạ tiết đúng 1 màu
  await tpls.nth(6).click(); // Noel 3 màu
  await page.locator('[data-testid="gw-colors"] button').first().click();
  let r = await audit('couche 1 màu');
  expect(r.cols.filter((c) => c !== r.bg).length).toBe(1);

  // tên shop dài + đổi cỡ ô / mật độ / góc xoay + mọi kiểu hoạ tiết
  await page.getByTestId('gw-brand').fill('CỬA HÀNG QUÀ TẶNG THỦ CÔNG GIA KHÁNH HANDMADE');
  const setRange = (id: string, v: string) => page.getByTestId(id).evaluate((el, val) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, v);
  await setRange('gw-tile', '140');
  const styles = page.locator('[data-testid="gw-styles"] button');
  for (let s = 0; s < await styles.count(); s++) {
    await styles.nth(s).click();
    for (const d of [0, 2]) {
      await page.locator('[data-testid="gw-density"] button').nth(d).click();
      r = await audit(`kiểu ${s} mật độ ${d}`);
      expect(r.tile).toBe(140);
      expect(r.minText, `kiểu ${s} mật độ ${d}: chữ quá nhỏ`).toBeGreaterThanOrEqual(1.2);
    }
  }
  await page.locator('[data-testid="gw-styles"] button').nth(1).click();
  await setRange('gw-rot', '25');
  r = await audit('xoay 25°');

  // kraft + logo (→ 1 màu mực)
  await page.getByTestId('gw-kind-kraft').click();
  const logo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 120; c.height = 80;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 120, 80); x.fillStyle = '#d11'; x.beginPath(); x.arc(40, 40, 28, 0, 7); x.fill(); x.fillStyle = '#123'; x.fillRect(70, 15, 40, 50);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-testid="gw-styles"] button').first().click();
  await page.getByTestId('gw-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') });
  await expect(page.locator('[data-testid="gw-print-tile"] svg image').first()).toBeAttached({ timeout: 10_000 });
  r = await audit('kraft + logo');
  expect(r.bg).toBeNull();
  await page.getByTestId('gw-flat').screenshot({ path: path.join(OUT, 'gw-kraft-logo.png') });

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const png = fs.readFileSync(await grab('gw-png'));
  expect(png.readUInt32BE(16)).toBe(Math.round((140 / 25.4) * 300));
  const svg = fs.readFileSync(await grab('gw-svg'), 'utf8');
  expect(svg).toContain('viewBox="0 0 140 140"');
  expect((svg.match(/<text/g) || []).length, 'SVG ô lặp: chữ đã outline').toBe(0);
  const pdf = fs.readFileSync(await grab('gw-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);

  // 3D: couche (hộp quà + cuộn) & pelure (hộp mở + giấy lụa)
  for (const [k, idx] of [['couche', 0], ['pelure', 13]] as const) {
    await tpls.nth(idx).click(); await page.waitForTimeout(300);
    const u = await page.evaluate(() => (window as unknown as { __gwSnap: (w: number, h: number) => Promise<string> }).__gwSnap(1200, 900));
    expect(u.length, `3D ${k}`).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(OUT, `gw-3d-${k}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
