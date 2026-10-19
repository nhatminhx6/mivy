// QC capture: renderer đẩy bounding box vào global để audit (đè nhau / tràn khung).
// Chỉ hoạt động khi window.__QC_ON = true → 0 chi phí ở production.
export type QCBoxType = 'content' | 'cta' | 'decor' | 'sticker';
export interface QCBox { t: QCBoxType; x: number; y: number; w: number; h: number; id: string; tag?: string }

export function qcBox(t: QCBoxType, x: number, y: number, w: number, h: number, tag?: string) {
  const g = globalThis as unknown as { __QC_ON?: boolean; __qcBoxes?: QCBox[]; __QC_ID?: string };
  if (!g.__QC_ON) return;
  if (!g.__qcBoxes) g.__qcBoxes = [];
  g.__qcBoxes.push({ t, x, y, w, h, id: g.__QC_ID || '?', tag });
}
