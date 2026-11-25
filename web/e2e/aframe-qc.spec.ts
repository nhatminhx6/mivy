import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bảng chữ A: mọi mẫu × khổ × 2 mặt — chữ nằm trong mặt in, không đè nhau, không quá nhỏ (nhìn từ xa);
// mặt sau đổi bố cục; nội dung dài; ảnh + logo; tải PNG/PDF 2 trang/ảnh 3D; 3D dựng được; không lỗi trang.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'aframe');
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const res: { face: string; out: string[]; overlap: string[]; tiny: string[]; n: number }[] = [];
    for (const id of ['af-src-front', 'af-src-back']) {
      const svg = document.querySelector(`[data-testid="${id}"] svg`) as SVGSVGElement;
      const W = +svg.getAttribute('data-w')!, H = +svg.getAttribute('data-h')!;
      const boxes = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim()).map((t) => {
        const b = (t as SVGTextElement).getBBox();
        // getBBox gồm cả khoảng ascent/descent của font → co 18% chiều cao để so đè chữ cho thật
        const sh = b.height * 0.18;
        return { t: t.textContent!, x: b.x, y: b.y + sh, w: b.width, h: b.height - sh * 2, rawH: b.height };
      });
      const out = boxes.filter((b) => b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1).map((b) => b.t);
      const overlap: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ix > 1 && iy > 1 && ix * iy > 0.12 * Math.min(a.w * a.h, c.w * c.h)) overlap.push(`${a.t} × ${c.t}`);
      }
      const tiny = boxes.filter((b) => b.rawH < 9).map((b) => `${b.t} (${b.rawH.toFixed(1)}mm)`);
      res.push({ face: id, out, overlap, tiny, n: boxes.length });
    }
    return res;
  });
  for (const f of r) {
    expect(f.n, `${label} ${f.face}: có chữ`).toBeGreaterThan(4);
    expect(f.out, `${label} ${f.face}: chữ lòi khỏi mặt in`).toEqual([]);
    expect(f.overlap, `${label} ${f.face}: chữ đè nhau`).toEqual([]);
    expect(f.tiny, `${label} ${f.face}: chữ quá nhỏ`).toEqual([]);
  }
}

test('Bảng chữ A: mọi mẫu × khổ × 2 mặt, mặt sau, nội dung dài, ảnh, tải file, 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/aframe');
  const tpls = page.getByTestId('af-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);
  const sizes = page.locator('[data-testid="af-sizes"] button');

  // mọi mẫu × mọi khổ
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < n; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      await audit(page, `khổ ${s} mẫu ${i}`);
    }
  }

  // mặt sau: đổi qua mọi bố cục (mẫu đầu, khổ 60×90)
  await sizes.first().click(); await tpls.first().click();
  const backs = page.locator('[data-testid="af-back"] button');
  for (let b = 0; b < await backs.count(); b++) {
    await backs.nth(b).click(); await page.waitForTimeout(120);
    await audit(page, `mặt sau ${b}`);
  }

  // ảnh flat 2 mặt để soi
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('af-flat').screenshot({ path: path.join(OUT, 'af-flat.png') });

  // nội dung rất dài trên mọi bố cục mặt trước
  await page.getByTestId('af-brand').fill('NHÀ HÀNG HẢI SẢN TƯƠI SỐNG BIỂN XANH QUỐC BẢO VÀ THU HÀ');
  await page.getByTestId('af-tagline').fill('Hải sản tươi sống mỗi ngày · nhận đặt tiệc · giao tận nơi trong bán kính năm cây số');
  await page.getByTestId('af-menu').fill(Array.from({ length: 10 }, (_, i) => `Món đặc biệt số ${i + 1} sốt me chua ngọt kiểu miền Tây | ${120 + i * 15}K`).join('\n'));
  const fronts = page.locator('[data-testid="af-front"] button');
  for (let f = 0; f < await fronts.count(); f++) {
    await fronts.nth(f).click(); await page.waitForTimeout(150);
    await audit(page, `dài · mặt trước ${f}`);
  }
  await page.getByTestId('af-flat').screenshot({ path: path.join(OUT, 'af-long.png') });

  // ảnh món + logo (tạo ảnh trong trang, không cần file mẫu)
  const png = async (w: number, h: number, c1: string, c2: string) => Buffer.from((await page.evaluate(([w, h, c1, c2]) => {
    const c = document.createElement('canvas'); c.width = +w; c.height = +h;
    const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, +w, +h); g.addColorStop(0, String(c1)); g.addColorStop(1, String(c2));
    x.fillStyle = g; x.fillRect(0, 0, +w, +h); return c.toDataURL('image/png').split(',')[1];
  }, [w, h, c1, c2] as const)), 'base64');
  await fronts.nth(1).click(); // khuyến mãi có ô ảnh
  await page.getByTestId('af-photo').setInputFiles({ name: 'mon.png', mimeType: 'image/png', buffer: await png(900, 600, '#E76F51', '#F4A261') });
  await page.getByTestId('af-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await png(300, 300, '#264653', '#2A9D8F') });
  await expect(page.locator('[data-testid="af-src-front"] svg image')).toHaveCount(2, { timeout: 10_000 });
  await audit(page, 'có ảnh + logo');

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return fs.readFileSync(p);
  };
  const pf = await grab('af-png-front');
  expect(pf.readUInt32BE(16)).toBe(1400);
  const pb = await grab('af-png-back');
  expect(pb.readUInt32BE(16)).toBe(1400);
  const pdf = await grab('af-pdf');
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);

  // 3D: khung xem + ảnh 3D + chụp mọi kiểu khung
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const p3 = await grab('af-3d');
  expect(p3.readUInt32BE(16)).toBe(1600);
  const frames = page.locator('[data-testid="af-frames"] button');
  for (let fi = 0; fi < await frames.count(); fi++) {
    await frames.nth(fi).click();
    const url = await page.evaluate(() => (window as unknown as { __afSnap: (w: number, h: number) => Promise<string> }).__afSnap(800, 1000));
    expect(url.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(OUT, `af-3d-khung-${fi}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }

  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
