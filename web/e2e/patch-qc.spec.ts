import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Patch thêu · huy hiệu vải: 12 mẫu × 9 hình × 3 loại (thêu/in/PVC) — chữ nằm trong đường cắt, không đè nhau,
// số màu chỉ ≤ 8 (thêu) / ≤ 6 (PVC), cảnh báo chữ <4mm, chữ dài, logo, tải PNG / SVG (In + CutContour, outline) / PDF / 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'patch');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'patch');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(60);
  const r = await page.locator('[data-testid="pt-preview"] svg').evaluate((svg: SVGSVGElement) => {
    const cut = svg.querySelector('path[data-role="cut"]') as SVGPathElement | null;
    if (!cut) return { out: ['thiếu path[data-role="cut"]'], n: 0, minF: 0 };
    const inside = (x: number, y: number) => {
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return cut.isPointInFill(p);
    };
    const texts = Array.from(svg.querySelectorAll('text')) as SVGTextElement[];
    const out: string[] = [];
    const boxes: { x0: number; x1: number; y0: number; y1: number; txt: string }[] = [];
    let minF = 999;
    for (const t of texts) {
      if (!(t.textContent || '').trim()) continue;
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      minF = Math.min(minF, fs);
      if (t.getAttribute('data-arc')) {
        const x = parseFloat(t.getAttribute('x') || '0');
        const y = parseFloat(t.getAttribute('y') || '0');
        if (!inside(x, y)) out.push(`chữ cong "${t.textContent}" lòi ra ngoài`);
        continue;
      }
      const b = t.getBBox();
      const base = parseFloat(t.getAttribute('y') || '0');
      const y0 = base - fs * 0.72;
      const y1 = base + fs * 0.18;
      const x0 = b.x;
      const x1 = b.x + b.width;
      const pts = [[x0 + 0.4, y0 + 0.4], [x1 - 0.4, y0 + 0.4], [x0 + 0.4, y1 - 0.4], [x1 - 0.4, y1 - 0.4]];
      if (!pts.every(([px, py]) => inside(px, py))) {
        out.push(`chữ lòi ra ngoài đường cắt: "${t.textContent}" [${x0.toFixed(1)}..${x1.toFixed(1)}, ${y0.toFixed(1)}..${y1.toFixed(1)}]`);
      }
      boxes.push({ x0, x1, y0, y1, txt: t.textContent || '' });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x0 < c.x1 - 0.3 && c.x0 < a.x1 - 0.3 && a.y0 < c.y1 - 0.3 && c.y0 < a.y1 - 0.3) {
          out.push(`chữ đè nhau: "${a.txt}" × "${c.txt}"`);
        }
      }
    }
    return { out, n: texts.length, minF };
  });
  expect(r.out, `${label}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.minF, `${label}: chữ quá nhỏ`).toBeGreaterThanOrEqual(1.15);
}

test('Patch thêu: 12 mẫu × 9 hình × 3 loại, chữ dài, cảnh báo, logo, tải file, 3D', async ({ page }) => {
  test.setTimeout(360_000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/patch');

  const tpls = page.getByTestId('pt-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBe(12);

  await page.getByTestId('tab-flat').click();

  // 1) 12 mẫu mặc định + kiểm màu chỉ ≤ 8
  for (let i = 0; i < 12; i++) {
    await tpls.nth(i).click();
    await audit(page, `mẫu ${i}`);
    const colCount = Number(await page.getByTestId('pt-colors').getAttribute('data-count'));
    expect(colCount, `mẫu ${i} quá 8 màu chỉ`).toBeLessThanOrEqual(8);
  }

  // 2) 9 hình trên mẫu chữ nhật/CLB
  await tpls.nth(3).click();
  const shapes = page.getByTestId('pt-shape');
  const ns = await shapes.count();
  expect(ns).toBe(9);
  for (let s = 0; s < ns; s++) {
    await shapes.nth(s).click();
    await audit(page, `hình ${s}`);
  }

  // 3) Cảnh báo: hình cắt theo dáng không vắt sổ được + thêu chữ < 4mm trên Ø50
  await tpls.nth(0).click();
  await shapes.nth(0).click(); // r50
  await page.getByTestId('pt-field-title').fill('CÂU LẠC BỘ CHẠY BỘ ĐƯỜNG DÀI QUỐC BẢO');
  await expect(page.getByTestId('pt-warn').first()).toBeVisible();

  // 4) Chữ dài qua các bố cục trên chữ nhật
  await shapes.nth(4).click(); // rect 90×55
  await page.getByTestId('pt-field-sub').fill('ĐOÀN KẾT · BẢN LĨNH · TẬN TÂM PHỤC VỤ');
  const layouts = page.getByTestId('pt-layout');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    await audit(page, `chữ dài bố cục ${l}`);
  }

  // 5) Đổi 3 loại: thêu, in chuyển nhiệt, PVC dẻo
  for (const k of ['emb', 'print', 'pvc'] as const) {
    await page.getByTestId(`pt-kind-${k}`).click();
    await audit(page, `loại ${k}`);
    if (k === 'pvc') {
      const c = Number(await page.getByTestId('pt-colors').getAttribute('data-count'));
      expect(c).toBeLessThanOrEqual(6);
    }
  }
  await page.getByTestId('pt-kind-emb').click();

  // 6) Logo khách
  await tpls.nth(3).click();
  const pngLogo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 200);
    x.fillStyle = '#1E2A4A'; x.beginPath(); x.arc(100, 100, 80, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#E8B84A'; x.font = 'bold 72px sans-serif'; x.textAlign = 'center'; x.fillText('AK', 100, 126);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('pt-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(pngLogo, 'base64') });
  await expect(page.locator('[data-testid="pt-preview"] svg [data-role="logo"]')).toHaveCount(1, { timeout: 10_000 });
  await audit(page, 'có logo');
  await page.getByRole('button', { name: /Bỏ logo/ }).click();

  // 7) Tải file: PNG, SVG (In + CutContour + 0 <text>), PDF phiếu sản xuất
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(p);
    return p;
  };
  const pngFile = fs.readFileSync(await grab('pt-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1600);
  const svgFile = fs.readFileSync(await grab('pt-svg'), 'utf8');
  expect(svgFile).toContain('id="In"');
  expect(svgFile).toContain('id="CutContour"');
  expect((svgFile.match(/<text[\s>]/g) || []).length, 'SVG in-cắt: chữ phải outline hết').toBe(0);
  const pdfFile = fs.readFileSync(await grab('pt-pdf'));
  expect(pdfFile.subarray(0, 4).toString()).toBe('%PDF');

  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 8) 3D: kiểm tra canvas + chụp 3 biến thể (thêu, in, PVC + velcro)
  await page.getByTestId('tab-3d').click();
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => !!(window as unknown as { __ptSnap?: unknown }).__ptSnap);
  const snap = async (name: string) => {
    await page.waitForTimeout(450);
    const url = await page.evaluate(() => (window as unknown as { __ptSnap: (w: number, h: number) => Promise<string> }).__ptSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(SHOTS, name), buf);
  };

  await tpls.nth(0).click();
  await page.getByTestId('pt-kind-emb').click();
  await snap('patch-emb-3d.png');

  await tpls.nth(7).click();
  await page.getByTestId('pt-kind-print').click();
  await snap('patch-print-3d.png');

  await tpls.nth(3).click();
  await page.getByTestId('pt-kind-pvc').click();
  await page.getByTestId('pt-backing-velcro').click();
  await snap('patch-pvc-velcro-3d.png');

  const d3File = fs.readFileSync(await grab('pt-3d'));
  expect(d3File.readUInt32BE(16)).toBe(1600);

  expect(errors).toEqual([]);
});
