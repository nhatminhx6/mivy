import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Thẻ cào: mọi mẫu × khổ — chữ nằm trong thẻ, giải + mã nằm trọn trong vùng cào, không chồng chữ, cỡ chữ đủ đọc;
// phân bổ giải ĐÚNG số lượng (CSV + tờ in), mã cào không trùng, số seri liên tiếp; file PDF/ZIP/PNG/3D tải được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'scratchcard');

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: { id: string; bad: string[]; minFont: number; vars: number }[] = [];
    for (const id of ['sc-cover', 'sc-reveal', 'sc-back']) {
      const svg = document.querySelector(`[data-testid="${id}"] svg`) as SVGSVGElement;
      const vb = svg.viewBox.baseVal; const sr = svg.getBoundingClientRect(); const k = vb.width / sr.width;
      const toU = (b: DOMRect) => ({ x0: (b.left - sr.left) * k + vb.x, y0: (b.top - sr.top) * k + vb.y, x1: (b.right - sr.left) * k + vb.x, y1: (b.bottom - sr.top) * k + vb.y });
      const bad: string[] = []; let minFont = 99;
      const texts = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim());
      const boxes: { t: string; b: ReturnType<typeof toU>; fs: number; v: boolean }[] = [];
      for (const t of texts) {
        const b = toU(t.getBoundingClientRect()); const fs = parseFloat(t.getAttribute('font-size') || '0');
        minFont = Math.min(minFont, fs);
        const padY = fs * 0.15;
        if (b.x0 < 15 || b.x1 > vb.width - 15 || b.y0 < -padY || b.y1 > vb.height + padY) bad.push(`"${t.textContent}" ra ngoài thẻ`);
        boxes.push({ t: t.textContent || '', b, fs, v: !!t.getAttribute('data-var') || t.textContent === 'CÀO TẠI ĐÂY' });
      }
      // giải + mã phải nằm trọn trong vùng cào
      const zone = svg.querySelector('[data-zone]') as SVGPathElement | null;
      let vars = 0;
      if (zone) {
        for (const t of Array.from(svg.querySelectorAll('[data-var="prize"], [data-var="code"]')) as SVGTextElement[]) {
          vars++;
          const bb = t.getBBox(); const fs = parseFloat(t.getAttribute('font-size') || '0');
          const pts = [[bb.x, bb.y + fs * 0.25], [bb.x + bb.width, bb.y + fs * 0.25], [bb.x, bb.y + bb.height - fs * 0.15], [bb.x + bb.width, bb.y + bb.height - fs * 0.15]];
          for (const [x, y] of pts) { const p = svg.createSVGPoint(); p.x = x; p.y = y; if (!zone.isPointInFill(p)) { bad.push(`"${t.textContent}" lòi khỏi vùng cào`); break; } }
        }
      }
      // không chồng chữ (lõi dòng: bỏ phần trên/dưới của hộp font)
      const core = boxes.map((x) => ({ ...x, c: { x0: x.b.x0 + 2, x1: x.b.x1 - 2, y0: x.b.y0 + (x.b.y1 - x.b.y0) * 0.3, y1: x.b.y1 - (x.b.y1 - x.b.y0) * 0.25 } }));
      for (let i = 0; i < core.length; i++) for (let j = i + 1; j < core.length; j++) {
        const a = core[i].c, b = core[j].c;
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) bad.push(`chồng chữ "${core[i].t}" × "${core[j].t}"`);
      }
      out.push({ id, bad, minFont, vars });
    }
    return out;
  });
  for (const s of r) {
    expect(s.bad, `${label} ${s.id}`).toEqual([]);
    expect(s.minFont, `${label} ${s.id} cỡ chữ nhỏ nhất`).toBeGreaterThanOrEqual(14); // ≥1.4mm
  }
  expect(r.find((s) => s.id === 'sc-reveal')!.vars, `${label}: thẻ đã cào phải có giải + mã`).toBeGreaterThanOrEqual(2);
}

// đọc file .zip kiểu "store" (không nén) do zipStore tạo
function unzip(buf: Buffer) {
  const files: { name: string; data: Buffer }[] = [];
  let o = 0;
  while (o + 30 <= buf.length && buf.readUInt32LE(o) === 0x04034b50) {
    const csize = buf.readUInt32LE(o + 18); const nlen = buf.readUInt16LE(o + 26); const xlen = buf.readUInt16LE(o + 28);
    const name = buf.slice(o + 30, o + 30 + nlen).toString('utf8');
    const start = o + 30 + nlen + xlen;
    files.push({ name, data: buf.slice(start, start + csize) });
    o = start + csize;
  }
  return files;
}
const csvRows = (txt: string) => txt.replace(/^﻿/, '').trim().split('\n').slice(1).map((l) => {
  const m = l.match(/^(\d+),([^,]+),([^,]+),(.*)$/)!; return { stt: +m[1], serial: m[2], code: m[3], prize: m[4].replace(/^"|"$/g, '').replace(/""/g, '"') };
});

test('Thẻ cào: mọi mẫu × khổ, phân bổ giải đúng, file in đủ lớp', async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/studio/scratchcard', { waitUntil: 'domcontentloaded' });
  const tpls = page.getByTestId('sc-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 120_000 });
  // tab 3D mặc định dựng được
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();

  const sizes = page.locator('[data-testid="sc-sizes"] button');
  const nT = await tpls.count();
  expect(nT).toBeGreaterThanOrEqual(10);
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (let i = 0; i < nT; i++) {
      await tpls.nth(i).click();
      await page.waitForTimeout(120);
      await audit(page, `khổ ${s} mẫu ${i}`);
      if (s !== 1) await page.getByTestId('sc-reveal').locator('xpath=../../..').screenshot({ path: path.join(OUT, `sc-${s}-${String(i).padStart(2, '0')}.png`) });
    }
  }
  // các hình vùng cào × bố cục, chữ rất dài
  await sizes.nth(0).click(); await tpls.first().click();
  await page.getByTestId('sc-field-title').fill('Cào ngay hôm nay – trúng liền tay quà tặng cực lớn');
  await page.getByTestId('sc-field-sub').fill('Áp dụng cho tất cả hoá đơn mua sắm tại hệ thống cửa hàng trên toàn quốc trong tháng khai trương');
  await page.getByTestId('sc-field-prizes').fill('Phiếu mua hàng trị giá năm trăm nghìn đồng tại quầy | 3\nGiảm 50k | 7');
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click();
    for (const lay of [0, 1, 2]) {
      await page.locator('[data-testid="sc-layouts"] button').nth(lay).click();
      for (let z = 0; z < 4; z++) {
        await page.locator('[data-testid="sc-zones"] button').nth(z).click();
        await page.waitForTimeout(80);
        await audit(page, `chữ dài khổ ${s} bố cục ${lay} vùng ${z}`);
      }
    }
    await page.getByTestId('sc-reveal').locator('xpath=../../..').screenshot({ path: path.join(OUT, `sc-long-${s}.png`) });
  }

  // ---- phân bổ giải 500 thẻ: CSV đúng số lượng, mã không trùng, seri liên tiếp ----
  await sizes.nth(0).click(); await tpls.first().click();
  await page.getByTestId('sc-field-prefix').fill('QB');
  await page.getByTestId('sc-field-start').fill('120');
  await page.getByTestId('sc-field-prizes').fill('Giải nhất | 1\nGiảm 50k | 50\nChúc may mắn | 449');
  await expect(page.getByTestId('sc-total')).toContainText('500');
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const rows = csvRows(fs.readFileSync(await grab('sc-csv'), 'utf8'));
  expect(rows.length).toBe(500);
  const byPrize = (rs: { prize: string }[]) => rs.reduce<Record<string, number>>((a, r) => ((a[r.prize] = (a[r.prize] || 0) + 1), a), {});
  expect(byPrize(rows)).toEqual({ 'Giải nhất': 1, 'Giảm 50k': 50, 'Chúc may mắn': 449 });
  expect(new Set(rows.map((r) => r.code)).size).toBe(500);
  expect(rows[0].serial).toBe('QB00120'); expect(rows[499].serial).toBe('QB00619');
  expect(rows.every((r) => /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(r.code))).toBe(true);
  // xáo thật (giải nhất không nằm cứng ở thẻ đầu) và lặp lại được theo seed
  const rows2 = csvRows(fs.readFileSync(await grab('sc-csv'), 'utf8'));
  expect(rows2.map((r) => r.code)).toEqual(rows.map((r) => r.code));
  await page.getByTestId('sc-reseed').click();
  const rows3 = csvRows(fs.readFileSync(await grab('sc-csv'), 'utf8'));
  expect(rows3.map((r) => r.code)).not.toEqual(rows.map((r) => r.code));
  expect(byPrize(rows3)).toEqual({ 'Giải nhất': 1, 'Giảm 50k': 50, 'Chúc may mắn': 449 });

  // ---- tờ in (.zip): 43 thẻ → 3 tờ trước + 1 tờ sau + CSV; giải trên tờ khớp CSV ----
  await page.getByTestId('sc-field-prizes').fill('Giải A | 3\nGiải B | 10\nGiải C | 30');
  await expect(page.getByTestId('sc-total')).toContainText('43');
  const zip = unzip(fs.readFileSync(await grab('sc-zip')));
  const fronts = zip.filter((f) => /mat-truoc\.svg$/.test(f.name));
  const backs = zip.filter((f) => /mat-sau.*\.svg$/.test(f.name));
  const csv = zip.find((f) => f.name.endsWith('.csv'))!;
  expect(fronts.length).toBe(3); expect(backs.length).toBe(1); expect(csv).toBeTruthy();
  const sheetCards: { serial: string; prize: string; code: string }[] = [];
  for (const f of fronts) {
    const t = f.data.toString('utf8');
    for (const L of ['id="In"', 'id="Variable"', 'id="Scratch"', 'id="CutContour"']) expect(t, f.name).toContain(L);
    expect((t.match(/<text/g) || []).length, `${f.name}: chữ chưa outline`).toBe(0);
    for (const m of t.matchAll(/data-serial="([^"]+)" data-prize="([^"]+)" data-code="([^"]+)"/g)) sheetCards.push({ serial: m[1], prize: m[2], code: m[3] });
  }
  expect(sheetCards.length).toBe(43);
  expect(byPrize(sheetCards)).toEqual({ 'Giải A': 3, 'Giải B': 10, 'Giải C': 30 });
  const zrows = csvRows(csv.data.toString('utf8'));
  expect(sheetCards.map((c) => `${c.serial}|${c.code}|${c.prize}`)).toEqual(zrows.map((r) => `${r.serial}|${r.code}|${r.prize}`));
  expect(backs[0].data.toString('utf8')).toContain('id="CutContour"');

  // ---- PDF in (trước + sau + khuôn mực cào), PNG ----
  const pdf = fs.readFileSync(await grab('sc-pdf'));
  expect(pdf.slice(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(3);
  for (const id of ['sc-png-cover', 'sc-png-reveal']) {
    const png = fs.readFileSync(await grab(id));
    expect(png.readUInt32BE(16), id).toBe(1600);
  }

  // ---- 3D: mọi khổ chụp được ----
  for (let s = 0; s < await sizes.count(); s++) {
    await sizes.nth(s).click(); await page.waitForTimeout(300);
    const u = await page.evaluate(() => (window as unknown as { __scSnap: (w: number, h: number) => Promise<string> }).__scSnap(1200, 900));
    expect(u.length, `3D khổ ${s}`).toBeGreaterThan(200_000);
    fs.writeFileSync(path.join(OUT, `sc-3d-${s}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
