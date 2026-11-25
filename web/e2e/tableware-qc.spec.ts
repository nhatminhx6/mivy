import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bộ bàn ăn F&B: mọi mẫu × khổ giấy lót khay → chữ nằm trong khổ, không đè nhau; bao đũa + khăn giấy vừa khung,
// khăn đúng số màu mực; file in tải được (PDF/SVG chữ outline, khuôn bao đũa có CutContour); 3D dựng được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tableware');

async function audit(page: Page, testid: string, label: string, inset = 1.2) {
  return page.getByTestId(testid).locator('svg').first().evaluate((svg: SVGSVGElement, inset: number) => {
    const vb = svg.viewBox.baseVal;
    // khung thành phẩm (bỏ lề xén): viewBox có thể bắt đầu âm khi có bleed
    const x0 = Math.max(0, vb.x), y0 = Math.max(0, vb.y), x1 = vb.x + vb.width - Math.max(0, -vb.x), y1 = vb.y + vb.height - Math.max(0, -vb.y);
    const inv = svg.getScreenCTM()!.inverse();
    const boxes: { t: string; x: number; y: number; w: number; h: number; size: number }[] = [];
    for (const el of Array.from(svg.querySelectorAll('text'))) {
      const t = (el.textContent || '').trim(); if (!t) continue;
      const b = el.getBBox(); const m = inv.multiply(el.getScreenCTM()!);
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const size = parseFloat(getComputedStyle(el).fontSize) * Math.abs(m.a);
      boxes.push({ t, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), size });
    }
    const out = boxes.filter((b) => b.x < x0 + inset - 0.01 || b.y < y0 + inset * 0.5 - 0.01 || b.x + b.w > x1 - inset + 0.01 || b.y + b.h > y1 - inset * 0.5 + 0.01).map((b) => b.t);
    // chồng chữ: 2 hộp cắt nhau > 35% hộp nhỏ hơn (thu hộp theo chiều cao chữ thật ~ 0.72em để bỏ khoảng trống dấu)
    const lap: string[] = [];
    const tight = boxes.map((b) => ({ ...b, y: b.y + b.h * 0.18, h: b.h * 0.64 }));
    for (let i = 0; i < tight.length; i++) for (let j = i + 1; j < tight.length; j++) {
      const a = tight[i], c = tight[j];
      const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      if (ix > 0 && iy > 0 && ix * iy > 0.35 * Math.min(a.w * a.h, c.w * c.h)) lap.push(`${a.t} × ${c.t}`);
    }
    const minSize = Math.min(...boxes.map((b) => b.size));
    return { n: boxes.length, out, lap, minSize, qr: svg.querySelectorAll('[data-qr]').length };
  }, inset).then((r) => ({ ...r, label }));
}

test('Bộ bàn ăn: mọi mẫu × khổ, bao đũa, khăn, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tableware');
  const tpls = page.getByTestId('tw-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBeGreaterThanOrEqual(12);
  await expect(page.locator('[data-testid="tw-tpl"] svg')).toHaveCount(await tpls.count());
  await page.getByTestId('tab-flat').click();

  const check = async (label: string) => {
    await page.getByTestId('tw-item-liner').click();
    const l = await audit(page, 'tw-liner', `${label} lót khay`, 2);
    expect(l.out, `${label}: chữ lòi khỏi giấy lót khay`).toEqual([]);
    expect(l.lap, `${label}: chữ đè nhau`).toEqual([]);
    expect(l.minSize, `${label}: chữ quá nhỏ`).toBeGreaterThan(1.6);
    expect(l.qr, `${label}: thiếu mã QR`).toBe(1);
    await page.getByTestId('tw-item-sleeve').click();
    for (const id of ['tw-sleeve-front', 'tw-sleeve-back']) {
      const s = await audit(page, id, `${label} ${id}`, 0.8);
      expect(s.out, `${label} ${id}: chữ lòi khỏi bao đũa`).toEqual([]);
      expect(s.lap, `${label} ${id}: chữ đè nhau`).toEqual([]);
      expect(s.minSize).toBeGreaterThan(1.6);
    }
    await page.getByTestId('tw-item-napkin').click();
    const nap = await page.getByTestId('tw-napkin').locator('svg').evaluate((svg: SVGSVGElement) => {
      const art = svg.querySelector('[data-napkin-art]') as SVGGElement; const b = art.getBBox();
      const cols = new Set<string>();
      art.querySelectorAll('*').forEach((el) => {
        for (const a of ['fill', 'stroke']) { const v = el.getAttribute(a); if (v && v !== 'none' && !v.startsWith('url')) cols.add(v.toUpperCase()); }
        const fc = el.getAttribute('flood-color'); if (fc) cols.add(fc.toUpperCase());
      });
      return { x: b.x, y: b.y, w: b.width, h: b.height, cols: [...cols] };
    });
    const z0 = (165 - 100) / 2 - 1, z1 = z0 + 102;
    expect(nap.x >= z0 && nap.y >= z0 && nap.x + nap.w <= z1 && nap.y + nap.h <= z1, `${label}: hình khăn lòi khỏi vùng in 10×10cm`).toBe(true);
    const inks = await page.getByTestId('tw-inks').locator('button').evaluateAll((bs) => bs.findIndex((b) => b.className.includes('indigo-400')) + 1);
    expect(nap.cols.length, `${label}: khăn in quá số màu mực (${nap.cols.join(',')})`).toBeLessThanOrEqual(inks);
  };

  const sizes = page.getByTestId('tw-size');
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click();
    for (let z = 0; z < await sizes.count(); z++) {
      await sizes.nth(z).click();
      await page.waitForTimeout(60);
      await check(`mẫu ${i} khổ ${z}`);
    }
    if (i % 3 === 0) { await page.getByTestId('tw-item-liner').click(); await page.getByTestId('tw-liner').screenshot({ path: path.join(OUT, `lot-khay-${String(i).padStart(2, '0')}.png`) }); }
  }
  // khăn 1 màu
  await page.getByTestId('tw-inks').locator('button').first().click();
  await check('khăn 1 màu');

  // nội dung rất dài + logo khách
  await sizes.first().click();
  await page.getByTestId('tw-brand').fill('Nhà Hàng Hải Sản Tươi Sống Gia Khánh Quận Bảy');
  await page.getByTestId('tw-slogan').fill('Hải sản tươi sống bắt tại hồ — chế biến theo yêu cầu, giá niêm yết rõ ràng');
  await page.getByTestId('tw-story').fill('Câu chuyện rất dài '.repeat(40));
  await page.getByTestId('tw-menu').fill(Array.from({ length: 12 }, (_, i) => `Món đặc sản số ${i + 1} sốt me chua ngọt kiểu nhà làm | ${(i + 1) * 45}.000`).join('\n'));
  await page.getByTestId('tw-social').fill('fb.com/nhahanghaisantuoisonggiakhanh · TikTok @haisangiakhanh · Zalo 0909 123 456');
  await page.getByTestId('tw-address').fill('Số 1234 Đường Huỳnh Tấn Phát, Phường Tân Thuận, Thành phố Hồ Chí Minh');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 200); x.fillStyle = '#B3261E'; x.beginPath(); x.arc(150, 100, 80, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('tw-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="tw-liner"] svg image')).toHaveCount(1, { timeout: 10_000 });
  for (let z = 0; z < await sizes.count(); z++) { await sizes.nth(z).click(); await page.waitForTimeout(60); await check(`chữ dài khổ ${z}`); }
  await page.getByTestId('tw-item-liner').click();
  await page.getByTestId('tw-liner').screenshot({ path: path.join(OUT, 'lot-khay-chu-dai.png') });

  // tải file
  await sizes.first().click();
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  for (const id of ['tw-pdf-liner', 'tw-pdf-sleeve', 'tw-pdf-napkin']) {
    const f = fs.readFileSync(await grab(id));
    expect(f.subarray(0, 4).toString(), id).toBe('%PDF');
    expect(f.length, id).toBeGreaterThan(30_000);
  }
  for (const id of ['tw-svg-liner', 'tw-svg-sleeve', 'tw-svg-napkin']) {
    const s = fs.readFileSync(await grab(id), 'utf8');
    expect(s.includes('<text'), `${id}: còn <text> chưa outline`).toBe(false);
    if (id === 'tw-svg-sleeve') { expect(s).toContain('id="CutContour"'); expect(s).toContain('id="Fold"'); }
    if (id === 'tw-svg-napkin') expect(s).toContain('id="Fold"');
  }
  // PNG cả bộ = 3 file
  const pngs: string[] = [];
  page.on('download', async (d) => pngs.push(d.suggestedFilename()));
  await page.getByTestId('tw-png').click();
  await expect.poll(() => pngs.length, { timeout: 60_000 }).toBe(3);

  // 3D
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  const img3d = await page.evaluate(async () => await (window as unknown as { __twSnap: (w: number, h: number) => Promise<string> }).__twSnap(1600, 1200));
  const buf = Buffer.from(img3d.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, 'bo-ban-an-3d.png'), buf);
  expect(buf.readUInt32BE(16)).toBe(1600);
  const d3 = await grab('tw-3d');
  expect(fs.readFileSync(d3).readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
