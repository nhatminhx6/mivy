import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Sơ đồ chỗ ngồi: mọi mẫu → chữ nằm trong bảng/thẻ bàn, không đè nhau, không tràn; 200 khách / 20 bàn hiện đủ ở mọi khổ;
// thẻ tên = số khách (6 thẻ/tờ A4); 40 bàn, bàn đông khách, dạng "Tên | Bàn"; tải PDF sơ đồ / thẻ tên / số bàn, PNG, 3D.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'seating');

async function auditBoard(page: Page, label: string, expectGuests?: number) {
  const r = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="sc-board"] svg') as SVGSVGElement;
    const [W, H] = (svg.getAttribute('data-board') || '0x0').split('x').map(Number);
    const bad: string[] = [];
    const texts = Array.from(svg.querySelectorAll('text')) as SVGTextElement[];
    for (const t of texts) {
      if (!t.textContent?.trim()) continue;
      const b = t.getBBox();
      if (b.x < -0.5 || b.y < -0.5 || b.x + b.width > W + 0.5 || b.y + b.height > H + 0.5) bad.push(`ngoài bảng: ${t.textContent}`);
    }
    // từng thẻ bàn: tên khách nằm trong thẻ, không đè nhau
    const cards = Array.from(svg.querySelectorAll('[data-card]'));
    let guests = 0; let minSize = 99;
    for (const c of cards) {
      const [x, y, w, h] = (c.getAttribute('data-card-box') || '').split(',').map(Number);
      const ts = Array.from(c.querySelectorAll('text')) as SVGTextElement[];
      const boxes = ts.map((t) => { const b = t.getBBox(); return { t: t.textContent || '', x: b.x, y: b.y + b.height * 0.18, w: b.width, h: b.height * 0.64 }; });
      for (const t of ts) {
        const b = t.getBBox();
        if (b.x < x - 0.3 || b.x + b.width > x + w + 0.3 || b.y < y - 0.3 || b.y + b.height > y + h + 0.3) bad.push(`ra ngoài thẻ ${c.getAttribute('data-card')}: ${t.textContent}`);
        if (t.hasAttribute('data-guest')) { guests++; minSize = Math.min(minSize, parseFloat(t.getAttribute('font-size') || '0')); }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(`đè nhau: ${a.t} / ${b.t}`);
      }
    }
    // thẻ bàn không chồng nhau
    const rects = cards.map((c) => (c.getAttribute('data-card-box') || '').split(',').map(Number));
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [ax, ay, aw, ah] = rects[i], [bx, by, bw, bh] = rects[j];
      if (ax < bx + bw - 0.1 && bx < ax + aw - 0.1 && ay < by + bh - 0.1 && by < ay + ah - 0.1) bad.push('thẻ bàn chồng nhau');
    }
    return { bad: bad.slice(0, 6), overflow: svg.getAttribute('data-overflow'), guests, minSize, cards: cards.length };
  });
  expect(r.bad, `${label}: ${r.bad.join(' | ')}`).toEqual([]);
  expect(r.overflow, `${label}: tràn`).toBeNull();
  expect(r.minSize, `${label}: chữ tên khách quá nhỏ`).toBeGreaterThanOrEqual(3.2);
  if (expectGuests !== undefined) expect(r.guests, `${label}: số khách trên sơ đồ`).toBe(expectGuests);
  return r;
}

const settle = async (page: Page) => { await page.waitForTimeout(450); };
const pdfPages = (buf: Buffer) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('Sơ đồ chỗ ngồi: mẫu, 200 khách, thẻ tên, số bàn, tải file, 3D', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/seating');
  const tpls = page.getByTestId('sc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  await page.getByTestId('tab-flat').click();
  const board = page.getByTestId('sc-board');

  // 1) mọi mẫu (danh sách mẫu của từng loại tiệc)
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click(); await settle(page);
    await auditBoard(page, `mẫu ${i}`);
    await board.screenshot({ path: path.join(OUT, `so-do-mau-${i + 1}.png`) });
  }

  // 2) 200 khách / 20 bàn ở mọi khổ
  await tpls.first().click();
  await page.getByTestId('sc-sample200').click(); await settle(page);
  await expect(page.getByTestId('sc-count')).toContainText('200 khách · 20 bàn');
  const sizes = page.getByTestId('sc-size');
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click(); await settle(page);
    await auditBoard(page, `200 khách khổ ${s}`, 200);
    await board.screenshot({ path: path.join(OUT, `so-do-200-khach-kho-${s + 1}.png`) });
  }
  // mọi tên trong danh sách đều có trên sơ đồ
  const missing = await page.evaluate(() => {
    const list = (document.querySelector('[data-testid="sc-guests"]') as HTMLTextAreaElement).value.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    const on = new Set(Array.from(document.querySelectorAll('[data-testid="sc-board"] [data-guest]')).map((e) => e.getAttribute('data-guest')));
    return list.filter((g) => !on.has(g.trim()));
  });
  expect(missing).toEqual([]);
  const print = page.getByTestId('sc-print');
  await expect(print.locator('[data-print="sheet"] [data-place]')).toHaveCount(200);
  await expect(print.locator('[data-print="sheet"] > svg')).toHaveCount(34);
  await expect(print.locator('[data-print="number"] > svg')).toHaveCount(20);
  // mỗi thẻ tên nằm trong đúng ô cắt của tờ
  const sheetOk = await page.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll('[data-testid="sc-print"] [data-print="sheet"] > svg')) as SVGSVGElement[];
    const bad: string[] = [];
    for (const s of sheets) {
      const cuts = Array.from(s.querySelectorAll('#CutContour rect')).map((r) => (r as SVGRectElement).getBBox());
      const names = Array.from(s.querySelectorAll('[data-place-name]')) as SVGTextElement[];
      if (cuts.length !== s.querySelectorAll('[data-place]').length) bad.push('số nét cắt ≠ số thẻ');
      for (const t of names) {
        const m = t.getScreenCTM()!, sm = s.getScreenCTM()!.inverse();
        const b = t.getBBox();
        const p1 = new DOMPoint(b.x, b.y).matrixTransform(m).matrixTransform(sm), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m).matrixTransform(sm);
        const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
        if (!cuts.some((c) => x0 >= c.x - 0.2 && x1 <= c.x + c.width + 0.2 && y0 >= c.y - 0.2 && y1 <= c.y + c.height + 0.2)) bad.push(`tên ra ngoài thẻ: ${t.textContent}`);
      }
    }
    return bad.slice(0, 5);
  });
  expect(sheetOk).toEqual([]);

  // 3) 40 bàn × 5 khách tên dài, và 5 bàn rất đông (14 khách) — vẫn vừa khổ A2
  await sizes.first().click();
  const longList = Array.from({ length: 40 }, (_, t) => [`## Bàn ${t + 1} – Khách mời phía nhà trai số ${t + 1}`,
    ...Array.from({ length: 5 }, (_, i) => `Nguyễn Hoàng Phương Thảo Uyên ${t}-${i}`)].join('\n')).join('\n');
  await page.getByTestId('sc-guests').fill(longList); await settle(page);
  await auditBoard(page, '40 bàn tên dài', 200);
  await board.screenshot({ path: path.join(OUT, 'so-do-40-ban.png') });
  const crowd = Array.from({ length: 5 }, (_, t) => [`## Bàn ${t + 1}`, ...Array.from({ length: 14 }, (_, i) => `Trần Thị Bích Ngọc ${t}${i}`)].join('\n')).join('\n');
  await page.getByTestId('sc-guests').fill(crowd); await settle(page);
  await auditBoard(page, '5 bàn đông', 70);
  // dạng "Tên | Bàn"
  await page.getByTestId('sc-guests').fill('Lê Văn Hùng | Bàn 2\nPhạm Thu Trang | 2\nĐỗ Gia Huy | Bàn VIP\nVõ Ngọc Lan | 1');
  await settle(page);
  await expect(page.getByTestId('sc-count')).toContainText('4 khách · 3 bàn');
  await auditBoard(page, 'Tên | Bàn', 4);
  await expect(page.locator('[data-testid="sc-board"] [data-card]').first()).toHaveAttribute('data-card', '1');

  // 4) tải file: danh sách nhỏ cho nhanh (13 khách → 3 tờ A4, 3 bàn)
  const small = ['## Bàn 1 – Họ hàng nhà trai', 'Lê Văn Hùng', 'Phạm Thu Trang', 'Đỗ Gia Huy', 'Võ Ngọc Lan', 'Bùi Thanh Tâm',
    '## Bàn 2 – Bạn cô dâu', 'Ngô Bích Ngân', 'Dương Thu Hà', 'Hồ Kim Yến', 'Lý Quốc Khoa', '## Bàn 3', 'Trần Đức Long', 'Huỳnh Mai Vy', 'Phan Hoài Nam', 'Vũ Ngọc Diệp'].join('\n');
  await page.getByTestId('sc-guests').fill(small); await settle(page);
  const grab = async (id: string) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, d.suggestedFilename()); await d.saveAs(p); return fs.readFileSync(p);
  };
  const pb = await grab('sc-pdf-board'); expect(pb.subarray(0, 4).toString()).toBe('%PDF'); expect(pdfPages(pb)).toBe(1);
  const pp = await grab('sc-pdf-place'); expect(pdfPages(pp)).toBe(3);
  const pn = await grab('sc-pdf-number'); expect(pdfPages(pn)).toBe(3);
  const png = await grab('sc-png'); expect(png.readUInt32BE(16)).toBe(2400);
  // ép kim: thêm trang khuôn ép sau sơ đồ
  await page.getByTestId('sc-foil').check(); await settle(page);
  const pf = await grab('sc-pdf-board'); expect(pdfPages(pf)).toBe(2);
  await page.getByTestId('sc-foil').uncheck();

  // 5) 3D: mỗi loại tiệc
  await page.getByTestId('tab-3d').click();
  for (const k of ['wedding', 'baby', 'yep']) {
    await page.getByTestId(`sc-kind-${k}`).click(); await page.waitForTimeout(600);
    const u = await page.evaluate(() => (window as unknown as { __scSnap: (w: number, h: number) => Promise<string> }).__scSnap(1200, 900));
    fs.writeFileSync(path.join(OUT, `3d-${k}.png`), Buffer.from(u.split(',')[1], 'base64'));
    expect(u.length).toBeGreaterThan(50_000);
  }
  await page.waitForTimeout(1500);
  const p3 = await grab('sc-3d'); expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByTestId('print-request')).toBeVisible();
  expect(errors).toEqual([]);
});
