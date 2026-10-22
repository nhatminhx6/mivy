import { test, expect } from '@playwright/test';

// QC: preview poster KHÔNG bị cắt (nằm trọn trong card) + có bo góc hiển thị.
// Kiểm ở nhiều khổ (4:5 cao nhất dễ tràn) để không tái phát lỗi "mất góc".

const SIZES = [
  { name: 'Dọc 4:5', label: 'Dọc 4:5' },
  { name: 'Story 9:16', label: 'Story 9:16' },
];

test('Preview poster vừa khung, không bị cắt + bo góc', async ({ page }) => {
  await page.goto('/studio/marketing');
  await page.waitForSelector('[data-testid="ad-preview"]', { timeout: 30_000 });

  for (const s of SIZES) {
    await page.getByRole('button', { name: s.label, exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const res = await page.evaluate(() => {
      const node = document.querySelector('[data-testid="ad-preview"]') as HTMLElement | null;
      const wrap = node?.parentElement as HTMLElement | null;      // div bo góc + overflow
      const card = node?.closest('.group') as HTMLElement | null;  // card preview
      if (!node || !wrap || !card) return null;
      const nr = node.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      return {
        radius: parseFloat(getComputedStyle(wrap).borderTopLeftRadius) || 0,
        // node phải nằm trong card (không tràn/không bị cắt quá 1px)
        fitsBottom: nr.bottom <= cr.bottom + 1,
        fitsTop: nr.top >= cr.top - 1,
        nodeH: Math.round(nr.height), cardH: Math.round(cr.height),
      };
    });
    expect(res, `tìm thấy preview cho ${s.name}`).not.toBeNull();
    expect(res!.radius, `${s.name}: preview phải bo góc`).toBeGreaterThan(4);
    expect(res!.fitsBottom, `${s.name}: poster không bị cắt đáy (nodeH=${res!.nodeH}, cardH=${res!.cardH})`).toBeTruthy();
    expect(res!.fitsTop, `${s.name}: poster không bị cắt đỉnh`).toBeTruthy();
  }
});
