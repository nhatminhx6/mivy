import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// QC Khăn lạnh in logo: mọi mẫu × khổ gói — chữ mặt trước nằm trong vùng an toàn (tránh mép hàn răng cưa),
// chữ mặt sau tránh đường hàn lưng, không chồng chữ, cỡ chữ tối thiểu; file in có lớp In/Seal/Fold/CutContour,
// số màu mực đúng (1 màu / 2 màu), xuất PDF/SVG/PNG/3D, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'wetwipe');
fs.mkdirSync(OUT, { recursive: true });

interface Bad { msg: string }
async function audit(page: Page, label: string): Promise<{ bad: string[]; colors: number; mode: number }> {
  return page.evaluate((label) => {
    const bad: string[] = [];
    const front = document.querySelector('[data-testid="ww-front-hidden"] svg') as SVGSVGElement;
    const back = document.querySelector('[data-testid="ww-back-hidden"] svg') as SVGSVGElement;
    const [sx, sy, sw, sh] = front.getAttribute('data-safe')!.split(' ').map(Number);
    const vb = front.viewBox.baseVal;
    const L = vb.width, W = vb.height;
    const box = (svg: SVGSVGElement, t: SVGTextElement) => {
      const b = t.getBBox();
      const f = parseFloat(t.getAttribute('font-size') || '0');
      const m = (svg.getScreenCTM()!.inverse()).multiply(t.getScreenCTM()!);
      const rotated = Math.abs(m.b) > 1e-3 || Math.abs(m.c) > 1e-3;
      const y = parseFloat(t.getAttribute('y') || '0');
      // hộp "mực" theo baseline (bỏ khoảng đệm dòng của font) khi chữ không xoay
      const y0 = rotated ? b.y : y - 0.78 * f, y1 = rotated ? b.y + b.height : y + 0.22 * f;
      const pts = [[b.x, y0], [b.x + b.width, y0], [b.x, y1], [b.x + b.width, y1]].map(([px, py]) => { const p = svg.createSVGPoint(); p.x = px; p.y = py; return p.matrixTransform(m); });
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), f: f * Math.hypot(m.a, m.b), zone: t.getAttribute('data-zone') || t.closest('[data-zone]')?.getAttribute('data-zone') || '', t: t.textContent || '' };
    };
    const tol = 0.35;
    const check = (svg: SVGSVGElement, side: string) => {
      const items = Array.from(svg.querySelectorAll('text')).map((t) => box(svg, t)).filter((b) => b.t.trim());
      const main = items.filter((b) => b.zone !== 'pattern');
      for (const b of main) {
        if (b.f < 1.5) bad.push(`${label} ${side}: chữ nhỏ ${b.f.toFixed(2)}mm "${b.t}"`);
        if (b.zone === 'seal') {
          if (b.x0 < -tol || b.x1 > L + tol || b.y0 < -tol || b.y1 > W + tol) bad.push(`${label} ${side}: chữ mép hàn lòi ra "${b.t}"`);
          continue;
        }
        if (b.x0 < sx - tol || b.x1 > sx + sw + tol || b.y0 < sy - tol || b.y1 > sy + sh + tol) bad.push(`${label} ${side}: ra ngoài vùng an toàn "${b.t}" [${b.x0.toFixed(1)},${b.y0.toFixed(1)}..${b.x1.toFixed(1)},${b.y1.toFixed(1)}]`);
        if (side === 'back' && b.y1 > W / 2 - 3 + tol && b.y0 < W / 2 + 3 - tol) bad.push(`${label} back: đè đường hàn lưng "${b.t}"`);
      }
      for (let i = 0; i < main.length; i++) for (let j = i + 1; j < main.length; j++) {
        const a = main[i], c = main[j];
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 0.4 && oy > 0.4) bad.push(`${label} ${side}: chồng chữ "${a.t}" × "${c.t}"`);
      }
    };
    check(front, 'front');
    check(back, 'back');
    // số màu mực trong lớp In của file in (bỏ "none", bỏ ảnh)
    const print = document.querySelector('[data-testid="ww-print"] svg') as SVGSVGElement;
    const inL = print.querySelector('#In')!;
    const cols = new Set<string>();
    inL.querySelectorAll('[fill],[stroke]').forEach((el) => {
      if (el.closest('mask') || el.closest('defs')) return;
      for (const a of ['fill', 'stroke']) { const v = (el.getAttribute(a) || '').toLowerCase(); if (v && v !== 'none' && v !== '#ffffff' && !v.startsWith('url(')) cols.add(v); }
    });
    const modeBtn = Array.from(document.querySelectorAll('[data-testid="ww-modes"] button')).findIndex((b) => b.className.includes('indigo-400'));
    return { bad, colors: cols.size, mode: [1, 2, 0][modeBtn] ?? -1 };
  }, label);
}

test('Khăn lạnh: mọi mẫu × khổ gói, file in, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/wetwipe');
  const tpls = page.getByTestId('ww-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  const sizes = page.locator('[data-testid="ww-sizes"] button');
  const nSizes = await sizes.count();
  expect(nSizes).toBe(3);

  const allBad: string[] = [];
  for (let s = 0; s < nSizes; s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      const r = await audit(page, `size${s} mẫu${i}`);
      allBad.push(...r.bad);
      if (r.mode === 1) expect(r.colors, `size${s} mẫu${i}: in 1 màu`).toBeLessThanOrEqual(1);
      if (r.mode === 2) expect(r.colors, `size${s} mẫu${i}: in 2 màu`).toBeLessThanOrEqual(2);
    }
  }
  // chụp bản phẳng 1 mẫu để soi
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('ww-flat').screenshot({ path: path.join(OUT, 'ww-flat.png') });

  // chữ dài × mọi bố cục, khổ nhỏ nhất (6×18)
  await sizes.nth(1).click();
  await page.getByTestId('ww-brand').fill('NHÀ HÀNG HẢI SẢN TƯƠI SỐNG QUỐC BẢO PHƯỚC LỘC');
  await page.getByTestId('ww-slogan').fill('Hải sản tươi sống mỗi ngày – Giá cả bình dân');
  await page.getByTestId('ww-address').fill('123 Đường Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh');
  const lays = page.locator('[data-testid="ww-layouts"] button');
  for (let l = 0; l < await lays.count(); l++) {
    await lays.nth(l).click(); await page.waitForTimeout(100);
    allBad.push(...(await audit(page, `dài layout${l}`)).bad);
  }
  expect(allBad, allBad.slice(0, 12).join('\n')).toEqual([]);

  // đổi 1 màu → chỉ còn 1 màu mực
  await page.locator('[data-testid="ww-modes"] button').nth(0).click(); await page.waitForTimeout(100);
  expect((await audit(page, '1màu')).colors).toBeLessThanOrEqual(1);

  // logo (PNG vẽ tay) → in 2 màu: thành mask 1 màu
  await page.locator('[data-testid="ww-modes"] button').nth(1).click();
  const png = makePng(64, 64);
  await page.getByTestId('ww-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await lays.nth(0).click(); // bố cục có ô logo
  await expect(page.locator('[data-testid="ww-front-hidden"] svg mask image')).not.toHaveCount(0, { timeout: 10_000 });
  allBad.length = 0;
  for (let l = 0; l < await lays.count(); l++) { await lays.nth(l).click(); await page.waitForTimeout(100); allBad.push(...(await audit(page, `logo layout${l}`)).bad); }
  expect(allBad, allBad.slice(0, 8).join('\n')).toEqual([]);

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const svg = fs.readFileSync(await grab('ww-svg'), 'utf8');
  for (const id of ['In', 'Seal', 'Fold', 'CutContour']) expect(svg).toContain(`id="${id}"`);
  expect((svg.match(/<text/g) || []).length, 'SVG đã outline').toBe(0);
  const pdf = fs.readFileSync(await grab('ww-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const pngOut = fs.readFileSync(await grab('ww-png'));
  expect(pngOut.readUInt32BE(16)).toBe(2000);

  // 3D: tab 3D dựng được + ảnh chụp góc mặc định
  await page.getByTestId('tab-3d').click();
  await page.getByTestId('ww-tpl').nth(2).click();
  const shot = await page.evaluate(() => (window as unknown as { __wwSnap: (w: number, h: number) => Promise<string> }).__wwSnap(1600, 1200));
  const buf = Buffer.from(shot.split(',')[1], 'base64');
  expect(buf.readUInt32BE(16)).toBe(1600);
  fs.writeFileSync(path.join(OUT, 'ww-3d.png'), buf);
  const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId('ww-3d').click()]);
  const p3 = path.join(OUT, dl3.suggestedFilename()); await dl3.saveAs(p3);
  expect(fs.readFileSync(p3).readUInt32BE(16)).toBe(1600);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});

// PNG đơn giản: vòng tròn đen trên nền trắng (logo giả)
function makePng(w: number, h: number): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      const d = Math.hypot(x - w / 2, y - h / 2);
      const v = d < w * 0.36 ? 20 : 255;
      raw[i] = raw[i + 1] = raw[i + 2] = v; raw[i + 3] = 255;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return ~c;
}
export type { Bad };
