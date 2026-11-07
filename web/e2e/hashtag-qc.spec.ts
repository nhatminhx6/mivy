import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC trang Hashtag cầm tay: mọi dịp × mẫu dựng được bảng bế viền 1 khối, khổ đúng, file cắt có lớp In + CutContour.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'hashtag');

test('Hashtag cầm tay: mọi mẫu, sửa chữ, đổi khổ, tải file cắt', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/hashtag');
  const occ = page.getByTestId('ht-occ');
  await expect(occ.first()).toBeVisible({ timeout: 60_000 });
  const preview = page.getByTestId('ht-preview');
  // chờ bản lớn dựng lại sau khi đổi (đường cắt khác trước)
  const cutD = () => page.locator('[data-testid="ht-cut-file"] #CutContour path').first().getAttribute('d').catch(() => '');
  const settle = async (prev: string | null) => { await expect.poll(cutD, { timeout: 20_000 }).not.toBe(prev); await page.waitForTimeout(100); return cutD(); };

  let d: string | null = '';
  let n = 0;
  for (let o = 0; o < await occ.count(); o++) {
    await occ.nth(o).click();
    const tpls = page.getByTestId('ht-tpl');
    await expect(tpls.first().locator('svg')).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < await tpls.count(); i++) {
      await tpls.nth(i).click();
      if (o + i > 0) d = await settle(d); else { await expect.poll(cutD, { timeout: 30_000 }).toBeTruthy(); d = await cutD(); }
      const dims = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="ht-cut-file"] svg') as SVGSVGElement;
        const img = svg.querySelector('image')!; const p = svg.querySelector('#CutContour path') as SVGPathElement;
        const a = { x: +img.getAttribute('x')!, y: +img.getAttribute('y')!, w: +img.getAttribute('width')!, h: +img.getAttribute('height')! };
        const b = p.getBBox();
        return { wmm: parseFloat(svg.getAttribute('width')!), hmm: parseFloat(svg.getAttribute('height')!), subpaths: (p.getAttribute('d')!.match(/M/g) || []).length,
          inside: a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.width + 1 && a.y + a.h <= b.y + b.height + 1 };
      });
      expect(dims.subpaths, `mẫu ${o}-${i}: đường bế phải là 1 khối`).toBe(1);
      expect(dims.inside, `mẫu ${o}-${i}: hình lòi ra ngoài đường bế`).toBe(true);
      expect(Math.max(dims.wmm, dims.hmm), `mẫu ${o}-${i}: khổ`).toBeGreaterThan(500);
      expect(Math.max(dims.wmm, dims.hmm)).toBeLessThan(506);
      await preview.screenshot({ path: path.join(OUT, `ht-${o + 1}-${i + 1}.png`) });
      n++;
    }
  }
  expect(n).toBeGreaterThanOrEqual(12);

  // sửa chữ + đổi màu/kiểu chữ/hình + khổ 30cm
  await occ.first().click(); await page.getByTestId('ht-tpl').first().click(); d = await settle(d);
  await page.getByTestId('ht-text').first().fill('Tri ân cô Thu Hà');
  d = await settle(d);
  await page.getByTestId('ht-palettes').locator('button').nth(3).click(); await page.waitForTimeout(400);
  await page.getByTestId('ht-fonts').locator('button').nth(2).click(); d = await settle(d);
  await page.getByTestId('ht-decos').locator('button').first().click(); d = await settle(d);
  await page.getByTestId('ht-sizes').locator('button').first().click(); d = await settle(d);
  const w30 = await page.evaluate(() => parseFloat((document.querySelector('[data-testid="ht-cut-file"] svg') as SVGSVGElement).getAttribute('width')!));
  expect(w30).toBeGreaterThan(300); expect(w30).toBeLessThan(306);
  await preview.screenshot({ path: path.join(OUT, 'ht-edited.png') });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const svg = fs.readFileSync(await grab('ht-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).toContain('data:image/png');
  const png = fs.readFileSync(await grab('ht-png'));
  expect(png.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
