const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:3009';

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'chrome' }); }
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const results = [];
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  const preview = () => page.locator('[data-testid="ad-preview"]');
  const snap = async () => { try { return await preview().innerHTML(); } catch { return '__none__'; } };
  async function check(name, fn) {
    const before = await snap();
    try { await fn(); } catch (e) { results.push([name, 'ERR', e.message.slice(0, 60)]); return; }
    await page.waitForTimeout(350);
    const after = await snap();
    results.push([name, before !== after && after !== '__none__' ? 'OK' : 'NO-EFFECT', '']);
  }
  const setRange = async (loc, v) => loc.evaluate((el, val) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(v));

  await page.goto(`${BASE}/studio/marketing`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Tiếp → Soạn & tải' }).click();
  await page.waitForTimeout(400);
  // chọn skin Vintage
  await page.locator('button[title="Cổ điển / Vintage"]').click();
  await page.waitForTimeout(500);
  if (await preview().count() === 0) { console.log('PREVIEW NOT FOUND after selecting skin'); }

  // ---- TAB NỘI DUNG (mặc định) ----
  await check('Tiêu đề (input)', async () => {
    await page.locator('xpath=//label[normalize-space()="Tiêu đề Poster"]/following::input[1]').fill('QC HEADLINE ' + Date.now());
  });
  await check('Slogan (input)', async () => {
    await page.locator('xpath=//label[contains(normalize-space(),"Slogan")]/following::input[1]').fill('QC slogan ' + Date.now());
  });
  await check('CTA (input)', async () => {
    await page.locator('xpath=//label[contains(normalize-space(),"CTA")]/following::input[1]').fill('QC CTA ' + Date.now());
  });

  // ---- TAB THIẾT KẾ ----
  await page.getByRole('button', { name: /Thiết kế & Trang trí/ }).click();
  await page.waitForTimeout(300);

  await check('Gợi ý: Ngành (select)', async () => {
    await page.locator('select[title="Ngành hàng"]').selectOption({ index: 2 });
  });
  await check('Đổi nền (button)', async () => {
    await page.getByRole('button', { name: 'Đổi nền' }).click();
  });
  await check('Bỏ nền (button)', async () => {
    await page.getByRole('button', { name: 'Bỏ nền' }).click();
  });
  await check('Viền (slider)', async () => {
    await setRange(page.locator('input[type=range]').nth(0), 16);
  });
  await check('Bo góc (slider)', async () => {
    await setRange(page.locator('input[type=range]').nth(1), 50);
  });
  await check('Màu viền (color)', async () => {
    await page.locator('input[type=color]').evaluate((el) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, '#ff0000');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await check('Dịp: Tết (dropdown)', async () => {
    await page.locator('[data-testid="season-select"]').selectOption('tet');
  });
  await check('Kiểu decor: Huy hiệu', async () => {
    await page.getByRole('button', { name: 'Huy hiệu' }).click();
  });
  await check('Kiểu decor: Dải ngang', async () => {
    await page.getByRole('button', { name: 'Dải ngang' }).click();
  });
  await check('Kiểu decor: Góc hoạ tiết', async () => {
    await page.getByRole('button', { name: 'Góc hoạ tiết' }).click();
  });

  // ---- ĐỔI SKIN ----
  await check('Đổi skin: Art Deco', async () => {
    await page.locator('button[title="Art Deco"]').click();
  });
  await check('Đổi skin: Đêm nến', async () => {
    await page.locator('button[title="Đêm nến"]').click();
  });

  // ================= CHẾ ĐỘ CANVAS (Mặc định) =================
  await page.getByRole('button', { name: /Mặc định/ }).first().click();
  await page.waitForTimeout(500);
  const canvasSnap = async () => page.evaluate(() => {
    const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : '__none__';
  });
  async function checkC(name, fn) {
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const before = await canvasSnap();
    try { await fn(); } catch (e) { results.push([name, 'ERR', e.message.slice(0, 60)]); return; }
    await page.waitForTimeout(900);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const after = await canvasSnap();
    results.push([name, before !== after && after !== '__none__' ? 'OK' : 'NO-EFFECT', '']);
  }
  await page.getByRole('button', { name: /Thiết kế & Trang trí/ }).click();
  await page.waitForTimeout(200);
  // Trên canvas sạch trước (chưa có decor dịp):
  { const k = page.getByRole('button', { name: /Bảng Ma Trận/ }); if (await k.count()) await checkC('[canvas] Kiểu (layout)', async () => k.click()); }
  { const t = page.getByRole('button', { name: 'Warm Editorial' }); if (await t.count()) await checkC('[canvas] Phong cách (theme)', async () => t.click()); }
  await page.locator('[data-testid="season-select"]').selectOption('8thang3'); await page.waitForTimeout(600);
  await checkC('[canvas] Dịp (8/3→Tết)', async () => page.locator('[data-testid="season-select"]').selectOption('tet'));
  await checkC('[canvas] Kiểu decor: Huy hiệu', async () => page.getByRole('button', { name: 'Huy hiệu' }).click());
  await checkC('[canvas] Kiểu decor: Dải ngang', async () => page.getByRole('button', { name: 'Dải ngang' }).click());
  await checkC('[canvas] Viền', async () => setRange(page.locator('input[type=range]').nth(0), 20));
  await checkC('[canvas] Bo góc', async () => setRange(page.locator('input[type=range]').nth(1), 55));
  await checkC('[canvas] Màu viền', async () => page.locator('input[type=color]').evaluate((el) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, '#22ff88'); el.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  await checkC('[canvas] Khổ (aspect)', async () => page.locator('select').filter({ hasText: /Vuông|Dọc|Story/ }).first().selectOption('1:1'));
  await checkC('[canvas] Đổi nền', async () => page.getByRole('button', { name: 'Đổi nền' }).click());
  await checkC('[canvas] Bỏ nền', async () => { const b = page.getByRole('button', { name: 'Bỏ nền' }); if (await b.count()) await b.click(); else throw new Error('Bỏ nền ẩn (không có nền)'); });

  await browser.close();

  console.log('\n===== QC OPTIONS REPORT =====');
  for (const [n, s, d] of results) console.log(`${s.padEnd(10)} ${n}${d ? '  — ' + d : ''}`);
  const bad = results.filter((r) => r[1] !== 'OK');
  console.log(`\n${results.length - bad.length}/${results.length} OK`);
  if (bad.length) console.log('FAIL:', bad.map((b) => b[0]).join(' | '));
  if (errors.length) console.log('\nCONSOLE ERRORS:', [...new Set(errors)].slice(0, 5).join(' || '));
})().catch((e) => { console.error('QC FAIL', e.message); process.exit(1); });
