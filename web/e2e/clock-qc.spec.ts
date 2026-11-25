import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Đồng hồ in logo: mọi mẫu × mọi khổ — chữ nằm trong mặt số, không đè nhau, đủ cỡ; chữ dài; logo/ảnh tải lên;
// file in (PDF / SVG có CutContour + Khoan, chữ đã outline), PNG, ảnh 3D các loại viền + để bàn; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'clock');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ck-print"] svg') as SVGSVGElement;
    const R = parseFloat(svg.getAttribute('data-r')!);
    const round = svg.getAttribute('data-shape') === 'round';
    const inv = svg.getScreenCTM()!.inverse();
    const boxes: { x0: number; y0: number; x1: number; y1: number; arc: string | null; t: string }[] = [];
    const bad: string[] = [];
    let minSize = Infinity;
    svg.querySelectorAll('#In text').forEach((el) => {
      const t = el as SVGTextElement;
      if (!t.textContent?.trim()) return;
      const bb = t.getBBox();
      const m = inv.multiply(t.getScreenCTM()!);
      const pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      for (const p of pts) {
        const out = round ? Math.hypot(p.x, p.y) > R * 0.99 : Math.max(Math.abs(p.x), Math.abs(p.y)) > R * 0.99;
        if (out) { bad.push(`ngoài mặt số: "${t.textContent}"`); break; }
      }
      const fs = parseFloat(t.getAttribute('font-size') || '0') * Math.hypot(m.a, m.b);
      minSize = Math.min(minSize, fs);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const arc = t.closest('[data-arc]')?.getAttribute('data-arc') ?? null;
      const k = arc ? 0.2 : 0.06; // co hộp chữ vòng (xoay) cho bớt dương tính giả
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      boxes.push({ x0: Math.min(...xs) + w * k, y0: Math.min(...ys) + h * k, x1: Math.max(...xs) - w * k, y1: Math.max(...ys) - h * k, arc, t: t.textContent! });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.arc && a.arc === b.arc) continue;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.3 && oy > 0.3) bad.push(`đè nhau: "${a.t}" × "${b.t}"`);
    }
    return { bad, minSize, n: boxes.length };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.minSize, `${label}: chữ nhỏ nhất ${r.minSize.toFixed(2)}mm`).toBeGreaterThanOrEqual(2.3);
  expect(r.n, `${label}: phải có chữ`).toBeGreaterThanOrEqual(3);
}

const pngBuffer = async (page: Page, w: number, h: number, color: string) => {
  const u = await page.evaluate(([w, h, color]) => {
    const c = document.createElement('canvas'); c.width = +w; c.height = +h;
    const x = c.getContext('2d')!; x.fillStyle = String(color); x.fillRect(0, 0, +w, +h);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(+w / 2, +h / 2, +w / 3, 0, Math.PI * 2); x.fill();
    return c.toDataURL('image/png');
  }, [w, h, color] as const);
  return Buffer.from(u.split(',')[1], 'base64');
};

test('Đồng hồ in logo: mẫu × khổ, chữ dài, logo/ảnh, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/clock');
  const tpls = page.getByTestId('ck-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const sizes = page.getByTestId('ck-size');
  const nT = await tpls.count(), nS = await sizes.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  expect(nS).toBe(5);

  // 1) mọi mẫu × mọi khổ
  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    for (let j = 0; j < nS; j++) {
      await sizes.nth(j).click();
      await audit(page, `mẫu ${i} khổ ${j}`);
    }
  }

  // 2) chữ rất dài ở mọi bố cục, khổ nhỏ nhất (để bàn) + lớn nhất
  const LONG: Record<string, string> = {
    brand: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ XUẤT NHẬP KHẨU AN KHANG',
    slogan: 'Tận tâm phục vụ · Uy tín hàng đầu · Chất lượng vượt trội',
    contact: 'Hotline 1900 6868 · www.ankhanggroup.com.vn',
    names: 'Nguyễn Quốc Bảo & Trần Thị Thu Hà',
    date: 'Kỷ niệm 10 năm ngày cưới 12.12.2026',
    year: 'Chúc mừng năm mới Xuân Đinh Mùi 2027',
  };
  const layouts = page.locator('[data-testid="ck-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (const [k, v] of Object.entries(LONG)) {
      const inp = page.getByTestId(`ck-in-${k}`);
      if (await inp.count()) await inp.fill(v);
    }
    for (const j of [4, 2]) { await sizes.nth(j).click(); await audit(page, `chữ dài bố cục ${l} khổ ${j}`); }
  }

  // 3) logo tải lên → có <image data-ck=logo> trong file in
  await tpls.nth(0).click(); await sizes.nth(1).click();
  await page.getByTestId('ck-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await pngBuffer(page, 300, 300, '#1F3A68') });
  await expect(page.locator('[data-testid="ck-print"] svg image[data-ck="logo"]')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'có logo');

  // 4) ảnh nhỏ cho mẫu ảnh → cảnh báo độ nét; ảnh vào mặt số
  await tpls.nth(6).click();
  await page.getByTestId('ck-photo').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: await pngBuffer(page, 260, 200, '#7FA5A1') });
  await expect(page.getByTestId('ck-dpi')).toContainText('mờ');
  await expect(page.locator('[data-testid="ck-print"] svg image[data-ck="photo"]')).toHaveCount(1);
  await page.getByTestId('ck-zoom').fill('1.6');
  await audit(page, 'ảnh khách');

  // 5) tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  await tpls.nth(0).click(); await sizes.nth(1).click();
  const pdf = fs.readFileSync(await grab('ck-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('ck-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Khoan"');
  expect(svg).toContain('id="In"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  expect(svg).toMatch(/width="276mm"/); // Ø30: mặt số 270 + 2×3mm lề xén
  const png = fs.readFileSync(await grab('ck-png'));
  expect(png.readUInt32BE(16)).toBe(1600);
  const p3d = fs.readFileSync(await grab('ck-3d'));
  expect(p3d.readUInt32BE(16)).toBe(1600);

  // 6) 3D: mọi viền (treo tường) + vuông + để bàn
  const snap = async (name: string) => {
    await page.waitForTimeout(1800);
    const u = await page.evaluate(() => (window as unknown as { __ckSnap: (w: number, h: number) => Promise<string> }).__ckSnap(1200, 900));
    expect(u.length, `${name}: ảnh 3D`).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(u.split(',')[1], 'base64'));
  };
  const frames = page.getByTestId('ck-frame');
  for (let f = 0; f < await frames.count(); f++) { await frames.nth(f).click(); await snap(`3d-vien-${f}`); }
  await sizes.nth(3).click(); await snap('3d-vuong');
  await sizes.nth(4).click(); await snap('3d-de-ban');

  expect(errors).toEqual([]);
});
