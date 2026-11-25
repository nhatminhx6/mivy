import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thiệp mời sự kiện: mọi mẫu × khổ, phẳng + gấp đôi — chữ nằm gọn trong từng mặt (không lấn nếp gấp), không đè nhau,
// không quá nhỏ; chữ rất dài vẫn vừa; 30 khách mời → PDF cá nhân hoá 30 trang; PDF in đủ trang (+ RSVP + khuôn ép kim); ảnh 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'invitation');
fs.mkdirSync(OUT, { recursive: true });

const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

async function audit(page: Page, testid: string, label: string, halves = 1) {
  const r = await page.getByTestId(testid).locator('svg').first().evaluate((svg: SVGSVGElement, halves: number) => {
    const vb = svg.viewBox.baseVal;
    const hw = vb.width / halves;
    const bad: string[] = [];
    const boxes: { half: number; x: number; y: number; w: number; h: number; t: string }[] = [];
    svg.querySelectorAll('text').forEach((t) => {
      const b = (t as SVGTextElement).getBBox();
      if (!t.textContent?.trim() || b.width === 0) return;
      const m = (t as SVGGraphicsElement).getCTM()!, sm = svg.getCTM()!.inverse().multiply(m);
      const x = b.x + sm.e, y = b.y + sm.f;
      const half = Math.min(halves - 1, Math.max(0, Math.floor((x + b.width / 2) / hw)));
      const x0 = half * hw, x1 = x0 + hw;
      if (x < x0 + 1.5 || x + b.width > x1 - 1.5 || y < 1 || y + b.height > vb.height - 1) bad.push(`ngoài khung: "${t.textContent}" [${x.toFixed(1)},${y.toFixed(1)},${b.width.toFixed(1)}×${b.height.toFixed(1)}] mặt ${half}`);
      const fs = parseFloat(t.getAttribute('font-size') || '0') * (sm.a || 1);
      if (fs < 1.6) bad.push(`chữ quá nhỏ ${fs.toFixed(2)}mm: "${t.textContent}"`);
      boxes.push({ half, x, y, w: b.width, h: b.height, t: t.textContent || '' });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.half !== c.half) continue;
      const ia = a.h * 0.24, ic = c.h * 0.24;
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const oy = Math.min(a.y + a.h - ia, c.y + c.h - ic) - Math.max(a.y + ia, c.y + ic);
      if (ox > 0.4 && oy > 0.4) bad.push(`đè nhau: "${a.t}" × "${c.t}"`);
    }
    return { bad, n: boxes.length };
  }, halves);
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(4);
}

async function grab(page: Page, id: string) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
}

test('Thiệp mời: mọi mẫu × khổ, phẳng & gấp đôi, cá nhân hoá, PDF, 3D', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/studio/invitation');
  const tpls = page.getByTestId('iv-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  await page.getByTestId('tab-flat').click();

  // thiệp phẳng: mọi mẫu × 3 khổ
  const sizes = page.getByTestId('iv-sizes').locator('button');
  for (let z = 0; z < await sizes.count(); z++) {
    await sizes.nth(z).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click(); await page.waitForTimeout(120);
      await audit(page, 'iv-front', `phẳng khổ ${z} mẫu ${i} mặt trước`);
      await audit(page, 'iv-back', `phẳng khổ ${z} mẫu ${i} mặt sau`);
      if (z === 0) await page.getByTestId('iv-front').screenshot({ path: path.join(OUT, `phang-${i}.png`) });
    }
  }
  await audit(page, 'iv-rsvp', 'thẻ RSVP');

  // gấp đôi: mọi mẫu (khổ DL + A5)
  await page.getByTestId('iv-fold').click(); await page.getByTestId('tab-flat').click().catch(() => null);
  for (const z of [0, 2]) {
    await sizes.nth(z).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click(); await page.waitForTimeout(120);
      await audit(page, 'iv-outside', `gấp khổ ${z} mẫu ${i} mặt ngoài`, 2);
      await audit(page, 'iv-inside', `gấp khổ ${z} mẫu ${i} mặt trong`, 2);
    }
  }
  await page.getByTestId('iv-inside').screenshot({ path: path.join(OUT, 'gap-doi-mat-trong.png') });

  // chữ rất dài + khách mời dài
  await sizes.nth(0).click();
  await page.getByTestId('iv-title').fill('Hội nghị tổng kết hoạt động kinh doanh và tri ân khách hàng, đối tác chiến lược toàn quốc năm 2026');
  await page.getByTestId('iv-venue').fill('Trung tâm Hội nghị Tiệc cưới An Khang Palace – Sảnh Đại Yến Kim Cương tầng 3');
  await page.getByTestId('iv-address').fill('Số 1234 Đường Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Thành phố Hồ Chí Minh');
  await page.getByTestId('iv-agenda').fill('07:30 | Đón khách, check-in, chụp ảnh lưu niệm tại khu vực backdrop chính\n08:00 | Khai mạc\n08:30 | Báo cáo tổng kết hoạt động kinh doanh năm 2026 và định hướng 2027\n10:00 | Vinh danh các đối tác xuất sắc\n11:00 | Bốc thăm may mắn\n11:30 | Tiệc trưa thân mật');
  await page.getByTestId('iv-recipients').fill(Array.from({ length: 30 }, (_, i) => `Ông/Bà Nguyễn Văn Khách Mời Số ${i + 1} | Giám đốc Điều hành Công ty Cổ phần Thương mại Dịch vụ Hải Đăng ${i + 1}`).join('\n'));
  await page.getByTestId('iv-pv').selectOption('5');
  for (let i = 0; i < n; i += 3) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    await audit(page, 'iv-outside', `chữ dài gấp mẫu ${i} ngoài`, 2);
    await audit(page, 'iv-inside', `chữ dài gấp mẫu ${i} trong`, 2);
  }
  const rTxt = (await page.getByTestId('iv-inside').locator('[data-iv="recipient"]').allTextContents()).join(' ');
  expect(rTxt).toContain('Số 6');
  await page.getByTestId('iv-flat').click(); await page.getByTestId('tab-flat').click().catch(() => null);
  for (let i = 0; i < n; i += 3) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    await audit(page, 'iv-front', `chữ dài phẳng mẫu ${i} trước`);
    await audit(page, 'iv-back', `chữ dài phẳng mẫu ${i} sau`);
  }
  await page.getByTestId('iv-front').screenshot({ path: path.join(OUT, 'chu-dai-mat-truoc.png') });

  // PDF cá nhân hoá 30 trang
  const pers = fs.readFileSync(await grab(page, 'iv-pers'));
  expect(pdfPages(pers)).toBe(30);

  // PDF in chính: mẫu có ép kim → 2 tờ + RSVP + 2 khuôn + khuôn RSVP = 6
  await tpls.nth(2).click(); await page.waitForTimeout(200);
  const main = fs.readFileSync(await grab(page, 'iv-pdf'));
  expect(main.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdfPages(main)).toBe(6);
  // mẫu không ép kim, bỏ RSVP → 2 trang
  await tpls.nth(0).click(); await page.getByTestId('iv-rsvp-card').uncheck(); await page.waitForTimeout(200);
  expect(pdfPages(fs.readFileSync(await grab(page, 'iv-pdf')))).toBe(2);
  await page.getByTestId('iv-rsvp-card').check();

  // PNG mặt chính
  const png = fs.readFileSync(await grab(page, 'iv-face-png'));
  expect(png.readUInt32BE(16)).toBe(1400);

  // 3D: phẳng + gấp
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  for (const fold of [false, true]) {
    await page.getByTestId(fold ? 'iv-fold' : 'iv-flat').click();
    await page.waitForTimeout(800);
    const u = await page.evaluate(() => (window as unknown as { __ivSnap: (w: number, h: number) => Promise<string> }).__ivSnap(1200, 1200));
    fs.writeFileSync(path.join(OUT, `3d-${fold ? 'gap' : 'phang'}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  const p3 = fs.readFileSync(await grab(page, 'iv-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('iv-envelope-link')).toHaveAttribute('href', '/studio/envelope');
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
