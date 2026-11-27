import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp quà cưới mini: 6 kiểu hộp × khổ × 12 mẫu — chữ nằm gọn trong từng mặt, không đè nhau,
// khuôn bế có đủ lớp In / CutContour / Fold, chữ dài, logo, tải SVG khuôn / SVG tờ in (đã outline) / PDF / PNG 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'favorbox');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'favorbox');

async function auditFaces(page: Page, label: string) {
  await page.waitForTimeout(50);
  const res = await page.locator('[data-testid="fb-faces"] svg').evaluateAll((svgs) => {
    const out: string[] = [];
    let totalTexts = 0;
    for (const svg of svgs) {
      const face = svg.getAttribute('data-face') || '';
      const vb = (svg as SVGSVGElement).viewBox.baseVal;
      const texts = Array.from(svg.querySelectorAll('text')) as SVGTextElement[];
      const boxes: { x0: number; x1: number; y0: number; y1: number; txt: string }[] = [];
      for (const t of texts) {
        if (!(t.textContent || '').trim()) continue;
        totalTexts++;
        const b = t.getBBox();
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        const base = parseFloat(t.getAttribute('y') || '0');
        const y0 = base - fs * 0.8;
        const y1 = base + fs * 0.18;
        const x0 = b.x;
        const x1 = b.x + b.width;
        if (x0 < -0.5 || x1 > vb.width + 0.5 || y0 < -0.5 || y1 > vb.height + 0.5) {
          out.push(`${face}: chữ tràn mặt "${t.textContent}" [${x0.toFixed(1)}..${x1.toFixed(1)}, ${y0.toFixed(1)}..${y1.toFixed(1)}]/${vb.width}×${vb.height}`);
        }
        if (fs < 1.3) {
          out.push(`${face}: chữ quá nhỏ ${fs.toFixed(2)}mm "${t.textContent}"`);
        }
        boxes.push({ x0, x1, y0, y1, txt: t.textContent || '' });
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], c = boxes[j];
          if (a.x0 < c.x1 - 0.3 && c.x0 < a.x1 - 0.3 && a.y0 < c.y1 - 0.3 && c.y0 < a.y1 - 0.3) {
            out.push(`${face}: chữ đè nhau "${a.txt}" × "${c.txt}"`);
          }
        }
      }
    }
    return { out, totalTexts };
  });
  expect(res.out, `${label}`).toEqual([]);
  expect(res.totalTexts, `${label}: có chữ`).toBeGreaterThan(0);

  const dieLayers = await page.getByTestId('fb-die').evaluate((svg) => ({
    hasIn: !!svg.querySelector('#In'),
    hasCut: !!svg.querySelector('#CutContour'),
    hasFold: !!svg.querySelector('#Fold'),
    loops: Number(svg.getAttribute('data-loops') || '0'),
  }));
  expect(dieLayers.hasIn, `${label}: thiếu lớp In`).toBe(true);
  expect(dieLayers.hasCut, `${label}: thiếu lớp CutContour`).toBe(true);
  expect(dieLayers.hasFold, `${label}: thiếu lớp Fold`).toBe(true);
  expect(dieLayers.loops, `${label}: đường cắt phải khép 1 vòng`).toBe(1);
}

test('Hộp quà cưới mini: 6 kiểu hộp × mẫu × khổ, chữ dài, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(360_000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/favorbox');

  const tpls = page.getByTestId('fb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBe(12);

  const kinds = page.getByTestId('fb-kind');
  const nk = await kinds.count();
  expect(nk).toBe(6);

  await page.getByTestId('tab-flat').click();

  // 1) 12 mẫu trên kiểu đầu tiên
  for (let i = 0; i < 12; i++) {
    await tpls.nth(i).click();
    await auditFaces(page, `mẫu ${i}`);
  }
  await tpls.first().click();

  // 2) 6 kiểu hộp × mọi kích thước
  for (let k = 0; k < nk; k++) {
    await kinds.nth(k).click();
    const sizes = page.getByTestId('fb-size');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      await auditFaces(page, `kiểu ${k} khổ ${s}`);
    }
  }

  // 3) Chữ rất dài trên 4 bố cục × vài kiểu hộp
  await page.getByTestId('fb-title').fill('Trăm năm hạnh phúc');
  await page.getByTestId('fb-names').fill('Nguyễn Quốc Bảo & Trần Thị Thu Hà');
  await page.getByTestId('fb-date').fill('20.12.2026 · TP.HCM');
  await page.getByTestId('fb-message').fill('Gia đình hai bên trân trọng cảm ơn quý khách đã đến chung vui cùng chúng mình!');
  await page.getByTestId('fb-contents').fill('Socola hạnh nhân · Kẹo cưới');
  const layouts = page.getByTestId('fb-layout');
  for (const k of [0, 1, 2, 4, 5]) {
    await kinds.nth(k).click();
    for (let l = 0; l < await layouts.count(); l++) {
      await layouts.nth(l).click();
      await auditFaces(page, `chữ dài kiểu ${k} bố cục ${l}`);
    }
  }

  // 4) Logo khách
  await kinds.nth(1).click();
  await tpls.nth(1).click();
  const pngLogo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!;
    x.fillStyle = '#6B3C42'; x.beginPath(); x.arc(100, 100, 88, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 72px serif'; x.textAlign = 'center'; x.fillText('B&H', 100, 124);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('fb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(pngLogo, 'base64') });
  await expect(page.locator('[data-testid="fb-faces"] svg image').first()).toBeVisible({ timeout: 10_000 });
  await auditFaces(page, 'có logo');
  await page.getByRole('button', { name: /Bỏ ảnh/ }).click();

  // 5) Tải file: SVG khuôn, SVG tờ in, PDF, PNG 3D
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return p;
  };
  const svgDie = fs.readFileSync(await grab('fb-svg'), 'utf8');
  expect(svgDie).toContain('id="In"');
  expect(svgDie).toContain('id="CutContour"');
  expect(svgDie).toContain('id="Fold"');
  expect((svgDie.match(/<text[\s>]/g) || []).length, 'SVG khuôn: chữ phải outline hết').toBe(0);

  const svgSheet = fs.readFileSync(await grab('fb-sheet-svg'), 'utf8');
  expect(svgSheet).toContain('id="In"');
  expect(svgSheet).toContain('id="CutContour"');
  expect(svgSheet).toContain('id="Fold"');
  expect((svgSheet.match(/<text[\s>]/g) || []).length, 'SVG tờ in: chữ phải outline hết').toBe(0);

  const pdfPages = Number(await page.getByTestId('fb-pdf').getAttribute('data-pages'));
  const pdfBuf = fs.readFileSync(await grab('fb-pdf'));
  expect(pdfBuf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdfBuf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pdfPages);

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 6) 3D: kiểm tra canvas + chụp 3 mẫu tiêu biểu để soi
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __fvSnap?: unknown }).__fvSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(450);
    const url = await page.evaluate(() => (window as unknown as { __fvSnap: (w: number, h: number) => Promise<string> }).__fvSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(SHOTS, name), buf);
  };

  await tpls.nth(0).click();
  await kinds.nth(0).click(); // pillow
  await snap('favorbox-pillow-3d.png');

  await tpls.nth(3).click();
  await kinds.nth(1).click(); // square
  await snap('favorbox-square-3d.png');

  await tpls.nth(10).click();
  await kinds.nth(4).click(); // gable
  await snap('favorbox-gable-3d.png');

  const png3d = fs.readFileSync(await grab('fb-png'));
  expect(png3d.readUInt32BE(16)).toBe(1600);

  expect(errors).toEqual([]);
});
