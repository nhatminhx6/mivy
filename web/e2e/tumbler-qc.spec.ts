import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bình giữ nhiệt khắc/in logo: mọi mẫu × 4 sản phẩm, mặt trước + sau — chữ nằm gọn trong vùng khắc, không chồng, không quá nhỏ;
// chữ dài; logo (laser → bóng 1 màu, UV → ảnh gốc); 30 tên → PDF 30 trang + zip 30 SVG; PNG/SVG/3D; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tumbler');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(120);
  for (const side of ['front', 'back']) {
    const r = await page.locator(`[data-testid="tb-${side}"] svg`).first().evaluate((svg: SVGSVGElement) => {
      const vb = svg.viewBox.baseVal; const box = svg.getBoundingClientRect(); const k = box.width / vb.width;
      const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('[data-guide]') && (t.textContent || '').trim());
      const bad: string[] = []; let minF = 99;
      const boxes = texts.map((t) => {
        const b = t.getBoundingClientRect();
        const x0 = (b.left - box.left) / k, x1 = (b.right - box.left) / k, y0 = (b.top - box.top) / k, y1 = (b.bottom - box.top) / k;
        if (x0 < -0.3 || x1 > vb.width + 0.3 || y0 < -0.8 || y1 > vb.height + 0.8) bad.push(`ngoài vùng: "${t.textContent}" x[${x0.toFixed(1)},${x1.toFixed(1)}] y[${y0.toFixed(1)},${y1.toFixed(1)}]`);
        minF = Math.min(minF, parseFloat(t.getAttribute('font-size') || '99'));
        const m = (y1 - y0) * 0.22;
        return { t: t.textContent || '', x0, x1, y0: y0 + m, y1: y1 - m };
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 0.5 && oy > 0.5) bad.push(`chồng chữ: "${a.t}" × "${b.t}"`);
      }
      // hình vẽ (logo/hoa/ly) cũng phải nằm trong vùng
      for (const g of svg.querySelectorAll('[data-logo], circle, ellipse, path')) {
        if ((g as Element).closest('[data-guide]')) continue;
        const b = (g as Element).getBoundingClientRect();
        if (!b.width && !b.height) continue;
        const x0 = (b.left - box.left) / k, x1 = (b.right - box.left) / k, y0 = (b.top - box.top) / k, y1 = (b.bottom - box.top) / k;
        if (x0 < -0.4 || x1 > vb.width + 0.4 || y0 < -0.4 || y1 > vb.height + 0.4) { bad.push(`hình lòi ra ngoài: <${(g as Element).tagName}> x[${x0.toFixed(1)},${x1.toFixed(1)}]`); break; }
      }
      return { bad, minF, n: texts.length };
    });
    expect(r.n, `${label} ${side}: có chữ`).toBeGreaterThan(0);
    expect(r.bad, `${label} ${side}`).toEqual([]);
    expect(r.minF, `${label} ${side}: chữ nhỏ nhất ${r.minF.toFixed(2)}mm`).toBeGreaterThanOrEqual(2.2);
  }
}

function pngFile(p: string, w: number, h: number) {
  const zlib = require('zlib');
  const row = Buffer.alloc(1 + w * 4);
  for (let x = 0; x < w; x++) { const on = x > w * 0.2 && x < w * 0.8; row[1 + x * 4] = on ? 20 : 255; row[2 + x * 4] = on ? 40 : 255; row[3 + x * 4] = on ? 90 : 255; row[4 + x * 4] = 255; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('Bình giữ nhiệt: mọi mẫu × sản phẩm, chữ dài, logo, khắc hàng loạt, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tumbler');
  const tpls = page.getByTestId('tb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  // mọi mẫu (đúng sản phẩm của mẫu) + đổi sang cả 4 sản phẩm
  const products = ['flask500', 'sport750', 'tumbler600', 'tumbler900'];
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('tb-flat').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
    for (const pr of products) {
      await page.getByTestId(`tb-product-${pr}`).click();
      await audit(page, `mẫu ${i} · ${pr}`);
    }
  }

  // chữ dài trên sản phẩm hẹp nhất
  await tpls.nth(0).click();
  await page.getByTestId('tb-product-flask500').click();
  await page.getByTestId('tb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC TẾ');
  await page.getByTestId('tb-slogan').fill('Đồng hành cùng thành công của khách hàng trên mọi chặng đường phát triển bền vững');
  await page.getByTestId('tb-names').fill('Nguyễn Thị Thu Hà Phương Linh\nLê Gia Khánh');
  await page.getByTestId('tb-message').fill('Cảm ơn bạn đã luôn đồng hành, cống hiến hết mình cùng công ty trong suốt chặng đường mười năm qua, chúc bạn luôn mạnh khoẻ');
  await audit(page, 'chữ dài');

  // logo: laser → bóng 1 màu (mask), UV → ảnh gốc
  const img = path.join(OUT, '_logo-test.png');
  pngFile(img, 300, 160);
  await page.getByTestId('tb-logo').setInputFiles(img);
  await expect.poll(() => page.locator('[data-testid="tb-front"] svg [data-logo] rect[mask]').count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await audit(page, 'logo laser');
  await page.getByTestId('tb-method-uv').click();
  await expect.poll(() => page.locator('[data-testid="tb-front"] svg image[data-logo]').count()).toBeGreaterThan(0);
  await audit(page, 'logo UV');
  await page.getByTestId('tb-method-laser').click();

  // khắc hàng loạt: 30 tên → PDF 30 trang + zip 30 SVG
  const names = Array.from({ length: 30 }, (_, i) => `${['Quốc Bảo', 'Thu Hà', 'Gia Khánh', 'Bảo Ngọc', 'Ngọc Châu'][i % 5]} ${i + 1}`).join('\n');
  await page.getByTestId('tb-names').fill(names);
  await expect(page.getByTestId('tb-count')).toContainText('30');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('tb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(pdf)).toBe(30);
  const zipP = await grab('tb-svg');
  expect(zipP.endsWith('.zip')).toBe(true);
  const zip = fs.readFileSync(zipP);
  expect((zip.toString('latin1').match(/PK\x03\x04/g) || []).length).toBe(30);
  expect(zip.toString('utf8')).not.toContain('<text');

  // 1 tên: SVG đơn, khổ thật, không còn <text>
  await page.getByTestId('tb-names').fill('Trần Thu Hà');
  const svg = fs.readFileSync(await grab('tb-svg'), 'utf8');
  expect(svg).toMatch(/width="[\d.]+mm"/);
  expect(svg).not.toContain('<text');
  const png = fs.readFileSync(await grab('tb-png'));
  expect(png.readUInt32BE(16)).toBe(Math.round(((52 * 2 + 12) / 25.4) * 300));

  // 3D: mọi sản phẩm × laser/UV
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  for (const pr of products) {
    await page.getByTestId(`tb-product-${pr}`).click();
    for (const m of ['laser', 'uv']) {
      await page.getByTestId(`tb-method-${m}`).click();
      const url = await page.evaluate(() => (window as unknown as { __tbSnap: (w: number, h: number) => Promise<string> }).__tbSnap(1600, 1200));
      expect(url.startsWith('data:image/png')).toBe(true);
      fs.writeFileSync(path.join(OUT, `3d-${pr}-${m}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  await page.getByTestId('tb-finish-steel').click();
  const d3 = fs.readFileSync(await grab('tb-3d-png'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
