import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Hộp ống tròn: mọi mẫu × mọi kích thước × 2 kiểu nắp → chữ nằm trong vùng an toàn (mặt trước/sau thân, băng nắp,
// tem mặt nắp), không chồng nhau, không nhỏ hơn 1.5mm; chữ dài; logo; file in (CutContour, Fold, outline), PDF 1–2 trang
// (ép kim), PNG 2400px, 3D chụp được, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tube');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const bad: string[] = [];
    const rects: { part: string; x0: number; y0: number; x1: number; y1: number; t: string }[] = [];
    for (const part of ['body', 'lid', 'top']) {
      const svg = document.querySelector(`[data-testid="tb-tex-${part}"] svg`) as SVGSVGElement | null;
      if (!svg) { bad.push(`thiếu ${part}`); continue; }
      svg.querySelectorAll('g[data-zone]').forEach((z) => {
        const zone = z.getAttribute('data-zone')!;
        z.querySelectorAll('text').forEach((t) => {
          const b = (t as SVGTextElement).getBBox();
          const fs = parseFloat(t.getAttribute('font-size') || '0');
          const txt = (t.textContent || '').slice(0, 24);
          if (fs < 1.5) bad.push(`${zone}: chữ nhỏ ${fs.toFixed(2)}mm "${txt}"`);
          if (b.width < 0.01) return;
          if (zone === 'top') {
            const cx = +z.getAttribute('data-cx')!, cy = +z.getAttribute('data-cy')!, rr = +z.getAttribute('data-r')!;
            for (const [x, y] of [[b.x, b.y + b.height * 0.2], [b.x + b.width, b.y + b.height * 0.2], [b.x, b.y + b.height * 0.85], [b.x + b.width, b.y + b.height * 0.85]]) {
              if (Math.hypot(x - cx, y - cy) > rr + 0.3) { bad.push(`top: chữ ra ngoài vòng "${txt}"`); break; }
            }
          } else {
            const x0 = +z.getAttribute('data-x0')!, x1 = +z.getAttribute('data-x1')!, y0 = +z.getAttribute('data-y0')!, y1 = +z.getAttribute('data-y1')!;
            if (b.x < x0 - 0.6 || b.x + b.width > x1 + 0.6 || b.y < y0 - 0.6 || b.y + b.height > y1 + 0.6) bad.push(`${zone}: lòi khỏi vùng "${txt}" [${b.x.toFixed(1)},${b.y.toFixed(1)},${(b.x + b.width).toFixed(1)},${(b.y + b.height).toFixed(1)}] ⊄ [${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}]`);
          }
          rects.push({ part, x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height, t: txt });
        });
      });
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], c = rects[j];
      if (a.part !== c.part) continue;
      const w = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), h = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (w > 0.3 && h > 0.3) bad.push(`${a.part}: chồng chữ "${a.t}" × "${c.t}"`);
    }
    const n = document.querySelectorAll('[data-testid="tb-tex-body"] svg text').length;
    return { bad, n };
  });
  expect(r.bad, `${label}: ${r.bad.slice(0, 4).join(' ; ')}`).toEqual([]);
  expect(r.n, `${label}: phải có chữ`).toBeGreaterThan(5);
}

test('Hộp ống tròn: mọi mẫu × kích thước × kiểu nắp, chữ dài, logo, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tube');
  const tpls = page.getByTestId('tb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  const sizes = page.locator('[data-testid="tb-sizes"] button');
  const nS = await sizes.count();

  for (let i = 0; i < nT; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(120);
    await audit(page, `mẫu ${i}`);
    for (let s = 0; s < nS; s++) {
      await sizes.nth(s).click();
      await page.waitForTimeout(60);
      await audit(page, `mẫu ${i} cỡ ${s}`);
    }
    // đổi kiểu nắp
    const other = (await page.getByTestId('tb-style-lid').getAttribute('class'))?.includes('indigo') ? 'tb-style-neck' : 'tb-style-lid';
    await page.getByTestId(other).click();
    await page.waitForTimeout(60);
    await audit(page, `mẫu ${i} nắp khác`);
  }

  // chữ rất dài trên ống nhỏ nhất + ống cao nhất
  await tpls.nth(0).click();
  await page.getByTestId('tb-brand').fill('CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ TRÀ ĐẶC SẢN AN KHANG');
  await page.getByTestId('tb-name').fill('Trà Sen Bách Diệp Ướp Thủ Công Theo Công Thức Gia Truyền Tây Hồ');
  await page.getByTestId('tb-desc').fill('Ướp sen thủ công · Búp chè Thái Nguyên chọn lọc · Đóng gói tại xưởng · Không chất bảo quản · Hộp quà biếu Tết sang trọng');
  await page.getByTestId('tb-ingredients').fill('Chè xanh Thái Nguyên 95%, hương sen Tây Hồ tự nhiên 5%, không phẩm màu, không hương liệu tổng hợp, không chất bảo quản, đạt chuẩn VietGAP.');
  await page.getByTestId('tb-origin').fill('Sản xuất và đóng gói tại Việt Nam bởi Công ty TNHH Thương mại Dịch vụ Trà Đặc sản An Khang, 123 đường Hoàng Văn Thụ, TP. Thái Nguyên.');
  for (const id of ['c60', 'p70', 't75', 'w90']) {
    await page.getByTestId(`tb-size-${id}`).click();
    for (const st of ['lid', 'neck']) {
      await page.getByTestId(`tb-style-${st}`).click();
      await page.waitForTimeout(80);
      await audit(page, `chữ dài ${id} ${st}`);
    }
  }
  await page.locator('[data-testid="tb-tex-body"]').screenshot({ path: path.join(OUT, 'tube-chu-dai.png') }).catch(() => null);

  // logo
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR4nGNgGAWjYBSMglEwCkbBYAP/GRgY/jMwMPxnYGBg+M/AwPCfgYHhPwMDAwMAJ0QD/WUVK1QAAAAASUVORK5CYII=', 'base64');
  await page.getByTestId('tb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="tb-tex-body"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('[data-testid="tb-tex-top"] svg image')).toHaveCount(1);
  await audit(page, 'có logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  await tpls.nth(0).click(); // mẫu ép kim
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="tb-mask"] svg')).toHaveCount(1);
  const pdfFoil = fs.readFileSync(await grab('tb-pdf'));
  expect(pdfFoil.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdfFoil.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 'ép kim → 2 trang').toBe(2);
  await page.getByTestId('tb-foil').uncheck();
  await page.waitForTimeout(200);
  const pdf1 = fs.readFileSync(await grab('tb-pdf'));
  expect((pdf1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 'không ép kim → 1 trang').toBe(1);
  const svg = fs.readFileSync(await grab('tb-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Fold"');
  expect(svg).not.toMatch(/<text[\s>]/);
  const pngOut = fs.readFileSync(await grab('tb-png'));
  expect(pngOut.readUInt32BE(16)).toBe(2400);

  // 3D: chụp mặc định + nút tải
  for (const i of [0, 2, 4]) {
    await tpls.nth(i).click();
    await page.waitForTimeout(500);
    const u = await page.evaluate(() => (window as unknown as { __tubeSnap: (w: number, h: number) => Promise<string> }).__tubeSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `tube-3d-${i}.png`), Buffer.from(u.split(',')[1], 'base64'));
    expect(u.length).toBeGreaterThan(50_000);
  }
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  const shot3d = fs.readFileSync(await grab('tb-3d'));
  expect(shot3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
