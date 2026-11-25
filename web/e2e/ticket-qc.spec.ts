import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { qrPath } from '../src/lib/flyer-qr';

// QC Vé sự kiện: mọi mẫu × khổ × 2 mặt — chữ nằm trong vé, không lấn qua răng cưa (thân ↔ cuống), không đè nhau;
// số vé chạy liên tiếp không trùng, QR từng vé = mã sự kiện + số vé (đúng ma trận), ghế theo hàng; PDF/ZIP/PNG/3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'ticket');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const res: { side: string; bad: string[]; texts: number; minFont: number }[] = [];
    for (const side of ['front', 'back']) {
      const svg = document.querySelector(`[data-testid="tk-${side}"] svg`) as SVGSVGElement;
      const vb = svg.viewBox.baseVal;
      const perf = svg.querySelector('[data-perf]') as SVGLineElement | null;
      const px = perf ? +perf.getAttribute('x1')! : null;
      const bad: string[] = []; let minFont = 99;
      const boxes: { t: string; x0: number; x1: number; y0: number; y1: number; reg: string }[] = [];
      for (const t of Array.from(svg.querySelectorAll('text')) as SVGTextElement[]) {
        const txt = (t.textContent || '').trim(); if (!txt) continue;
        if (t.closest('[data-motif]')) continue;
        const fs = parseFloat(t.getAttribute('font-size') || '0');
        minFont = Math.min(minFont, fs);
        const w = t.getBBox().width;
        const x = +t.getAttribute('x')!, y = +t.getAttribute('y')!;
        const a = t.getAttribute('text-anchor') || 'start';
        const x0 = a === 'middle' ? x - w / 2 : a === 'end' ? x - w : x;
        const box = { t: txt, x0, x1: x0 + w, y0: y - fs * 0.72, y1: y + fs * 0.08, reg: t.closest('[data-region]')?.getAttribute('data-region') || '' };
        boxes.push(box);
        if (box.x0 < 5 || box.x1 > vb.width - 5 || box.y0 < 5 || box.y1 > vb.height - 5) bad.push(`"${txt}" ra ngoài vé (${box.x0.toFixed(0)},${box.y0.toFixed(0)},${box.x1.toFixed(0)},${box.y1.toFixed(0)})`);
        if (px !== null) {
          const inStub = box.reg === 'stub';
          const stubRight = (svg.querySelector('[data-region="stub"] rect') as SVGRectElement | null) ? +(svg.querySelector('[data-region="stub"] rect') as SVGRectElement).getAttribute('x')! >= px - 1 : true;
          const leftSide = box.x1 <= px + 2, rightSide = box.x0 >= px - 2;
          const ok = inStub ? (stubRight ? rightSide : leftSide) : (stubRight ? leftSide : rightSide);
          if (!ok) bad.push(`"${txt}" lấn qua răng cưa (${box.reg || 'thân'})`);
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 6 && oy > 6) bad.push(`"${a.t}" đè "${b.t}"`);
      }
      res.push({ side, bad, texts: boxes.length, minFont });
    }
    return res;
  });
  for (const s of r) {
    expect(s.bad, `${label} ${s.side}`).toEqual([]);
    expect(s.texts, `${label} ${s.side}: có chữ`).toBeGreaterThan(3);
    expect(s.minFont, `${label} ${s.side}: chữ quá nhỏ`).toBeGreaterThanOrEqual(18);
  }
}

const grab = async (page: Page, id: string, timeout = 240_000) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
};
// zip kiểu "store" (không nén): đọc lần lượt local header → nội dung từng file
function unzipSvgs(buf: Buffer): string[] {
  const out: string[] = []; let o = 0;
  while (o + 30 <= buf.length && buf.readUInt32LE(o) === 0x04034b50) {
    const size = buf.readUInt32LE(o + 18), nl = buf.readUInt16LE(o + 26), el = buf.readUInt16LE(o + 28);
    const start = o + 30 + nl + el;
    out.push(buf.subarray(start, start + size).toString('utf8'));
    o = start + size;
  }
  return out;
}

test('Vé sự kiện: mọi mẫu × khổ, số + QR riêng từng vé, ghế, file in, 3D', async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/ticket');
  await expect(page.getByTestId('tk-tpl').first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();

  const tpls = page.getByTestId('tk-tpl');
  const sizes = page.locator('[data-testid="tk-sizes"] button');
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  let n = 0;
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < nT; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(80);
      await audit(page, `khổ ${s} mẫu ${i}`);
      if (s === 0) await page.getByTestId('tk-front').screenshot({ path: path.join(OUT, `ve-${String(i).padStart(2, '0')}.png`) });
      n++;
    }
  }
  expect(n).toBeGreaterThanOrEqual(40);

  // cuống trái + chữ rất dài
  await sizes.nth(0).click(); await tpls.nth(0).click();
  await page.locator('[data-testid="tk-stub"] button').nth(1).click();
  await page.getByTestId('tk-field-event').fill('Đại nhạc hội chào xuân Đinh Mùi cùng các ngôi sao hàng đầu Việt Nam');
  await page.getByTestId('tk-field-artist').fill('Gia Khánh · Thu Hà · Quốc Bảo · Bảo Ngọc · Ban nhạc Bầu Trời & dàn nhạc giao hưởng thành phố');
  await page.getByTestId('tk-field-venue').fill('Sân vận động Quân khu 7, 202 Hoàng Văn Thụ, phường 9, quận Phú Nhuận, TP. Hồ Chí Minh');
  await page.waitForTimeout(150);
  for (let s = 0; s < await sizes.count(); s++) { await sizes.nth(s).click(); await page.waitForTimeout(80); await audit(page, `chữ dài · khổ ${s}`); }
  await page.getByTestId('tk-front').screenshot({ path: path.join(OUT, 've-chu-dai-vip.png') });

  // gala: cuống = số bốc thăm
  await sizes.nth(0).click();
  await tpls.nth(4).click();
  await expect(page.locator('[data-testid="tk-front"] [data-lucky]')).toHaveText('001');

  // số vé + QR + ghế: 2 hàng × 10 ghế = 20 vé
  await page.locator('[data-testid="tk-stub"] button').nth(0).click();
  await page.getByTestId('tk-field-code').fill('QB27');
  await page.getByTestId('tk-field-prefix').fill('QB');
  await page.getByTestId('tk-field-start').fill('120');
  await page.getByTestId('tk-seat').check();
  await page.getByTestId('tk-field-rowFrom').fill('A');
  await page.getByTestId('tk-field-rowTo').fill('B');
  await page.getByTestId('tk-field-perRow').fill('10');
  await expect(page.getByTestId('tk-serial-info')).toContainText('QB00120');
  await expect(page.getByTestId('tk-serial-info')).toContainText('QB00139');
  const sheet = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="tk-sheet"] svg')!;
    return {
      count: +svg.getAttribute('data-count')!,
      dyn: Array.from(svg.querySelectorAll('[data-dyn]')).map((g) => ({
        sn: g.getAttribute('data-sn')!, payload: g.getAttribute('data-payload')!,
        d: g.querySelector('[data-qr]')!.getAttribute('d')!,
        seat: Array.from(g.querySelectorAll('[data-seat]')).map((t) => t.textContent || ''),
      })),
      cuts: svg.querySelectorAll('#CutContour use').length,
      perfs: svg.querySelectorAll('#Perf line').length,
    };
  });
  expect(sheet.dyn.length).toBe(sheet.count);
  expect(sheet.cuts).toBe(sheet.count);
  expect(sheet.perfs).toBe(sheet.count);
  sheet.dyn.forEach((t, i) => {
    expect(t.sn).toBe(`QB${String(120 + i).padStart(5, '0')}`);
    expect(t.payload).toBe(`QB27-${t.sn}`);
    expect(t.d, `QR vé ${t.sn}`).toBe(qrPath(t.payload).d);
    expect(t.seat[0]).toContain(`HÀNG ${i < 10 ? 'A' : 'B'} · SỐ ${String((i % 10) + 1).padStart(2, '0')}`);
  });
  expect(new Set(sheet.dyn.map((t) => t.payload)).size).toBe(sheet.dyn.length);

  // tải file: PNG, PDF in (2 mặt + khuôn + nhũ), ZIP tờ in có số, PDF tờ in
  const png = fs.readFileSync(await grab(page, 'tk-png-front'));
  expect(png.readUInt32BE(16)).toBe(2000);
  await page.getByTestId('tk-foil').check();
  const pdf = fs.readFileSync(await grab(page, 'tk-pdf')).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(4);
  const zipBuf = fs.readFileSync(await grab(page, 'tk-zip'));
  const svgs = unzipSvgs(zipBuf);
  const pages = Math.ceil(20 / await page.evaluate(() => +document.querySelector('[data-testid="tk-sheet"] svg')!.getAttribute('data-count')!));
  expect(svgs.length).toBe(pages + 1);
  const payloads: string[] = [];
  for (const s of svgs) {
    expect(s).toContain('id="CutContour"');
    expect(s).toContain('id="Perf"');
    expect((s.match(/<text/g) || []).length, 'chữ phải outline hết').toBe(0);
    payloads.push(...Array.from(s.matchAll(/data-payload="([^"]+)"/g)).map((m) => m[1]));
  }
  expect(payloads.length).toBe(20);
  expect(new Set(payloads).size).toBe(20);
  const spdf = fs.readFileSync(await grab(page, 'tk-sheet-pdf')).toString('latin1');
  expect((spdf.match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(pages + 1);

  // VIP: số + QR ở mặt sau
  await sizes.nth(3).click();
  await expect(page.locator('[data-testid="tk-back"] [data-dyn]')).toHaveCount(1);
  await expect(page.locator('[data-testid="tk-front"] [data-dyn]')).toHaveCount(0);

  // 3D: vé giấy (có nhũ) + thẻ VIP
  await page.getByTestId('tab-3d').click();
  for (const s of [0, 3]) {
    await sizes.nth(s).click();
    await page.waitForTimeout(400);
    const u = await page.evaluate(async () => (window as unknown as { __tkSnap: (w: number, h: number) => Promise<string> }).__tkSnap(1400, 1050));
    expect(u.length).toBeGreaterThan(50_000);
    fs.writeFileSync(path.join(OUT, `ve-3d-${s}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await page.waitForTimeout(1500);
  const p3 = fs.readFileSync(await grab(page, 'tk-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  expect(errors).toEqual([]);
});
