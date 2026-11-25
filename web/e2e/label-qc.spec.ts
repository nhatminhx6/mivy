import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Nhãn chai · hũ · lọ: mọi mẫu × vật chứa × kiểu nhãn — chữ nằm trong nhãn, không chồng nhau, cỡ chữ đủ đọc,
// kích thước nhãn đúng chu vi vật chứa, mã vạch đúng số kiểm tra, file in có CutContour, tải file đủ, 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'label');

// r, gap theo label-engine (nhãn quấn = 2πr − gap)
const CONT: Record<string, { r: number; gap: number }> = {
  pet500: { r: 32.5, gap: -8 }, glass250: { r: 29, gap: 8 }, glass500: { r: 35, gap: 10 }, wine750: { r: 38, gap: 30 },
  jar500: { r: 39, gap: 10 }, jarpl: { r: 34, gap: 8 }, dropper30: { r: 16, gap: 6 }, can330: { r: 33, gap: -6 },
};

async function audit(page: Page, label: string) {
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const out: { part: string; w: number; h: number; bad: string[]; overlaps: string[]; minFs: number; barcodes: string[] }[] = [];
    document.querySelectorAll('[data-testid^="lb-tex-"] svg[data-part]').forEach((svg) => {
      const s = svg as SVGSVGElement;
      const w = +s.getAttribute('data-w')!, h = +s.getAttribute('data-h')!, round = s.getAttribute('data-part') === 'cap';
      const bad: string[] = [], overlaps: string[] = [];
      let minFs = 99;
      const boxes: { b: DOMRect; t: string; g: Element | null }[] = [];
      s.querySelectorAll('text').forEach((t) => {
        const tx = (t.textContent || '').trim(); if (!tx) return;
        const b = (t as SVGTextElement).getBBox();
        // bbox theo toạ độ nhãn (text nằm trong <g> không transform)
        const fs = parseFloat(getComputedStyle(t).fontSize);
        minFs = Math.min(minFs, fs);
        const tol = 0.6;
        if (round) {
          const cx = w / 2, R = w / 2 - 0.4;
          for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
            if (Math.hypot(x - cx, y - cx) > R + tol) { bad.push(`${tx.slice(0, 24)} ngoài nhãn tròn`); break; }
          }
        } else if (b.x < 0.6 - tol || b.y < 0.6 - tol || b.x + b.width > w - 0.6 + tol || b.y + b.height > h - 0.6 + tol) {
          bad.push(`${tx.slice(0, 24)} (${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)}×${b.height.toFixed(1)}) / ${w}×${h}`);
        }
        boxes.push({ b, t: tx, g: t.parentElement });
      });
      // chồng chữ: 2 dòng khác nhau giao nhau > 35% diện tích dòng nhỏ (bbox có cả khoảng trên/dưới dấu → nới)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i].b, B = boxes[j].b;
        const ix = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const iy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        if (ix <= 0 || iy <= 0) continue;
        const small = Math.min(A.width * A.height, B.width * B.height);
        if ((ix * iy) / small > 0.35) overlaps.push(`"${boxes[i].t.slice(0, 18)}" × "${boxes[j].t.slice(0, 18)}"`);
      }
      const barcodes = [...s.querySelectorAll('[data-barcode]')].map((e) => e.getAttribute('data-barcode')!);
      out.push({ part: s.getAttribute('data-part')!, w, h, bad, overlaps, minFs, barcodes });
    });
    return out;
  });
  expect(r.length, `${label}: có nhãn`).toBeGreaterThan(0);
  for (const p of r) {
    expect(p.bad, `${label} · ${p.part}: chữ ra ngoài nhãn`).toEqual([]);
    expect(p.overlaps, `${label} · ${p.part}: chữ chồng nhau`).toEqual([]);
    expect(p.minFs, `${label} · ${p.part}: chữ quá nhỏ`).toBeGreaterThanOrEqual(0.84);
    for (const d of p.barcodes) {
      const sum = [...d.slice(0, 12)].reduce((s, ch, i) => s + Number(ch) * (i % 2 ? 3 : 1), 0);
      expect(Number(d[12]), `${label}: số kiểm tra EAN-13`).toBe((10 - (sum % 10)) % 10);
    }
  }
  return r;
}

test('Nhãn chai · hũ · lọ: mọi mẫu, vật chứa, kiểu nhãn, file in, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/label');
  const tpls = page.getByTestId('lb-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 90_000 });
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(12);

  // 1) mọi mẫu
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click();
    await audit(page, `mẫu ${i}`);
  }
  await page.getByTestId('tab-flat').click();
  await page.getByTestId('lb-flat').screenshot({ path: path.join(OUT, 'flat-last.png') });

  // 2) mọi vật chứa × 2 kiểu nhãn + nhãn nắp / cổ: kích thước đúng chu vi
  await tpls.first().click();
  for (const id of Object.keys(CONT)) {
    await page.getByTestId(`lb-c-${id}`).click();
    for (const st of ['wrap', 'frontback']) {
      await page.getByTestId(`lb-style-${st}`).click();
      for (const extra of ['lb-cap', 'lb-neck']) {
        const btn = page.getByTestId(extra);
        if (await btn.isEnabled() && !(await btn.innerText()).startsWith('✓')) await btn.click();
      }
      const parts = await audit(page, `${id} · ${st}`);
      if (st === 'wrap') {
        const wrap = parts.find((p) => p.part === 'wrap')!;
        const want = 2 * Math.PI * CONT[id].r - CONT[id].gap;
        expect(Math.abs(wrap.w - want), `${id}: dài nhãn quấn ${wrap.w} ≠ ${want.toFixed(1)}`).toBeLessThan(0.6);
      } else {
        expect(parts.map((p) => p.part)).toEqual(expect.arrayContaining(['front', 'back']));
      }
    }
  }

  // 3) nội dung rất dài + chất liệu
  await tpls.nth(0).click();
  await page.getByTestId('lb-name').fill('Mật ong rừng U Minh nguyên chất thượng hạng đặc biệt');
  await page.getByTestId('lb-tagline').fill('Khai thác thủ công từ rừng tràm U Minh Hạ, không pha trộn, không đường');
  await page.getByTestId('lb-ingredients').fill('100% mật ong rừng tràm. '.repeat(6));
  await page.getByTestId('lb-maker').fill('Hợp tác xã nuôi ong An Khang — ấp 3, xã Khánh Thuận, huyện U Minh, tỉnh Cà Mau, Việt Nam');
  for (const m of ['paper', 'milky', 'clear', 'kraft']) {
    await page.getByTestId(`lb-mat-${m}`).click();
    for (const id of ['dropper30', 'jar500', 'glass250']) {
      await page.getByTestId(`lb-c-${id}`).click();
      await audit(page, `dài · ${m} · ${id}`);
    }
  }
  await page.getByTestId('lb-mat-clear').click();
  await page.getByTestId('lb-white').check();
  await audit(page, 'decal trong + lót trắng');
  expect(await page.locator('[data-testid^="lb-tex-"] [data-plate]').count()).toBeGreaterThan(0);

  // 4) logo khách
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVR42mNkYPhfz0AEYBxVSF+FjP///ydKIYMBAEoXBg7v5S3cAAAAAElFTkSuQmCC', 'base64');
  await page.getByTestId('lb-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('[data-testid^="lb-tex-"] [data-logo]').first()).toBeAttached({ timeout: 10_000 });

  // 5) file in: mỗi nhãn 1 đường bế
  const sheet = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="lb-sheet"] svg')!;
    return { cuts: s.querySelectorAll('#CutContour path').length, labels: s.querySelectorAll('[data-label]').length };
  });
  expect(sheet.cuts).toBe(sheet.labels);
  expect(sheet.cuts).toBeGreaterThanOrEqual(1);

  // 6) tải file
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  await tpls.nth(2).click(); // nước mắm: trước + sau + cổ chai
  await page.waitForTimeout(300);
  const pdf = fs.readFileSync(await grab('lb-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(30_000);
  const svg = fs.readFileSync(await grab('lb-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('id="In"');
  expect((svg.match(/<text/g) || []).length, 'SVG đã outline hết chữ').toBe(0);
  const pngOut = fs.readFileSync(await grab('lb-png'));
  expect(pngOut.readUInt32BE(16)).toBe(2400);

  // 7) 3D: dựng được cho vài vật chứa (thuỷ tinh trong, lon, rượu, decal trong)
  await page.getByTestId('tab-3d').click();
  for (const i of [0, 5, 6, 12]) {
    await tpls.nth(i).click();
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => (window as unknown as { __lbSnap: (w: number, h: number) => Promise<string> }).__lbSnap(900, 675));
    expect(url.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `3d-${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const p3 = fs.readFileSync(await grab('lb-3d'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
