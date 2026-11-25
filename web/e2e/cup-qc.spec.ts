import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// QC Ly in logo: mọi loại ly × dung tích × mẫu — khuôn quạt đúng toán (R, r, góc θ: cung ngoài = chu vi miệng,
// cung trong = chu vi đáy), chữ nằm trong vùng an toàn (né cuộn miệng / gấp đáy), tải PNG/PDF/SVG, 3D dựng được.
const OUT = process.env.QC_OUT || path.join(__dirname, '..', 'test-results', 'cup');
const SIZES: Record<string, [number, number, number]> = { p8: [80, 56, 92], p12: [90, 60, 110], p16: [90, 60, 136], t360: [95, 56, 92], t500: [95, 58, 118], t700: [95, 60, 150] };
const KIND_SIZES = { paper: ['p8', 'p12', 'p16'], pet: ['t360', 't500', 't700'] } as const;
const SAFE = { paper: { top: 8, bottom: 10 }, pet: { top: 11, bottom: 9 } };
const geom = ([dt, db, h]: [number, number, number]) => {
  const rt = dt / 2, rb = db / 2, l = Math.hypot(h, rt - rb), R = (l * rt) / (rt - rb), r = R - l;
  return { R, r, th: (2 * Math.PI * rt) / R, l };
};
// PNG 24×24 hợp lệ (tạo bằng zlib) làm logo thử
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function makePng(): Buffer {
  const w = 24, h = 24, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = (x * 10) & 255; raw[o + 2] = (y * 10) & 255; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PNG1 = makePng();

test('Ly in logo: mọi ly × dung tích × mẫu, khuôn quạt đúng toán, tải file', async ({ page }) => {
  test.setTimeout(420_000);
  fs.mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio/cup');
  const tpls = page.getByTestId('cup-tpl');
  await expect(tpls.first()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('tab-flat').click();
  const dieReady = () => expect(page.locator('[data-testid="cup-die"][data-ready="1"]')).toHaveCount(1, { timeout: 20_000 });

  let n = 0;
  for (const kind of ['paper', 'pet'] as const) {
    await page.getByTestId(`cup-kind-${kind}`).click();
    const sizes = page.locator('[data-testid="cup-sizes"] button');
    await expect(sizes).toHaveCount(3);
    for (let si = 0; si < 3; si++) {
      const id = KIND_SIZES[kind][si];
      await sizes.nth(si).click();
      await dieReady();
      const g = geom(SIZES[id]);
      const die = await page.locator('[data-testid="cup-die"] svg').evaluate((s) => ({
        R: +s.getAttribute('data-R')!, r: +s.getAttribute('data-r')!, th: +s.getAttribute('data-theta')!,
        cut: (s.querySelector('#CutContour path') as SVGPathElement).getAttribute('d')!,
        img: !!s.querySelector('#In image')?.getAttribute('href')?.startsWith('data:image/'),
      }));
      const [dt, db] = SIZES[id];
      expect(Math.abs(die.R - g.R), `${id}: R`).toBeLessThan(0.01);
      expect(Math.abs(die.r - g.r), `${id}: r`).toBeLessThan(0.01);
      expect(Math.abs(die.th - g.th), `${id}: θ`).toBeLessThan(1e-4);
      expect(Math.abs(die.R * die.th - Math.PI * dt), `${id}: cung ngoài = chu vi miệng`).toBeLessThan(0.05);
      expect(Math.abs(die.r * die.th - Math.PI * db), `${id}: cung trong = chu vi đáy`).toBeLessThan(0.05);
      expect((die.cut.match(/A/g) || []).length, `${id}: khuôn có 2 cung`).toBe(2);
      expect(die.img, `${id}: có ảnh in đã uốn`).toBe(true);
      const shoot = si === 1;
      for (let i = 0; i < await tpls.count(); i++) {
        await tpls.nth(i).click();
        await dieReady();
        const r = await page.locator('[data-testid="cup-art"] svg').evaluate((svg: SVGSVGElement) => {
          const W = +svg.getAttribute('data-w')!, H = +svg.getAttribute('data-h')!;
          // dọc: theo đường chân chữ + cỡ chữ (dấu tiếng Việt cao ~1.02em, chân ~0.24em) — không dùng hộp dòng của font (Baloo rất cao)
          const boxes = Array.from(svg.querySelectorAll('text')).filter((t) => (t.textContent || '').trim()).map((t) => {
            const b = t.getBBox(), fs = parseFloat(t.getAttribute('font-size') || '0'), base = parseFloat(t.getAttribute('y') || '0');
            return { t: t.textContent, x: b.x, y: base - fs * 1.02, w: b.width, h: fs * 1.26 };
          });
          return { W, H, boxes };
        });
        expect(Math.abs(r.W - Math.PI * dt), `${id} mẫu ${i}: rộng = chu vi miệng`).toBeLessThan(0.05);
        expect(Math.abs(r.H - g.l), `${id} mẫu ${i}: cao = đường sinh`).toBeLessThan(0.05);
        expect(r.boxes.length, `${id} mẫu ${i}: có chữ`).toBeGreaterThanOrEqual(3);
        const sf = SAFE[kind];
        for (const b of r.boxes) {
          expect(b.x >= -0.3 && b.x + b.w <= r.W + 0.3, `${id} mẫu ${i}: "${b.t}" tràn ngang`).toBe(true);
          expect(b.y >= sf.top - 1 && b.y + b.h <= r.H - sf.bottom + 1, `${id} mẫu ${i}: "${b.t}" lấn vùng cuộn miệng/gấp đáy (${b.y.toFixed(1)}–${(b.y + b.h).toFixed(1)} / ${r.H.toFixed(1)})`).toBe(true);
        }
        // các dòng chữ không đè nhau
        for (let a = 0; a < r.boxes.length; a++) for (let c = a + 1; c < r.boxes.length; c++) {
          const A = r.boxes[a], B = r.boxes[c];
          const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), oy = Math.min(A.y + A.h * 0.9, B.y + B.h * 0.9) - Math.max(A.y + A.h * 0.2, B.y + B.h * 0.2);
          expect(ox > 0.5 && oy > 0.5, `${id} mẫu ${i}: "${A.t}" đè "${B.t}"`).toBe(false);
        }
        if (shoot) {
          await page.getByTestId('cup-art').screenshot({ path: path.join(OUT, `${id}-mau-${String(i + 1).padStart(2, '0')}.png`) });
          if (i === 0 || i === 2) await page.getByTestId('cup-die').screenshot({ path: path.join(OUT, `${id}-khuon-${i + 1}.png`) });
        }
        n++;
      }
    }
  }
  expect(n).toBe(72);

  // ly nhựa: 1 màu → khuôn ghi đúng 1 màu pha
  await page.locator('[data-testid="cup-colors"] button').first().click();
  await dieReady();
  expect(await page.locator('[data-testid="cup-die"] svg').textContent()).toContain('1 màu pha');
  await page.locator('[data-testid="cup-lids"] button').nth(1).click();

  // sửa chữ + logo
  await page.getByTestId('cup-kind-paper').click();
  await tpls.first().click();
  await page.getByTestId('cup-brand').fill('TIỆM CÀ PHÊ QUỐC BẢO');
  await page.getByTestId('cup-logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG1 });
  await expect(page.locator('[data-testid="cup-art"] svg image')).toHaveCount(1, { timeout: 10_000 });
  await dieReady();
  expect(await page.locator('[data-testid="cup-art"] svg').textContent()).toContain('QUỐC BẢO');

  const grab = async (id: string) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.getByTestId(id).click()]);
    const p = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(p); return p;
  };
  const png = fs.readFileSync(await grab('cup-png'));
  expect(png.readUInt32BE(16)).toBe(2400);
  const pdf = fs.readFileSync(await grab('cup-pdf'));
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(100_000);
  const svg = fs.readFileSync(await grab('cup-svg'), 'utf8');
  expect(svg).toContain('id="CutContour"');
  expect(svg).toContain('data:image/jpeg');
  expect(svg).not.toMatch(/<text[\s>]/);

  // 3D dựng được (khung xem + ảnh chụp)
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="mockup-3d"] canvas')).toHaveCount(1, { timeout: 30_000 });
  const snap = await page.evaluate(async () => (await (window as unknown as { __cupSnap: (w: number, h: number) => Promise<string> }).__cupSnap(1200, 900)));
  expect(snap.length).toBeGreaterThan(80_000);
  fs.writeFileSync(path.join(OUT, 'ly-3d.png'), Buffer.from(snap.split(',')[1], 'base64'));
  const p3 = fs.readFileSync(await grab('cup-3d-png'));
  expect(p3.readUInt32BE(16)).toBe(1600);
  await expect(page.getByRole('button', { name: /Gửi yêu cầu in|Đặt in/ })).toBeVisible();
  expect(errors).toEqual([]);
});
