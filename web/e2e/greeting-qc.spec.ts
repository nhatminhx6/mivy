import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thiệp Tết doanh nghiệp: mọi mẫu × khổ, gấp đôi + phẳng — chữ nằm gọn trong từng nửa thiệp (không lấn nếp gấp),
// không đè nhau; danh sách 30 người nhận → PDF cá nhân hoá 30 trang; PDF in đủ trang (+ khuôn ép kim); ảnh 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'greeting');
fs.mkdirSync(OUT, { recursive: true });

const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

/** kiểm 1 tờ: mỗi <text> nằm trong nửa của nó (cách mép ≥ 1mm), các dòng cùng nửa không chồng nhau */
async function audit(page: Page, testid: string, label: string) {
  const r = await page.getByTestId(testid).locator('svg').first().evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const halves = Math.round(vb.width / vb.height) >= 2 || vb.width / vb.height > 1.3 ? 2 : 1;
    const hw = vb.width / halves;
    const bad: string[] = [];
    const boxes: { half: number; x: number; y: number; w: number; h: number; t: string }[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      const b = (t as SVGTextElement).getBBox();
      if (!t.textContent?.trim() || b.width === 0) return;
      // toạ độ trong hệ của svg (text nằm trong <g translate>)
      const m = (t as SVGGraphicsElement).getCTM()!, sm = svg.getCTM()!.inverse().multiply(m);
      const x = b.x + sm.e, y = b.y + sm.f;
      const half = Math.min(halves - 1, Math.floor((x + b.width / 2) / hw));
      const x0 = half * hw, x1 = x0 + hw;
      if (x < x0 + 1 || x + b.width > x1 - 1 || y < 0.5 || y + b.height > vb.height - 0.5) bad.push(`ngoài khung: "${t.textContent}" [${x.toFixed(1)},${y.toFixed(1)},${b.width.toFixed(1)}×${b.height.toFixed(1)}] nửa ${half}`);
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      if (fs < 1.3) bad.push(`chữ quá nhỏ ${fs}mm: "${t.textContent}"`);
      boxes.push({ half, x, y, w: b.width, h: b.height, t: t.textContent || '' });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.half !== c.half) continue;
      // bỏ phần trên/dưới rỗng của hộp chữ (ascent/descent) → so lõi chữ
      const ia = a.h * 0.22, ic = c.h * 0.22;
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const oy = Math.min(a.y + a.h - ia, c.y + c.h - ic) - Math.max(a.y + ia, c.y + ic);
      if (ox > 0.5 && oy > 0.5) bad.push(`đè nhau: "${a.t}" × "${c.t}"`);
    }
    return { bad, n: boxes.length };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(2);
}

test('Thiệp Tết: mọi mẫu × khổ, cá nhân hoá, file in, 3D', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/greeting');
  const tpls = page.getByTestId('gt-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  await page.getByTestId('tab-flat').click();

  const sizes = page.getByTestId('gt-sizes').locator('button');
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      await audit(page, 'gt-outside', `size ${s} mẫu ${i} ngoài`);
      await audit(page, 'gt-inside', `size ${s} mẫu ${i} trong`);
      if (s === 0) {
        await page.getByTestId('gt-outside').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}-ngoai.png`) });
        await page.getByTestId('gt-inside').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}-trong.png`) });
      }
    }
  }
  await sizes.first().click();

  // nội dung dài vẫn gọn
  await tpls.first().click();
  await page.getByTestId('gt-brand').fill('CÔNG TY CỔ PHẦN THƯƠNG MẠI DỊCH VỤ AN KHANG VIỆT NAM');
  await page.getByTestId('gt-headline').fill('Chúc Mừng Năm Mới An Khang Thịnh Vượng Vạn Sự Như Ý');
  await page.getByTestId('gt-greeting').fill('Kính chúc Quý khách '.repeat(28));
  await page.getByTestId('gt-recipients').fill(Array.from({ length: 30 }, (_, i) => `Anh Trần Gia Khánh số ${i + 1} | Công ty TNHH Thương mại Hải Đăng chi nhánh ${i + 1}`).join('\n'));
  await page.getByTestId('gt-pv').selectOption('29');
  for (let i = 0; i < n; i += 3) {
    await tpls.nth(i).click(); await page.waitForTimeout(120);
    await audit(page, 'gt-outside', `dài mẫu ${i} ngoài`);
    await audit(page, 'gt-inside', `dài mẫu ${i} trong`);
  }
  await page.getByTestId('gt-inside').screenshot({ path: path.join(OUT, 'noi-dung-dai-trong.png') });
  const inside = await page.getByTestId('gt-inside').textContent();
  expect(inside).toContain('số 30');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return fs.readFileSync(p);
  };
  // PDF cá nhân hoá: 30 trang
  const pers = await grab('gt-pers');
  expect(pers.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(pers)).toBe(30);
  // PDF in: ngoài + trong + 2 trang khuôn ép kim (mẫu đỏ ánh kim)
  await tpls.first().click(); await page.waitForTimeout(200);
  expect(pdfPages(await grab('gt-pdf'))).toBe(4);
  await page.getByTestId('gt-foil').uncheck();
  expect(pdfPages(await grab('gt-pdf'))).toBe(2);
  await page.getByTestId('gt-foil').check();

  // thiệp phẳng: trước + sau
  await page.getByTestId('gt-flat').click();
  await page.getByTestId('gt-recipients').fill('');
  for (let i = 0; i < n; i += 2) {
    await tpls.nth(i).click(); await page.waitForTimeout(120);
    await audit(page, 'gt-front', `phẳng mẫu ${i} trước`);
    await audit(page, 'gt-back', `phẳng mẫu ${i} sau`);
  }
  expect(pdfPages(await grab('gt-pdf'))).toBeGreaterThanOrEqual(2);
  await page.getByTestId('gt-fold').click();

  // PNG bìa
  const png = await grab('gt-cover-png');
  expect(png.readUInt32BE(16)).toBe(1400);

  // 3D: dựng được, ảnh 1600
  await page.getByTestId('tab-3d').click();
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __gtSnap?: unknown }).__gtSnap), { timeout: 30_000 }).toBe(true);
  for (const i of [0, 4, 10, 11]) {
    await tpls.nth(i).click(); await page.waitForTimeout(600);
    const url = await page.evaluate(() => (window as unknown as { __gtSnap: (w: number, h: number) => Promise<string> }).__gtSnap(1000, 1000));
    fs.writeFileSync(path.join(OUT, `3d-mau-${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
    expect(url.length).toBeGreaterThan(50_000);
  }
  await page.waitForTimeout(1500);
  const shot3d = await grab('gt-png');
  expect(shot3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  await expect(page.getByTestId('gt-envelope-link')).toHaveAttribute('href', '/studio/envelope');
  expect(errors).toEqual([]);
});
