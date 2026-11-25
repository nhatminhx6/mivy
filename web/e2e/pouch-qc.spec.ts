import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Túi zip đứng: mọi mẫu × 2 mặt — chữ nằm trong vùng an toàn (không lấn mép hàn 2 bên, khoá zip, đáy gấp),
// chữ không đè nhau; đổi chất liệu / cửa sổ / khổ / chữ dài vẫn gọn; tải PDF + SVG file in + ảnh 3D; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'pouch');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const res: { side: string; bad: string[]; overlaps: string[]; n: number }[] = [];
    for (const id of ['pc-front', 'pc-back']) {
      const svg = document.querySelector(`[data-testid="${id}"] svg`) as SVGSVGElement;
      const [sx0, sy0, sx1, sy1] = (svg.getAttribute('data-safe') || '').split(' ').map(Number);
      const vb = svg.viewBox.baseVal, R = svg.getBoundingClientRect();
      const k = vb.width / R.width;
      const toU = (b: DOMRect) => ({ x0: vb.x + (b.left - R.left) * k, y0: vb.y + (b.top - R.top) * k, x1: vb.x + (b.right - R.left) * k, y1: vb.y + (b.bottom - R.top) * k });
      const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('[data-guides]') && (t.textContent || '').trim());
      const bad: string[] = [], overlaps: string[] = [];
      const boxes = texts.map((t) => ({ t: (t.textContent || '').slice(0, 24), u: toU(t.getBoundingClientRect()), g: t.parentElement }));
      for (const b of boxes) {
        const { x0, y0, x1, y1 } = b.u;
        if (x0 < sx0 - 0.3 || x1 > sx1 + 0.3 || y0 < sy0 - 0.3 || y1 > sy1 + 0.6) bad.push(`"${b.t}" [${x0.toFixed(1)},${y0.toFixed(1)} → ${x1.toFixed(1)},${y1.toFixed(1)}] safe [${sx0},${sy0} → ${sx1},${sy1}]`);
      }
      // chữ khác khối không được đè nhau (co hộp 22% theo chiều cao vì hộp chữ gồm cả khoảng trống dấu)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.g === b.g) continue;
        const sh = (u: typeof a.u) => { const h = u.y1 - u.y0; return { ...u, y0: u.y0 + h * 0.22, y1: u.y1 - h * 0.22 }; };
        const A = sh(a.u), B = sh(b.u);
        const ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), iy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
        if (ix > 0.4 && iy > 0.4) overlaps.push(`"${a.t}" × "${b.t}"`);
      }
      res.push({ side: id, bad, overlaps, n: texts.length });
    }
    return res;
  });
  for (const s of r) {
    expect(s.n, `${label} ${s.side}: có chữ`).toBeGreaterThan(3);
    expect(s.bad, `${label} ${s.side}: chữ lấn vùng hàn/zip/đáy`).toEqual([]);
    expect(s.overlaps, `${label} ${s.side}: chữ đè nhau`).toEqual([]);
  }
}

test('Túi zip: mọi mẫu 2 mặt, chất liệu, cửa sổ, khổ, chữ dài, tải file', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/pouch');
  const tpls = page.getByTestId('pc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const sizes = page.getByTestId('pc-size');
  // ảnh thành phẩm 3D mẫu (góc mặc định): dừng xoay → đổi khổ qua lại để canh lại góc → chụp
  await page.locator('[data-testid="mockup-3d"] canvas').click({ position: { x: 6, y: 6 } });
  for (const [i, name] of [[0, '3d-ca-phe-mang-bac.png'], [1, '3d-kraft-cua-so.png'], [7, '3d-mang-trong.png']] as const) {
    await tpls.nth(i).click(); await page.waitForTimeout(1200);
    await sizes.nth(2).click(); await page.waitForTimeout(900); await sizes.nth(1).click(); await page.waitForTimeout(3000);
    fs.copyFileSync(await grab('pc-png'), path.join(OUT, name));
  }
  await page.getByTestId('tab-flat').click();
  const pv = page.locator('[data-testid="pc-front"]').locator('xpath=../../..');

  // chụp 2 mặt cỡ lớn để soi bằng mắt: tạm phóng khung xem trước rồi trả lại
  const shot = async (name: string) => {
    await pv.evaluate((el) => { (el as HTMLElement).dataset.css = (el as HTMLElement).style.cssText; Object.assign((el as HTMLElement).style, { position: 'fixed', left: '0', top: '0', width: '1300px', zIndex: '99', background: '#fff', padding: '8px' }); });
    await page.waitForTimeout(80);
    await pv.screenshot({ path: path.join(OUT, name) });
    await pv.evaluate((el) => { (el as HTMLElement).style.cssText = (el as HTMLElement).dataset.css || ''; });
  };
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    await audit(page, `mẫu ${i}`);
    await shot(`tpl-${String(i + 1).padStart(2, '0')}.png`);
  }

  // chất liệu × cửa sổ trên 1 mẫu
  await tpls.nth(3).click();
  for (const m of ['foil', 'white', 'matte', 'kraft', 'clear']) {
    await page.getByTestId(`pc-mat-${m}`).click();
    for (const w of ['none', 'oval', 'rect', 'arch']) {
      const b = page.getByTestId(`pc-win-${w}`);
      if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(120); await audit(page, `${m}/${w}`); }
    }
  }
  await page.getByTestId('pc-mat-white').click();
  // khổ + lỗ treo + van
  await page.getByTestId('pc-euro').click();
  await page.getByTestId('pc-valve').click();
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click(); await page.waitForTimeout(150);
    for (const t of [0, 4, 8]) { await tpls.nth(t).click(); await page.waitForTimeout(120); await audit(page, `khổ ${s} mẫu ${t}`); }
  }
  // chữ dài
  await sizes.first().click();
  await page.getByTestId('pc-name').fill('Cà phê Arabica Cầu Đất rang xay nguyên chất đặc biệt hảo hạng');
  await page.getByTestId('pc-brand').fill('CÔNG TY CỔ PHẦN NÔNG SẢN AN KHANG');
  await page.getByTestId('pc-badges').fill('Không chất bảo quản nhân tạo\nRang mộc thủ công truyền thống\nNguồn gốc rõ ràng');
  await page.getByTestId('pc-usage').fill('Pha phin: 20g cà phê với 70ml nước sôi 92–95°C, ủ 4–5 phút. Pha máy: xay mịn, 18g cho 1 shot espresso 36ml trong 28 giây. Cold brew: 100g cà phê xay thô ngâm 1 lít nước lạnh 16 giờ.');
  for (let t = 0; t < n; t++) { await tpls.nth(t).click(); await page.waitForTimeout(150); await audit(page, `chữ dài mẫu ${t}`); }
  await shot('chu-dai.png');

  // tải file
  const pdf = fs.readFileSync(await grab('pc-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(80_000);
  const svg = fs.readFileSync(await grab('pc-svg'), 'utf8');
  expect(svg).toContain('data-sheet');
  expect((svg.match(/<text/g) || []).length, 'SVG file in: chữ đã outline').toBeLessThan(5);
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const png = fs.readFileSync(await grab('pc-png'));
  expect(png.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
