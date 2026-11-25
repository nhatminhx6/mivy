import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Nhãn tên học sinh: mọi chủ đề × 2 kiểu nền — chữ nằm gọn trong từng nhãn (tròn: trong vòng tròn), không đè nhau,
// cỡ chữ tối thiểu; đủ 54 nhãn + 54 CutContour; tên rất dài vẫn gọn; nhiều bé → nhiều tờ / nhiều trang PDF; tải file; 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'namelabel');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: string[] = [];
    const svg = document.querySelector('[data-testid="nl-preview"] svg') as SVGSVGElement;
    const groups = Array.from(svg.querySelectorAll('[data-nl]')) as SVGGElement[];
    let minSize = 99;
    for (const g of groups) {
      const type = g.getAttribute('data-nl')!;
      const shape = g.querySelector('[data-shape]') as SVGGraphicsElement;
      const sb = shape.getBoundingClientRect();
      const texts = Array.from(g.querySelectorAll('text[data-nl-text]')) as SVGTextElement[];
      const boxes = texts.map((t) => ({ t, b: t.getBoundingClientRect() }));
      for (const { t, b } of boxes) {
        minSize = Math.min(minSize, parseFloat(t.getAttribute('font-size') || '0'));
        const tol = 0.5;
        if (b.left < sb.left - tol || b.right > sb.right + tol || b.top < sb.top - tol || b.bottom > sb.bottom + tol) out.push(`${type}: chữ "${t.textContent}" lòi khỏi nhãn`);
        if (type === 'round') {
          const cx = (sb.left + sb.right) / 2, cy = (sb.top + sb.bottom) / 2, R = (sb.right - sb.left) / 2;
          // chiều rộng chữ thật (không tính khoảng trống trên/dưới của hộp font) phải nằm trong vòng tròn
          const ink = { l: b.left, r: b.right, t: b.top + b.height * 0.2, b: b.bottom - b.height * 0.2 };
          for (const [x, y] of [[ink.l, ink.t], [ink.r, ink.t], [ink.l, ink.b], [ink.r, ink.b]]) if (Math.hypot(x - cx, y - cy) > R + 0.5) out.push(`tròn: chữ "${t.textContent}" ra ngoài vòng`);
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, b = boxes[j].b;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 0.5 && oy > Math.min(a.height, b.height) * 0.25) out.push(`${type}: "${boxes[i].t.textContent}" đè "${boxes[j].t.textContent}"`);
      }
    }
    return { out: [...new Set(out)].slice(0, 6), n: groups.length, minSize };
  });
  expect(r.n, `${label}: đủ 54 nhãn`).toBe(54);
  expect(r.out, `${label}: ${r.out.join(' | ')}`).toEqual([]);
  expect(r.minSize, `${label}: cỡ chữ nhỏ nhất ${r.minSize}mm`).toBeGreaterThanOrEqual(1.8);
}

test('Nhãn tên học sinh: mọi chủ đề, chữ dài, nhiều bé, file in–cắt, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/namelabel');
  const tpls = page.getByTestId('nl-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();
  const preview = page.getByTestId('nl-preview');

  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    await audit(page, `mẫu ${i}`);
    for (const style of ['solid', 'light']) {
      await page.getByTestId('nl-styles').locator('button').nth(style === 'solid' ? 0 : 1).click();
      await page.waitForTimeout(150);
      await audit(page, `mẫu ${i} · ${style}`);
    }
    if (i % 3 === 0) await preview.screenshot({ path: path.join(OUT, `nl-mau-${String(i + 1).padStart(2, '0')}.png`) });
  }

  // tên rất dài + trường dài, đổi font
  await tpls.first().click();
  await page.getByTestId('nl-in-name').fill('Nguyễn Hoàng Bảo Ngọc Thiên Kim');
  await page.getByTestId('nl-in-school').fill('Trường Tiểu học Nguyễn Bỉnh Khiêm Quận Một');
  await page.getByTestId('nl-in-cls').fill('Lớp 5A3 – Bán trú');
  const fonts = page.getByTestId('nl-fonts').locator('button');
  for (let f = 0; f < await fonts.count(); f++) {
    await fonts.nth(f).click();
    await page.waitForTimeout(200);
    await audit(page, `tên dài · font ${f}`);
  }
  await preview.screenshot({ path: path.join(OUT, 'nl-ten-dai.png') });

  // ảnh bé → nhãn tròn/nhãn lớn có <image>
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGElEQVR4nGP8z8Dwn4EIwMjIyMjAwAAAJ+QD/2NqsboAAAAASUVORK5CYII=', 'base64');
  await page.getByTestId('nl-photo').setInputFiles({ name: 'be.png', mimeType: 'image/png', buffer: png });
  await expect(preview.locator('[data-nl="round"] image').first()).toBeAttached({ timeout: 10_000 });
  await audit(page, 'có ảnh');

  // print sheet: đủ CutContour, không có chữ lòi
  const cuts = await page.evaluate(() => document.querySelectorAll('[data-testid="nl-print"] svg[data-nl-sheet="print"] #CutContour path').length);
  expect(cuts).toBe(54);

  // nhiều bé
  await page.getByTestId('nl-in-name').fill('Gia Khánh');
  await page.locator('summary, button').filter({ hasText: 'Nhiều bé' }).first().click().catch(() => null);
  await page.getByTestId('nl-batch').fill('Gia Khánh | Lớp 2A\nBảo Ngọc | Lớp 4B | TH Hoà Bình\nAn Nhiên | Mầm non Lá | MN Hoa Sen | 0912 000 111');
  await expect(page.getByTestId('nl-kid-pick').locator('option')).toHaveCount(3);
  await page.getByTestId('nl-kid-pick').selectOption('1');
  await expect(preview.locator('[data-nl-title]')).toContainText('Bảo Ngọc');
  await audit(page, 'bé 2');
  expect(await page.evaluate(() => document.querySelectorAll('[data-testid="nl-print"] svg[data-nl-sheet="print"]').length)).toBe(3);

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('nl-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);
  const zipP = await grab('nl-svg');
  expect(zipP.endsWith('.zip')).toBe(true);
  const zip = fs.readFileSync(zipP).toString('latin1');
  expect((zip.match(/id="CutContour"/g) || []).length).toBe(3);
  expect(zip.includes('<text')).toBe(false);

  // 1 bé → 1 file SVG
  await page.getByTestId('nl-batch').fill('');
  const svgP = await grab('nl-svg');
  expect(svgP.endsWith('.svg')).toBe(true);
  const svg = fs.readFileSync(svgP, 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect(svg).not.toContain('<text');
  const pngP = await grab('nl-png');
  expect(fs.readFileSync(pngP).readUInt32BE(16)).toBe(1600);

  // 3D
  await page.getByTestId('tab-3d').click();
  await page.waitForFunction(() => typeof (window as unknown as { __nlSnap?: unknown }).__nlSnap === 'function', null, { timeout: 30_000 });
  for (const t of [0, 1, 7]) {
    await tpls.nth(t).click();
    await page.waitForTimeout(500);
    const u = await page.evaluate(() => (window as unknown as { __nlSnap: (w: number, h: number) => Promise<string> }).__nlSnap(1200, 900));
    expect(u.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `nl-3d-${t}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.waitForTimeout(3000);
  const p3 = await grab('nl-3d');
  expect(fs.readFileSync(p3).readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
