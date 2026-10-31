'use client';
// Tự lưu bài đang làm vào IndexedDB của trình duyệt (ảnh to, localStorage không đủ chỗ). Mở lại trang là làm tiếp.

const DB = 'mivy', STORE = 'projects';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function saveProject<T>(key: string, value: T): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  db.close();
}
export async function loadProject<T>(key: string): Promise<T | null> {
  const db = await open();
  const v = await new Promise<T | null>((res, rej) => { const r = db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res((r.result as T) ?? null); r.onerror = () => rej(r.error); });
  db.close(); return v;
}
export async function clearProject(key: string): Promise<void> {
  const db = await open();
  await new Promise<void>((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); });
  db.close();
}

// blob:/đường dẫn → data URL để lưu bền (blob URL chết khi tải lại trang). Có cache để khỏi đổi lại.
const cache = new Map<string, string>();
export async function persistUrl(url: string): Promise<string> {
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  const hit = cache.get(url); if (hit) return hit;
  const blob = await (await fetch(url)).blob();
  const d = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
  cache.set(url, d); return d;
}
