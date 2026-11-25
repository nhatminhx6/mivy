import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Biển công ty: mọi loại × mẫu × khổ — chữ nằm trong vùng an toàn (không đè ốc pát), không chồng nhau, đủ lớn;
// file in có lớp In/CutContour/Khoan (+ ChuNoi khi mica), chữ đã outline; PDF/PNG/3D tải được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'plaque');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="pl-preview"] svg') as SVGSVGElement;
    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const caps = Array.from(svg.querySelectorAll('circle')).filter((c) => c.parentElement?.querySelectorAll('circle').length === 2 && (c.getAttribute('fill') || '').startsWith('url('))
      .map((c) => ({ x: +c.getAttribute('cx')!, y: +c.getAttribute('cy')!, r: +c.getAttribute('r')! }));
    const texts = Array.from(svg.querySelectorAll('text[data-pl-text]')).filter((t) => !t.closest('[opacity]'));
    // ngang: bbox thật; dọc: theo đường cơ sở (bbox SVG tính cả khoảng dòng của font → cao hơn nét chữ thật)
    const boxes = texts.map((t) => {
      const b = (t as SVGTextElement).getBBox(); const fs = +(t.getAttribute('font-size') || 0); const by = +(t.getAttribute('y') || 0);
      const up = /[A-ZÀ-Ỹ0-9]/.test(t.textContent || '') ? 1.02 : 0.92;
      return { key: t.getAttribute('data-pl-text')!, size: +(t.getAttribute('data-pl-size') || fs), x: b.x, y: by - fs * up, w: b.width, h: fs * (up + 0.26), txt: t.textContent };
    });
    const bad: string[] = [];
    for (const b of boxes) {
      if (!b.txt?.trim()) continue;
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) bad.push(`tràn khổ: ${b.key} "${b.txt}"`);
      for (const c of caps) {
        const nx = Math.max(b.x, Math.min(c.x, b.x + b.w)), ny = Math.max(b.y + b.h * 0.15, Math.min(c.y, b.y + b.h * 0.85));
        if (Math.hypot(nx - c.x, ny - c.y) < c.r) bad.push(`đè ốc pát: ${b.key} "${b.txt}"`);
      }
    }
    // chồng chữ: so phần thân chữ (bỏ 18% trên/dưới của bbox — dấu & phần thừa)
    const body = boxes.filter((b) => b.txt?.trim() && b.key !== 'logo').map((b) => ({ ...b, y1: b.y + b.h * 0.22, y2: b.y + b.h * 0.86 }));
    for (let i = 0; i < body.length; i++) for (let j = i + 1; j < body.length; j++) {
      const a = body[i], c = body[j];
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y1 < c.y2 && c.y1 < a.y2) bad.push(`chồng: "${a.txt}" × "${c.txt}"`);
    }
    const minSize = Math.min(...boxes.filter((b) => b.key !== 'logo' && b.size > 0).map((b) => b.size));
    return { bad, minSize, n: boxes.length, W, H, caps: caps.length };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.caps, `${label}: có nắp ốc pát`).toBeGreaterThanOrEqual(2);
  // chữ nhỏ nhất ≥ 2.6mm (biển nhỏ) / ≥ 5mm (biển công ty, đọc được từ ~1.5m)
  expect(r.minSize, `${label}: chữ quá nhỏ ${r.minSize}`).toBeGreaterThan(Math.min(r.W, r.H) < 200 ? 2.6 : 5);
  return r;
}

test('Biển công ty: mọi loại × mẫu × khổ, file in–cắt, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/plaque');
  await expect(page.getByTestId('pl-tpl').first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('tab-flat').click();

  let shots = 0;
  for (const kind of ['company', 'room', 'number']) {
    await page.getByTestId(`pl-kind-${kind}`).click();
    await page.waitForTimeout(300);
    const tpls = page.getByTestId('pl-tpl');
    const nt = await tpls.count();
    expect(nt).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < nt; i++) {
      await tpls.nth(i).click();
      const sizes = page.getByTestId('pl-size');
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click();
        await page.waitForTimeout(120);
        await audit(page, `${kind} mẫu ${i} khổ ${z}`);
      }
      await page.getByTestId('pl-preview').screenshot({ path: path.join(OUT, `${kind}-${i}.png`) });
      shots++;
    }
  }
  expect(shots).toBeGreaterThanOrEqual(15);

  // chữ rất dài vẫn vừa (biển công ty, mọi bố cục)
  await page.getByTestId('pl-kind-company').click();
  await page.getByTestId('pl-company').fill('Công ty Cổ phần Đầu tư Xây dựng và Thương mại Dịch vụ An Khang Quốc Bảo');
  await page.getByTestId('pl-en').fill('An Khang Quoc Bao Investment Construction Trading and Services Joint Stock Company');
  await page.getByTestId('pl-address').fill('Tầng 12, Toà nhà Bitexco, 2 Hải Triều, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam');
  const layouts = page.locator('[data-testid="pl-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click(); await page.waitForTimeout(150);
    await audit(page, `chữ dài bố cục ${l}`);
  }
  await page.getByTestId('pl-preview').screenshot({ path: path.join(OUT, 'company-long.png') });

  // logo khách
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DwnwEJMDGgAQBPhQEDwW5V8wAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('pl-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="pl-preview"] svg image')).toHaveCount(1, { timeout: 10_000 });

  // file in–cắt: mica có ChuNoi, kim loại thì không có nền
  const layersOf = () => page.evaluate(() => {
    const s = document.querySelector('[data-testid="pl-print"] svg')!;
    return { In: !!s.querySelector('#In'), cut: !!s.querySelector('#CutContour rect'), holes: s.querySelectorAll('#Khoan circle').length, chu: s.querySelectorAll('#ChuNoi text').length, bg: Array.from(s.querySelectorAll('#In > rect')).some((r) => +r.getAttribute('height')! >= (s as SVGSVGElement).viewBox.baseVal.height - 0.01) };
  });
  await page.getByTestId('pl-mat-mica').click(); await page.waitForTimeout(200);
  const lm = await layersOf();
  expect(lm.In && lm.cut).toBe(true); expect(lm.holes).toBe(4); expect(lm.chu).toBeGreaterThan(0); expect(lm.bg).toBe(true);
  await page.getByTestId('pl-mat-alu').click(); await page.waitForTimeout(200);
  const la = await layersOf();
  expect(la.chu).toBe(0); expect(la.bg).toBe(false);
  await page.getByTestId('pl-mat-mica').click(); await page.waitForTimeout(200);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const svg = fs.readFileSync(await grab('pl-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Khoan"');
  expect(svg).toContain('id="ChuNoi"');
  expect((svg.match(/<text/g) || []).length, 'SVG in phải outline hết chữ').toBe(0);
  const pdf = fs.readFileSync(await grab('pl-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const prev = fs.readFileSync(await grab('pl-png'));
  expect(prev.readUInt32BE(16)).toBe(1600);

  // 3D: dựng được mọi vật liệu, ảnh 3D 1600px
  await page.getByTestId('tab-3d').click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__plSnap), { timeout: 30_000 }).toBe(true);
  for (const m of ['mica', 'alu', 'inox', 'inoxGold', 'wood']) {
    await page.getByTestId(`pl-mat-${m}`).click();
    await page.waitForTimeout(300);
    const url: string = await page.evaluate(() => (window as any).__plSnap(800, 600));
    fs.writeFileSync(path.join(OUT, `3d-${m}.png`), Buffer.from(url.split(',')[1], 'base64'));
    expect(url.length).toBeGreaterThan(20_000);
  }
  await page.waitForTimeout(1500);
  const p3 = fs.readFileSync(await grab('pl-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
