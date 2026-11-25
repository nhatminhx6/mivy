import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng chào mừng tiệc: mọi mẫu × mọi khổ — chữ nằm trong tấm (cách mép ≥ lề xén), không đè nhau, không đè ô ảnh,
// đủ to để đọc từ xa; chữ dài vẫn gọn; ảnh khách + cảnh báo dpi; mica trong có lớp mực trắng; tải file; 3D 3 chất liệu.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'welcomesign');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string, minMm: number) {
  // đợi bản in dựng lại khớp lựa chọn hiện tại
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ws-print"] svg') as SVGSVGElement;
    const W = Number(svg.getAttribute('data-ws-w')), H = Number(svg.getAttribute('data-ws-h'));
    const texts = [...svg.querySelectorAll('text')] as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox();
      return { t: t.textContent!, role: t.getAttribute('data-role'), x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(t.getAttribute('font-size') || '0') };
    });
    const out: string[] = [];
    for (const b of boxes) {
      if (b.x < 3 || b.y < 3 || b.x + b.w > W - 3 || b.y + b.h > H - 3) out.push(`ra mép: "${b.t}" (${b.x.toFixed(0)},${b.y.toFixed(0)},${b.w.toFixed(0)}×${b.h.toFixed(0)}) / ${W}×${H}`);
    }
    // đè nhau: thu hẹp hộp chữ 18% cao (đường bao font có khoảng trống trên/dưới)
    const shrink = (b: typeof boxes[number]) => ({ x: b.x + b.w * 0.02, y: b.y + b.h * 0.18, w: b.w * 0.96, h: b.h * 0.64 });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = shrink(boxes[i]), c = shrink(boxes[j]);
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) out.push(`đè: "${boxes[i].t}" × "${boxes[j].t}"`);
    }
    // không đè ô ảnh
    const clip = svg.querySelector('clipPath[id$="-pc"] path') as SVGPathElement | null;
    if (clip) {
      const pb = clip.getBBox();
      for (const b0 of boxes) {
        const b = shrink(b0);
        if (b.x < pb.x + pb.width && pb.x < b.x + b.w && b.y < pb.y + pb.height && pb.y < b.y + b.h) out.push(`đè ảnh: "${b0.t}"`);
      }
    }
    const minFs = Math.min(...boxes.map((b) => b.fs));
    return { out, minFs, n: boxes.length, W, H };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(3);
  expect(r.out, `${label}: ${r.out.join(' | ')}`).toEqual([]);
  expect(r.minFs, `${label}: chữ nhỏ nhất ${r.minFs.toFixed(1)}mm`).toBeGreaterThanOrEqual(minMm);
  return r;
}

test('Bảng chào mừng: mọi mẫu × khổ, chữ dài, ảnh, mica, tải file, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/welcomesign');
  const tpls = page.getByTestId('ws-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  const sizes = page.locator('[data-testid="ws-sizes"] button');
  const nSizes = await sizes.count();

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (let z = 0; z < nSizes; z++) {
      await sizes.nth(z).click();
      await audit(page, `mẫu ${i} khổ ${z}`, 9);
    }
  }
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('ws-preview').screenshot({ path: path.join(OUT, 'ws-flat-last.png') });

  // chữ rất dài trên mọi bố cục, khổ nhỏ nhất (40×60) và ngang
  const long = {
    eyebrow: 'LỄ THÀNH HÔN CỦA HAI GIA ĐÌNH',
    kicker: 'Trân trọng kính mời quý khách đến chung vui cùng gia đình',
    title: 'Nguyễn Hoàng Quốc Bảo & Trần Ngọc Thu Hà',
    date: 'Chủ nhật · 18 giờ 30 · ngày 12 tháng 12 năm 2026',
    venue: 'Trung tâm Hội nghị Tiệc cưới An Khang Palace · Sảnh Hoa Hồng tầng 3',
    note: 'Sự hiện diện của quý khách là niềm vinh hạnh lớn cho gia đình chúng tôi',
  };
  for (const [k, v] of Object.entries(long)) await page.getByTestId(`ws-in-${k}`).fill(v);
  const layouts = page.locator('[data-testid="ws-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (const z of [0, nSizes - 1]) {
      await sizes.nth(z).click();
      await audit(page, `chữ dài bố cục ${l} khổ ${z}`, 7);
    }
  }
  await page.getByTestId('ws-preview').screenshot({ path: path.join(OUT, 'ws-long.png') });

  // ảnh khách: ảnh nhỏ 400×300 → cảnh báo dpi thấp; ảnh xuất hiện trong bản in
  await page.locator('[data-testid="ws-layouts"] button', { hasText: 'Có ảnh' }).click();
  await sizes.nth(1).click();
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 400, 300); g.addColorStop(0, '#f6a'); g.addColorStop(1, '#36c'); x.fillStyle = g; x.fillRect(0, 0, 400, 300);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('ws-photo').setInputFiles({ name: 'anh-cuoi.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByTestId('ws-dpi')).toBeVisible({ timeout: 15_000 });
  const dpi = Number(await page.getByTestId('ws-dpi').getAttribute('data-dpi'));
  expect(dpi).toBeLessThan(60);
  await expect(page.locator('[data-testid="ws-dpi"]')).toContainText('quá thấp');
  const hasUserPhoto = await page.evaluate(() => [...document.querySelectorAll('[data-testid="ws-print"] image[data-photo]')].some((im) => (im.getAttribute('href') || '').startsWith('data:image/jpeg')));
  expect(hasUserPhoto).toBe(true);
  await audit(page, 'có ảnh khách', 7);

  // tải file (formex)
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pngFile = fs.readFileSync(await grab('ws-png'));
  expect(pngFile.readUInt32BE(16)).toBe(1800);
  const pages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const pdf1 = fs.readFileSync(await grab('ws-pdf'));
  expect(pdf1.subarray(0, 4).toString()).toBe('%PDF');
  expect(pages(pdf1)).toBe(1);
  const svg1 = fs.readFileSync(await grab('ws-svg'), 'utf8');
  expect(svg1).toContain('id="CutContour"');
  expect(svg1).toContain('id="In"');
  expect((svg1.match(/<text/g) || []).length).toBe(0);

  // mica trong: có lớp mực trắng, PDF 2 trang, SVG lớp trắng
  await page.locator('[data-testid="ws-materials"] button').nth(1).click();
  await expect(page.getByTestId('ws-white-layer')).toHaveCount(1);
  const pdf2 = fs.readFileSync(await grab('ws-pdf'));
  expect(pages(pdf2)).toBe(2);
  const white = fs.readFileSync(await grab('ws-white'), 'utf8');
  expect(white).toContain('feColorMatrix');
  expect((white.match(/<text/g) || []).length).toBe(0);
  await expect(page.getByTestId('print-request')).toBeVisible();

  // 3D: 3 chất liệu
  await page.getByTestId('tab-3d').click();
  for (let m = 0; m < 3; m++) {
    await page.locator('[data-testid="ws-materials"] button').nth(m).click();
    await page.waitForTimeout(2500);
    let url = '';
    for (let k = 0; k < 8 && !url; k++) {
      url = await page.evaluate(async () => { try { return await (window as unknown as { __wsSnap: (w: number, h: number) => Promise<string> }).__wsSnap(800, 1000); } catch { return ''; } });
      if (!url) await page.waitForTimeout(2000);
    }
    expect(url.startsWith('data:image/png'), `3D chất liệu ${m}`).toBe(true);
    fs.writeFileSync(path.join(OUT, `ws-3d-${m}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const d3 = fs.readFileSync(await grab('ws-3d'));
  expect(d3.readUInt32BE(16)).toBe(1600);
  expect(errors).toEqual([]);
});
