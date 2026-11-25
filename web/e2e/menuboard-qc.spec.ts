import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng menu treo tường: mọi mẫu × khổ × số tấm → chữ nằm trong từng tấm, không đè nhau, đủ to đọc từ xa;
// số tấm in = số tấm chọn; ảnh món + logo; file tải về (PDF đủ trang, SVG/zip outline, PNG, 3D); không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'menuboard');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll('[data-testid^="mbd-print-"] svg[data-panel]')) as SVGSVGElement[];
    const issues: string[] = [];
    let minFont = 1e9;
    for (const svg of panels) {
      const vb = svg.viewBox.baseVal; const b = -vb.x; const W = vb.width - b * 2, H = vb.height - b * 2;
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      const boxes = texts.map((t) => { const bb = (t as SVGTextElement).getBBox(); return { t: t.textContent || '', x: bb.x, y: bb.y, w: bb.width, h: bb.height, fs: parseFloat(t.getAttribute('font-size') || '0') }; });
      for (const bx of boxes) {
        minFont = Math.min(minFont, bx.fs);
        if (bx.x < -0.5 || bx.y < -0.5 || bx.x + bx.w > W + 0.5 || bx.y + bx.h > H + 0.5) issues.push(`P${svg.dataset.panel} ngoài tấm: "${bx.t}" [${bx.x.toFixed(0)},${bx.y.toFixed(0)},${bx.w.toFixed(0)}x${bx.h.toFixed(0)}] / ${W}x${H}`);
      }
      // chồng chữ: dùng hộp thu hẹp theo cỡ chữ (bbox SVG gồm cả khoảng dấu tiếng Việt)
      const core = boxes.map((bx) => ({ ...bx, y: bx.y + bx.h * 0.22, h: bx.h * 0.56 }));
      for (let i = 0; i < core.length; i++) for (let j = i + 1; j < core.length; j++) {
        const a = core[i], c = core[j];
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ox > 1 && oy > 1) issues.push(`P${svg.dataset.panel} chồng: "${a.t}" × "${c.t}"`);
      }
    }
    return { n: panels.length, issues, minFont, overflow: !!document.querySelector('[data-testid="mbd-overflow"]') };
  });
  expect(r.issues, `${label}: ${r.issues.slice(0, 4).join(' | ')}`).toEqual([]);
  expect(r.minFont, `${label}: chữ nhỏ nhất ${r.minFont.toFixed(1)}mm`).toBeGreaterThanOrEqual(5.4);
  return r;
}
const snap = async (page: Page, file: string) => {
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    if (await page.getByTestId('mbd-board').screenshot({ path: path.join(OUT, file) }).then(() => true).catch(() => false)) return;
  }
};
const imgBuf = async (page: Page, color: string) => Buffer.from((await page.evaluate((c) => {
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
  const x = cv.getContext('2d')!; x.fillStyle = c; x.fillRect(0, 0, 400, 300); x.fillStyle = '#fff'; x.beginPath(); x.arc(200, 150, 90, 0, 7); x.fill();
  return cv.toDataURL('image/png');
}, color)).split(',')[1], 'base64');

test('Bảng menu treo tường: mẫu × khổ × số tấm, ảnh món, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/menuboard');
  const tpls = page.getByTestId('mbd-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(8);
  await page.getByTestId('tab-flat').click();

  // mọi mẫu × 3 khổ, 3 tấm (mặc định) — mẫu chuẩn không được tràn
  const sizes = page.getByTestId('mbd-size');
  for (let t = 0; t < nT; t++) {
    await tpls.nth(t).click();
    for (let z = 0; z < 3; z++) {
      await sizes.nth(z).click();
      const r = await audit(page, `mẫu ${t} khổ ${z}`);
      expect(r.n).toBe(3);
      expect(r.overflow, `mẫu ${t} khổ ${z}: thực đơn mẫu không được tràn 3 tấm`).toBe(false);
    }
    await snap(page, `mau-${String(t).padStart(2, '0')}.png`);
  }
  // số tấm 1–4: đúng số tấm in; 1 tấm thực đơn dài → báo tràn nhưng chữ vẫn gọn
  for (const n of [1, 2, 4]) {
    await page.getByTestId(`mbd-panels-${n}`).click();
    for (let z = 0; z < 3; z++) {
      await sizes.nth(z).click();
      const r = await audit(page, `${n} tấm khổ ${z}`);
      expect(r.n).toBe(n);
    }
  }
  await page.getByTestId('mbd-panels-3').click();
  await sizes.nth(0).click();

  // chữ rất dài
  await page.getByTestId('mbd-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ CÀ PHÊ RANG XAY AN KHANG CHI NHÁNH QUẬN BA');
  await page.getByTestId('mbd-menu').fill('## Cà phê pha phin truyền thống đậm đà | Nóng | Đá\n*Cà phê sữa đá Sài Gòn pha phin nhôm truyền thống | 25k | 29k | mới\nBạc xỉu nhiều sữa ít cà phê thêm kem muối | 29k | 35k\n+Cold brew cam sả ủ lạnh mười hai tiếng | 45k | 55k\n## Trà | S | M | L\nTrà đào | 30k | 35k | 40k\nTrà vải | 30k | 35k | 40k\nTrà sen vàng | 35k | 40k | 45k | Hương sen tự nhiên, ít ngọt');
  await page.getByTestId('mbd-combo').fill('Combo sáng siêu tiết kiệm cho dân văn phòng | Cà phê sữa đá size L + bánh mì ốp la + trà đá miễn phí | 59k');
  for (let z = 0; z < 3; z++) { await sizes.nth(z).click(); await audit(page, `chữ dài khổ ${z}`); }
  await snap(page, 'chu-dai.png');

  // ảnh món nổi bật + logo
  await page.getByTestId('mbd-photo').first().setInputFiles({ name: 'mon.png', mimeType: 'image/png', buffer: await imgBuf(page, '#7a4a2a') });
  await page.getByTestId('mbd-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await imgBuf(page, '#1f6f5f') });
  await expect.poll(() => page.locator('[data-testid="mbd-print-0"] image').count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => page.locator('[data-testid^="mbd-print-"] image[href^="data:image/jpeg"]').count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  await audit(page, 'có ảnh + logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('mbd-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);
  const zip = fs.readFileSync(await grab('mbd-svg'));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  const zs = zip.toString('utf8');
  expect((zs.match(/<svg/g) || []).length).toBe(3);
  expect(zs).not.toContain('<text');
  const png = fs.readFileSync(await grab('mbd-png'));
  expect(png.readUInt32BE(16)).toBe(2400);
  await page.getByTestId('mbd-panels-1').click();
  const one = fs.readFileSync(await grab('mbd-svg'), 'utf8');
  expect(one).toContain('<svg'); expect(one).not.toContain('<text');
  await page.getByTestId('mbd-panels-3').click();

  // 3D: đủ 3 chất liệu
  for (const m of ['alu', 'lightbox', 'wood']) {
    await page.getByTestId(`mbd-mat-${m}`).click();
    await page.waitForTimeout(400);
    const u = await page.evaluate(() => (window as unknown as { __mbdSnap: (w: number, h: number) => Promise<string> }).__mbdSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${m}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const p3 = fs.readFileSync(await grab('mbd-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  expect(errors).toEqual([]);
});
