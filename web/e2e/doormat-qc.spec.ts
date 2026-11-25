import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thảm chùi chân: mọi mẫu × khổ — chữ nằm trong vùng in (theo khung chữ THẬT: baseline ± asc/desc), không đè nhau,
// đủ lớn; thảm cao su / xơ dừa chỉ 1 màu mực; chữ dài vẫn gọn; logo; khổ tuỳ chỉnh; tải PNG/PDF/SVG + 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'doormat');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string, minFs = 12) {
  const r = await page.locator('[data-testid="dm-print"] svg').evaluate((svg: SVGSVGElement) => {
    const pW = Number(svg.getAttribute('data-pw')), pH = Number(svg.getAttribute('data-ph'));
    const boxes = [...svg.querySelectorAll('text')].map((t) => {
      const b = (t as SVGTextElement).getBBox();
      const y = Number(t.getAttribute('y')), asc = Number(t.getAttribute('data-asc') || 0), desc = Number(t.getAttribute('data-desc') || 0);
      return { role: t.getAttribute('data-role') || '', text: t.textContent || '', fs: Number(t.getAttribute('font-size')), x0: b.x, x1: b.x + b.width, y0: y - asc, y1: y + desc };
    });
    const out: string[] = [];
    for (const b of boxes) {
      if (!b.text.trim()) continue;
      if (b.x0 < -0.5 || b.x1 > pW + 0.5 || b.y0 < -0.5 || b.y1 > pH + 0.5) out.push(`ngoài vùng in: ${b.role} "${b.text}" [${b.x0.toFixed(0)},${b.y0.toFixed(0)},${b.x1.toFixed(0)},${b.y1.toFixed(0)}] / ${pW}×${pH}`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 1 && oy > 1) out.push(`đè nhau: "${a.text}" × "${c.text}"`);
    }
    // màu mực (bản in): bỏ none / trắng (không in) / url(...)
    const cols = new Set<string>();
    svg.querySelectorAll('#In *').forEach((el) => {
      if (el.closest('mask')) return;
      for (const a of ['fill', 'stroke']) {
        const v = (el.getAttribute(a) || '').trim().toUpperCase();
        if (!v || v === 'NONE' || v.startsWith('URL') || v === '#FFFFFF' || v === 'WHITE') continue;
        cols.add(v);
      }
    });
    return { out, minFs: Math.min(...boxes.filter((b) => b.text.trim()).map((b) => b.fs)), cols: [...cols], pW, pH, n: boxes.length };
  });
  expect(r.out, `${label}: ${r.out.join(' | ')}`).toEqual([]);
  expect(r.minFs, `${label}: chữ nhỏ nhất ${r.minFs}mm`).toBeGreaterThanOrEqual(minFs);
  return r;
}

test('Thảm chùi chân: mọi mẫu × khổ, 1 màu, chữ dài, logo, khổ tuỳ chỉnh, tải file + 3D', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => { errors.push('dialog: ' + d.message()); d.dismiss().catch(() => null); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/doormat');
  const tpls = page.getByTestId('dm-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (const sz of ['40x60', '60x90', '90x150']) {
      await page.getByTestId(`dm-size-${sz}`).click();
      await page.waitForTimeout(120);
      const r = await audit(page, `mẫu ${i} · ${sz}`);
      expect(r.n, `mẫu ${i}: có chữ`).toBeGreaterThanOrEqual(2);
      if (i >= 8) expect(r.cols.length, `mẫu ${i} (1 màu): màu mực ${r.cols.join(',')}`).toBeLessThanOrEqual(1);
    }
    await page.getByTestId('dm-preview').screenshot({ path: path.join(OUT, `dm-${String(i).padStart(2, '0')}.png`) });
  }

  // chữ rất dài × mọi bố cục × 3 khổ
  const long: Record<string, string> = {
    welcome: 'CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI CHÚNG TÔI', brand: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG GIA KHÁNH',
    tagline: 'Chuyên thời trang công sở · phụ kiện · quà tặng cao cấp nhập khẩu', hours: 'Thứ 2 – Chủ nhật · 7:30 – 22:30 (lễ Tết vẫn mở cửa)',
    note: 'Vui lòng cởi giày trước khi vào cửa hàng, xin cảm ơn quý khách', wifi: 'Wifi: AnKhang-GiaKhanh-Guest · matkhau-rat-dai-2026',
  };
  for (const [k, v] of Object.entries(long)) await page.getByTestId(`dm-field-${k}`).fill(v);
  const layouts = page.getByTestId('dm-layout');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (const sz of ['40x60', '60x90', '90x150']) {
      await page.getByTestId(`dm-size-${sz}`).click();
      await page.waitForTimeout(120);
      await audit(page, `chữ dài · bố cục ${l} · ${sz}`);
    }
  }
  await page.getByTestId('dm-preview').screenshot({ path: path.join(OUT, 'dm-long.png') });

  // khổ tuỳ chỉnh 120×70 → vùng in 1150×650 (+ lấn 5mm)
  await page.getByTestId('dm-mat-felt').click(); // viền nỉ 25mm
  await page.getByTestId('dm-size-custom').click();
  await page.getByTestId('dm-wcm').fill('120');
  await page.getByTestId('dm-hcm').fill('70');
  await page.waitForTimeout(200);
  await expect(page.locator('[data-testid="dm-print"] svg')).toHaveAttribute('width', '1160mm');
  await expect(page.locator('[data-testid="dm-print"] svg')).toHaveAttribute('height', '660mm');
  await audit(page, 'tuỳ chỉnh 120×70');

  // logo: nỉ = ảnh màu, cao su = mask 1 màu
  await tpls.nth(1).click();
  await page.getByTestId('dm-size-60x90').click();
  const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAqElEQVR4nO3PyxGAMAwD0ZRCCZRE/02YDoh/icREB13tfcPMxp8HDxAAHSAAOkCAzmPX/Zh3NIBI9AoMPL6KgIdXIVTxGQRdfBRBGR9BnAFAxHsR1PEehADUAHS4ByGAAAIIIIAAAtACWBBffQLQA9CIWZsLgEJ4us4B7EZ4m0KAXYhITxiwGhFtSQFWQLINJUAXovK/DMhiun62AhCDBwiADhAAHVDdC68ixwaMqQfhAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('dm-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png1 });
  await expect(page.locator('[data-testid="dm-print"] svg image[data-role="logo"]')).toHaveCount(1, { timeout: 15_000 });
  await page.getByTestId('dm-mat-rubber').click();
  await expect(page.locator('[data-testid="dm-print"] svg [data-role="logo"] mask')).toHaveCount(1, { timeout: 15_000 });
  const rl = await audit(page, 'cao su + logo');
  expect(rl.cols.length).toBeLessThanOrEqual(1);
  await page.getByTestId('dm-mat-felt').click();

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('dm-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('dm-svg'), 'utf8');
  expect(svg).toContain('id="In"');
  expect(svg).not.toContain('<text');
  expect(svg).toMatch(/width="[\d.]+mm"/);
  const png = fs.readFileSync(await grab('dm-png'));
  expect(png.readUInt32BE(16)).toBe(2000);

  // 3D: 3 chất liệu
  await page.getByTestId('tab-3d').click();
  for (const [ti, name] of [[0, 'ni'], [8, 'cao-su'], [10, 'xo-dua']] as const) {
    await tpls.nth(ti).click();
    await page.waitForTimeout(800);
    const u = await page.evaluate(() => (window as unknown as { __dmSnap: (w: number, h: number) => Promise<string> }).__dmSnap(1200, 900));
    const buf = Buffer.from(u.split(',')[1], 'base64');
    expect(buf.length, `3D ${name}`).toBeGreaterThan(60_000);
    fs.writeFileSync(path.join(OUT, `dm-3d-${name}.png`), buf);
  }
  await page.waitForTimeout(2500);
  const p3 = fs.readFileSync(await grab('dm-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
