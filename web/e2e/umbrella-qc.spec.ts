import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Ô dù in logo: mọi mẫu × 3 loại ô — chữ/logo nằm GỌN trong múi (cách đường may ≥ nửa vùng an toàn),
// không chồng nhau; file in có đường may + CutContour, PDF đúng số trang, SVG đã outline; 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'umbrella');

async function auditGore(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="umb-gore"]') as SVGSVGElement;
    const Rs = +svg.dataset.rs!, N = +svg.dataset.n!, L = +svg.dataset.l!, margin = +svg.dataset.margin!, sc = +svg.dataset.sc!;
    const w = (s: number) => (Math.PI / N) * Rs * Math.sin(Math.min(s, L) / Rs);
    const boxes: { x: number; y: number; w: number; h: number; t: string }[] = [];
    svg.querySelectorAll('[data-art] text, [data-art] image').forEach((el) => {
      const b = (el as SVGGraphicsElement).getBBox();
      if (b.width > 0) boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height, t: el.textContent || 'img' });
    });
    const bad: string[] = [];
    for (const b of boxes) {
      for (const yy of [b.y, b.y + b.h]) {
        const lim = w(yy) - margin * 0.5;
        if (b.x < -lim - 0.5 || b.x + b.w > lim + 0.5) bad.push(`ra mép múi: "${b.t}" y=${yy.toFixed(0)}`);
      }
      if (b.y < 0 || b.y + b.h > L * (1 - sc)) bad.push(`ra ngoài chiều dài múi: "${b.t}"`);
    }
    // chồng nhau (theo hộp chữ thu hẹp 15% vì hộp chữ có khoảng trống trên/dưới)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const sh = (q: typeof a) => ({ x: q.x, y: q.y + q.h * 0.15, w: q.w, h: q.h * 0.7 });
      const A = sh(a), C = sh(c);
      if (A.x < C.x + C.w && C.x < A.x + A.w && A.y < C.y + C.h && C.y < A.y + A.h) bad.push(`chồng: "${a.t}" × "${c.t}"`);
    }
    return { n: boxes.length, bad };
  });
  expect(r.n, `${label}: có nội dung in`).toBeGreaterThan(0);
  expect(r.bad, label).toEqual([]);
}

test('Ô dù: mọi mẫu × loại ô, file in, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/umbrella');
  const tpls = page.getByTestId('umb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  const names = await tpls.evaluateAll((els) => els.map((e) => e.querySelector('div + div')?.textContent || ''));
  for (const name of names) {
    await page.getByTestId('umb-tpl').filter({ hasText: name }).first().click();
    await page.waitForTimeout(120);
    for (const k of ['hand', 'fold', 'patio']) {
      await page.getByTestId(`umb-kind-${k}`).click();
      await page.waitForTimeout(80);
      await auditGore(page, `${name} · ${k}`);
    }
    await page.getByTestId('umb-flat').screenshot({ path: path.join(OUT, `umb-${name.replace(/[^\w]+/g, '-')}.png`) });
  }

  // nội dung dài + đổi bố cục/múi/màu mực
  await page.getByTestId('umb-kind-hand').click();
  await page.getByTestId('umb-brand').fill('CÔNG TY CỔ PHẦN THƯƠNG MẠI DỊCH VỤ AN KHANG QUỐC BẢO');
  await page.getByTestId('umb-slogan').fill('Đồng hành cùng khách hàng trên mọi nẻo đường Việt Nam');
  await page.getByTestId('umb-phone').fill('0909 123 456 – 028 3838 1234');
  for (const li of [0, 1, 2, 3]) {
    await page.getByTestId('umb-layouts').locator('button').nth(li).click();
    for (const k of ['hand', 'fold', 'patio']) { await page.getByTestId(`umb-kind-${k}`).click(); await auditGore(page, `chữ dài · bố cục ${li} · ${k}`); }
  }
  await page.getByTestId('umb-inks').locator('button').first().click();
  // 1 màu mực → chữ trên múi chính chỉ 1 màu
  const fills = await page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll('[data-testid="umb-gore"] [data-art] text')).map((t) => t.getAttribute('fill')))));
  expect(fills.length, '1 màu mực').toBe(1);

  // logo tải lên → hiện trong múi, tô 1 màu
  await page.getByTestId('umb-kind-hand').click();
  await page.getByTestId('umb-layouts').locator('button').first().click();
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 200;
    const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 200);
    x.fillStyle = '#123'; x.beginPath(); x.arc(100, 100, 70, 0, Math.PI * 2); x.fill(); x.fillRect(170, 40, 110, 120);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByTestId('umb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[data-testid="umb-gore"] image')).toHaveCount(1, { timeout: 10_000 });
  await auditGore(page, 'logo tải lên');

  // file in: dù quán xen kẽ in 8 múi → 4 trang (múi chính, múi phụ, diềm chính, diềm phụ)
  await page.getByTestId('umb-kind-patio').click();
  await page.getByTestId('umb-panels').locator('button').nth(3).click();
  if (!(await page.getByTestId('umb-alternate').isChecked())) await page.getByTestId('umb-alternate').check();
  await page.waitForTimeout(300);
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('umb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(4);
  const zip = fs.readFileSync(await grab('umb-svg'));
  expect(zip.subarray(0, 2).toString()).toBe('PK');
  const zs = zip.toString('utf8');
  expect((zs.match(/id="CutContour"/g) || []).length).toBe(4);
  expect(zs).not.toContain('<text');

  // ô cầm tay in 1 múi → PDF 1 trang + 1 file SVG
  await page.getByTestId('umb-kind-hand').click();
  await page.getByTestId('umb-panels').locator('button').first().click();
  const pdf1 = fs.readFileSync(await grab('umb-pdf'));
  expect((pdf1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);
  const svg1 = fs.readFileSync(await grab('umb-svg'), 'utf8');
  expect(svg1).toContain('id="CutContour"');
  expect(svg1).toContain('id="DuongMay"');
  expect(svg1).not.toContain('<text');
  const pngF = fs.readFileSync(await grab('umb-png'));
  expect(pngF.readUInt32BE(16)).toBe(1600);

  // 3D: mỗi loại ô chụp được
  await page.getByTestId('tab-3d').click();
  for (const k of ['hand', 'fold', 'patio']) {
    await page.getByTestId(`umb-kind-${k}`).click();
    await page.waitForTimeout(600);
    const url = await page.evaluate(() => (window as unknown as { __umbSnap: (w: number, h: number) => Promise<string> }).__umbSnap(1200, 900));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `umb-3d-${k}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const img3d = fs.readFileSync(await grab('umb-3d'));
  expect(img3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
