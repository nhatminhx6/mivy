import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hoá đơn · phiếu liên: mọi loại phiếu × khổ × mẫu — chữ nằm trong khổ, không đè nhau, không quá nhỏ;
// số nhảy đúng; liên đủ; PDF = số liên + 1 trang thông số; SVG outline; ảnh 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'receiptbook');

async function audit(page: Page, label: string) {
  const r = await page.locator('[data-testid="rb-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const boxes = Array.from(svg.querySelectorAll('text')).map((t) => {
      const b = (t as SVGTextElement).getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(t.getAttribute('font-size') || '0'), txt: t.textContent || '', op: (t.parentElement?.getAttribute('opacity') || '1') };
    }).filter((b) => b.txt.trim() && b.op === '1');
    const out = boxes.filter((b) => b.x < vb.x - 1 || b.y < vb.y - 1 || b.x + b.w > vb.x + vb.width + 1 || b.y + b.h > vb.y + vb.height + 1).map((b) => b.txt);
    // đè nhau: thu hộp theo chiều cao chữ thực (bỏ phần dư trên/dưới của font)
    const core = boxes.map((b) => ({ ...b, y: b.y + b.h * 0.22, h: b.h * 0.56 }));
    const over: string[] = [];
    for (let i = 0; i < core.length; i++) for (let j = i + 1; j < core.length; j++) {
      const a = core[i], c = core[j];
      const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      if (ix > 2 && iy > 2 && ix * iy > 0.12 * Math.min(a.w * a.h, c.w * c.h)) over.push(`${a.txt} ✕ ${c.txt}`);
    }
    const minFs = Math.min(...boxes.map((b) => b.fs));
    return { out, over, minFs, rows: Number(svg.getAttribute('data-rows')), n: boxes.length };
  });
  expect(r.out, `${label}: chữ tràn khổ`).toEqual([]);
  expect(r.over, `${label}: chữ đè nhau`).toEqual([]);
  expect(r.minFs, `${label}: chữ quá nhỏ (${r.minFs / 10}mm)`).toBeGreaterThanOrEqual(11);
  return r;
}

test('Hoá đơn · phiếu liên: mọi loại × khổ × mẫu, số nhảy, liên, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/receiptbook');
  const tpls = page.getByTestId('rb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  const types = ['invoice', 'receipt', 'payment', 'delivery', 'warranty'];
  const sizes = page.locator('[data-testid="rb-sizes"] button');
  let n = 0;
  for (const ty of types) {
    await page.getByTestId(`rb-type-${ty}`).click();
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click();
        const r = await audit(page, `${ty} khổ ${s} mẫu ${i}`);
        if (['invoice', 'delivery'].includes(ty)) expect(r.rows, `${ty} khổ ${s}: bảng ít nhất 2 dòng`).toBeGreaterThanOrEqual(2);
        if (i === 0 || i === 8) await page.getByTestId('rb-preview').screenshot({ path: path.join(OUT, `rb-${ty}-${s}-${i}.png`) });
        n++;
      }
    }
  }
  expect(n).toBe(5 * 4 * 10);

  // nội dung dài + logo + số nhảy
  await page.getByTestId('rb-type-invoice').click();
  await sizes.first().click();
  await tpls.nth(6).click();
  await page.getByTestId('rb-shop').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ ĐIỆN MÁY GIA DỤNG AN KHANG PHÁT');
  await page.getByTestId('rb-address').fill('Số 128/45/12 Nguyễn Trãi, Phường Bến Thành, Quận 1, Thành phố Hồ Chí Minh, Việt Nam');
  await page.getByTestId('rb-footer').fill('Hàng mua rồi miễn đổi trả sau 7 ngày — Cảm ơn quý khách đã tin tưởng ủng hộ cửa hàng chúng tôi!');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR42mNk+M9Qz0AEYBxVSF+FQwMDw38iFDLSXyHjqELaKhwNg4YCAP2JCRH1hnUQAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('rb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="rb-preview"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await page.getByTestId('rb-prefix').fill('QB');
  await page.getByTestId('rb-start').fill('120');
  await expect(page.locator('[data-testid="rb-preview"] [data-rb="num"]')).toHaveText('QB000120');
  await expect(page.getByTestId('rb-range')).toContainText('QB000120');
  await expect(page.getByTestId('rb-range')).toContainText('QB000619'); // 50 bộ × 10 cuốn
  await audit(page, 'chữ dài + logo');
  await page.getByTestId('rb-preview').screenshot({ path: path.join(OUT, 'rb-long.png') });

  // 3 liên: đủ nhãn liên + PDF = 3 liên + 1 trang thông số
  await page.getByTestId('rb-parts-3').click();
  await expect(page.locator('[data-testid="rb-part-tabs"] button')).toHaveCount(3);
  await page.locator('[data-testid="rb-part-tabs"] button').nth(2).click();
  await expect(page.locator('[data-testid="rb-preview"] [data-rb="lien"]')).toHaveText('Liên 3: Nội bộ');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('rb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(4);
  const svg = fs.readFileSync(await grab('rb-svg'), 'utf8');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const pngOut = fs.readFileSync(await grab('rb-png'));
  expect(pngOut.readUInt32BE(16)).toBe(1800);

  // 1 liên: không nhãn liên, PDF 2 trang
  await page.getByTestId('rb-parts-1').click();
  await expect(page.locator('[data-testid="rb-preview"] [data-rb="lien"]')).toHaveCount(0);
  const pdf1 = fs.readFileSync(await grab('rb-pdf'));
  expect((pdf1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);

  // 3D + ảnh 3D
  await page.getByTestId('rb-parts-2').click();
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const shot = fs.readFileSync(await grab('rb-3d'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  for (const ty of ['invoice', 'warranty']) {
    await page.getByTestId(`rb-type-${ty}`).click();
    await page.waitForTimeout(800);
    const d = await page.evaluate(async () => (window as unknown as { __rbSnap: (w: number, h: number) => Promise<string> }).__rbSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `rb-3d-${ty}.png`), Buffer.from(d.split(',')[1], 'base64'));
  }
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
