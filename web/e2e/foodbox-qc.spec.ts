import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp đồ ăn · hộp pizza: 4 loại × mọi khổ × mọi mẫu → khuôn bế có ĐÚNG 1 đường cắt bao ngoài (khép kín), chữ nằm gọn
// trong từng tấm (không lấn nét gấp), có nét gấp + lỗ/khe; chữ dài + logo vẫn gọn; tải PDF / SVG (outline, CutContour) /
// ảnh 3D; ?kind= mở đúng loại; chụp 3D từng loại để soi. Không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'foodbox');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(120);
  const r = await page.locator('[data-testid="fb-flat"] svg').evaluate((svg: SVGSVGElement) => {
    const outer = svg.querySelector('[data-cut="outer"]')?.getAttribute('d') || '';
    const folds = svg.querySelector('#Fold path')?.getAttribute('d') || '';
    const bad: string[] = [];
    let n = 0;
    svg.querySelectorAll('[data-panel]').forEach((g) => {
      const rr = g.querySelector('[data-panel-rect]')!.getBoundingClientRect();
      const boxes: { b: DOMRect; s: string }[] = [];
      g.querySelectorAll('text').forEach((t) => {
        const b = t.getBoundingClientRect();
        if (!b.width || !(t.textContent || '').trim()) return;
        n++;
        if (b.left < rr.left - 0.5 || b.right > rr.right + 0.5 || b.top < rr.top - 0.5 || b.bottom > rr.bottom + 0.5) bad.push(`${g.getAttribute('data-panel')}: "${t.textContent}"`);
        boxes.push({ b, s: t.textContent || '' });
      });
      // 2 dòng chữ chồng lên nhau (lấy lõi 60% chiều cao em-box để không bắt nhầm dấu/ascender)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, c = boxes[j].b;
        // tấm xoay ±90°: chiều cao dòng chữ nằm theo trục x màn hình
        const vert = /rotate\((-?90)\)/.test(g.querySelector('g[transform]')?.getAttribute('transform') || '');
        const core = (r: DOMRect) => vert
          ? { l: r.left + r.width * 0.2, r: r.right - r.width * 0.2, t: r.top, b: r.bottom }
          : { l: r.left, r: r.right, t: r.top + r.height * 0.2, b: r.bottom - r.height * 0.2 };
        const A = core(a), C = core(c);
        const ix = Math.min(A.r, C.r) - Math.max(A.l, C.l), iy = Math.min(A.b, C.b) - Math.max(A.t, C.t);
        if (ix > 0.5 && iy > 0.5) bad.push(`${g.getAttribute('data-panel')}: chồng "${boxes[i].s}" × "${boxes[j].s}"`);
      }
    });
    return { loops: (outer.match(/M/g) || []).length, closed: outer.trim().endsWith('Z'), folds: (folds.match(/M/g) || []).length, bad, n, wmm: parseFloat(svg.getAttribute('width') || '0') };
  });
  expect(r.loops, `${label}: đường cắt ngoài phải 1 vòng kín`).toBe(1);
  expect(r.closed, `${label}: đường cắt khép kín`).toBe(true);
  expect(r.folds, `${label}: có nét gấp`).toBeGreaterThan(6);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(3);
  expect(r.bad, `${label}: chữ lấn ra ngoài tấm`).toEqual([]);
  return r;
}

test('Hộp đồ ăn: mọi loại × khổ × mẫu, file in, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/foodbox');
  const kinds = page.getByTestId('fb-kind');
  await expect(kinds.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('fb-tpl').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  let combos = 0;
  for (let k = 0; k < await kinds.count(); k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('fb-size');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      const tpls = page.getByTestId('fb-tpl');
      const nt = await tpls.count();
      expect(nt, `loại ${k}: đủ mẫu`).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < nt; i++) {
        await tpls.nth(i).click();
        const r = await audit(page, `loại ${k} khổ ${s} mẫu ${i}`);
        expect(r.wmm).toBeGreaterThan(150);
        combos++;
      }
    }
    await page.locator('[data-testid="fb-flat"] svg').screenshot({ path: path.join(OUT, `khuon-${k}.png`) });
  }
  expect(combos).toBeGreaterThanOrEqual(60);

  // chữ rất dài + logo
  await kinds.nth(0).click();
  await page.getByTestId('fb-brand').fill('Tiệm Pizza Nướng Củi Gia Khánh Chi Nhánh Thủ Đức');
  await page.getByTestId('fb-tagline').fill('Đế mỏng giòn, phô mai Mozzarella kéo sợi, nướng lò củi mỗi ngày');
  await page.getByTestId('fb-note').fill('Ngon nóng hổi — giao tận nơi trong 30 phút khu vực nội thành');
  await page.getByTestId('fb-hotline').fill('0909 123 456 - 028 3812 3456');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d')!; x.fillStyle = '#C8102E'; x.beginPath(); x.arc(60, 60, 56, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.fillText('GK', 18, 82); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('fb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="fb-flat"] svg image').first()).toBeAttached({ timeout: 10_000 });
  for (let k = 0; k < 4; k++) {
    await kinds.nth(k).click();
    const tpls = page.getByTestId('fb-tpl');
    for (let i = 0; i < await tpls.count(); i++) { await tpls.nth(i).click(); await audit(page, `chữ dài loại ${k} mẫu ${i}`); }
  }
  await page.locator('[data-testid="fb-flat"] svg').screenshot({ path: path.join(OUT, 'khuon-chu-dai-logo.png') });

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('fb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab('fb-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Fold"');
  expect(svg).not.toMatch(/<text[\s>]/);
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const shot = fs.readFileSync(await grab('fb-png'));
  expect(shot.readUInt32BE(16)).toBe(1600);

  // ?kind= mở đúng loại
  await page.goto('/studio/foodbox?kind=tray');
  await expect(page.locator('[data-testid="fb-kind"][data-active="true"]')).toHaveText(/Khay/, { timeout: 60_000 });

  // chụp 3D từng loại (góc mặc định) để soi
  await page.goto('/studio/foodbox');
  await expect(kinds.first()).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __fbSnap?: unknown }).__fbSnap, null, { timeout: 60_000 });
  for (let k = 0; k < 4; k++) {
    await kinds.nth(k).click();
    await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __fbSnap: (w: number, h: number) => Promise<string> }).__fbSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${k}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  expect(errors).toEqual([]);
});
