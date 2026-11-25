import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Bộ bài in logo: 54 lá đủ + đúng số pip, mặt lưng đối xứng xoay 180° (so điểm ảnh), chữ không lòi khỏi lá/ mặt hộp,
// 3 kiểu mặt bài, chữ dài + logo, tải PDF 55 trang / khuôn hộp PDF + SVG (CutContour, Fold, không còn <text>) / PNG / 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'playingcards');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function textsInside(page: Page, sel: string) {
  return page.evaluate((s) => {
    const bad: string[] = [];
    document.querySelectorAll(s).forEach((svg) => {
      const r = (svg as SVGSVGElement).getBoundingClientRect();
      svg.querySelectorAll('[data-pc-text]').forEach((t) => {
        const b = (t as SVGGraphicsElement).getBoundingClientRect();
        if (!b.width) return;
        if (b.left < r.left - 0.5 || b.right > r.right + 0.5 || b.top < r.top - 0.5 || b.bottom > r.bottom + 0.5) bad.push(`${(t.textContent || '').slice(0, 20)}`);
      });
    });
    return bad;
  }, sel);
}

// mặt lưng vẽ ra canvas → so từng điểm với điểm đối xứng tâm
async function backSymmetry(page: Page) {
  return page.evaluate(async () => {
    const svg = document.querySelector('[data-testid="pc-back"] svg') as SVGSVGElement;
    const src = new XMLSerializer().serializeToString(svg);
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); await im.decode();
    const W = 252, H = 352;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d')!; x.drawImage(im, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data;
    let sum = 0, big = 0, n = 0;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const i = (y * W + xx) * 4, j = ((H - 1 - y) * W + (W - 1 - xx)) * 4;
      const df = Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
      sum += df; if (df > 90) big++; n++;
    }
    return { mean: sum / n / 3, bigFrac: big / n };
  });
}

test('Bộ bài: 54 lá + pip, mặt lưng đối xứng 180°, kiểu mặt, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/playingcards');
  const tpls = page.getByTestId('pc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  expect(await tpls.count()).toBeGreaterThanOrEqual(8);
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('pc-show-all').click();
  await expect(page.getByTestId('pc-card')).toHaveCount(54);

  // mọi mẫu: mặt lưng đối xứng + chữ trong lá
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(250);
    const sym = await backSymmetry(page);
    expect(sym.mean, `mẫu ${i}: mặt lưng lệch đối xứng (mean ${sym.mean.toFixed(2)})`).toBeLessThan(2.5);
    expect(sym.bigFrac, `mẫu ${i}: mặt lưng lệch đối xứng`).toBeLessThan(0.01);
    expect(await textsInside(page, '[data-testid="pc-back"] svg, [data-testid="pc-all"] svg'), `mẫu ${i}: chữ lòi khỏi lá`).toEqual([]);
    await page.getByTestId('pc-flat').screenshot({ path: path.join(OUT, `mau-${String(i).padStart(2, '0')}.png`) });
  }

  // đủ 54 lá + đúng số pip mỗi lá số
  const pips = await page.evaluate(() => [...document.querySelectorAll('[data-testid="pc-card"]')].map((el) => ({ k: el.getAttribute('data-card')!, n: el.querySelectorAll('[data-pip]').length })));
  expect(new Set(pips.map((p) => p.k)).size).toBe(54);
  for (const p of pips) {
    if (p.k.startsWith('J-')) continue;
    const rank = p.k.slice(0, -1);
    const want = rank === 'A' ? 1 : ['J', 'Q', 'K'].includes(rank) ? 0 : Number(rank);
    expect(p.n, `${p.k}: số pip`).toBe(want);
  }

  // 3 kiểu mặt bài
  const faces = page.getByTestId('pc-faces').locator('button');
  for (let i = 0; i < await faces.count(); i++) {
    await faces.nth(i).click();
    await page.waitForTimeout(200);
    expect(await textsInside(page, '[data-testid="pc-all"] svg')).toEqual([]);
    await page.getByTestId('pc-all').screenshot({ path: path.join(OUT, `kieu-mat-${i}.png`) });
  }

  // chữ dài + logo
  await page.getByTestId('pc-brand').fill('CÔNG TY TNHH AN KHANG PHÁT ĐẠT');
  await page.getByTestId('pc-slogan').fill('Chúc Mừng Năm Mới · Vạn Sự Như Ý · Xuân Đinh Mùi');
  await page.getByTestId('pc-web').fill('www.ankhangphatdat.com.vn');
  await page.getByTestId('pc-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(page.locator('[data-testid="pc-back"] svg image')).toHaveCount(2, { timeout: 10_000 });
  for (let i = 0; i < await tpls.count(); i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(150);
    expect(await textsInside(page, '[data-testid="pc-back"] svg, [data-testid="pc-flat"] svg[data-pc-box]'), `mẫu ${i} chữ dài`).toEqual([]);
    // chữ dài 2 dòng: khử răng cưa chữ xoay 180° lệch vài điểm ảnh — phần hình vẫn đối xứng tuyệt đối
    expect((await backSymmetry(page)).bigFrac).toBeLessThan(0.03);
    // chữ trên từng mặt hộp nằm gọn trong mặt đó
    const boxBad = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('[data-testid="pc-flat"] svg[data-pc-box] [data-pc-panel]').forEach((g) => {
        const r = g.querySelector('rect')!.getBoundingClientRect();
        g.querySelectorAll('[data-pc-text]').forEach((t) => {
          const b = t.getBoundingClientRect();
          if (b.width && (b.left < r.left - 0.5 || b.right > r.right + 0.5 || b.top < r.top - 0.5 || b.bottom > r.bottom + 0.5)) bad.push(`${g.getAttribute('data-pc-panel')}: ${(t.textContent || '').slice(0, 24)}`);
        });
      });
      return bad;
    });
    expect(boxBad, `mẫu ${i}: chữ lòi khỏi mặt hộp`).toEqual([]);
  }
  await page.getByTestId('pc-flat').screenshot({ path: path.join(OUT, 'chu-dai-logo.png') });

  // tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 240_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const pdf = fs.readFileSync(await grab('pc-pdf')).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 'PDF 55 trang').toBe(55);
  const boxPdf = fs.readFileSync(await grab('pc-box-pdf')).toString('latin1');
  expect(boxPdf.startsWith('%PDF')).toBe(true);
  const boxSvg = fs.readFileSync(await grab('pc-box-svg'), 'utf8');
  expect(boxSvg).toContain('id="CutContour"');
  expect(boxSvg).toContain('id="Fold"');
  expect(boxSvg).not.toContain('<text');
  const png = fs.readFileSync(await grab('pc-png'));
  expect(png.readUInt32BE(16)).toBe(1200);

  // 3D
  await page.getByTestId('tab-3d').click();
  await page.waitForFunction(() => !!(window as unknown as { __pcSnap?: unknown }).__pcSnap);
  for (const i of [0, 1, 5]) {
    await tpls.nth(i).click(); await page.waitForTimeout(300);
    const u = await page.evaluate(() => (window as unknown as { __pcSnap: (w: number, h: number) => Promise<string> }).__pcSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${i}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.waitForTimeout(2500);
  const shot = fs.readFileSync(await grab('pc-3d'));
  expect(shot.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
