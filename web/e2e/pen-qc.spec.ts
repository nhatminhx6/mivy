import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bút bi in logo: mọi mẫu × vùng in (thân + kẹp) — chữ nằm gọn trong vùng in, không chồng nhau, không nhỏ hơn 1.1mm;
// nội dung dài vẫn vừa; khắc tên riêng 40 người → đúng số trang A4; tải PDF/SVG/PNG/3D; 3D dựng được cho 4 loại bút.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pen');
fs.mkdirSync(OUT, { recursive: true });

async function auditArt(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const bad: string[] = [];
    const svgs = Array.from(document.querySelectorAll('[data-role="barrel"] > svg, [data-role="clip"] > svg')) as SVGSVGElement[];
    for (const svg of svgs) {
      const W = +svg.getAttribute('data-w')!, H = +svg.getAttribute('data-h')!, area = svg.getAttribute('data-area');
      const boxes: { x0: number; x1: number; y0: number; y1: number; t: string }[] = [];
      for (const t of Array.from(svg.querySelectorAll('text[data-pen-text]')) as SVGTextElement[]) {
        const b = t.getBBox();
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        const y = parseFloat(t.getAttribute('y') || '0');
        const box = { x0: b.x, x1: b.x + b.width, y0: y - fs * 0.74, y1: y + fs * 0.12, t: t.textContent || '' };
        if (fs < 1.1 - 1e-6) bad.push(`${area}: "${box.t}" cỡ ${fs.toFixed(2)}mm < 1.1`);
        if (box.x0 < -0.15 || box.x1 > W + 0.15) bad.push(`${area}: "${box.t}" tràn ngang (${box.x0.toFixed(2)}..${box.x1.toFixed(2)} / ${W})`);
        if (box.y0 < -0.25 || box.y1 > H + 0.25) bad.push(`${area}: "${box.t}" tràn dọc (${box.y0.toFixed(2)}..${box.y1.toFixed(2)} / ${H})`);
        boxes.push(box);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 0.2 && oy > 0.2) bad.push(`${area}: "${a.t}" chồng "${c.t}"`);
      }
    }
    return { bad, n: svgs.length };
  });
  expect(r.n, `${label}: có ảnh in`).toBeGreaterThan(0);
  expect(r.bad, label).toEqual([]);
}

test('Bút bi in logo: mọi mẫu, nội dung dài, khắc tên, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/pen');
  const tpls = page.getByTestId('pen-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(150);
    await auditArt(page, `mẫu ${i}`);
  }

  // nội dung rất dài trên mọi bố cục
  await tpls.nth(1).click();
  await page.getByTestId('pen-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC TẾ');
  await page.getByTestId('pen-line2').fill('www.ankhang-quocte.com.vn · 0909 123 456');
  await page.getByTestId('pen-clip').fill('Hotline 0909 123 456 · ankhang.vn');
  const layouts = page.locator('[data-testid="pen-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click(); await page.waitForTimeout(120);
    await auditArt(page, `dài · bố cục ${l}`);
  }
  // đổi loại bút: vùng in khác khổ vẫn vừa
  const models = page.locator('[data-testid="pen-models"] button');
  for (let m = 0; m < await models.count(); m++) {
    await models.nth(m).click(); await page.waitForTimeout(120);
    await auditArt(page, `dài · loại ${m}`);
  }

  // logo upload (1 màu cho tampon) — bố cục có logo
  await layouts.first().click();
  const logoB64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 120;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 120, 120);
    x.fillStyle = '#0B3D91'; x.beginPath(); x.arc(60, 60, 46, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.fillRect(40, 30, 14, 60); x.fillRect(66, 30, 14, 60);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('pen-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logoB64, 'base64') });
  await expect(page.locator('[data-role="barrel"] > svg mask image, [data-role="barrel"] > svg image').first()).toBeAttached({ timeout: 10_000 });

  // khắc tên riêng 40 người: mẫu kim loại VIP
  await tpls.nth(6).click();
  await page.waitForTimeout(200);
  const names = Array.from({ length: 40 }, (_, i) => ['Quốc Bảo', 'Thu Hà', 'Gia Khánh', 'Bảo Ngọc', 'Nguyễn Hoàng Phương Thảo'][i % 5] + ` ${i + 1}`).join('\n');
  await page.getByTestId('pen-names').fill(names);
  await page.waitForTimeout(300);
  await auditArt(page, 'khắc tên');
  const pages = Number(await page.getByTestId('pen-summary').getAttribute('data-pages'));
  expect(pages).toBeGreaterThanOrEqual(2);
  const labels = await page.locator('[data-testid="pen-sheets"] svg[data-page] text').allTextContents();
  for (const k of [1, 17, 40]) expect(labels.some((t) => t.includes(`${String(k).padStart(2, '0')} · `)), `tên ${k} có trong file in`).toBe(true);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pen-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pages);
  const zipOrSvg = await grab('pen-svg');
  expect(zipOrSvg).toMatch(/\.zip$/);
  // 1 trang → SVG đơn, chữ đã outline
  await tpls.nth(0).click(); await page.waitForTimeout(300);
  const svg = fs.readFileSync(await grab('pen-svg'), 'utf8');
  expect(svg).toContain('id="Vung-in"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  await page.getByTestId('tab-flat').click();
  const png = fs.readFileSync(await grab('pen-png'));
  expect(png.readUInt32BE(16)).toBe(2400);
  await page.getByTestId('tab-3d').click();
  await page.waitForTimeout(500);

  // 3D: 4 loại bút (có hộp quà) chụp được
  for (const i of [0, 4, 6, 10]) {
    await tpls.nth(i).click(); await page.waitForTimeout(400);
    const url = await page.evaluate(() => (window as unknown as { __penSnap: (w: number, h: number) => Promise<string> }).__penSnap(1200, 900));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(60_000);
    fs.writeFileSync(path.join(OUT, `pen-3d-${i}.png`), buf);
  }
  await page.waitForTimeout(2500);
  const d3 = fs.readFileSync(await grab('pen-3d'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
