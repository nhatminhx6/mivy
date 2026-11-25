import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp khăn giấy: mọi dáng × mẫu × khổ — chữ nằm trong từng mặt hộp, không đè nhau, không lấn lỗ rút khăn;
// khuôn có 1 vòng cắt ngoài + nét gấp + đường xé; tải PDF/SVG/PNG; 3D dựng được cả 3 dáng.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tissuebox');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string, minFont: number) {
  const r = await page.locator('[data-testid="tb-flat"] svg[data-testid="tb-die"]').evaluate((svg: SVGSVGElement, minF: number) => {
    const errs: string[] = [];
    const perf = svg.querySelector('#Perf path') as SVGPathElement;
    const ob = perf.getBBox();
    let texts = 0;
    svg.querySelectorAll('g[data-panel]').forEach((g) => {
      const face = g.getAttribute('data-panel')!;
      const w = +g.getAttribute('data-w')!, h = +g.getAttribute('data-h')!;
      const boxes: DOMRect[] = [];
      g.querySelectorAll('text').forEach((t) => {
        if (!t.textContent?.trim()) return;
        texts++;
        const b = (t as SVGTextElement).getBBox();
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        if (b.x < -0.3 || b.y < -0.3 || b.x + b.width > w + 0.3 || b.y + b.height > h + 0.3) errs.push(`${face}: chữ lòi "${t.textContent}" (${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)}×${b.height.toFixed(1)} / ${w}×${h})`);
        if (fs < minF) errs.push(`${face}: chữ quá nhỏ ${fs.toFixed(2)}mm "${t.textContent}"`);
        if (face === 'top' && b.x < ob.x + ob.width && b.x + b.width > ob.x && b.y < ob.y + ob.height && b.y + b.height > ob.y) errs.push(`top: chữ lấn lỗ rút "${t.textContent}"`);
        // chữ trong huy hiệu (monogram) nằm trong vòng tròn, bỏ qua kiểm đè
        if (t.closest('g') && (t.previousElementSibling?.tagName === 'circle')) return;
        for (const o of boxes) {
          const ix = Math.min(b.x + b.width, o.x + o.width) - Math.max(b.x, o.x), iy = Math.min(b.y + b.height, o.y + o.height) - Math.max(b.y, o.y);
          if (ix > 0.4 && iy > 0.4) errs.push(`${face}: chữ đè nhau "${t.textContent}"`);
        }
        boxes.push(b);
      });
    });
    const cut = svg.querySelector('#CutContour path')!.getAttribute('d') || '';
    const fold = svg.querySelector('#Fold path')!.getAttribute('d') || '';
    return { errs, texts, loops: (cut.match(/M/g) || []).length, folds: (fold.match(/M/g) || []).length };
  }, minFont);
  expect(r.errs, `${label}: ${r.errs.slice(0, 6).join(' | ')}`).toEqual([]);
  expect(r.texts, `${label}: có chữ`).toBeGreaterThan(4);
  expect(r.loops, `${label}: 1 vòng cắt ngoài`).toBe(1);
  expect(r.folds, `${label}: nét gấp`).toBeGreaterThanOrEqual(12);
}

test('Hộp khăn giấy: mọi dáng × mẫu × khổ, chữ dài, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });

  // ?kind=pocket mở đúng dáng
  await page.goto('/studio/tissuebox?kind=pocket');
  await expect(page.getByTestId('tb-tpl').first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-testid="tb-kind"][data-active="true"]')).toHaveText(/dẹt/);

  await page.getByTestId('tab-flat').click();
  const kinds = page.getByTestId('tb-kind');
  const tpls = page.getByTestId('tb-tpl');
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('tb-size');
    const nSize = await sizes.count();
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click();
      for (let z = 0; z < nSize; z++) {
        await sizes.nth(z).click();
        await page.waitForTimeout(60);
        await audit(page, `dáng ${k} mẫu ${i} khổ ${z}`, 2.4);
      }
    }
    await page.locator('[data-testid="tb-flat"]').screenshot({ path: path.join(OUT, `khuon-${k}.png`) });
  }

  // chữ rất dài trên mọi dáng × bố cục
  await page.getByTestId('tb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC BẢO');
  await page.getByTestId('tb-slogan').fill('Phục vụ tận tâm – Chất lượng hàng đầu – Giá cả hợp lý cho mọi nhà');
  await page.getByTestId('tb-hotline').fill('0909 123 456 – 0938 456 789');
  await page.getByTestId('tb-web').fill('www.ankhangquocbao-thuongmai.com.vn');
  const layouts = page.locator('[data-testid="tb-layouts"] button');
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    for (let l = 0; l < await layouts.count(); l++) {
      await layouts.nth(l).click();
      await page.waitForTimeout(60);
      await audit(page, `chữ dài dáng ${k} bố cục ${l}`, 1.5);
    }
  }

  // logo
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJklEQVR42mNkYPhfz0AEYBxVSF+FjP8ZGP4TrZBkhfRXOKpwZCkEAJ0nEgUMmYPpAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('tb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="tb-flat"] svg image').first()).toBeAttached({ timeout: 10_000 });
  await kinds.nth(0).click();
  await audit(page, 'có logo', 1.5);

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('tb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('tb-svg'), 'utf8');
  for (const id of ['In', 'CutContour', 'Fold', 'Perf', 'MangPE']) expect(svg).toContain(`id="${id}"`);
  expect((svg.match(/<text/g) || []).length, 'SVG đã outline hết chữ').toBe(0);

  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(2500);
  const pngFile = fs.readFileSync(await grab('tb-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1600);

  // 3D cả 3 dáng ở góc mặc định
  for (let k = 0; k < 3; k++) {
    await kinds.nth(k).click();
    await tpls.nth(k * 4).click();
    await page.waitForTimeout(800);
    const u = await page.evaluate(() => (window as unknown as { __tbSnap: (w: number, h: number) => Promise<string> }).__tbSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${k}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
