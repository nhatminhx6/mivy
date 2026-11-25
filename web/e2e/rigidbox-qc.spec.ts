import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp quà cứng: mọi kiểu × khổ × mẫu — chữ mặt nắp nằm gọn trong mặt, không chồng; khuôn giấy bồi đủ phần + có nét cắt/gấp;
// PDF đúng số trang (khuôn + khuôn ép kim + bảng cắt), zip SVG chữ đã outline, PNG 2000px, 3D chụp được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'rigidbox');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = ['tet', 'wine', 'cosmetic', 'jewelry', 'tea'];

async function auditTop(page: Page, label: string) {
  const r = await page.locator('[data-testid="rb-top"] svg').evaluate((svg: SVGSVGElement) => {
    const box = svg.getBoundingClientRect();
    const k = box.width / svg.viewBox.baseVal.width; // px / mm
    const rects = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBoundingClientRect();
      const sh = b.height * 0.22; // hộp em của font rộng hơn nét chữ thật
      return { t: t.textContent || '', x0: b.left, x1: b.right, y0: b.top + sh, y1: b.bottom - sh, size: parseFloat(t.getAttribute('font-size') || '0') };
    });
    const out: string[] = [];
    const tol = 1.2 * k;
    rects.forEach((a) => {
      if (a.x0 < box.left - tol || a.x1 > box.right + tol || a.y0 < box.top - tol || a.y1 > box.bottom + tol) out.push(`ra ngoài: "${a.t}"`);
    });
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 1.5 * k && oy > 1.5 * k) out.push(`chồng: "${a.t}" × "${b.t}"`);
    }
    const tiny = rects.filter((a) => a.size > 0 && a.size < 2.2).map((a) => `chữ nhỏ ${a.size.toFixed(2)}mm: "${a.t}"`);
    return { problems: [...out, ...tiny], n: rects.length };
  });
  expect(r.problems, `${label}: ${r.problems.join('; ')}`).toEqual([]);
  expect(r.n, `${label}: phải có chữ`).toBeGreaterThan(0);
}

test('Hộp quà cứng: mọi kiểu × khổ × mẫu, khuôn, file in, 3D', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/rigidbox');
  const tpls = page.getByTestId('rb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await page.waitForFunction(() => !!(window as unknown as { __rbSnap?: unknown }).__rbSnap, null, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);

  for (const kind of ['lid', 'magnet', 'drawer'] as const) {
    await page.getByTestId(`rb-kind-${kind}`).click();
    for (let s = 0; s < SIZES.length; s++) {
      await page.locator('[data-testid="rb-sizes"] button').nth(s).click();
      for (let i = 0; i < nT; i++) {
        await tpls.nth(i).click();
        await auditTop(page, `${kind}/${SIZES[s]}/mẫu ${i}`);
      }
      // khuôn: 3 phần, mỗi phần có nét cắt + nét gấp
      const parts = page.getByTestId('rb-part-btn');
      await expect(parts).toHaveCount(3);
      for (let k = 0; k < 3; k++) {
        await parts.nth(k).click();
        const d = await page.locator('[data-testid="rb-dieline"] svg').evaluate((svg) => ({
          cut: svg.querySelectorAll('#CutContour path').length,
          fold: svg.querySelectorAll('#Fold path').length,
          sub: ((svg.querySelector('#CutContour path')?.getAttribute('d') || '').match(/M/g) || []).length,
        }));
        expect(d.cut, `${kind}/${SIZES[s]} phần ${k}: nét cắt`).toBe(1);
        expect(d.sub, `${kind}/${SIZES[s]} phần ${k}: nét cắt liền 1 vòng`).toBe(1);
        expect(d.fold).toBeGreaterThanOrEqual(6);
      }
      await page.getByTestId('rb-top').screenshot({ path: path.join(OUT, `top-${kind}-${SIZES[s]}.png`) });
    }
    await parts0(page);
    await page.locator('[data-testid="rb-dieline"]').screenshot({ path: path.join(OUT, `khuon-${kind}.png`) });
  }

  // chữ dài + logo
  await page.getByTestId('rb-kind-lid').click();
  await page.locator('[data-testid="rb-sizes"] button').nth(3).click(); // trang sức 10×10 — mặt nhỏ nhất
  await page.getByTestId('rb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI AN KHANG PHÁT');
  await page.getByTestId('rb-tagline').fill('Quà tặng doanh nghiệp cao cấp cho đối tác và khách hàng thân thiết');
  for (let i = 0; i < nT; i++) { await tpls.nth(i).click(); await auditTop(page, `chữ dài · mẫu ${i}`); }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVR4nGNgYGD4z8DAwMDEgAb+MzAwMDCiC4ABYgFQGwMDAwB2YQMGcI+KsQAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('rb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="rb-top"] svg image').first()).toBeAttached({ timeout: 10_000 });

  // tải file
  await page.getByTestId('rb-brand').fill('AN KHANG');
  await page.getByTestId('rb-tagline').fill('Trà & quà Tết thượng hạng');
  await tpls.first().click();
  await page.locator('[data-testid="rb-sizes"] button').nth(0).click();
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = Number(await page.getByTestId('rb-pdf').getAttribute('data-pages'));
  expect(pages).toBe(3 + 1 + 1); // 3 khuôn + 1 khuôn ép kim (nắp) + bảng cắt
  const pdf = fs.readFileSync(await grab('rb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pages);
  const zip = fs.readFileSync(await grab('rb-svg')).toString('latin1');
  expect(zip.startsWith('PK')).toBe(true);
  expect((zip.match(/giay-boi\.svg/g) || []).length).toBeGreaterThanOrEqual(3);
  expect(zip).toContain('khuon-ep-kim.svg');
  expect(zip).toContain('id="CutContour"');
  expect(zip).not.toContain('<text');
  const top = fs.readFileSync(await grab('rb-png'));
  expect(top.readUInt32BE(16)).toBe(2000);

  // 3D: chụp được mọi kiểu
  for (const kind of ['lid', 'magnet', 'drawer'] as const) {
    await page.getByTestId(`rb-kind-${kind}`).click();
    await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __rbSnap: (w: number, h: number) => Promise<string> }).__rbSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `3d-${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d')).toBeVisible();
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});

async function parts0(page: Page) { await page.getByTestId('rb-part-btn').first().click(); }
