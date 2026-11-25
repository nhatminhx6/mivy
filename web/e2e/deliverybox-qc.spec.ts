import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thùng giao hàng: mọi mẫu × khổ × 4 mặt decal — chữ nằm trong decal, không chồng nhau, đủ to; QR khớp link;
// chữ rất dài + logo; tải PDF 4 trang / zip SVG có CutContour, không còn <text>; ảnh 3D chụp được (có xe / dưới đất).
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'deliverybox');
fs.mkdirSync(OUT, { recursive: true });

const FACES = ['back', 'left', 'right', 'top'] as const;

async function audit(page: Page, label: string) {
  for (const face of FACES) {
    const r = await page.locator(`[data-testid="db-tex-${face}"] svg`).evaluate((svg: SVGSVGElement) => {
      const vb = svg.viewBox.baseVal;
      const inv = svg.getScreenCTM()!.inverse();
      const toU = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(inv);
      const boxes = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim()).map((t) => {
        const b = t.getBoundingClientRect();
        const a = toU(b.left, b.top), c = toU(b.right, b.bottom);
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        return { t: t.textContent || '', x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y, fs };
      });
      const out: string[] = [];
      for (const b of boxes) {
        if (b.x < vb.x - 0.6 || b.y < vb.y - 0.6 || b.x + b.w > vb.x + vb.width + 0.6 || b.y + b.h > vb.y + vb.height + 0.6) out.push(`ra ngoài: "${b.t}"`);
        if (b.fs < 3) out.push(`nhỏ ${b.fs.toFixed(1)}mm: "${b.t}"`);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ox > 0.8 && oy > 0.8) out.push(`chồng: "${a.t}" × "${c.t}"`);
      }
      return { out, n: boxes.length };
    });
    expect(r.out, `${label} · mặt ${face}`).toEqual([]);
    expect(r.n, `${label} · mặt ${face} có chữ`).toBeGreaterThan(2);
  }
}

test('Thùng giao hàng: mọi mẫu × khổ × 4 mặt, chữ dài, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => { errors.push('dialog: ' + d.message()); void d.dismiss(); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/deliverybox');
  const tpls = page.getByTestId('db-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  const sizes = page.getByTestId('db-size');
  const nS = await sizes.count();
  expect(nS).toBe(3);

  for (let s = 0; s < nS; s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < nT; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      await audit(page, `size ${s} mẫu ${i}`);
    }
  }

  // QR khớp link (ma trận module = qrPath của link)
  await page.getByTestId('db-in-qr').fill('https://zalo.me/0909000111');
  await page.waitForTimeout(200);
  const qrOk = await page.locator('[data-testid="db-tex-back"] [data-testid="db-qrcard"] path').first().getAttribute('d');
  expect(qrOk && qrOk.length > 200).toBeTruthy();

  // chữ rất dài + logo, mọi bố cục
  await page.getByTestId('db-in-brand').fill('Cơm Văn Phòng Nhà Làm Bà Tư Chi Nhánh Quận Bình Thạnh');
  await page.getByTestId('db-in-service').fill('Giao cơm tận nơi nhanh trong ba mươi phút');
  await page.getByTestId('db-in-items').fill('Cơm tấm sườn bì chả · Cơm gà xối mỡ · Canh chua cá lóc · Rau luộc kho quẹt');
  await page.getByTestId('db-in-hotline').fill('0909 123 456 – 0938 222 333');
  await page.getByTestId('db-in-qrLabel').fill('Quét mã Zalo để đặt cơm văn phòng mỗi ngày');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('db-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="db-tex-back"] image')).toHaveCount(1, { timeout: 10_000 });
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(120);
    await audit(page, `chữ dài · mẫu ${i}`);
  }
  await page.getByTestId('db-in-qr').fill('');
  await page.waitForTimeout(150);
  for (let i = 0; i < 4; i++) { await tpls.nth(i * 3).click(); await page.waitForTimeout(120); await audit(page, `không QR · mẫu ${i * 3}`); }
  await page.locator('[data-testid="db-tex-back"]').screenshot({ path: path.join(OUT, 'mat-sau-chu-dai.png') });

  // tải file
  await page.getByTestId('db-in-qr').fill('https://zalo.me/0909123456');
  await tpls.first().click(); await page.waitForTimeout(300);
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('db-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(4);
  const zip = fs.readFileSync(await grab('db-svg')).toString('latin1');
  expect((zip.match(/id="CutContour"/g) || []).length).toBe(4);
  expect((zip.match(/id="In"/g) || []).length).toBe(4);
  expect(zip).not.toContain('<text');
  const pngOut = fs.readFileSync(await grab('db-png'));
  expect(pngOut.readUInt32BE(16)).toBe(1600);

  // 3D: có xe + dưới đất
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __dbSnap?: unknown }).__dbSnap), { timeout: 30_000 }).toBe('function');
  const snap = async (name: string) => {
    const u = await page.evaluate(() => (window as unknown as { __dbSnap: (w: number, h: number) => Promise<string> }).__dbSnap(1400, 1050));
    fs.writeFileSync(path.join(OUT, name), Buffer.from(u.split(',')[1], 'base64'));
  };
  await snap('3d-co-xe.png');
  await page.getByTestId('db-scooter').uncheck(); await page.waitForTimeout(300);
  await snap('3d-duoi-dat.png');
  await page.getByTestId('db-scooter').check(); await page.waitForTimeout(500);
  const p3d = fs.readFileSync(await grab('db-3d-png'));
  expect(p3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
