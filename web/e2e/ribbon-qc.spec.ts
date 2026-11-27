import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Ruy băng in logo: mọi mẫu × mọi khổ (10/15/20/25/38mm) — chữ nằm gọn trong bản rộng ruy băng, không đè nhau,
// chữ dài vẫn gọn, cảnh báo tương phản, logo 1 màu, tải PNG / PDF / SVG (đã outline) / ảnh 3D, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'ribbon');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'ribbon');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(80);
  const r = await page.locator('[data-testid="rb-unit"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const box = svg.getBoundingClientRect();
    const k = box.width / vb.width;
    const texts = [...svg.querySelectorAll('#In text')].filter((t) => (t.textContent || '').trim());
    const out: string[] = [];
    const boxes: { x0: number; x1: number; y0: number; y1: number; txt: string; fs: number }[] = [];
    let minF = 99;
    for (const t of texts) {
      const b = t.getBoundingClientRect();
      const x0 = (b.left - box.left) / k;
      const x1 = (b.right - box.left) / k;
      const y0 = (b.top - box.top) / k;
      const y1 = (b.bottom - box.top) / k;
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      minF = Math.min(minF, fs);
      if (y0 < -0.8 || y1 > vb.height + 0.8 || x0 < -0.5 || x1 > vb.width + 0.5) {
        out.push(`${t.textContent} y[${y0.toFixed(1)},${y1.toFixed(1)}]/${vb.height} x[${x0.toFixed(1)},${x1.toFixed(1)}]/${vb.width}`);
      }
      // Dùng baseline và fontSize để kiểm tra chồng chữ theo chiều dọc
      const base = parseFloat(t.getAttribute('y') || '0');
      const tightY0 = base - fs * 0.78;
      const tightY1 = base + fs * 0.16;
      boxes.push({ x0, x1, y0: tightY0, y1: tightY1, txt: t.textContent || '', fs });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) {
          out.push(`chữ đè nhau: "${a.txt}" × "${c.txt}"`);
        }
      }
    }
    return { out, minF, n: texts.length, W: vb.height, L: vb.width };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.out, `${label}: lỗi bố cục`).toEqual([]);
  expect(r.minF, `${label}: chữ quá nhỏ`).toBeGreaterThanOrEqual(2.0);
  return r;
}

test('Ruy băng in logo: mọi mẫu × khổ, chữ dài, tương phản, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/ribbon');

  const tpls = page.getByTestId('rb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBe(12);

  const widths = page.locator('[data-testid="rb-widths"] button');
  const nw = await widths.count();
  expect(nw).toBe(5);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (let w = 0; w < nw; w++) {
      await widths.nth(w).click();
      const r = await audit(page, `mẫu ${i} khổ ${w}`);
      expect([10, 15, 20, 25, 38]).toContain(r.W);
    }
  }
  await widths.nth(3).click(); // 25mm

  // chữ rất dài trên các bố cục
  await tpls.first().click();
  await page.getByTestId('rb-brand').fill('CỬA HÀNG HOA TƯƠI QUỐC BẢO SÀI GÒN');
  await page.getByTestId('rb-message').fill('Cảm ơn quý khách đã tin tưởng và ủng hộ!');
  const layouts = page.locator('[data-testid="rb-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    await audit(page, `chữ dài bố cục ${l}`);
  }

  // cảnh báo tương phản: chọn màu Champagne + nhũ vàng → hiện cảnh báo
  await tpls.first().click();
  await page.locator('[data-testid="rb-colors"] button[title="Champagne"]').click();
  await expect(page.getByTestId('rb-warn')).toBeVisible();
  await page.locator('[data-testid="rb-colors"] button[title="Đỏ"]').click();
  await expect(page.getByTestId('rb-warn')).toHaveCount(0);

  // logo khách
  const pngLogo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 120);
    x.fillStyle = '#111'; x.beginPath(); x.arc(60, 60, 42, 0, Math.PI * 2); x.fill();
    x.fillRect(115, 25, 65, 70);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('rb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(pngLogo, 'base64') });
  await expect.poll(() => page.locator('[data-testid="rb-unit"] svg mask image').count(), { timeout: 10_000 }).toBeGreaterThan(0);
  await audit(page, 'có logo');
  await page.getByRole('button', { name: /Bỏ logo/ }).click();

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return p;
  };
  const pngFile = fs.readFileSync(await grab('rb-png'));
  expect(pngFile.readUInt32BE(16)).toBe(2400);
  const pdfFile = fs.readFileSync(await grab('rb-pdf'));
  expect(pdfFile.subarray(0, 4).toString()).toBe('%PDF');
  const svgText = fs.readFileSync(await grab('rb-svg'), 'utf8');
  expect(svgText).toContain('id="In"');
  expect(svgText).toContain('id="VachLap"');
  expect((svgText.match(/<text[\s>]/g) || []).length, 'SVG in: chữ phải outline hết').toBe(0);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 3D: kiểm tra canvas + chụp 3 mẫu tiêu biểu (satin nhũ vàng, grosgrain mực, organza)
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __rbSnap?: unknown }).__rbSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __rbSnap: (w: number, h: number) => Promise<string> }).__rbSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(SHOTS, name), buf);
  };
  await tpls.nth(0).click();
  await snap('ribbon-satin-foil-3d.png');
  await tpls.nth(1).click();
  await snap('ribbon-grosgrain-ink-3d.png');
  await tpls.nth(3).click();
  await snap('ribbon-organza-3d.png');

  const d3File = fs.readFileSync(await grab('rb-3d'));
  expect(d3File.readUInt32BE(16)).toBe(1600);

  await page.getByTestId('tab-flat').click();
  await page.getByTestId('rb-flat').screenshot({ path: path.join(OUT, 'ribbon-flat.png') });

  expect(errors).toEqual([]);
});
