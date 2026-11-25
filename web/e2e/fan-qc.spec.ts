import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// QC Quạt cầm tay: mọi mẫu × hình × tay cầm, 2 mặt — chữ nằm gọn trong đường cắt (tính cả chữ dọc trên tay cầm),
// không đè nhau, không quá nhỏ, không đè QR; mặt sau tay cầm rời không để chữ dưới que; chữ dài vẫn gọn;
// tải PNG 2 mặt, PDF 2 trang, file in–cắt .zip (2 tờ: In + CutContour, chữ outline); 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'fan');
const SHOTS = path.join(__dirname, '..', '..', 'output', 'fan');

async function audit(page: Page, side: 'front' | 'back', label: string) {
  const r = await page.locator(`[data-testid="fan-${side}"] svg`).evaluate((svg: SVGSVGElement, sd: string) => {
    const d = svg.querySelector('#CutPreview')!.getAttribute('d')!;
    const NS = 'http://www.w3.org/2000/svg';
    const cut = document.createElementNS(NS, 'path'); cut.setAttribute('d', d); cut.setAttribute('fill-rule', 'evenodd'); svg.appendChild(cut);
    const inside = (x: number, y: number) => { const p = svg.createSVGPoint(); p.x = x / 10; p.y = y / 10; return cut.isPointInFill(p); };
    const inv = svg.getCTM()!.inverse();
    const guide = svg.querySelector('[data-role="stick-guide"] rect') as SVGRectElement | null;
    const stick = guide ? guide.getBBox() : null;
    const texts = Array.from(svg.querySelectorAll('#Content text')) as SVGTextElement[];
    const boxes = texts.filter((t) => (t.textContent || '').trim()).map((t) => {
      const b = t.getBBox();
      const fs = parseFloat(t.getAttribute('font-size') || '0');
      const base = parseFloat(t.getAttribute('y') || '0');
      const m = inv.multiply(t.getCTM()!);
      const pts = [[b.x, base - fs * 0.8], [b.x + b.width, base - fs * 0.8], [b.x, base + fs * 0.15], [b.x + b.width, base + fs * 0.15], [b.x + b.width / 2, base - fs * 0.8], [b.x + b.width / 2, base + fs * 0.15]]
        .map(([x, y]) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return [q.x, q.y]; });
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { role: t.getAttribute('data-role') || '', text: t.textContent || '', fs, pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    });
    const out: string[] = [];
    for (const b of boxes) {
      if (!b.pts.every(([x, y]) => inside(x, y))) out.push(`chữ lòi ra ngoài đường cắt: "${b.text}"`);
      const min = b.role === 'title' ? 50 : b.role === 'hotline' ? 40 : b.role === 'qr-label' ? 18 : 22; // mm×10
      if (b.fs < min) out.push(`chữ quá nhỏ (${(b.fs / 10).toFixed(1)}mm): "${b.text}" [${b.role}]`);
      if (stick && b.x0 < stick.x + stick.width && stick.x < b.x1 && b.y0 < stick.y + stick.height && stick.y < b.y1) out.push(`chữ nằm dưới que tay cầm: "${b.text}"`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) out.push(`chữ đè nhau: "${a.text}" × "${c.text}"`);
    }
    // đinh tán que (mặt trước): không nằm trên chữ
    for (const c of Array.from(svg.querySelectorAll('[data-role="rivet-guide"] circle')) as SVGCircleElement[]) {
      const cx = c.cx.baseVal.value, cy = c.cy.baseVal.value, rr = 40;
      for (const b of boxes) if (b.x0 < cx + rr && cx - rr < b.x1 && b.y0 < cy + rr && cy - rr < b.y1) out.push(`đinh tán đè chữ: "${b.text}"`);
    }
    const qr = svg.querySelector('[data-role="qr"] rect') as SVGRectElement | null;
    if (qr) {
      const q = qr.getBBox();
      if (![[q.x, q.y], [q.x + q.width, q.y], [q.x, q.y + q.height], [q.x + q.width, q.y + q.height]].every(([x, y]) => inside(x, y))) out.push('QR lòi ra ngoài đường cắt');
      if (stick && q.x < stick.x + stick.width && stick.x < q.x + q.width && q.y < stick.y + stick.height && stick.y < q.y + q.height) out.push('QR nằm dưới que tay cầm');
      for (const b of boxes) if (b.role !== 'qr-label' && b.x0 < q.x + q.width && q.x < b.x1 && b.y0 < q.y + q.height && q.y < b.y1) out.push(`chữ đè QR: "${b.text}"`);
    }
    cut.remove();
    return { out, roles: boxes.map((b) => b.role), qr: !!qr, side: sd };
  }, side);
  expect(r.out, `${label} (${side})`).toEqual([]);
  if (side === 'front') expect(r.roles, `${label}: thiếu tiêu đề`).toContain('title');
  else { expect(r.roles, `${label}: thiếu hotline`).toContain('hotline'); expect(r.qr, `${label}: thiếu QR`).toBe(true); }
}

test('Quạt cầm tay: mọi mẫu × hình × tay cầm, chữ dài, tải file, 3D', async ({ page }) => {
  test.setTimeout(480_000);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/fan');
  const tpls = page.getByTestId('fan-tpl');
  await expect(tpls).toHaveCount(14, { timeout: 120_000 });
  await page.getByTestId('tab-flat').click();
  const shapes = page.getByTestId('fan-shape'), handles = page.getByTestId('fan-handle');
  expect(await shapes.count()).toBe(4);
  expect(await handles.count()).toBe(2);

  for (let i = 0; i < 14; i++) {
    await tpls.nth(i).click();
    await page.waitForTimeout(60);
    for (const sd of ['front', 'back'] as const) await audit(page, sd, `mẫu ${i}`);
    await page.locator('[data-testid="fan-front"]').locator('..').locator('..').screenshot({ path: path.join(OUT, `mau-${String(i + 1).padStart(2, '0')}.png`) });
    for (let h = 0; h < 2; h++) {
      await handles.nth(h).click();
      for (let s = 0; s < 4; s++) {
        await shapes.nth(s).click();
        await page.waitForTimeout(25);
        for (const sd of ['front', 'back'] as const) await audit(page, sd, `mẫu ${i} tay ${h} hình ${s}`);
      }
    }
  }

  // chữ dài trên mọi hình × tay cầm
  await tpls.nth(0).click();
  const long: Record<string, string> = {
    eyebrow: 'Thông báo tuyển sinh năm học mới', title: 'TRƯỜNG MẦM NON SONG NGỮ ÁNH DƯƠNG QUỐC TẾ', highlight: 'ƯU ĐÃI HỌC PHÍ 50% THÁNG ĐẦU',
    sub: 'Nhận trẻ từ 18 tháng đến 6 tuổi · lớp nhỏ · giáo viên bản ngữ · đưa đón tận nhà',
    brand: 'HỆ THỐNG TRƯỜNG MẦM NON SONG NGỮ ÁNH DƯƠNG', info: 'Lớp nhỏ 15 bé, cô giáo tận tâm, camera xem con 24/7\nSân chơi rộng, bếp ăn tại trường, thực đơn dinh dưỡng\nĐưa đón tận nhà khu vực Q.7, Nhà Bè\nHọc thử miễn phí 1 tuần',
    hotline: '0988 112 233 – 0909 123 456', address: '12 Nguyễn Văn Linh, P. Tân Thuận Tây, Q.7, TP. Hồ Chí Minh', link: 'https://anhduong.edu.vn/tuyen-sinh-2027?utm_source=quat',
  };
  for (const [k, v] of Object.entries(long)) await page.getByTestId(`fan-field-${k}`).fill(v);
  for (let h = 0; h < 2; h++) {
    await handles.nth(h).click();
    for (let s = 0; s < 4; s++) {
      await shapes.nth(s).click();
      await page.waitForTimeout(40);
      for (const sd of ['front', 'back'] as const) await audit(page, sd, `chữ dài tay ${h} hình ${s}`);
      await page.locator('[data-testid="fan-front"]').locator('..').locator('..').screenshot({ path: path.join(OUT, `chu-dai-${h}-${s}.png`) });
    }
  }

  // logo + ảnh nền khách
  const mkPng = async (txt: string, color: string) => Buffer.from((await page.evaluate(([t, c]) => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const x = cv.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 400, 300); g.addColorStop(0, c); g.addColorStop(1, '#ffffff'); x.fillStyle = g; x.fillRect(0, 0, 400, 300);
    x.fillStyle = '#fff'; x.font = 'bold 120px sans-serif'; x.textAlign = 'center'; x.fillText(t, 200, 190);
    return cv.toDataURL('image/png');
  }, [txt, color])).split(',')[1], 'base64');
  await tpls.nth(2).click();
  await page.getByTestId('fan-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await mkPng('QB', '#2563EB') });
  await expect(page.locator('[data-testid="fan-back"] svg [data-role="logo"]')).toHaveCount(1, { timeout: 10_000 });
  await page.getByTestId('fan-photo').setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: await mkPng('ẢNH', '#16A34A') });
  await expect(page.locator('[data-testid="fan-front"] svg [data-role="photo"]')).toHaveCount(1, { timeout: 10_000 });
  for (const sd of ['front', 'back'] as const) await audit(page, sd, 'logo + ảnh');
  await page.locator('[data-testid="fan-front"]').locator('..').locator('..').screenshot({ path: path.join(OUT, 'logo-anh.png') });
  await page.getByRole('button', { name: /Bỏ logo/ }).click();
  await page.getByRole('button', { name: /Bỏ ảnh/ }).click();

  // tải file (mẫu quạt xoè que tre)
  await tpls.nth(3).click();
  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  for (const id of ['fan-png-front', 'fan-png-back']) expect(fs.readFileSync(await grab(id)).readUInt32BE(16)).toBe(1600);
  const pdf = fs.readFileSync(await grab('fan-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length).toBe(2);
  const zip = fs.readFileSync(await grab('fan-zip'));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  const zs = zip.toString('utf8');
  const svgs = zs.split('<svg').length - 1;
  expect(svgs).toBeGreaterThanOrEqual(4); // 2 tờ, mỗi tờ có svg ngoài + svg quạt nhúng
  expect((zs.match(/id="CutContour"/g) || []).length).toBe(2);
  expect((zs.match(/id="In"/g) || []).length).toBe(2);
  expect(zs).not.toMatch(/<text[\s>]/);
  expect(zs).toContain('data-side="front"');
  expect(zs).toContain('data-side="back"');
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();

  // 3D: dựng được + chụp ảnh lớn để soi
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!(window as unknown as { __fanSnap?: unknown }).__fanSnap);
  // trả chữ mẫu cho ảnh thành phẩm
  await tpls.nth(0).click();
  for (const [k] of Object.entries(long)) await page.getByTestId(`fan-field-${k}`).fill('');
  await page.getByTestId('fan-purposes').locator('button').nth(1).click();
  await page.getByTestId('fan-purposes').locator('button').nth(0).click();
  const snap = async (name: string, keep?: string) => {
    await page.waitForTimeout(2200);
    const url = await page.evaluate(() => (window as unknown as { __fanSnap: (w: number, h: number) => Promise<string> }).__fanSnap(1600, 1200));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    expect(buf.length).toBeGreaterThan(100_000);
    fs.writeFileSync(path.join(OUT, name), buf);
    if (keep) fs.writeFileSync(path.join(SHOTS, keep), buf);
  };
  await snap('3d-tron-tay-lien.png');
  await tpls.nth(3).click(); await snap('3d-xoe-que.png', 'quat-xoe-que-tre-3d.png');
  await tpls.nth(6).click(); await snap('3d-vuong-que-neon.png', 'quat-vuong-dem-nhac-3d.png');
  await tpls.nth(1).click(); await snap('3d-tim.png');
  await tpls.nth(12).click(); await snap('3d-co-vu.png', 'quat-tron-co-vu-3d.png');

  expect(errors).toEqual([]);
});
