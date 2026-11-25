import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Mũ lưỡi trai: mọi mẫu × loại mũ × vị trí — chữ nằm trong khung vị trí, ≤ 6 màu chỉ, cảnh báo chữ nhỏ khi thêu,
// file PDF đủ trang, SVG đã outline, ảnh 3D dựng được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cap');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: { pos: string; over: string[]; texts: number }[] = [];
    document.querySelectorAll('[data-testid^="cap-print-"] svg').forEach((svg) => {
      const s = svg as SVGSVGElement; const vb = s.viewBox.baseVal; const over: string[] = [];
      const texts = Array.from(s.querySelectorAll('text, image, circle, rect, path, polygon, line')) as SVGGraphicsElement[];
      for (const t of texts) {
        const b = t.getBBox(); const m = t.getCTM(), ms = s.getCTM();
        if (!m || !ms) continue;
        const rel = ms.inverse().multiply(m);
        const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => { const p = s.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(rel); });
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        if (Math.min(...xs) < vb.x - 0.6 || Math.max(...xs) > vb.x + vb.width + 0.6 || Math.min(...ys) < vb.y - 0.6 || Math.max(...ys) > vb.y + vb.height + 0.6)
          over.push(`${t.tagName}:${(t.textContent || '').slice(0, 16)} [${Math.min(...xs).toFixed(1)},${Math.min(...ys).toFixed(1)} → ${Math.max(...xs).toFixed(1)},${Math.max(...ys).toFixed(1)}] in ${vb.width}x${vb.height}`);
      }
      out.push({ pos: s.getAttribute('data-pos') || '', over, texts: s.querySelectorAll('text').length });
    });
    return out;
  });
  for (const p of r) expect(p.over, `${label} · ${p.pos}: phần tử lòi khỏi khung`).toEqual([]);
  const n = Number(await page.getByTestId('cap-used').getAttribute('data-count'));
  expect(n, `${label}: số màu chỉ`).toBeLessThanOrEqual(6);
  expect(n).toBeGreaterThanOrEqual(1);
  return r;
}

test('Mũ lưỡi trai: mọi mẫu × loại mũ, vị trí, thêu/in, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/cap');
  const tpls = page.getByTestId('cap-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  // mọi mẫu, bật đủ 4 vị trí, thử cả 3 loại mũ
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (const p of ['left', 'right', 'back']) { const cb = page.getByTestId(`cap-pos-${p}`); if (!(await cb.isChecked())) await cb.check(); }
    await expect(page.locator('[data-testid^="cap-print-"]')).toHaveCount(4);
    for (const k of ['dad', 'trucker', 'snap']) {
      await page.getByTestId(`cap-kind-${k}`).click();
      await audit(page, `mẫu ${i} ${k}`);
    }
    await page.getByTestId('tab-flat').click();
    await page.getByTestId('cap-flat').screenshot({ path: path.join(OUT, `cap-${String(i + 1).padStart(2, '0')}-phang.png`) });
    await page.getByTestId('tab-3d').click();
  }

  // chữ rất dài: vẫn trong khung + có cảnh báo chữ nhỏ khi thêu
  await tpls.first().click();
  await page.getByTestId('cap-method-embroider').click();
  await page.getByTestId('cap-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC BẢO');
  await page.getByTestId('cap-sub').fill('ĐỒNG PHỤC NHÂN VIÊN CHI NHÁNH THỦ ĐỨC 2027');
  await audit(page, 'chữ dài');
  await expect(page.getByTestId('cap-warn')).toBeVisible();
  for (const lay of await page.getByTestId('cap-layouts').locator('button').all()) { await lay.click(); await audit(page, 'chữ dài bố cục'); }

  // logo khách (thêu → 1 màu chỉ)
  await page.getByTestId('cap-layouts').locator('button', { hasText: 'Logo + tên' }).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVR42mNgGAWjgP7/PwMDAwMDw38GBgYGBob/DAwMDAwMDAwMDAwMACk3Bf3v5w8xAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('cap-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="cap-print-front"] image')).toHaveCount(1);
  await audit(page, 'logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = Number(await page.getByTestId('cap-pdf').getAttribute('data-pages'));
  const pdf = fs.readFileSync(await grab('cap-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pages);
  const svg = fs.readFileSync(await grab('cap-svg'), 'utf8');
  expect(svg).not.toContain('<text');
  expect(svg).toMatch(/viewBox="0 0 100 55"/);
  const mock = fs.readFileSync(await grab('cap-png'));
  expect(mock.readUInt32BE(16)).toBe(2000);
  const shot = fs.readFileSync(await grab('cap-3d'));
  expect(shot.readUInt32BE(16)).toBe(1600);

  // 3D mỗi loại mũ (ảnh lớn để soi)
  for (const [i, k] of [[0, 'dad'], [7, 'trucker'], [2, 'snap']] as const) {
    await tpls.nth(i).click();
    await page.getByTestId(`cap-kind-${k}`).click();
    await page.waitForTimeout(1500);
    let url = '';
    for (let a = 0; a < 30 && !url; a++) { url = await page.evaluate(async () => { try { return await (window as unknown as { __capSnap: (w: number, h: number) => Promise<string> }).__capSnap(1200, 900); } catch { return ''; } }); if (!url) await page.waitForTimeout(1000); }
    expect(url.length).toBeGreaterThan(10_000);
    fs.writeFileSync(path.join(OUT, `cap-3d-${k}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  expect(errors).toEqual([]);
});
