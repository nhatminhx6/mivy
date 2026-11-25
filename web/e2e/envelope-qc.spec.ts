import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Lì xì & phong bì: mọi mẫu × 2 loại dựng đủ mặt trước + mặt sau, khuôn bế đúng khổ theo khổ × kiểu nắp,
// ảnh 3D dựng được, tải PNG / PDF khuôn / SVG khuôn, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'envelope');

const NET: Record<string, { w: number; h: number; s: number }> = {
  'lx-85': { w: 85, h: 165, s: 12 }, 'lx-90': { w: 90, h: 175, s: 12 }, dl: { w: 220, h: 110, s: 22 }, c5: { w: 229, h: 162, s: 22 },
};

async function grab(page: Page, id: string) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
}

test('Lì xì & phong bì: mọi mẫu, khổ, nắp, cửa sổ, 3D, tải file', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/envelope');
  await expect(page.getByTestId('env-tpl').first()).toBeVisible({ timeout: 60_000 });

  // 3D mặc định dựng được (WebGL) — đợi hết vòng quay chờ
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('[data-testid="mockup-3d"] .animate-spin')).toHaveCount(0, { timeout: 60_000 });
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'lixi-3d.png') });
  const png = fs.readFileSync(await grab(page, 'env-png'));
  expect(png.readUInt32BE(16)).toBe(1600);

  await page.getByTestId('tab-flat').click();
  for (let k = 0; k < 2; k++) {
    await page.getByTestId('env-kind').nth(k).click();
    const tpls = page.getByTestId('env-tpl');
    const n = await tpls.count();
    expect(n).toBeGreaterThanOrEqual(k === 0 ? 8 : 4);
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      for (const side of ['env-front', 'env-back']) {
        const r = await page.locator(`[data-testid="${side}"] > svg`).evaluate((s: SVGSVGElement) => ({ texts: s.querySelectorAll('text').length, w: s.getBoundingClientRect().width }));
        expect(r.texts, `kind ${k} mẫu ${i} ${side}: có chữ`).toBeGreaterThan(0);
        expect(r.w).toBeGreaterThan(50);
      }
      await page.locator('[data-testid="env-front"]').locator('..').locator('..').screenshot({ path: path.join(OUT, `${k ? 'phong-bi' : 'li-xi'}-${String(i + 1).padStart(2, '0')}.png`) });
    }
    // khổ × kiểu nắp → khuôn đúng bề ngang (mm) = W + 2 tai hông + 2 lề xén
    const sizes = page.locator('[data-testid="env-sizes"] button');
    const flaps = page.locator('[data-testid="env-flaps"] button');
    const ids = k === 0 ? ['lx-85', 'lx-90'] : ['dl', 'c5'];
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      for (let f = 0; f < await flaps.count(); f++) {
        await flaps.nth(f).click();
        await page.waitForTimeout(80);
        const vb = await page.locator('[data-testid="env-dieline"] > svg').first().getAttribute('viewBox');
        const wMm = Number(vb!.split(' ')[2]) / 2;
        const net = NET[ids[s]];
        expect(Math.abs(wMm - (net.w + 2 * net.s + 6)), `${ids[s]} nắp ${f}: bề ngang khuôn`).toBeLessThan(0.5);
      }
    }
  }

  // phong bì có cửa sổ → khuôn có thêm nét cắt ô cửa
  const rectsBefore = await page.locator('[data-testid="env-dieline"] > svg > rect').count();
  await page.getByTestId('env-window').check();
  await expect.poll(() => page.locator('[data-testid="env-dieline"] > svg > rect').count()).toBe(rectsBefore + 1);
  await page.locator('[data-testid="env-front"]').screenshot({ path: path.join(OUT, 'phong-bi-cua-so.png') });

  // sửa chữ → mặt trước đổi theo
  await page.getByTestId('env-company').fill('CÔNG TY CP QUỐC BẢO');
  await expect(page.locator('[data-testid="env-front"] > svg')).toContainText('QUỐC BẢO');

  // 3D phong bì + tải PDF khuôn (lề xén) + SVG khuôn (chữ đã outline)
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] .animate-spin')).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'phong-bi-3d.png') });
  const pdf = fs.readFileSync(await grab(page, 'env-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab(page, 'env-svg'), 'utf8');
  expect(svg).toContain('<path');
  expect(svg).toContain('stroke-dasharray');

  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
