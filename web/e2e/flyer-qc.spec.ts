import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Tờ rơi: mọi mẫu × 2 mặt — chữ nằm gọn trong khổ (cách mép ≥1.5mm), các khối chữ không đè nhau; nội dung dài vẫn vừa;
// đổi khổ A4/A6 đúng tỉ lệ; ảnh khách vào ô ảnh; tải PDF 2 trang / PNG / SVG outline; xem 3D không lỗi.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'flyer');
const SIZES: Record<string, [number, number]> = { a5: [148, 210], a4: [210, 297], a6: [105, 148] };

async function audit(page: Page, label: string, wMm: number) {
  const r = await page.evaluate((wMm) => {
    const out: string[] = [];
    for (const id of ['fl-front', 'fl-back']) {
      const svg = document.querySelector(`[data-testid="${id}"] svg`) as SVGSVGElement | null;
      if (!svg) continue;
      const box = svg.getBoundingClientRect();
      const inset = (box.width * 1.5) / wMm;
      const texts = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim());
      if (!texts.length) out.push(`${id}: không có chữ`);
      const rects = texts.map((t) => ({ t: t.textContent || '', r: t.getBoundingClientRect() }));
      for (const { t, r } of rects) {
        if (r.left < box.left + inset - 0.5 || r.right > box.right - inset + 0.5 || r.top < box.top + inset * 0.4 - 0.5 || r.bottom > box.bottom - inset * 0.4 + 0.5)
          out.push(`${id}: "${t}" tràn mép (${Math.round(r.left - box.left)},${Math.round(r.top - box.top)} → ${Math.round(r.right - box.left)},${Math.round(r.bottom - box.top)} / ${Math.round(box.width)}×${Math.round(box.height)})`);
      }
      // đè chữ: so "mực" thật của dòng (đường chân chữ − 0.75em … + 0.1em), không so hộp em (font cao như Oswald có hộp em rất cao)
      const ink = texts.map((t) => {
        const m = t.getScreenCTM()!;
        const fs = parseFloat(getComputedStyle(t).fontSize) * Math.abs(m.d);
        const base = new DOMPoint(0, Number(t.getAttribute('y') || 0)).matrixTransform(m).y;
        const r = t.getBoundingClientRect();
        return { left: r.left, right: r.right, top: base - fs * 0.75, bottom: base + fs * 0.1, width: r.width, height: fs * 0.85 };
      });
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = ink[i], b = ink[j];
        const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const small = Math.min(a.width * a.height, b.width * b.height) || 1;
        if ((ix * iy) / small > 0.04) out.push(`${id}: "${rects[i].t}" đè "${rects[j].t}"`);
      }
    }
    return out;
  }, wMm);
  expect(r, label).toEqual([]);
}

// ảnh soi: ghép mọi mẫu (thumbnail dùng đúng nội dung đang điền) + mặt sau thành 1 tấm lớn
async function gallery(page: Page, file: string) {
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'qc-gal';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#d9d9d9;display:flex;flex-wrap:wrap;gap:8px;padding:8px;overflow:hidden';
    const svgs = [...document.querySelectorAll('[data-testid="fl-tpl"] svg'), document.querySelector('[data-testid="fl-back"] svg')].filter(Boolean) as SVGSVGElement[];
    svgs.forEach((s) => { const c = s.cloneNode(true) as SVGSVGElement; c.style.cssText = 'width:340px;height:auto;display:block;background:#fff'; d.appendChild(c); });
    document.body.appendChild(d);
  });
  await page.setViewportSize({ width: 1440, height: 1530 });
  await page.screenshot({ path: path.join(OUT, file) });
  await page.evaluate(() => document.getElementById('qc-gal')?.remove());
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('Tờ rơi: mọi mẫu, nội dung dài, đổi khổ, ảnh, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/flyer');
  const tpls = page.getByTestId('fl-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  // mặc định mở tab 3D → khung 3D phải lên (canvas WebGL)
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  const preview = page.locator('[data-testid="fl-front"]').locator('..').locator('..');

  // 1) mọi mẫu, nội dung mẫu theo ngành, 2 mặt
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(120);
    await audit(page, `mẫu ${i}`, 148);
    await preview.screenshot({ path: path.join(OUT, `fl-${String(i + 1).padStart(2, '0')}.png`) });
  }

  await gallery(page, 'fl-gallery.png');

  // 2) nội dung dài / nhiều dòng — mọi bố cục vẫn gọn
  const long: Record<string, string> = {
    brand: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ GIA KHÁNH',
    eyebrow: 'ƯU ĐÃI ĐẶC BIỆT DÀNH CHO KHÁCH HÀNG THÂN THIẾT',
    title: 'Chào mừng khai trương cơ sở thứ ba với hàng loạt ưu đãi cực kỳ hấp dẫn',
    highlight: 'GIẢM GIÁ ĐẾN 70% TOÀN BỘ',
    subtitle: 'Từ thứ Hai 01/12 đến hết Chủ nhật 31/12 · 7:00 – 22:00 mỗi ngày',
    bullets: 'Tặng voucher 100.000đ cho hoá đơn từ 500.000đ trở lên\nMiễn phí giao hàng nội thành TP.HCM\nTích điểm đổi quà cực kỳ hấp dẫn\nBốc thăm trúng thưởng xe máy\nQuà tặng cho 200 khách đầu tiên\nGiảm thêm 10% khi thanh toán chuyển khoản',
    prices: Array.from({ length: 10 }, (_, k) => `Dịch vụ chăm sóc đặc biệt số ${k + 1} | ${(k + 1) * 150}.000đ`).join('\n'),
    address: 'Tầng 3, toà nhà Sài Gòn Center, 65 Lê Lợi, P. Bến Nghé, Q.1, TP. Hồ Chí Minh',
    website: 'https://www.facebook.com/giakhanhspa.chinhanh3',
    phone: '0909 123 456 – 028 3822 1234',
  };
  for (const [k, v] of Object.entries(long)) await page.getByTestId(`fl-${k}`).fill(v);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(120);
    await audit(page, `mẫu ${i} chữ dài`, 148);
  }
  await gallery(page, 'fl-long-gallery.png');
  // vẫn quét được QR (có ô trắng + path)
  await expect(page.locator('[data-testid="fl-back"] [data-qr="1"] path')).toHaveCount(2);

  // 3) đổi khổ: tỉ lệ đúng, chữ vẫn gọn
  for (const id of ['a4', 'a6']) {
    await page.getByTestId('fl-size').filter({ hasText: id.toUpperCase() }).click();
    await page.waitForTimeout(150);
    const ratio = await page.locator('[data-testid="fl-front"] svg').evaluate((s: SVGSVGElement) => s.viewBox.baseVal.height / s.viewBox.baseVal.width);
    expect(Math.abs(ratio - SIZES[id][1] / SIZES[id][0])).toBeLessThan(0.01);
    await audit(page, `khổ ${id}`, SIZES[id][0]);
  }
  await page.getByTestId('fl-size').filter({ hasText: 'A5' }).click();

  // 4) ảnh khách vào ô ảnh (không có ảnh → không có <image>)
  await expect(page.locator('[data-testid="fl-front"] svg image')).toHaveCount(0);
  await page.getByTestId('fl-photo').setInputFiles(path.join(__dirname, '..', 'public', 'test-raw', 'ao-hoodie-1.jpg'));
  await expect(page.locator('[data-testid="fl-front"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await tpls.nth(0).click();
  await preview.screenshot({ path: path.join(OUT, 'fl-photo.png') });

  // 5) tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('fl-pdf')).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 'PDF 2 mặt = 2 trang').toBe(2);
  const png = fs.readFileSync(await grab('fl-png'));
  expect(png.readUInt32BE(16)).toBe(1600);
  const svg = fs.readFileSync(await grab('fl-svg'), 'utf8');
  expect(svg).toContain('<path');
  expect((svg.match(/<text/g) || []).length, 'SVG in: chữ đã outline').toBe(0);

  // 1 mặt → PDF 1 trang
  await page.getByTestId('fl-sides-1').click();
  await expect(page.locator('[data-testid="fl-back"]')).toHaveCount(0);
  const pdf1 = fs.readFileSync(await grab('fl-pdf')).toString('latin1');
  expect((pdf1.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(1);

  // 6) quay lại 3D sau khi đổi nhiều thứ: vẫn dựng được
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.getByTestId('mockup-3d').screenshot({ path: path.join(OUT, 'fl-3d.png') });
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
