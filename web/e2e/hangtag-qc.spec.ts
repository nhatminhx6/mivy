import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tag treo + thẻ cảm ơn: mọi mẫu × mọi hình bế — chữ nằm gọn trong hình & tránh lỗ xỏ dây, mã vạch EAN-13 đúng số kiểm,
// tờ in có CutContour đủ con, tải PNG/PDF 2 trang/SVG cắt, 3D dựng được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'hangtag');

const eanOk = (d: string) => {
  if (!/^\d{13}$/.test(d)) return false;
  const s = [...d.slice(0, 12)].reduce((a, ch, i) => a + Number(ch) * (i % 2 ? 3 : 1), 0);
  return (10 - (s % 10)) % 10 === Number(d[12]);
};

async function audit(page: Page, label: string) {
  for (const side of ['front', 'back'] as const) {
    const r = await page.locator(`[data-testid="ht-${side}"] svg`).evaluate((svg: SVGSVGElement) => {
      const cut = svg.querySelector('[data-cut]') as SVGPathElement;
      const hole = svg.querySelector('[data-hole]') as SVGCircleElement | null;
      const inv = svg.getScreenCTM()!.inverse();
      const bad: string[] = [];
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      for (const t of texts) {
        const b = t.getBBox();
        if (!b.width) continue;
        const m = inv.multiply(t.getScreenCTM()!);
        const ins = 0.12 * Math.min(b.width, b.height); // bbox chữ có khoảng trống trên/dưới — co nhẹ
        const pts = [[b.x + ins, b.y + ins], [b.x + b.width - ins, b.y + ins], [b.x + ins, b.y + b.height - ins], [b.x + b.width - ins, b.y + b.height - ins]].map(([x, y]) => {
          const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m);
        });
        if (!pts.every((p) => cut.isPointInFill(p))) bad.push(`ra ngoài: "${t.textContent}"`);
        if (hole) {
          const cx = hole.cx.baseVal.value, cy = hole.cy.baseVal.value, rr = hole.r.baseVal.value + 8;
          const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
          const nx = Math.max(Math.min(...xs), Math.min(cx, Math.max(...xs))), ny = Math.max(Math.min(...ys), Math.min(cy, Math.max(...ys)));
          if (Math.hypot(nx - cx, ny - cy) < rr) bad.push(`đè lỗ: "${t.textContent}"`);
        }
      }
      const ean = svg.querySelector('[data-ean]')?.getAttribute('data-ean') || '';
      return { bad, n: texts.length, ean };
    });
    expect(r.n, `${label} ${side}: có chữ`).toBeGreaterThan(1);
    expect(r.bad, `${label} ${side}`).toEqual([]);
    if (r.ean) expect(eanOk(r.ean), `${label}: EAN-13 ${r.ean} sai số kiểm`).toBe(true);
  }
}

test('Tag treo: mọi mẫu × hình bế, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/hangtag');
  const tpls = page.getByTestId('ht-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  let checked = 0;
  for (const kind of ['tag', 'thanks'] as const) {
    await page.getByTestId(`ht-kind-${kind}`).click();
    const n = await tpls.count();
    const shapes = page.locator('[data-testid="ht-shapes"] button');
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      for (let s = 0; s < await shapes.count(); s++) {
        await shapes.nth(s).click();
        await page.waitForTimeout(60);
        await audit(page, `${kind} mẫu ${i} hình ${s}`);
        checked++;
      }
      await page.getByTestId('ht-flat').screenshot({ path: path.join(OUT, `${kind}-${String(i).padStart(2, '0')}.png`) });
    }
  }
  expect(checked).toBeGreaterThanOrEqual(10 * 5 + 4 * 2);

  // nội dung dài + logo + khoen
  await page.getByTestId('ht-kind-tag').click();
  await tpls.first().click();
  await page.getByTestId('ht-brand').fill('NHÀ MAY GIA KHÁNH COUTURE');
  await page.getByTestId('ht-slogan').fill('Thời trang thiết kế may đo thủ công cao cấp');
  await page.getByTestId('ht-fabric').fill('95% Cotton 5% Spandex');
  await page.getByTestId('ht-price').fill('1.290.000đ');
  await page.getByTestId('ht-barcode').fill('893800012345');
  await page.getByTestId('ht-eyelet').check();
  for (let i = 0; i < await tpls.count(); i++) { await tpls.nth(i).click(); await audit(page, `chữ dài mẫu ${i}`); }
  // logo khách (PNG sinh tại chỗ)
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d')!; x.fillStyle = '#E3437A'; x.beginPath(); x.arc(100, 100, 90, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByTestId('ht-logo-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="ht-front"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'có logo');
  await page.getByTestId('ht-flat').screenshot({ path: path.join(OUT, 'tag-dai-logo.png') });

  // tờ in: CutContour đủ con (hình + lỗ)
  const sheet = await page.locator('[data-testid="ht-sheet-front"] svg').evaluate((s) => ({
    count: Number(s.getAttribute('data-count')), cuts: s.querySelectorAll('#CutContour path').length,
    holes: Array.from(s.querySelectorAll('#CutContour path')).every((p) => ((p.getAttribute('d') || '').match(/M/g) || []).length === 2),
  }));
  expect(sheet.count).toBeGreaterThanOrEqual(6);
  expect(sheet.cuts).toBe(sheet.count);
  expect(sheet.holes, 'đường bế tag phải gồm hình + lỗ').toBe(true);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pf = fs.readFileSync(await grab('ht-png-front'));
  expect(pf.readUInt32BE(16)).toBe(1200);
  const pb = fs.readFileSync(await grab('ht-png-back'));
  expect(pb.readUInt32BE(16)).toBe(1200);
  const pdf = fs.readFileSync(await grab('ht-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const svg = fs.readFileSync(await grab('ht-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).not.toMatch(/<text[\s>]/); // chữ đã outline

  // ảnh 3D các mẫu tiêu biểu (góc mặc định, khổ lớn) để soi
  await page.getByTestId('tab-3d').click();
  await page.getByTestId('ht-brand').fill('THU HÀ');
  await page.getByTestId('ht-slogan').fill('Thời trang thiết kế');
  await page.getByTestId('ht-fabric').fill('100% Cotton');
  await page.getByTestId('ht-price').fill('359.000đ');
  const shots: [string, number, string][] = [['tag', 0, 'nu-hong'], ['tag', 6, 'handmade-kraft'], ['tag', 8, 'sang-trong-ep-kim'], ['tag', 4, 'tre-em-tron'], ['thanks', 0, 'the-cam-on']];
  for (const [kind, i, nm] of shots) {
    await page.getByTestId(`ht-kind-${kind}`).click();
    await tpls.nth(i).click();
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __htSnap: (w: number, h: number) => Promise<string> }).__htSnap(1600, 1200));
    fs.writeFileSync(path.join(OUT, `3d-${nm}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
