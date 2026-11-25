import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Decal dán kính: mọi loại × mẫu × khổ kính — chữ nằm trong kính, không đè tay nắm, không chồng nhau, đủ lớn;
// file cắt chỉ còn CutContour (chữ đã outline, không tô); decal in có In + CutContour, lật gương khi dán mặt trong;
// PDF/PNG/3D tải được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'windowdecal');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="wd-preview"] svg') as SVGSVGElement;
    const W = +svg.getAttribute('data-wd-w')!, H = +svg.getAttribute('data-wd-h')!, door = svg.getAttribute('data-wd-door') === '1', bottom = +svg.getAttribute('data-wd-bottom')!;
    const hz = { x0: W - 112, x1: W - 78, y0: H - (1350 - bottom), y1: H - (750 - bottom) };
    const texts = Array.from(svg.querySelectorAll('text[data-wd-text]')).filter((t) => !t.closest('mask') && (t.textContent || '').trim());
    const boxes = texts.map((t) => {
      const b = (t as SVGTextElement).getBBox(); const fs = +(t.getAttribute('data-wd-size') || 0); const by = +(t.getAttribute('y') || 0);
      return { key: t.getAttribute('data-wd-text')!, arc: t.hasAttribute('data-wd-arc'), size: fs, x: b.x, y: by - fs * 0.95, w: b.width, h: fs * 1.18, txt: t.textContent };
    });
    const bad: string[] = [];
    for (const b of boxes) {
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) bad.push(`tràn kính: ${b.key} "${b.txt}"`);
      if (door && b.x < hz.x1 && b.x + b.w > hz.x0 && b.y < hz.y1 && b.y + b.h > hz.y0) bad.push(`đè tay nắm: ${b.key} "${b.txt}"`);
    }
    const body = boxes.map((b) => ({ ...b, y1: b.y + b.h * 0.22, y2: b.y + b.h * 0.86 }));
    for (let i = 0; i < body.length; i++) for (let j = i + 1; j < body.length; j++) {
      const a = body[i], c = body[j];
      if (a.arc && c.arc) continue;
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y1 < c.y2 && c.y1 < a.y2) bad.push(`chồng: "${a.txt}" × "${c.txt}"`);
    }
    const minSize = boxes.length ? Math.min(...boxes.map((b) => b.size)) : 99;
    return { bad, minSize, n: boxes.length };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.minSize, `${label}: chữ quá nhỏ ${r.minSize}mm`).toBeGreaterThanOrEqual(6);
}

test('Decal dán kính: mọi loại × mẫu × khổ kính, file cắt/in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/windowdecal');
  await expect(page.getByTestId('wd-tpl').first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();

  let n = 0;
  for (const type of ['cut', 'print', 'oneway']) {
    await page.getByTestId(`wd-type-${type}`).click(); await page.waitForTimeout(250);
    const tpls = page.getByTestId('wd-tpl');
    const nt = await tpls.count();
    expect(nt).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < nt; i++) {
      await tpls.nth(i).click();
      for (const g of ['door90', 'door100', 'win120', 'win200']) {
        await page.getByTestId(`wd-glass-${g}`).click(); await page.waitForTimeout(80);
        await audit(page, `${type} mẫu ${i} kính ${g}`);
      }
      await page.getByTestId('wd-glass-door90').click(); await page.waitForTimeout(80);
      await page.getByTestId('wd-preview').screenshot({ path: path.join(OUT, `${type}-${i}.png`) });
      n++;
    }
  }
  expect(n).toBeGreaterThanOrEqual(10);

  // khổ tự nhập: kính thấp (vách 150×110) + bật hết khối, chữ dài
  await page.getByTestId('wd-type-print').click(); await page.getByTestId('wd-tpl').first().click();
  await page.getByTestId('wd-glass-custom').click();
  await page.getByTestId('wd-w').fill('150'); await page.getByTestId('wd-h').fill('110');
  await page.getByTestId('wd-door').uncheck();
  for (const b of ['promo', 'band']) await page.getByTestId(`wd-block-${b}`).click();
  await page.getByTestId('wd-brand').fill('TIỆM CÀ PHÊ RANG XAY THỦ CÔNG AN KHANG QUỐC BẢO');
  await page.getByTestId('wd-hours').fill('Thứ 2 – Thứ 6 | 6:30 – 22:30\nThứ 7 – Chủ nhật | 7:00 – 23:30\nNgày lễ Tết | 8:00 – 21:00');
  await page.waitForTimeout(200);
  await audit(page, 'kính thấp + chữ dài');
  await page.getByTestId('wd-preview').screenshot({ path: path.join(OUT, 'custom-short.png') });
  await page.getByTestId('wd-glass-door90').click();
  await page.getByTestId('wd-brand').fill('AN KHANG COFFEE');

  // logo khách (decal in)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DwnwEJMDGgAQBPhQEDwW5V8wAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('wd-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="wd-preview"] svg image')).toHaveCount(1, { timeout: 10_000 });

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  // decal in: lớp In + CutContour, dán mặt trong → lật gương
  const mirror = () => page.evaluate(() => document.querySelector('[data-testid="wd-print"] svg')!.getAttribute('data-wd-mirror'));
  expect(await mirror()).toBe('0');
  await page.getByTestId('wd-inside').check(); await page.waitForTimeout(150);
  expect(await mirror()).toBe('1');
  const psvg = fs.readFileSync(await grab('wd-svg'), 'utf8');
  expect(psvg).toContain('id="In"'); expect(psvg).toContain('id="CutContour"');
  expect((psvg.match(/<text/g) || []).length, 'SVG in phải outline hết chữ').toBe(0);
  expect(psvg).toContain('scale(-1 1)');
  const pdf = fs.readFileSync(await grab('wd-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  await page.getByTestId('wd-inside').uncheck();

  // decal cắt: chỉ đường cắt CutContour (không tô), không còn <text>, không nền tham khảo
  await page.getByTestId('wd-type-cut').click(); await page.getByTestId('wd-tpl').nth(3).click(); await page.waitForTimeout(200);
  const csvg = fs.readFileSync(await grab('wd-svg'), 'utf8');
  expect(csvg).toContain('id="CutContour"'); expect(csvg).toContain('id="CutContour-DecalMo"');
  expect(csvg).not.toContain('NenThamKhao');
  expect((csvg.match(/<text/g) || []).length, 'file cắt phải outline hết chữ').toBe(0);
  const filled = (csvg.match(/<(path|rect|circle)[^>]*fill="(?!none)[^"]*"/g) || []).filter((m) => !/<rect[^>]*width="100%"/.test(m));
  expect(filled.length, 'file cắt không được có hình tô').toBe(0);
  expect(csvg).toContain('stroke="#FF00FF"');
  const prev = fs.readFileSync(await grab('wd-png'));
  expect(prev.readUInt32BE(16)).toBe(1600);

  // 3D: mọi loại dựng được, ảnh 3D 1600px
  await page.getByTestId('tab-3d').click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__wdSnap), { timeout: 30_000 }).toBe(true);
  for (const [t, i] of [['cut', 0], ['cut', 3], ['print', 0], ['oneway', 0], ['oneway', 1]] as const) {
    await page.getByTestId(`wd-type-${t}`).click(); await page.getByTestId('wd-tpl').nth(i).click();
    await page.waitForTimeout(900);
    const url: string = await page.evaluate(() => (window as any).__wdSnap(900, 675));
    fs.writeFileSync(path.join(OUT, `3d-${t}-${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
    expect(url.length).toBeGreaterThan(20_000);
  }
  await page.getByTestId('wd-glass-win200').click();
  await page.waitForTimeout(1800);
  const p3 = fs.readFileSync(await grab('wd-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
