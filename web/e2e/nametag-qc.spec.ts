import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng tên cài áo: mọi mẫu × khổ × hình dáng — chữ nằm trong tấm (kể cả bo tròn/oval), không chồng nhau, đủ lớn;
// danh sách 30 người → đủ 30 bảng trên tờ sản xuất; file SVG/PDF/PNG/3D tải được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'nametag');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="nt-preview"] svg') as SVGSVGElement;
    const plate = svg.querySelector('path[data-nt-plate]') as SVGPathElement;
    const pt = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return plate.isPointInFill(p); };
    const texts = Array.from(svg.querySelectorAll('text[data-nt-text]')) as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox(); const fs = +t.getAttribute('font-size')!; const by = +t.getAttribute('y')!;
      // thân chữ theo đường cơ sở (bbox SVG gồm cả khoảng dòng của font)
      return { key: t.getAttribute('data-nt-text')!, size: +t.getAttribute('data-nt-size')!, x: b.x, w: b.width, y1: by - fs * 0.72, y2: by + fs * 0.08, txt: t.textContent };
    });
    const bad: string[] = [];
    for (const b of boxes) {
      const inset = 0.2;
      const corners: [number, number][] = [[b.x + inset, b.y1], [b.x + b.w - inset, b.y1], [b.x + inset, b.y2], [b.x + b.w - inset, b.y2]];
      if (corners.some(([x, y]) => !pt(x, y))) bad.push(`ra ngoài tấm: ${b.key} "${b.txt}"`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.x < c.x + c.w - 0.1 && c.x < a.x + a.w - 0.1 && a.y1 < c.y2 - 0.1 && c.y1 < a.y2 - 0.1) bad.push(`chồng: "${a.txt}" × "${c.txt}"`);
    }
    // logo/icon không đè chữ
    const lg = svg.querySelector('[data-nt-logo]') as SVGGraphicsElement | null;
    if (lg) {
      // bbox logo quy về toạ độ svg (icon nằm trong <g transform>)
      const bb = lg.getBBox(); const m = svg.getScreenCTM()!.inverse().multiply(lg.getScreenCTM()!);
      const P = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m); };
      const a1 = P(bb.x, bb.y), a2 = P(bb.x + bb.width, bb.y + bb.height);
      const l = { x: Math.min(a1.x, a2.x), y: Math.min(a1.y, a2.y), width: Math.abs(a2.x - a1.x), height: Math.abs(a2.y - a1.y) };
      for (const b of boxes) if (b.key !== 'brand' && l.x < b.x + b.w - 0.2 && b.x < l.x + l.width - 0.2 && l.y < b.y2 - 0.2 && b.y1 < l.y + l.height - 0.2) bad.push(`logo đè chữ "${b.txt}"`);
    }
    const name = boxes.filter((b) => b.key === 'name').map((b) => b.size);
    const others = boxes.filter((b) => b.key !== 'name').map((b) => b.size);
    return { bad, n: boxes.length, nameMin: Math.min(...name), otherMin: others.length ? Math.min(...others) : 9 };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(1);
  expect(r.nameMin, `${label}: tên quá nhỏ`).toBeGreaterThanOrEqual(2.1);
  expect(r.otherMin, `${label}: chữ phụ quá nhỏ`).toBeGreaterThanOrEqual(1.3);
}

test('Bảng tên cài áo: mẫu × khổ × hình dáng, danh sách 30 người, file sản xuất, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/nametag');
  await expect(page.getByTestId('nt-tpl').first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();

  const tpls = page.getByTestId('nt-tpl');
  const nt = await tpls.count();
  expect(nt).toBeGreaterThanOrEqual(10);
  const shapes = page.locator('[data-testid="nt-shapes"] button');
  const sizes = page.getByTestId('nt-size');
  for (let i = 0; i < nt; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    await audit(page, `mẫu ${i}`);
    await page.getByTestId('nt-preview').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
    for (let s = 0; s < await shapes.count(); s++) {
      await shapes.nth(s).click();
      for (let z = 0; z < await sizes.count(); z++) {
        await sizes.nth(z).click(); await page.waitForTimeout(60);
        await audit(page, `mẫu ${i} hình ${s} khổ ${z}`);
      }
    }
  }

  // tên + chức vụ rất dài, song ngữ, mọi bố cục × hình dáng
  await tpls.nth(0).click();
  await page.getByTestId('nt-people').fill('Nguyễn Hoàng Phương Bảo Ngọc Anh Thư | Chuyên viên quan hệ khách hàng doanh nghiệp cao cấp | Senior Corporate Relationship Manager');
  await page.getByTestId('nt-brand').fill('NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN AN KHANG VIỆT NAM');
  await page.getByTestId('nt-bilingual').check();
  const layouts = page.locator('[data-testid="nt-layouts"] button');
  for (let l = 0; l < await layouts.count(); l++) {
    await layouts.nth(l).click();
    for (let s = 0; s < await shapes.count(); s++) {
      await shapes.nth(s).click(); await page.waitForTimeout(80);
      await audit(page, `chữ dài bố cục ${l} hình ${s}`);
    }
  }
  await page.getByTestId('nt-preview').screenshot({ path: path.join(OUT, 'chu-dai.png') });

  // logo: khắc laser → mask 1 màu; in UV → ảnh gốc
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DwnwEJMDGgAQBPhQEDwW5V8wAAAABJRU5ErkJggg==', 'base64');
  await layouts.nth(0).click(); await shapes.nth(0).click();
  await page.getByTestId('nt-mat-gold').click();
  await page.getByTestId('nt-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="nt-preview"] svg mask image')).toHaveCount(1, { timeout: 10_000 });
  await page.getByTestId('nt-mat-micaWhite').click();
  await expect(page.locator('[data-testid="nt-preview"] svg > image, [data-testid="nt-preview"] svg g > image')).toHaveCount(1, { timeout: 10_000 });

  // danh sách 30 người → 30 bảng, 2 tờ A4 (70×20: 16 bảng/tờ)
  const list = Array.from({ length: 30 }, (_, i) => `Nhân viên ${['Quốc Bảo', 'Thu Hà', 'Gia Khánh', 'Bảo Ngọc', 'Hoàng Long'][i % 5]} ${i + 1} | Giao dịch viên | Teller`).join('\n');
  await page.getByTestId('nt-people').fill(list);
  await page.getByTestId('nt-size').first().click();
  await page.waitForTimeout(400);
  const sh = await page.evaluate(() => ({
    sheets: document.querySelectorAll('[data-testid="nt-sheets"] svg[data-nt-sheet]').length,
    labels: document.querySelectorAll('[data-testid="nt-sheets"] [data-nt-label]').length,
    cuts: document.querySelectorAll('[data-testid="nt-sheets"] #CutContour').length,
  }));
  expect(sh.labels).toBe(30);
  expect(sh.sheets).toBe(2);
  expect(sh.cuts).toBe(30);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('nt-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zipP = await grab('nt-svg');
  expect(zipP.endsWith('.zip')).toBe(true);
  const zip = fs.readFileSync(zipP).toString('latin1');
  expect(zip).toContain('id="CutContour"');
  expect((zip.match(/<text/g) || []).length, 'SVG sản xuất phải outline hết chữ').toBe(0);

  // khắc laser, 1 tờ: SVG có lớp Khac + Khung, không còn <text>
  await page.getByTestId('nt-people').fill('Trần Quốc Bảo | Giao dịch viên | Teller\nLê Thu Hà | Chuyên viên | Advisor');
  await page.getByTestId('nt-mat-silver').click(); await page.waitForTimeout(300);
  const svg = fs.readFileSync(await grab('nt-svg'), 'utf8');
  expect(svg).toContain('id="Khac"');
  expect(svg).toContain('id="Khung"');
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const p1 = fs.readFileSync(await grab('nt-png'));
  expect(p1.readUInt32BE(16)).toBe(1600);

  // 3D: mọi chất liệu × 2 mặt sau
  await page.getByTestId('tab-3d').click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__ntSnap), { timeout: 30_000 }).toBe(true);
  const backs = page.locator('[data-testid="nt-backs"] button');
  for (const m of ['gold', 'silver', 'blackGold', 'metalUV', 'micaWhite', 'micaBlack', 'wood']) {
    await page.getByTestId(`nt-mat-${m}`).click();
    await backs.nth(m === 'micaWhite' || m === 'blackGold' ? 1 : 0).click();
    await page.waitForTimeout(300);
    const url: string = await page.evaluate(() => (window as any).__ntSnap(900, 675));
    fs.writeFileSync(path.join(OUT, `3d-${m}.png`), Buffer.from(url.split(',')[1], 'base64'));
    expect(url.length).toBeGreaterThan(30_000);
  }
  await page.waitForTimeout(1500);
  const p3 = fs.readFileSync(await grab('nt-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
