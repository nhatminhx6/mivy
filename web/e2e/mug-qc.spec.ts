import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Ly sứ in hình: mọi mẫu × 2 cỡ ly × 4 kiểu in — chữ nằm gọn trong dải in, không chồng nhau, không quá nhỏ;
// tải ảnh khách + logo; tải PNG (đúng 300dpi) / PDF / lật gương; 3D dựng được cả 3 loại ly; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'mug');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(120);
  const r = await page.locator('[data-testid="mug-wrap"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal; const box = svg.getBoundingClientRect(); const k = box.width / vb.width;
    const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('[data-guide]') && !t.getAttribute('data-deco') && (t.textContent || '').trim());
    const bad: string[] = []; let minF = 99;
    const boxes = texts.map((t) => {
      const b = t.getBoundingClientRect();
      const x0 = (b.left - box.left) / k, x1 = (b.right - box.left) / k, y0 = (b.top - box.top) / k, y1 = (b.bottom - box.top) / k;
      if (x0 < -0.3 || x1 > vb.width + 0.3 || y0 < -0.8 || y1 > vb.height + 0.8) bad.push(`ngoài dải: "${t.textContent}" x[${x0.toFixed(1)},${x1.toFixed(1)}] y[${y0.toFixed(1)},${y1.toFixed(1)}]`);
      minF = Math.min(minF, parseFloat(t.getAttribute('font-size') || '99'));
      const m = (y1 - y0) * 0.22; // co hộp chữ theo chiều dọc (em-box rộng hơn nét chữ)
      return { t: t.textContent || '', x0, x1, y0: y0 + m, y1: y1 - m };
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.6 && oy > 0.6) bad.push(`chồng chữ: "${a.t}" × "${b.t}"`);
    }
    return { bad, minF, n: texts.length };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.bad, label).toEqual([]);
  expect(r.minF, `${label}: chữ nhỏ nhất ${r.minF.toFixed(2)}mm`).toBeGreaterThanOrEqual(2.4);
}

function pngFile(p: string, w: number, h: number, rgb: [number, number, number]) {
  // PNG đơn sắc tối giản (không nén zlib thật: dùng stored block) — đủ cho input file
  const zlib = require('zlib');
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = rgb[0]; row[2 + x * 3] = rgb[1]; row[3 + x * 3] = (rgb[2] + x) % 256; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

test('Ly sứ: mọi mẫu × cỡ × kiểu in, ảnh, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/mug');
  const tpls = page.getByTestId('mug-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(12);
  const sizes = page.getByTestId('mug-size');

  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await audit(page, `cỡ ${s} mẫu ${i}`);
      if (s === 0) await page.getByTestId('mug-wrap').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  await sizes.first().click();

  // 4 kiểu in trên vài bố cục
  for (const i of [0, 7, 10, 12]) {
    await tpls.nth(i).click();
    for (const m of ['two', 'full', 'rh', 'lh']) {
      await page.getByTestId(`mug-mode-${m}`).click();
      await audit(page, `mẫu ${i} kiểu ${m}`);
    }
  }

  // chữ dài
  await tpls.nth(0).click();
  await page.getByTestId('mug-title').fill('Chúc mừng sinh nhật người bạn thân nhất trên đời của mình');
  await page.getByTestId('mug-name').fill('Nguyễn Thị Thu Hà');
  await page.getByTestId('mug-wish').fill('Chúc bạn tuổi mới thật nhiều sức khoẻ, luôn xinh đẹp, công việc thuận lợi, gia đình hạnh phúc và mọi điều tốt đẹp nhất sẽ đến với bạn trong năm nay nhé!');
  await audit(page, 'chữ dài sinh nhật');

  // ảnh khách: mẫu ghép 3 ảnh
  const img = path.join(OUT, '_anh-test.png');
  pngFile(img, 320, 240, [220, 120, 90]);
  const collage = await tpls.evaluateAll((els) => els.findIndex((e) => (e.textContent || '').includes('Ghép 3 ảnh')));
  await tpls.nth(collage).click();
  for (let k = 0; k < 3; k++) await page.getByTestId(`mug-photo-${k}`).setInputFiles(img);
  await expect.poll(() => page.locator('[data-testid="mug-wrap"] svg image').evaluateAll((els) => els.filter((e) => (e.getAttribute('href') || '').startsWith('data:image')).length)).toBe(3);
  await audit(page, 'ghép 3 ảnh');
  await page.getByTestId('mug-wrap').screenshot({ path: path.join(OUT, 'anh-khach.png') });

  // logo công ty
  const corp = await tpls.evaluateAll((els) => els.findIndex((e) => (e.textContent || '').includes('Quà doanh nghiệp')));
  await tpls.nth(corp).click();
  await page.getByTestId('mug-logo').setInputFiles(img);
  await expect.poll(() => page.locator('[data-testid="mug-wrap"] svg image').count()).toBeGreaterThanOrEqual(2);
  await audit(page, 'logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const png = fs.readFileSync(await grab('mug-png'));
  expect(png.readUInt32BE(16)).toBe(Math.round((200 / 25.4) * 300));
  const pdf = fs.readFileSync(await grab('mug-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  await page.getByTestId('mug-mirror').check();
  await expect(page.locator('[data-testid="mug-print"] svg > g').first()).toHaveAttribute('transform', /scale\(-1 1\)/);
  const pngM = await grab('mug-png');
  expect(path.basename(pngM)).toContain('-lat');

  // 3D: 3 loại ly × 2 kiểu
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  for (const kind of ['white', 'color', 'magic']) {
    await page.getByTestId(`mug-kind-${kind}`).click();
    for (const m of ['two', 'rh']) {
      await page.getByTestId(`mug-mode-${m}`).click();
      const url = await page.evaluate(() => (window as unknown as { __mugSnap: (w: number, h: number) => Promise<string> }).__mugSnap(1600, 1200));
      expect(url.startsWith('data:image/png')).toBe(true);
      fs.writeFileSync(path.join(OUT, `3d-${kind}-${m}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  const d3 = fs.readFileSync(await grab('mug-3d-png'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
