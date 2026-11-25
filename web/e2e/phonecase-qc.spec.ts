import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Ốp lưng: mọi mẫu × 4 máy (ốp cứng) + ốp trong/viền màu — chữ nằm trong lưng ốp, KHÔNG lấn ô camera,
// không chồng nhau, đủ cỡ; chữ rất dài vẫn gọn; ảnh khách + cảnh báo dpi; tải PDF/SVG/PNG/3D; 3D 3 kiểu ốp; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'phonecase');

async function audit(page: Page, label: string, which = 'a') {
  await page.waitForTimeout(80);
  const r = await page.locator(`[data-testid="pc-preview-${which}"] svg`).evaluate((svg: SVGSVGElement) => {
    const [W, H] = (svg.getAttribute('data-back') || '0,0').split(',').map(Number);
    const [kx, ky, kw, kh] = (svg.getAttribute('data-keep') || '0,0,0,0').split(',').map(Number);
    const texts = [...svg.querySelectorAll('text')].filter((t) => !t.getAttribute('data-deco') && (t.textContent || '').trim());
    const bad: string[] = []; let minF = 99;
    const boxes = texts.map((t) => {
      const b = t.getBBox();
      const m = b.height * 0.2;
      const bx = { t: t.textContent || '', x0: b.x, x1: b.x + b.width, y0: b.y + m, y1: b.y + b.height - m };
      if (bx.x0 < 0.8 || bx.x1 > W - 0.8 || bx.y0 < 0.8 || bx.y1 > H - 0.8) bad.push(`ngoài lưng ốp: "${bx.t}" x[${bx.x0.toFixed(1)},${bx.x1.toFixed(1)}] y[${bx.y0.toFixed(1)},${bx.y1.toFixed(1)}]`);
      if (bx.x1 > kx && bx.x0 < kx + kw && bx.y1 > ky && bx.y0 < ky + kh) bad.push(`lấn ô camera: "${bx.t}"`);
      minF = Math.min(minF, parseFloat(t.getAttribute('font-size') || '99'));
      return bx;
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.5 && oy > 0.5) bad.push(`chồng chữ: "${a.t}" × "${b.t}"`);
    }
    return { bad, minF, n: texts.length };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.bad, label).toEqual([]);
  expect(r.minF, `${label}: chữ nhỏ nhất ${r.minF.toFixed(2)}mm`).toBeGreaterThanOrEqual(2.6);
}

function pngFile(p: string, w: number, h: number) {
  const zlib = require('zlib');
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = 200; row[2 + x * 3] = (x * 7) % 256; row[3 + x * 3] = 90; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

test('Ốp lưng: mọi mẫu × máy × kiểu ốp, chữ dài, ảnh, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/phonecase');
  const tpls = page.getByTestId('pc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(12);

  // mọi mẫu × 4 máy (ốp cứng)
  for (const mo of ['p61', 'p67', 'p65', 'p64']) {
    await page.getByTestId(`pc-model-${mo}`).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await audit(page, `${mo} mẫu ${i}`);
      if (await page.getByTestId('pc-preview-b').count()) await audit(page, `${mo} mẫu ${i} ốp B`, 'b');
    }
  }
  await page.getByTestId('pc-preview-a').screenshot({ path: path.join(OUT, 'op-cung-p64.png') });

  // ốp trong + viền màu
  for (const c of ['clear', 'rim']) {
    await page.getByTestId(`pc-case-${c}`).click();
    for (const i of [0, 2, 4, 9, 11, 13]) { await tpls.nth(i).click(); await audit(page, `${c} mẫu ${i}`); }
  }
  await page.getByTestId('pc-case-hard').click();

  // chữ rất dài ở mọi bố cục, máy camera dọc + tròn giữa
  const long = 'Nguyễn Hoàng Thu Hà Bảo Ngọc Gia Khánh';
  for (const mo of ['p65', 'p64', 'p61']) {
    await page.getByTestId(`pc-model-${mo}`).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      for (const k of ['name', 'name2', 'line']) { const f = page.getByTestId(`pc-${k}`); if (await f.count()) await f.fill(long); }
      const q = page.getByTestId('pc-quote'); if (await q.count()) await q.fill('Cuộc sống không phải là chờ cơn bão đi qua mà là học cách nhảy múa dưới mưa, và mỉm cười thật tươi mỗi ngày');
      await audit(page, `${mo} chữ dài mẫu ${i}`);
      if (await page.getByTestId('pc-preview-b').count()) await audit(page, `${mo} chữ dài mẫu ${i} ốp B`, 'b');
    }
  }
  await page.getByTestId('pc-preview-a').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // ảnh khách: ảnh nhỏ → cảnh báo dpi; ảnh lớn → hết cảnh báo
  await tpls.nth(0).click();
  const small = path.join(OUT, 'anh-nho.png'); pngFile(small, 300, 420);
  await page.getByTestId('pc-photo').setInputFiles(small);
  await expect(page.getByTestId('pc-dpi-warn')).toBeVisible({ timeout: 10_000 });
  const big = path.join(OUT, 'anh-lon.png'); pngFile(big, 1300, 2600);
  await page.getByTestId('pc-photo').setInputFiles(big);
  await expect(page.getByTestId('pc-dpi')).toBeVisible();
  await expect(page.getByTestId('pc-dpi-warn')).toHaveCount(0);
  expect(await page.locator('[data-testid="pc-preview-a"] svg image').getAttribute('href')).toMatch(/^data:image\/jpeg/);
  await audit(page, 'ảnh khách');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // ốp cứng: PDF 1 trang, SVG có phần quấn cạnh (Fold) + lỗ nút, CutContour lỗ camera, không còn <text>
  const pdf1 = fs.readFileSync(await grab('pc-pdf')).toString('latin1');
  expect(pdf1.startsWith('%PDF')).toBe(true);
  expect((pdf1.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
  const svgHard = fs.readFileSync(await grab('pc-svg'), 'utf8');
  for (const id of ['In', 'CutContour', 'Fold', 'LoNut', 'KhongIn']) expect(svgHard).toContain(`id="${id}"`);
  expect(svgHard).not.toMatch(/<text[\s>]/);
  const png = fs.readFileSync(await grab('pc-png'));
  expect(png.readUInt32BE(16)).toBe(1200);
  // ốp trong: không có Fold
  await page.getByTestId('pc-case-clear').click();
  const svgClear = fs.readFileSync(await grab('pc-svg'), 'utf8');
  expect(svgClear).toContain('id="CutContour"');
  expect(svgClear).not.toContain('id="Fold"');
  // ốp đôi: PDF 2 trang (ốp A + B)
  await tpls.nth(10).click();
  await expect(page.getByTestId('pc-preview-b')).toBeVisible();
  const pdf2 = fs.readFileSync(await grab('pc-pdf')).toString('latin1');
  expect((pdf2.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);

  // 3D: 3 kiểu ốp (+ ốp đôi) dựng được
  for (const c of ['hard', 'clear', 'rim']) {
    await page.getByTestId(`pc-case-${c}`).click();
    await tpls.nth(c === 'hard' ? 10 : c === 'clear' ? 4 : 11).click();
    await page.waitForTimeout(300);
    const u = await page.evaluate(() => (window as unknown as { __pcSnap: (w: number, h: number) => Promise<string> }).__pcSnap(1000, 750));
    const buf = Buffer.from(u.split(',')[1], 'base64');
    expect(buf.length, `3D ${c}`).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${c}.png`), buf);
  }
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const p3 = fs.readFileSync(await grab('pc-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
