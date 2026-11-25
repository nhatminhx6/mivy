import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp quai xách (/studio/packaging?kind=carry): mở đúng loại từ link catalog, mọi mẫu × cỡ dựng khuôn bế đủ mảnh
// (quai có lỗ xỏ tay, mái, hồi, đáy khoá), khổ tấm khớp kích thước, ảnh 3D dựng được, tải PDF/SVG/PNG; hộp & túi vẫn chạy.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'carry');

test('Hộp quai xách: mọi mẫu × cỡ, khuôn bế, 3D, tải file; hộp/túi vẫn chạy', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/packaging?kind=carry');

  const kinds = page.getByTestId('pkg-kind');
  await expect(kinds.nth(2)).toHaveAttribute('data-active', 'true', { timeout: 60_000 });
  await expect(kinds.nth(2)).toHaveText('Hộp quai xách');
  const tpls = page.getByTestId('pkg-tpl');
  await expect(tpls).toHaveCount(7, { timeout: 30_000 });
  // thumbnail 3D mỗi mẫu là ảnh tĩnh
  await expect(page.locator('[data-testid="pkg-tpl"] img')).toHaveCount(7, { timeout: 60_000 });
  const view3d = page.getByTestId('mockup-3d').first();
  await expect(view3d.locator('canvas')).toHaveCount(1, { timeout: 30_000 });
  await expect(view3d.getByText('Kéo để xoay')).toBeVisible({ timeout: 30_000 });

  // khuôn bế đang hiện (bản xem trước) = svg trong khung trắng dưới ảnh 3D
  const dieline = page.locator('.bg-white.border svg').first();
  const audit = () => dieline.evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal;
    const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent || '');
    const clips = svg.querySelectorAll('clipPath').length;
    const cut = [...svg.querySelectorAll('path')].filter((p) => p.getAttribute('stroke') === null && p.closest('g[stroke]'));
    return { w: vb.width / 2, h: vb.height / 2, texts, clips, cutPaths: cut.length };
  });

  const sizes = page.getByTestId('pkg-size');
  await expect(sizes).toHaveCount(3);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    await tpls.nth(i).click();
    await expect(tpls.nth(i)).toHaveAttribute('data-active', 'true');
    for (let z = 0; z < 3; z++) {
      await sizes.nth(z).click();
      const m = /(\d+)×(\d+)×(\d+)/.exec(await sizes.nth(z).innerText())!;
      const [w, d] = [Number(m[1]), Number(m[2])];
      const r = await audit();
      // tấm khuôn = 2 dài + 2 hông + keo + lề 20mm
      expect(r.w, `mẫu ${i} cỡ ${z}: bề ngang tấm khuôn`).toBeGreaterThan(2 * w + 2 * d + 20);
      expect(r.w).toBeLessThan(2 * w + 2 * d + 20 + 20);
      expect(r.clips, `mẫu ${i} cỡ ${z}: đủ 10 mảnh in`).toBe(10);
      expect(r.cutPaths, `mẫu ${i} cỡ ${z}: nét cắt bao + lỗ quai + khe đáy`).toBe(3);
      expect(r.texts.join('|')).toContain('ĐÁY CÓ KHE');
      expect(r.texts.join('|')).toContain('2 QUAI DÁN ÁP NHAU');
      n++;
    }
    await page.waitForTimeout(700); // ảnh 3D dựng lại (debounce)
    await view3d.screenshot({ path: path.join(OUT, `carry-${i + 1}.png`) });
  }
  expect(n).toBe(21);

  // sửa chữ → khuôn + 3D nhận chữ mới, đổi mẫu giữ chữ khách
  await page.getByTestId('pkg-brand').fill('BẢO NGỌC CAKE');
  await expect(dieline.locator('text', { hasText: 'BẢO NGỌC CAKE' }).first()).toBeAttached();
  await tpls.nth(2).click();
  await expect(page.getByTestId('pkg-brand')).toHaveValue('BẢO NGỌC CAKE');
  await page.waitForTimeout(800);
  await view3d.screenshot({ path: path.join(OUT, 'carry-edited.png') });
  await dieline.screenshot({ path: path.join(OUT, 'carry-dieline.png') });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pkg-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svgPath = await grab('pkg-svg');
  expect(path.basename(svgPath)).toMatch(/^hop-quai-xach-/);
  const svg = fs.readFileSync(svgPath, 'utf8');
  expect(svg).toContain('clipPath');
  const png = fs.readFileSync(await grab('pkg-png'));
  expect(png.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();

  // hộp giấy: vẫn mặc định hộp lùn 80×80×80; túi giấy vẫn dựng được
  await kinds.nth(0).click();
  await expect(kinds.nth(0)).toHaveAttribute('data-active', 'true');
  await expect(tpls).toHaveCount(6);
  await expect(sizes.first()).toHaveText('Hộp nhỏ 80×80×80');
  await expect(sizes.first()).toHaveClass(/border-indigo-400/);
  await expect(page.locator('[data-testid="pkg-tpl"] img')).toHaveCount(6, { timeout: 60_000 });
  await page.waitForTimeout(800);
  await view3d.screenshot({ path: path.join(OUT, 'box.png') });
  await kinds.nth(1).click();
  await expect(tpls).toHaveCount(6);
  await expect(page.locator('[data-testid="pkg-tpl"] img')).toHaveCount(6, { timeout: 60_000 });
  await page.waitForTimeout(800);
  await view3d.screenshot({ path: path.join(OUT, 'bag.png') });
  // quay lại hộp quai: chữ khách vẫn giữ
  await kinds.nth(2).click();
  await expect(page.getByTestId('pkg-brand')).toHaveValue('BẢO NGỌC CAKE');

  // link ?kind= mở thẳng đúng loại
  await page.goto('/studio/packaging?kind=bag');
  await expect(page.getByTestId('pkg-kind').nth(1)).toHaveAttribute('data-active', 'true', { timeout: 60_000 });
  expect(errors).toEqual([]);
});
