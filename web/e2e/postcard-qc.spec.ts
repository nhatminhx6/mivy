import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Postcard: mọi mẫu × 2 mặt — chữ nằm trong khổ (cách mép ≥2mm), khối chữ không đè nhau; mọi khổ/hướng; nội dung dài;
// bộ bưu thiếp đủ số tấm; ảnh khách; tải PNG 2 mặt + PDF (mỗi tấm 2 trang) + ảnh 3D; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'postcard');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: string[] = [];
    const svgs = [...document.querySelectorAll('[data-testid="pc-front"] > svg, [data-testid="pc-back"] > svg, [data-testid="pc-set-front"] > svg')] as SVGSVGElement[];
    for (const svg of svgs) {
      const id = svg.getAttribute('data-side') || '?';
      const box = svg.getBoundingClientRect();
      const vbw = svg.viewBox.baseVal.width;
      const k = box.width / vbw; // px / mm
      const inset = 2 * k;
      const texts = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim());
      if (!texts.length) out.push(`${id}: không có chữ`);
      const ink = texts.map((t) => {
        const m = t.getScreenCTM()!;
        const fs = parseFloat(getComputedStyle(t).fontSize) * Math.abs(m.d);
        const base = new DOMPoint(Number(t.getAttribute('x') || 0), Number(t.getAttribute('y') || 0)).matrixTransform(m).y;
        const rr = t.getBoundingClientRect();
        return { t: t.textContent || '', left: rr.left, right: rr.right, top: base - fs * 0.75, bottom: base + fs * 0.12, w: rr.width, h: fs * 0.87, fsMm: fs / k };
      });
      for (const a of ink) {
        if (a.left < box.left + inset - 0.5 || a.right > box.right - inset + 0.5 || a.top < box.top + inset - 0.5 || a.bottom > box.bottom - inset + 0.5)
          out.push(`${id}: "${a.t}" tràn mép`);
        if (a.fsMm < 1.4) out.push(`${id}: "${a.t}" chữ quá nhỏ ${a.fsMm.toFixed(2)}mm`);
      }
      for (let i = 0; i < ink.length; i++) for (let j = i + 1; j < ink.length; j++) {
        const a = ink[i], b = ink[j];
        const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const small = Math.min(a.w * a.h, b.w * b.h) || 1;
        if ((ix * iy) / small > 0.06) out.push(`${id}: "${a.t}" đè "${b.t}"`);
      }
    }
    return out;
  });
  expect(r, label).toEqual([]);
}

async function gallery(page: Page, file: string) {
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'qc-gal';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#d9d9d9;display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-content:flex-start';
    const svgs = [...document.querySelectorAll('[data-testid="pc-tpl"] div > svg'), document.querySelector('[data-testid="pc-back"] > svg')].filter(Boolean) as SVGSVGElement[];
    svgs.forEach((s) => { const c = s.cloneNode(true) as SVGSVGElement; c.style.cssText = 'width:340px;height:auto;display:block;background:#fff'; d.appendChild(c); });
    document.body.appendChild(d);
  });
  await page.setViewportSize({ width: 1440, height: 1300 });
  await page.screenshot({ path: path.join(OUT, file) });
  await page.evaluate(() => document.getElementById('qc-gal')?.remove());
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('Postcard: mọi mẫu, khổ, bộ, ảnh, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/postcard');
  const tpls = page.getByTestId('pc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(12);

  // 1) mọi mẫu × 2 mặt
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(150);
    await audit(page, `mẫu ${i}`);
  }
  await gallery(page, 'pc-all.png');

  // 2) mọi khổ × hướng (mẫu retro + mẫu shop)
  for (const ti of [2, 9]) {
    await tpls.nth(ti).click();
    const sizes = page.getByTestId('pc-size');
    for (let s = 0; s < await sizes.count(); s++) {
      await sizes.nth(s).click();
      for (const o of ['land', 'port']) {
        const b = page.getByTestId(`pc-orient-${o}`);
        if (await b.count()) await b.click();
        await page.waitForTimeout(120);
        await audit(page, `mẫu ${ti} khổ ${s} ${o}`);
      }
    }
  }
  await page.getByTestId('pc-size').first().click();
  await page.getByTestId('pc-orient-land').click();

  // 3) nội dung dài (mặt sau cổ điển in lời nhắn + shop)
  await tpls.nth(0).click();
  await page.getByTestId('pc-title').fill('Phố cổ Hội An lung linh đèn lồng mùa trăng rằm tháng Giêng');
  await page.getByTestId('pc-caption').fill('Di sản văn hoá thế giới · Quảng Nam · Việt Nam');
  await page.getByTestId('pc-printmsg').check();
  await page.getByTestId('pc-message').fill('Gửi Thu Hà thân mến, chuyến đi lần này thật nhiều kỷ niệm: đèn lồng, sông Hoài, bánh mì Phượng và những buổi chiều thả đèn hoa đăng. Hẹn bạn mùa sau đi cùng nhé!');
  await page.getByTestId('pc-credit').fill('Bộ bưu thiếp Việt Nam · Lữ Quán An Khang · ankhang.vn · 0909 123 456');
  await page.waitForTimeout(200);
  await audit(page, 'chữ dài cổ điển');
  await tpls.nth(9).click();
  await page.getByTestId('pc-thanks').fill('Cảm ơn bạn đã tin tưởng và ủng hộ An Khang Handmade suốt thời gian qua!');
  await page.getByTestId('pc-social').fill('@ankhang.handmade · fb.com/ankhanghandmade');
  await page.waitForTimeout(200);
  await audit(page, 'chữ dài shop');
  await page.screenshot({ path: path.join(OUT, 'pc-long.png') });

  // 4) ảnh khách ở mặt trước
  await tpls.nth(0).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwnwEJMDEwMDAAACAuAgFrhfWbAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('pc-photo').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid="pc-front"] svg image')).toHaveCount(1, { timeout: 10_000 });

  // 5) bộ bưu thiếp: mẫu bộ 6 → 6 tấm, PDF 12 trang
  await tpls.nth(7).click();
  await expect(page.getByTestId('pc-set-front')).toHaveCount(6);
  await audit(page, 'bộ 6 tấm');
  await expect(page.getByTestId('pc-pdf')).toHaveAttribute('data-pages', '12');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf12 = fs.readFileSync(await grab('pc-pdf'));
  expect(pdf12.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf12.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(12);

  // 6) 1 tấm: PDF 2 trang, PNG 2 mặt 1800px
  await tpls.nth(1).click();
  await expect(page.getByTestId('pc-pdf')).toHaveAttribute('data-pages', '2');
  const pdf2 = fs.readFileSync(await grab('pc-pdf'));
  expect((pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  for (const id of ['pc-png-front', 'pc-png-back']) {
    const b = fs.readFileSync(await grab(id));
    expect(b.readUInt32BE(16)).toBe(1800);
  }

  // 7) 3D: chụp ở góc mặc định (1 tấm + bộ) + nút tải ảnh 3D
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  for (const [ti, name] of [[0, 'pc-3d-hoian.png'], [7, 'pc-3d-bo6.png'], [9, 'pc-3d-shop.png']] as const) {
    await tpls.nth(ti).click();
    await page.waitForTimeout(2000);
    const url = await page.evaluate(() => (window as unknown as { __pcSnap: (w: number, h: number) => Promise<string> }).__pcSnap(1400, 1050));
    fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  }
  const img3d = fs.readFileSync(await grab('pc-3d'));
  expect(img3d.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
