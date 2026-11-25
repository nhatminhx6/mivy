import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Băng keo in logo: mọi mẫu × mọi khổ — chữ nằm gọn trong bề rộng băng keo, số màu mực đúng số khách chọn (flexo),
// đổi số màu, logo 1 màu, tải PNG / PDF / SVG (chữ outline) / ảnh 3D, không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'tape');

async function audit(page: Page, label: string) {
  await page.waitForTimeout(150);
  const r = await page.locator('[data-testid="tp-unit"] svg').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal; const box = svg.getBoundingClientRect(); const k = box.width / vb.width;
    const texts = [...svg.querySelectorAll('#In text')].filter((t) => !t.closest('mask') && (t.textContent || '').trim());
    const out: string[] = []; let minF = 99;
    for (const t of texts) {
      const b = t.getBoundingClientRect();
      const y0 = (b.top - box.top) / k, y1 = (b.bottom - box.top) / k, x0 = (b.left - box.left) / k, x1 = (b.right - box.left) / k;
      // khung chữ (em-box) nới 0.6mm; dấu tiếng Việt nằm trong em-box
      if (y0 < -0.6 || y1 > vb.height + 0.6 || x0 < -0.5 || x1 > vb.width + 0.5) out.push(`${t.textContent} y[${y0.toFixed(1)},${y1.toFixed(1)}] x[${x0.toFixed(1)},${x1.toFixed(1)}]`);
      minF = Math.min(minF, parseFloat(t.getAttribute('font-size') || '99'));
    }
    const cols = new Set<string>();
    svg.querySelectorAll('#In *').forEach((el) => {
      if (el.closest('mask,clipPath,defs')) return;
      for (const a of ['fill', 'stroke']) { const v = el.getAttribute(a); if (v && v !== 'none' && !v.startsWith('url(')) cols.add(v.toUpperCase()); }
    });
    return { out, minF, cols: [...cols], n: texts.length, W: vb.height };
  });
  const inkRows = await page.locator('[data-testid="tp-inks"] > div').count();
  expect(r.n, `${label}: có chữ`).toBeGreaterThan(0);
  expect(r.out, `${label}: chữ tràn khổ`).toEqual([]);
  expect(r.minF, `${label}: chữ quá nhỏ`).toBeGreaterThan(2.2);
  expect(r.cols.length, `${label}: số màu mực ${r.cols.join(',')} > ${inkRows}`).toBeLessThanOrEqual(inkRows);
  return r;
}

test('Băng keo in logo: mọi mẫu × khổ, màu mực, logo, tải file', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/tape');
  const tpls = page.getByTestId('tp-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('mockup-3d').locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);
  const widths = page.locator('[data-testid="tp-widths"] button');

  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    for (let w = 0; w < await widths.count(); w++) {
      await widths.nth(w).click();
      const r = await audit(page, `mẫu ${i} khổ ${w}`);
      expect([48, 60, 72]).toContain(r.W);
    }
  }
  await widths.first().click();

  // nội dung dài vẫn gọn
  await tpls.first().click();
  await page.getByTestId('tp-brand').fill('CỬA HÀNG MỸ PHẨM THIÊN NHIÊN AN KHANG');
  await page.getByTestId('tp-slogan').fill('Cảm ơn bạn đã tin tưởng và ủng hộ shop mình rất nhiều nha!');
  for (let i = 0; i < n; i++) { await tpls.nth(i).click(); await audit(page, `chữ dài mẫu ${i}`); }

  // mẫu 3 màu → đổi về 1 màu: chỉ còn 1 màu mực
  await tpls.nth(10).click();
  expect((await audit(page, 'hoạ tiết 3 màu')).cols.length).toBe(3);
  await page.locator('[data-testid="tp-inkcount"] button').first().click();
  expect((await audit(page, 'hoạ tiết 1 màu')).cols.length).toBe(1);

  // logo → bóng 1 màu (vẫn không thêm màu)
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 120); x.fillStyle = '#c0392b'; x.beginPath(); x.arc(60, 60, 45, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#123'; x.fillRect(115, 25, 70, 70);
    return c.toDataURL('image/png').split(',')[1];
  });
  await tpls.first().click();
  await page.getByTestId('tp-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect.poll(() => page.locator('[data-testid="tp-unit"] svg mask image').count(), { timeout: 10_000 }).toBeGreaterThan(0);
  await audit(page, 'có logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pngF = fs.readFileSync(await grab('tp-png'));
  expect(pngF.readUInt32BE(16)).toBe(2400);
  const pdf = fs.readFileSync(await grab('tp-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const svg = fs.readFileSync(await grab('tp-svg'), 'utf8');
  expect(svg).toContain('id="In"');
  expect(svg).toContain('id="VachLap"');
  expect((svg.match(/<text/g) || []).length, 'SVG in: chữ phải outline hết').toBe(0);
  const p3 = fs.readFileSync(await grab('tp-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // ảnh 3D lớn để soi (góc mặc định)
  await page.getByRole('button', { name: 'Bỏ logo' }).click();
  await page.getByTestId('tp-brand').fill('AN KHANG STORE');
  await page.getByTestId('tp-slogan').fill('Cảm ơn bạn đã ủng hộ shop!');
  for (const i of [0, 2, 3, 9]) {
    await tpls.nth(i).click(); await page.waitForTimeout(600);
    const url = await page.evaluate(() => (window as unknown as { __tapeSnap: (w: number, h: number) => Promise<string> }).__tapeSnap(1600, 1200));
    fs.writeFileSync(path.join(OUT, `tape-3d-${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('tp-flat').screenshot({ path: path.join(OUT, 'tape-flat.png') });
  expect(errors).toEqual([]);
});
