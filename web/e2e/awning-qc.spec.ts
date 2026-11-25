import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Mái hiên: mọi mẫu × 3 bề ngang — chữ nằm gọn trong hộp (không lấn mép diềm/viền), không đè, chữ diềm đủ lớn đọc từ phố;
// chia khổ vải đúng công thức; chữ rất dài vẫn gọn; logo hiện; tải PDF/SVG (outline, có CutContour/Seam)/PNG/ảnh 3D; 3D đủ 3 loại.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'awning');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.evaluate(async () => {
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const bad: string[] = [], overlaps: string[] = [];
    let valMin = Infinity, n = 0;
    for (const svg of [...document.querySelectorAll('svg[data-piece]')] as SVGSVGElement[]) {
      const vb = svg.viewBox.baseVal;
      const texts = [...svg.querySelectorAll('text[data-awt]')] as SVGTextElement[];
      const boxes = texts.map((t) => {
        const b = t.getBBox();
        const [x, y, w, h] = (t.getAttribute('data-box') || '0,0,0,0').split(',').map(Number);
        const tol = Math.max(2, h * 0.03);
        n++;
        if (b.x < x - tol || b.y < y - tol || b.x + b.width > x + w + tol || b.y + b.height > y + h + tol) bad.push(`${t.textContent} ngoài hộp`);
        if (b.x < -1 || b.y < -1 || b.x + b.width > vb.width + 1 || b.y + b.height > vb.height + 1) bad.push(`${t.textContent} lòi khỏi mảnh ${svg.dataset.piece}`);
        if (t.dataset.awt === 'val-brand') valMin = Math.min(valMin, parseFloat(t.getAttribute('font-size') || '0'));
        return { s: t.textContent || '', b };
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b, b = boxes[j].b;
        const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        if ((ix * iy) / Math.max(1, Math.min(a.width * a.height, b.width * b.height)) > 0.05) overlaps.push(`${boxes[i].s} ⨯ ${boxes[j].s}`);
      }
    }
    return { n, bad, overlaps, valMin };
  });
  expect(r.n, `${label}: có chữ`).toBeGreaterThanOrEqual(1);
  expect(r.bad, `${label}: chữ lòi`).toEqual([]);
  expect(r.overlaps, `${label}: chữ đè`).toEqual([]);
  return r;
}

test('Mái hiên: mọi mẫu × bề ngang, chia khổ, tải file, 3D', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/awning');
  const tpl = page.getByTestId('aw-tpl');
  await expect(tpl.first()).toBeVisible({ timeout: 120_000 });
  const names = await tpl.locator('div.truncate').allInnerTexts();
  expect(names.length).toBeGreaterThanOrEqual(10);

  for (const w of ['2 m', '4 m', '6 m']) {
    await page.getByTestId('aw-width').filter({ hasText: new RegExp(`^${w}$`) }).click();
    for (const name of names) {
      await tpl.filter({ hasText: name }).click();
      const r = await audit(page, `${name} @ ${w}`);
      // chữ tên quán trên diềm đủ lớn đọc từ phố (≥ 80mm cỡ chữ, trừ layout lặp/tách đã chia nhỏ hộp)
      expect(r.valMin, `${name} @ ${w}: chữ diềm quá nhỏ`).toBeGreaterThanOrEqual(w === '2 m' ? 45 : 60);
    }
  }

  // chia khổ vải: n = ceil((W + 2·40) / (khổ − 30))
  await page.getByTestId('aw-width').filter({ hasText: /^5 m$/ }).click();
  for (const [roll, label] of [[1200, '1.2 m'], [1500, '1.5 m'], [3200, '3.2 m']] as const) {
    await page.getByTestId('aw-roll').filter({ hasText: new RegExp(`^${label.replace('.', '\\.')}$`) }).click();
    const n = Math.ceil((5000 + 80) / (roll - 30));
    await expect(page.getByTestId('aw-info')).toContainText(`${n} khổ vải`);
    await expect.poll(() => page.locator('[data-testid="aw-sheet-preview"] #Seam line').count()).toBe(n - 1);
  }

  // chữ rất dài + logo
  await page.getByTestId('aw-brand').fill('NHÀ HÀNG HẢI SẢN TƯƠI SỐNG GIA KHÁNH QUẬN BÌNH THẠNH');
  await page.getByTestId('aw-slogan').fill('Hải sản tươi sống mỗi ngày – đặt bàn tiệc, liên hoan, sinh nhật, giao tận nơi');
  await page.getByTestId('aw-hotline').fill('0909 123 456 – 0912 345 678');
  const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('aw-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png1 });
  for (const lay of ['Tên giữa', 'Tên + slogan', 'Tên | hotline', 'Lặp tên']) {
    await page.getByTestId('aw-layout').filter({ hasText: lay }).click();
    for (const cn of ['Mái để trơn', 'Huy hiệu logo trên mái', 'In tên lớn trên mái']) {
      await page.getByTestId('aw-canopy').filter({ hasText: cn }).click();
      await audit(page, `chữ dài · ${lay} · ${cn}`);
    }
  }
  // logo hiện trong huy hiệu diềm (Tên giữa) và trên mái (Huy hiệu logo)
  await page.getByTestId('aw-layout').filter({ hasText: 'Tên giữa' }).click();
  await page.getByTestId('aw-canopy').filter({ hasText: 'Huy hiệu logo trên mái' }).click();
  await expect.poll(() => page.locator('svg[data-piece] image').count()).toBeGreaterThanOrEqual(2);

  // tải file
  await page.getByTestId('tab-flat').click();
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return fs.readFileSync(p);
  };
  const pdf = await grab('aw-pdf');
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = (await grab('aw-svg')).toString('utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="Seam"');
  expect(svg).toMatch(/width="[\d.]+mm"/);
  expect((svg.match(/<text/g) || []).length).toBe(0);
  const png = await grab('aw-png');
  expect(png.readUInt32BE(16)).toBe(2400);
  await page.getByTestId('aw-front').screenshot({ path: path.join(OUT, 'front-chu-dai.png') });

  // 3D cả 3 loại
  for (const name of ['Cà phê sọc nâu', 'Tiệm bánh vòm hồng', 'Tiệm bánh kiểu Pháp']) {
    await tpl.filter({ hasText: name }).click();
    await page.waitForTimeout(600);
    const u = await page.evaluate(() => (window as unknown as { __awSnap: (w: number, h: number) => Promise<string> }).__awSnap(1200, 900));
    const buf = Buffer.from(u.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(60_000);
    fs.writeFileSync(path.join(OUT, `3d-${names.indexOf(name)}.png`), buf);
  }
  await page.getByTestId('tab-3d').click();
  const d3 = await grab('aw-3dpng');
  expect(d3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
