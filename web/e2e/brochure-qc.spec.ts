import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Brochure gấp 3: mọi mẫu × 2 mặt — chữ nằm gọn trong ô (cách nếp gấp/mép xén ≥ 3mm), không chữ nào đè chữ nào;
// chữ dài vẫn vừa; ảnh khách vào đúng ô; PDF 2 trang; PNG đủ nét; 3D dựng được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'brochure');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

async function audit(page: Page, label: string) {
  for (const side of ['outside', 'inside']) {
    const res = await page.locator(`[data-testid="br-${side}"] svg`).evaluate((svg: SVGSVGElement) => {
      const m = svg.getScreenCTM()!;
      const pt = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m); };
      const bad: string[] = [];
      let texts = 0;
      svg.querySelectorAll<SVGGElement>('g[data-panel]').forEach((g) => {
        const [x, w] = g.dataset.panel!.split(',').map(Number);
        const a = pt(x + 30, 30), b = pt(x + w - 30, 2100 - 30); // ≥3mm từ nếp gấp / mép xén
        const rs: { r: DOMRect; t: string }[] = [];
        g.querySelectorAll('text').forEach((t) => {
          const s = (t.textContent || '').trim();
          if (!s) return;
          texts++;
          const r = t.getBoundingClientRect();
          if (r.left < a.x - 0.5 || r.right > b.x + 0.5 || r.top < a.y - 0.5 || r.bottom > b.y + 0.5) bad.push(`tràn ô [${g.dataset.role}]: "${s}"`);
          rs.push({ r, t: s });
        });
        // chữ đè chữ (thu nhỏ hộp 18% chiều cao để bỏ phần dấu/đuôi chữ chạm nhau)
        for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
          const p = rs[i].r, q = rs[j].r;
          const sp = p.height * 0.18, sq = q.height * 0.18;
          const ix = Math.min(p.right, q.right) - Math.max(p.left, q.left);
          const iy = Math.min(p.bottom - sp, q.bottom - sq) - Math.max(p.top + sp, q.top + sq);
          if (ix > 1 && iy > 1) bad.push(`đè chữ [${g.dataset.role}]: "${rs[i].t}" × "${rs[j].t}"`);
        }
      });
      return { bad, texts, panels: svg.querySelectorAll('g[data-panel]').length };
    });
    expect(res.panels, `${label} ${side}: 3 ô`).toBe(3);
    expect(res.texts, `${label} ${side}: có chữ`).toBeGreaterThan(8);
    expect(res.bad, `${label} ${side}`).toEqual([]);
  }
}

test('Brochure gấp 3: mọi mẫu, 2 mặt, chữ dài, ảnh, PDF 2 trang, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/studio/brochure');
  const tpls = page.getByTestId('br-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 }); // mặc định tab 3D
  await page.waitForTimeout(2500);
  await page.locator('canvas').first().screenshot({ path: path.join(OUT, 'br-3d-default.png') });
  await page.getByTestId('tab-flat').click();

  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('br-outside').screenshot({ path: path.join(OUT, `br-${String(i).padStart(2, '0')}-ngoai.png`) });
    await page.getByTestId('br-inside').screenshot({ path: path.join(OUT, `br-${String(i).padStart(2, '0')}-trong.png`) });
  }

  // chữ rất dài ở mọi bố cục vẫn vừa ô
  for (const idx of [0, 2, 4, 6, 8, 10]) {
    await tpls.nth(idx).click();
    await page.getByTestId('br-title').fill('Giải pháp trọn gói chuyên nghiệp hàng đầu cho doanh nghiệp vừa và nhỏ trên toàn quốc');
    await page.getByTestId('br-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ QUỐC BẢO');
    await page.getByTestId('br-address').fill('Tầng 12, toà nhà Sài Gòn Centre, 67 Lê Lợi, P. Bến Nghé, Q.1, TP. Hồ Chí Minh');
    for (const key of ['about', 'gallery', 'promoNote']) {
      const f = page.getByTestId(`br-${key}`);
      if (await f.count()) await f.fill('Nội dung rất dài để kiểm tra khả năng tự co chữ. '.repeat(8));
    }
    await page.waitForTimeout(300);
    await audit(page, `chữ dài mẫu ${idx}`);
    if (idx === 4) await page.getByTestId('br-inside').screenshot({ path: path.join(OUT, 'br-long-text.png') });
  }

  // ảnh khách: bìa + ô hình ảnh
  await tpls.nth(4).click();
  await page.getByTestId('br-photo1').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_1PX });
  await page.getByTestId('br-photo2').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(page.locator('[data-testid="br-outside"] svg image')).toHaveCount(1);
  await expect(page.locator('[data-testid="br-inside"] svg image')).toHaveCount(1);

  // file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('br-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 'PDF 2 trang').toBe(2);
  const png = fs.readFileSync(await grab('br-png-in'));
  expect(png.readUInt32BE(16)).toBe(2400);

  // 3D sau khi đổi mẫu
  await tpls.nth(2).click();
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3000);
  await page.locator('canvas').first().screenshot({ path: path.join(OUT, 'br-3d-spa.png') });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
