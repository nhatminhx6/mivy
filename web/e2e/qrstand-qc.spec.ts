import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { qrPath } from '../src/lib/flyer-qr';

// QC Kệ mica QR: mọi mẫu × (1 mã / 2 mã + số bàn) — chữ nằm gọn trong thẻ, không đè nhau, không đè mã QR;
// mã vẽ ra ĐÚNG ma trận encoder cho đúng nội dung; VietQR đúng CRC; wifi/menu/review đúng chuỗi; 3 khổ đúng tỉ lệ;
// số bàn 1..12 → 12 thẻ + PDF 12 trang; ảnh QR ngân hàng thay mã; PNG 1600px quét ra đúng (OpenCV nếu có); 3D không lỗi.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'qrstand');
const PY = path.join(__dirname, '..', '..', 'back-end', '.venv', 'bin', 'python');

function crc16(s: string) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

async function audit(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const out: string[] = [];
    const svg = document.querySelector('[data-testid="qs-card"] svg') as SVGSVGElement;
    const W = +svg.dataset.w!, H = +svg.dataset.h!;
    const texts = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim());
    const boxes = texts.map((t) => {
      const b = t.getBBox(); const fs = parseFloat(t.getAttribute('font-size') || (t.closest('[font-size]')?.getAttribute('font-size') ?? '30'));
      const y = Number(t.getAttribute('y')); // hộp "mực": chân chữ −0.74em … +0.18em
      return { t: t.textContent || '', x0: b.x, x1: b.x + b.width, y0: y - fs * 0.74, y1: y + fs * 0.18 };
    });
    for (const b of boxes) if (b.x0 < 8 || b.x1 > W - 8 || b.y0 < 4 || b.y1 > H - 4) out.push(`"${b.t}" tràn mép (${Math.round(b.x0)},${Math.round(b.y0)}→${Math.round(b.x1)},${Math.round(b.y1)} / ${W}×${H})`);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 4 && oy > 4) out.push(`"${a.t}" đè "${c.t}"`);
    }
    const qrs = [...svg.querySelectorAll('[data-qr-purpose]')].map((g) => {
      const rc = g.querySelector('rect')!; const x = +rc.getAttribute('x')!, y = +rc.getAttribute('y')!, s = +rc.getAttribute('width')!;
      return { text: g.getAttribute('data-qr') || '', d: g.querySelector('path')?.getAttribute('d') || '', x, y, s, img: !!g.querySelector('image') };
    });
    for (const q of qrs) for (const b of boxes) {
      const ox = Math.min(q.x + q.s, b.x1) - Math.max(q.x, b.x0), oy = Math.min(q.y + q.s, b.y1) - Math.max(q.y, b.y0);
      if (ox > 2 && oy > 2) out.push(`"${b.t}" đè lên mã QR`);
      if (q.x < 0 || q.y < 0 || q.x + q.s > W || q.y + q.s > H) out.push('mã QR tràn khỏi thẻ');
      if (q.s < W * 0.3) out.push(`mã QR quá nhỏ (${Math.round(q.s)})`);
    }
    return { out, qrs, W, H };
  });
  expect(r.out, `${label}: ${r.out.join(' | ')}`).toEqual([]);
  for (const q of r.qrs) if (!q.img) expect(q.d, `${label}: ma trận QR khớp encoder`).toBe(qrPath(q.text).d);
  return r;
}

const pick = (page: Page, group: string, txt: string) => page.getByTestId(group).getByRole('button', { name: txt, exact: true }).click();
async function grab(page: Page, id: string) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
  const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
}

test('Kệ mica QR: mọi mẫu × 1/2 mã, nội dung QR đúng, số bàn, tải file', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (let a = 0; a < 2; a++) {
    try { await page.goto('/studio/qrstand', { timeout: 120_000 }); await expect(page.getByTestId('qs-tpl').first().locator('svg')).toBeVisible({ timeout: 90_000 }); break; }
    catch (e) { if (a) throw e; }
  }
  await page.getByTestId('tab-flat').click();
  const card = page.getByTestId('qs-card');
  const tpls = page.getByTestId('qs-tpl');
  const n = await tpls.count();
  expect(n).toBeGreaterThanOrEqual(10);

  // 1 mã chuyển khoản: payload VietQR hợp lệ (CRC, BIN, STK)
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(80);
    const r = await audit(page, `mẫu ${i} · 1 mã`);
    const pl = r.qrs[0].text;
    expect(pl.startsWith('000201010211')).toBe(true);
    expect(pl).toContain('0006970436');
    expect(pl).toContain('01101023456789');
    expect(pl.slice(-4)).toBe(crc16(pl.slice(0, -4)));
    if (i < 6) await card.screenshot({ path: path.join(OUT, `qs-${String(i).padStart(2, '0')}-1ma.png`) });
  }

  // 2 mã (chuyển khoản + wifi) + số bàn
  await page.getByTestId('qs-table').check();
  await pick(page, 'qs-q2', 'Wifi');
  for (let i = 0; i < n; i++) {
    await tpls.nth(i).click(); await page.waitForTimeout(80);
    const r = await audit(page, `mẫu ${i} · 2 mã + bàn`);
    expect(r.qrs.length).toBe(2);
    expect(r.qrs[1].text).toBe('WIFI:T:WPA;S:AnKhang_Coffee;P:cafengon2027;;');
    await expect(card.locator('text', { hasText: /01/ }).first()).toBeAttached();
    if (i < 6) await card.screenshot({ path: path.join(OUT, `qs-${String(i).padStart(2, '0')}-2ma.png`) });
  }

  // các mục đích khác + nội dung dài + đổi khổ
  await pick(page, 'qs-q2', 'Không');
  await pick(page, 'qs-q1', 'Menu · gọi món');
  await page.getByTestId('qs-menuUrl').fill('https://ankhang.vn/menu/ban-so-12?ref=qr');
  let r = await audit(page, 'menu');
  expect(r.qrs[0].text).toBe('https://ankhang.vn/menu/ban-so-12?ref=qr');
  await pick(page, 'qs-q1', 'Đánh giá · fanpage');
  r = await audit(page, 'review');
  expect(r.qrs[0].text).toContain('g.page');
  await pick(page, 'qs-q1', 'Wifi');
  await page.getByTestId('qs-wifiPass').fill('mat;khau:dac,biet');
  r = await audit(page, 'wifi ký tự đặc biệt');
  expect(r.qrs[0].text).toBe('WIFI:T:WPA;S:AnKhang_Coffee;P:mat\\;khau\\:dac\\,biet;;');
  await page.getByTestId('qs-brand').fill('NHÀ HÀNG HẢI SẢN BIỂN ĐÔNG QUỐC BẢO CHI NHÁNH THỦ ĐỨC');
  await page.getByTestId('qs-invite').fill('Quét mã để kết nối wifi miễn phí tốc độ cao dành cho khách');
  for (let i = 0; i < n; i++) { await tpls.nth(i).click(); await page.waitForTimeout(60); await audit(page, `mẫu ${i} · chữ dài`); }
  for (const [k, ratio] of [[1, 180 / 130], [2, 210 / 148], [0, 1.5]] as const) {
    await page.getByTestId('qs-size').nth(k).click(); await page.waitForTimeout(100);
    const rr = await audit(page, `khổ ${k}`);
    expect(Math.abs(rr.H / rr.W - ratio)).toBeLessThan(0.01);
  }

  // chuyển khoản: đổi ngân hàng + dán chuỗi mã riêng + ảnh QR ngân hàng
  await page.getByTestId('qs-brand').fill('AN KHANG COFFEE');
  await page.getByTestId('qs-invite').fill('Quét mã để thanh toán');
  await pick(page, 'qs-q1', 'Chuyển khoản');
  await page.getByTestId('qs-bank').selectOption('970422');
  r = await audit(page, 'MB');
  expect(r.qrs[0].text).toContain('0006970422');
  await page.getByTestId('qs-bankPayload').fill('00020101021138570010A000000727012700069704070113190366778899020QRIBFTTA53037045802VN63041234');
  r = await audit(page, 'payload dán');
  expect(r.qrs[0].text.startsWith('00020101021138570010A0000007270127')).toBe(true);
  await page.getByTestId('qs-bankPayload').fill('');
  const png1 = await grab(page, 'qs-png');
  const buf = fs.readFileSync(png1);
  expect(buf.readUInt32BE(16)).toBe(1600);
  if (fs.existsSync(PY)) {
    const dec = spawnSync(PY, ['-I', '-c', 'import cv2,sys; t,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(sys.argv[1])); print(t)', png1], { encoding: 'utf8' });
    const want = await page.evaluate(() => document.querySelector('[data-testid="qs-card"] [data-qr]')!.getAttribute('data-qr'));
    expect(dec.stdout.trim(), 'quét PNG ra đúng nội dung').toBe(want);
  }
  await page.getByTestId('qs-bankimg').setInputFiles(png1);
  await expect(card.locator('[data-qr-purpose="bank"] image')).toHaveCount(1, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Bỏ', exact: true }).click();

  // số bàn 1..12 → 12 thẻ in + PDF 12 trang
  await page.getByTestId('qs-tableFrom').fill('1');
  await page.getByTestId('qs-tableTo').fill('12');
  await expect(page.locator('[data-testid="qs-print"] svg')).toHaveCount(12);
  const nums = await page.evaluate(() => [...document.querySelectorAll('[data-testid="qs-print"] svg')].map((s) => [...s.querySelectorAll('text')].map((t) => t.textContent).join(' ')));
  for (let i = 0; i < 12; i++) expect(nums[i]).toContain(String(i + 1).padStart(2, '0'));
  const pdf = fs.readFileSync(await grab(page, 'qs-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(pages).toBe(12);

  // 3D: 3 kiểu kệ dựng được
  await page.getByTestId('tab-3d').click();
  for (const k of [0, 1, 2]) {
    await page.getByTestId('qs-stand').nth(k).click();
    await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
    await page.waitForTimeout(1500);
  }
  const snap = await page.evaluate(() => (window as unknown as { __qsSnap: (w: number, h: number) => Promise<string> }).__qsSnap(1200, 900));
  fs.writeFileSync(path.join(OUT, 'qs-3d.png'), Buffer.from(snap.split(',')[1], 'base64'));
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
