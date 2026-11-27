import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Giấy note in logo: 4 loại (sticky, sổ xé, hộp vuông 4 mặt, bộ sticky bìa cứng) × mẫu × dáng bế × khổ;
// chữ nằm gọn trong vùng an toàn, không đè nhau, đủ to; chữ dài; logo; tải PNG / PDF nhiều trang / SVG (outline + CutContour); 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'notepad');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'notepad');

async function auditMain(page: Page, label: string, checkShape = false) {
  await page.waitForTimeout(70);
  const r = await page.locator('[data-testid="np-main"] svg').evaluate((svg: SVGSVGElement, doShape: boolean) => {
    const safeAttr = svg.getAttribute('data-safe') || '0 0 0 0';
    const [sx, sy, sw, sh] = safeAttr.split(' ').map(Number);
    const shapePath = svg.querySelector('[data-np-shape="1"]') as SVGPathElement | null;
    const insideShape = (x: number, y: number) => {
      if (!doShape || !shapePath) return true;
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return shapePath.isPointInFill(p);
    };
    const texts = Array.from(svg.querySelectorAll('[data-content="1"] text')).filter(
      (t) => !t.getAttribute('data-deco') && (t.textContent || '').trim(),
    ) as SVGTextElement[];
    const out: string[] = [];
    const boxes: { x0: number; x1: number; y0: number; y1: number; txt: string; fs: number }[] = [];
    let minF = 999;
    for (const t of texts) {
      const b = t.getBBox();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const base = parseFloat(t.getAttribute('y') || '0');
      minF = Math.min(minF, fs);
      const y0 = base - fs * 0.8;
      const y1 = base + fs * 0.18;
      const x0 = b.x;
      const x1 = b.x + b.width;
      if (x0 < sx - 2 || x1 > sx + sw + 2 || y0 < sy - 2 || y1 > sy + sh + 2) {
        out.push(`tràn vùng an toàn: "${t.textContent}" [${x0.toFixed(0)}..${x1.toFixed(0)}, ${y0.toFixed(0)}..${y1.toFixed(0)}] / [${sx.toFixed(0)}..${(sx + sw).toFixed(0)}, ${sy.toFixed(0)}..${(sy + sh).toFixed(0)}]`);
      }
      if (doShape && shapePath) {
        const pts = [[x0 + 2, y0 + 2], [x1 - 2, y0 + 2], [x0 + 2, y1 - 2], [x1 - 2, y1 - 2]];
        if (!pts.every(([px, py]) => insideShape(px, py))) {
          out.push(`chữ chạm ra ngoài đường bế: "${t.textContent}"`);
        }
      }
      boxes.push({ x0, x1, y0, y1, txt: t.textContent || '', fs });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x0 < c.x1 - 1 && c.x0 < a.x1 - 1 && a.y0 < c.y1 - 1 && c.y0 < a.y1 - 1) {
          out.push(`chữ đè nhau: "${a.txt}" × "${c.txt}"`);
        }
      }
    }
    return { out, minF, n: texts.length };
  }, checkShape);
  expect(r.out, `${label}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.minF, `${label}: chữ quá nhỏ`).toBeGreaterThanOrEqual(16.5); // >= 1.65mm (minTxt = 17)
}

test('Giấy note in logo: 4 loại × mẫu × dáng bế, chữ dài, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(360_000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/notepad');

  const tpls = page.getByTestId('np-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBe(12);

  await page.getByTestId('tab-flat').click();

  // 1) Sticky: 12 mẫu × 6 dáng bế
  const shapes = page.locator('[data-testid="np-shapes"] button');
  const nShapes = await shapes.count();
  expect(nShapes).toBe(6);
  for (let i = 0; i < 12; i++) {
    await tpls.nth(i).click();
    await auditMain(page, `sticky mẫu ${i}`, true);
  }
  await tpls.first().click();
  for (let s = 0; s < nShapes; s++) {
    await shapes.nth(s).click();
    await auditMain(page, `sticky dáng ${s}`, true);
  }
  await shapes.first().click();

  // 2) Chữ rất dài trên mọi bố cục × nhiều dáng
  await page.getByTestId('np-brand').fill('CÔNG TY TNHH GIẢI PHÁP VĂN PHÒNG AN KHANG SÀI GÒN');
  await page.getByTestId('np-slogan').fill('Đồng hành cùng doanh nghiệp phát triển bền vững mỗi ngày');
  await page.getByTestId('np-website').fill('ankhangoffice.com.vn');
  await page.getByTestId('np-hotline').fill('1900 6868 88');
  const layouts = page.locator('[data-testid="np-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (const s of [0, 1, 2, 5]) {
      await shapes.nth(s).click();
      await auditMain(page, `chữ dài bố cục ${l} dáng ${s}`, true);
    }
  }
  await shapes.first().click();

  // 3) Đổi sang 3 loại còn lại: sổ xé (A6/A5), hộp note vuông, bộ sticky bìa cứng
  await page.getByTestId('np-kind-pad').click();
  const padSizes = page.locator('[data-testid="np-pad-sizes"] button');
  for (let z = 0; z < await padSizes.count(); z++) {
    await padSizes.nth(z).click();
    await auditMain(page, `pad khổ ${z}`);
  }
  await expect(page.getByTestId('np-cover')).toBeVisible();

  await page.getByTestId('np-kind-cube').click();
  await auditMain(page, 'cube');
  await expect(page.getByTestId('np-wrap')).toBeVisible();

  await page.getByTestId('np-kind-set').click();
  await auditMain(page, 'set');
  await expect(page.getByTestId('np-set')).toBeVisible();

  // 4) Logo khách
  await page.getByTestId('np-kind-sticky').click();
  await tpls.first().click();
  const pngLogo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!;
    x.fillStyle = '#1F3A68'; x.beginPath(); x.arc(100, 100, 88, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.fillText('AK', 100, 128);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('np-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(pngLogo, 'base64') });
  await expect(page.locator('[data-testid="np-main"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await auditMain(page, 'có logo', true);
  await page.getByRole('button', { name: /Bỏ logo/ }).click();

  // 5) Tải file: PNG, PDF (kiểm tra số trang từng loại), SVG (CutContour + đã outline)
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return p;
  };
  await shapes.nth(2).click(); // Tròn Ø76 (dáng bế)
  const pngFile = fs.readFileSync(await grab('np-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1600);
  const svgSticky = fs.readFileSync(await grab('np-svg'), 'utf8');
  expect(svgSticky).toContain('id="CutContour"');
  expect((svgSticky.match(/<text[\s>]/g) || []).length, 'SVG in: chữ phải outline hết').toBe(0);

  const checkPdfPages = async (kind: 'sticky' | 'pad' | 'cube' | 'set', expectedPages: number) => {
    await page.getByTestId(`np-kind-${kind}`).click();
    await page.waitForTimeout(150);
    const pdf = fs.readFileSync(await grab('np-pdf'));
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(expectedPages);
  };
  await checkPdfPages('sticky', 1);
  await checkPdfPages('pad', 2);
  await checkPdfPages('cube', 5);
  await checkPdfPages('set', 4);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 6) 3D: kiểm tra canvas + chụp 4 loại để soi
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __npSnap?: unknown }).__npSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(450);
    const url = await page.evaluate(() => (window as unknown as { __npSnap: (w: number, h: number) => Promise<string> }).__npSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(SHOTS, name), buf);
  };

  await page.getByTestId('np-kind-sticky').click();
  await tpls.nth(0).click();
  await shapes.nth(0).click();
  await snap('notepad-sticky-3d.png');

  await page.getByTestId('np-kind-pad').click();
  await tpls.nth(1).click();
  await snap('notepad-pad-3d.png');

  await page.getByTestId('np-kind-cube').click();
  await tpls.nth(5).click();
  await snap('notepad-cube-3d.png');

  await page.getByTestId('np-kind-set').click();
  await tpls.nth(3).click();
  await snap('notepad-set-3d.png');

  const d3File = fs.readFileSync(await grab('np-3d'));
  expect(d3File.readUInt32BE(16)).toBe(1600);

  expect(errors).toEqual([]);
});
