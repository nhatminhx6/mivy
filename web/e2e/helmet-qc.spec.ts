import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Mũ bảo hiểm in logo: mọi mẫu × vị trí decal — chữ trong khung, không chồng, đủ cỡ; số màu lụa đúng;
// logo; tải PDF/SVG/PNG; 3D dựng được (nửa đầu, 3/4 + lưỡi trai).
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'helmet');

async function audit(page: Page, label: string, minMm: number, maxInks?: number) {
  const r = await page.evaluate(() => {
    const out: { pos: string; bad: string[]; minFs: number; inks: number }[] = [];
    document.querySelectorAll('[data-testid^="hm-print-"] svg').forEach((svg) => {
      const s = svg as SVGSVGElement; const vb = s.viewBox.baseVal; const bad: string[] = [];
      const boxes: { b: DOMRect; t: string }[] = [];
      let minFs = 999;
      s.querySelectorAll('text').forEach((t) => {
        const b = (t as SVGTextElement).getBBox(); const txt = t.textContent || '';
        minFs = Math.min(minFs, parseFloat(t.getAttribute('font-size') || '0'));
        if (b.x < vb.x - 0.3 || b.y < vb.y - 0.3 || b.x + b.width > vb.x + vb.width + 0.3 || b.y + b.height > vb.y + vb.height + 0.3) bad.push(`tràn: ${txt}`);
        boxes.push({ b, t: txt });
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, c = boxes[j].b;
        const ox = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x), oy = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
        if (ox > 0.4 && oy > Math.min(a.height, c.height) * 0.28) bad.push(`chồng: ${boxes[i].t} / ${boxes[j].t}`);
      }
      const cols = new Set<string>();
      s.querySelectorAll('#In *').forEach((el) => {
        if (el.closest('mask') || el.tagName === 'image' || el.tagName === 'g') return;
        for (const a of ['fill', 'stroke']) { const v = (el.getAttribute(a) || '').toUpperCase(); if (v && v !== 'NONE' && !v.startsWith('URL') && v !== '#000') cols.add(v); }
      });
      out.push({ pos: s.getAttribute('data-pos') || '', bad, minFs, inks: cols.size });
    });
    return out;
  });
  expect(r.length, `${label}: có decal`).toBeGreaterThan(0);
  for (const d of r) {
    expect(d.bad, `${label} ${d.pos}`).toEqual([]);
    expect(d.minFs, `${label} ${d.pos}: cỡ chữ nhỏ nhất`).toBeGreaterThanOrEqual(minMm);
    if (maxInks) expect(d.inks, `${label} ${d.pos}: số màu mực`).toBeLessThanOrEqual(maxInks);
  }
}

test('Mũ bảo hiểm in logo: mẫu, vị trí, màu lụa, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/helmet');
  const tpls = page.getByTestId('hm-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (const p of ['left', 'right', 'back'] as const) { const cb = page.getByTestId(`hm-pos-${p}`); if (!(await cb.isChecked())) await cb.check(); }
    await page.waitForTimeout(150);
    const method = await page.getByTestId('hm-method-screen').getAttribute('class');
    const screen = (method || '').includes('border-indigo-400');
    const inks = screen ? Number(await page.getByTestId('hm-used').getAttribute('data-count')) : undefined;
    await audit(page, `mẫu ${i}`, 2.2, inks);
  }
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('hm-flat').screenshot({ path: path.join(OUT, 'hm-flat.png') });
  await page.getByTestId('tab-3d').click();

  // lụa 1 màu → đúng 1 màu
  await tpls.nth(0).click();
  await page.getByTestId('hm-method-screen').click();
  await page.getByTestId('hm-inks-1').click();
  await page.waitForTimeout(150);
  await audit(page, 'lụa 1 màu', 2.2, 1);
  await page.getByTestId('hm-inks-2').click();

  // chữ rất dài trên mọi bố cục
  const L = page.getByTestId('hm-layouts').locator('button');
  for (let l = 0; l < await L.count(); l++) {
    await L.nth(l).click();
    await page.getByTestId('hm-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG MIỀN NAM');
    await page.getByTestId('hm-slogan').fill('Đội mũ bảo hiểm đạt chuẩn – Bảo vệ chính mình và người thân yêu');
    await page.getByTestId('hm-hotline').fill('0909 123 456 – 028 3812 3456');
    await page.getByTestId('hm-web').fill('www.thuongmaidichvuankhang.com.vn');
    await page.waitForTimeout(150);
    await audit(page, `chữ dài bố cục ${l}`, 1.5);
  }

  // logo: lụa → mask 1 màu; UV → ảnh gốc
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!; x.fillStyle = '#1565C0'; x.beginPath(); x.arc(100, 100, 80, 0, 7); x.fill(); x.fillStyle = '#E53935'; x.fillRect(60, 60, 80, 80); return c.toDataURL('image/png'); });
  await page.getByTestId('hm-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png.split(',')[1], 'base64') });
  await page.getByTestId('hm-method-screen').click();
  await expect.poll(() => page.locator('[data-testid="hm-print-front"] svg mask image').count(), { timeout: 10_000 }).toBeGreaterThan(0);
  await page.getByTestId('hm-method-uv').click();
  await expect.poll(() => page.locator('[data-testid="hm-print-front"] svg > g image').count(), { timeout: 10_000 }).toBeGreaterThan(0);

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pages = Number(await page.getByTestId('hm-pdf').getAttribute('data-pages'));
  const pdf = fs.readFileSync(await grab('hm-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pages);
  const svg = fs.readFileSync(await grab('hm-svg'), 'utf8');
  expect(svg).toContain('id="In"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const pngf = fs.readFileSync(await grab('hm-png'));
  expect(pngf.readUInt32BE(16)).toBe(2000);

  // 3D: nửa đầu + 3/4 có lưỡi trai
  const snap = async (name: string) => {
    for (let i = 0; i < 40 && !(await page.evaluate(() => !!(window as unknown as { __hmSnap?: unknown }).__hmSnap)); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(2500);
    const u = await page.evaluate(() => (window as unknown as { __hmSnap: (w: number, h: number) => Promise<string> }).__hmSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, name), Buffer.from(u.split(',')[1], 'base64'));
  };
  await page.getByTestId('hm-kind-half').click(); await snap('hm-3d-half.png');
  await page.getByTestId('hm-kind-three4').click();
  if (!(await page.getByTestId('hm-visor').isChecked())) await page.getByTestId('hm-visor').check();
  await snap('hm-3d-three4.png');
  const d3 = fs.readFileSync(await grab('hm-3d'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  expect(errors).toEqual([]);
});
