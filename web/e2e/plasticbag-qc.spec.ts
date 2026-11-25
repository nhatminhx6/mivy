import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Túi xốp / túi nilon in logo: mọi mẫu × mọi khổ (2 loại túi) — chữ nằm trong vùng in an toàn (không đè lỗ quai,
// đường hàn, nếp hông), không chồng nhau, số màu mực ≤ số màu khách chọn; logo; tải PNG/PDF/SVG; 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'plasticbag');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="pb-print-front"] svg') as SVGSVGElement;
    const [ax, ay, aw, ah] = (svg.getAttribute('data-area') || '0 0 0 0').split(' ').map(Number);
    const texts = [...svg.querySelectorAll('[data-pbt]')] as SVGTextElement[];
    const boxes = texts.map((t) => {
      const b = t.getBBox(); const m = t.getCTM(); const sm = svg.getCTM();
      // quy về toạ độ viewBox (mm)
      const k = m && sm ? m.a / sm.a : 1, ox = m && sm ? (m.e - sm.e) / sm.a : 0, oy = m && sm ? (m.f - sm.f) / sm.d : 0;
      return { t: t.textContent || '', x: b.x * k + ox, y: b.y * k + oy, w: b.width * k, h: b.height * k, fs: parseFloat(t.getAttribute('font-size') || '0'), masked: !!t.closest('mask') };
    });
    const out = boxes.filter((b) => b.w > 0 && (b.x < ax - 0.8 || b.y < ay - 0.8 || b.x + b.w > ax + aw + 0.8 || b.y + b.h > ay + ah + 0.8)).map((b) => `${b.t} [${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}×${b.h.toFixed(1)}]`);
    const small = boxes.filter((b) => b.fs < 2.5).map((b) => `${b.t}:${b.fs.toFixed(2)}`);
    const vis = boxes.filter((b) => !b.masked && b.w > 0);
    const overlaps: string[] = [];
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i], b = vis[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0.5 && iy > 0.4 * Math.min(a.h, b.h)) overlaps.push(`${a.t} × ${b.t}`);
    }
    const inks = new Set<string>();
    svg.querySelectorAll('#In *').forEach((el) => {
      if (el.closest('mask,clipPath,defs')) return;
      for (const at of ['fill', 'stroke']) { const v = el.getAttribute(at); if (v && v !== 'none' && !v.startsWith('url(')) inks.add(v.toUpperCase()); }
    });
    const nInk = document.querySelectorAll('[data-testid="pb-inks"] > div').length;
    return { n: texts.length, out, small, overlaps, inks: [...inks], nInk, hasCut: !!svg.querySelector('#CutContour path') };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(2);
  expect(r.out, `${label}: chữ lòi khỏi vùng in`).toEqual([]);
  expect(r.small, `${label}: chữ quá nhỏ`).toEqual([]);
  expect(r.overlaps, `${label}: chữ chồng nhau`).toEqual([]);
  expect(r.inks.length, `${label}: số màu mực ${r.inks.join(',')} > ${r.nInk}`).toBeLessThanOrEqual(r.nInk);
  expect(r.hasCut, `${label}: có đường cắt`).toBe(true);
  return r;
}

test('Túi xốp in logo: mọi mẫu × khổ, màu mực, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/plasticbag');
  const tpls = page.getByTestId('pb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    const sizes = page.locator('[data-testid="pb-sizes"] button');
    for (let z = 0; z < await sizes.count(); z++) {
      await sizes.nth(z).click();
      await audit(page, `mẫu ${i} khổ ${z}`);
    }
    await page.getByTestId('pb-flat').screenshot({ path: path.join(OUT, `pb-${String(i).padStart(2, '0')}.png`) });
  }

  // 1 màu mực: lớp In chỉ còn 1 màu
  await tpls.nth(0).click();
  await page.locator('[data-testid="pb-inkcount"] button').first().click();
  const one = await audit(page, '1 màu');
  expect(one.inks.length).toBe(1);
  await page.locator('[data-testid="pb-inkcount"] button').nth(1).click();

  // chữ dài + tự huỷ sinh học, cả 2 loại túi
  for (const k of ['die', 'tshirt']) {
    await page.getByTestId(`pb-kind-${k}`).click();
    await page.getByTestId('pb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC BẢO');
    await page.getByTestId('pb-slogan').fill('Cảm ơn quý khách đã tin tưởng và ủng hộ cửa hàng chúng tôi suốt nhiều năm qua');
    await page.getByTestId('pb-address').fill('Số 123/45 Đường Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
    await page.getByTestId('pb-bio').locator('input').check();
    const L = page.locator('[data-testid="pb-layouts"] button');
    for (let l = 0; l < await L.count(); l++) { await L.nth(l).click(); await audit(page, `${k} chữ dài bố cục ${l}`); }
    await page.getByTestId('pb-flat').screenshot({ path: path.join(OUT, `pb-long-${k}.png`) });
    await page.getByTestId('pb-bio').locator('input').uncheck();
  }

  // logo: ảnh màu → bóng 1 màu, không thêm màu mực
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 120); x.fillStyle = '#1F5FD1'; x.beginPath(); x.arc(60, 60, 45, 0, 7); x.fill(); x.fillStyle = '#E0457B'; x.fillRect(110, 25, 70, 70); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('pb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect.poll(() => page.locator('[data-testid="pb-print-front"] svg #In mask image').count(), { timeout: 10_000 }).toBeGreaterThan(0);
  await audit(page, 'logo');

  // tải file: 2 mặt → PDF 2 trang + zip 2 SVG; 1 mặt → 1 SVG
  await page.locator('[data-testid="pb-faces"] button').nth(1).click();
  await page.locator('[data-testid="pb-back"] button').nth(1).click();
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zip = fs.readFileSync(await grab('pb-svg'));
  expect(zip.subarray(0, 2).toString()).toBe('PK');
  expect(zip.toString('utf8')).toContain('id="CutContour"');
  await page.locator('[data-testid="pb-faces"] button').first().click();
  const svg = fs.readFileSync(await grab('pb-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const pngF = fs.readFileSync(await grab('pb-png'));
  expect(pngF.readUInt32BE(16)).toBe(1600);

  // 3D: 2 loại túi, màng trong + màng đen
  await page.getByTestId('tab-3d').click();
  for (const [k, film] of [['die', 1], ['tshirt', 2], ['tshirt', 0]] as const) {
    await page.getByTestId(`pb-kind-${k}`).click();
    await page.locator('[data-testid="pb-films"] button').nth(film).click();
    await page.waitForTimeout(500);
    const url = await page.evaluate(async () => await (window as unknown as { __pbSnap: (w: number, h: number) => Promise<string> }).__pbSnap(1200, 900));
    expect(url.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `pb-3d-${k}-${film}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId('pb-3d').click()]);
  const p3 = path.join(OUT, dl3.suggestedFilename()); await dl3.saveAs(p3);
  expect(fs.readFileSync(p3).readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
