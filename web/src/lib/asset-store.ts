import { MarketingState } from '@/types';

export const DEFAULT_ASSET_DB = 'mivy-assets-v1';
export const ASSET_STORE_NAME = 'assets';
export const ASSET_REF_PREFIX = 'mivy-asset:';

export interface AssetRecord {
  id: string;
  data: string;
  updatedAt: number;
}

export interface AssetStoreOptions {
  dbName?: string;
  driver?: AssetStoreDriver;
}

export interface AssetStoreDriver {
  get(id: string): Promise<string | null>;
  set(id: string, data: string): Promise<void>;
  delete?(id: string): Promise<void>;
  clear?(): Promise<void>;
}

// In-memory fallback driver (cho môi trường không có IndexedDB hoặc khi bị chặn quyền)
const memoryStore = new Map<string, string>();
export const inMemoryDriver: AssetStoreDriver = {
  async get(id: string) {
    return memoryStore.get(id) || null;
  },
  async set(id: string, data: string) {
    memoryStore.set(id, data);
  },
  async delete(id: string) {
    memoryStore.delete(id);
  },
  async clear() {
    memoryStore.clear();
  },
};

export function isAssetRef(val?: string | null): boolean {
  return typeof val === 'string' && val.startsWith(ASSET_REF_PREFIX);
}

function generateAssetId(): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36);
  return `${ASSET_REF_PREFIX}${time}_${rand}`;
}

// Bộ nhớ đệm asset scoped theo từng store/db/driver namespace
const storeScopedCaches = new Map<string, Map<string, string>>();
const driverScopeIds = new WeakMap<AssetStoreDriver, string>();
let nextDriverId = 1;

function getStoreScopeKey(options?: AssetStoreOptions): string {
  if (options?.driver) {
    const anyDriver = options.driver as any;
    if (anyDriver.__storeId) return `driver:${anyDriver.__storeId}`;
    let id = driverScopeIds.get(options.driver);
    if (!id) {
      id = `driver_inst_${nextDriverId++}`;
      driverScopeIds.set(options.driver, id);
    }
    return `${id}:${options.dbName || 'default'}`;
  }
  return `idb:${options?.dbName || DEFAULT_ASSET_DB}`;
}

export function clearAssetCache(scopeKey?: string): void {
  if (scopeKey) {
    storeScopedCaches.delete(scopeKey);
  } else {
    storeScopedCaches.clear();
  }
}

/**
 * Băm 100% toàn bộ chuỗi nội dung theo FNV-1a kép (duyệt từng ký tự, không lấy mẫu).
 * Kết hợp dịch bit và vị trí để cả 2 hàm băm phân tán tốt trên tập ký tự ASCII.
 */
function computeFullContentHash(data: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const code = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ ((code << 1) ^ (i & 0xff)), 16777619);
  }
  return `full_${len}_${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

// Mở IndexedDB an toàn với cơ chế tự phục hồi schema nếu database bị mở rỗng trước đó
export function openAssetDB(dbName: string = DEFAULT_ASSET_DB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không khả dụng trong môi trường hiện tại'));
      return;
    }

    const req = window.indexedDB.open(dbName);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        // Schema bị poison từ trước: tăng version để kích hoạt onupgradeneeded tạo store assets
        const nextVersion = db.version + 1;
        db.close();
        const upgradeReq = window.indexedDB.open(dbName, nextVersion);
        upgradeReq.onupgradeneeded = () => {
          const udb = upgradeReq.result;
          if (!udb.objectStoreNames.contains(ASSET_STORE_NAME)) {
            udb.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
          }
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = () => reject(upgradeReq.error || new Error('Không thể nâng cấp IndexedDB schema'));
        return;
      }
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Không thể mở IndexedDB'));
  });
}
const openDB = openAssetDB;

/**
 * Lưu chuỗi data URI vào Asset Store (IndexedDB).
 * Nếu đã là URL thông thường hoặc asset ref, trả về nguyên dạng.
 * Tái sử dụng asset reference nếu cùng nội dung đã được persist thành công TRONG CÙNG STORE SCOPE.
 */
export async function saveAsset(
  dataUri: string,
  customId?: string,
  options?: AssetStoreOptions
): Promise<string> {
  if (!dataUri) return '';
  // Nếu đã là ref hoặc URL thông thường, không cần ghi đè
  if (isAssetRef(dataUri) || !dataUri.startsWith('data:')) {
    return dataUri;
  }

  const scopeKey = getStoreScopeKey(options);
  let scopeCache = storeScopedCaches.get(scopeKey);
  if (!scopeCache) {
    scopeCache = new Map<string, string>();
    storeScopedCaches.set(scopeKey, scopeCache);
  }

  const contentHash = computeFullContentHash(dataUri);
  const cachedRef = scopeCache.get(contentHash);
  if (cachedRef && !customId) {
    // Lấy full data từ store và so sánh chính xác tuyệt đối trước khi tái sử dụng
    // Triệt tiêu 100% rủi ro hash collision trả về nhầm ảnh khác
    let existingData: string | null = null;
    try {
      if (options?.driver) {
        existingData = await options.driver.get(cachedRef);
      } else if (typeof window !== 'undefined' && window.indexedDB) {
        existingData = await getAsset(cachedRef, options);
      }
    } catch {}

    if (existingData !== null && existingData === dataUri) {
      return cachedRef;
    } else {
      // Nếu không tồn tại hoặc dữ liệu khác nhau (collision), xóa cache entry đó
      scopeCache.delete(contentHash);
    }
  }

  const id = customId || generateAssetId();
  const dbName = options?.dbName || DEFAULT_ASSET_DB;

  if (options?.driver) {
    await options.driver.set(id, dataUri);
    // Chỉ cache vào scope này khi driver đã lưu thành công
    scopeCache.set(contentHash, id);
    return id;
  }

  const db = await openDB(dbName);
  return await new Promise<string>((resolve, reject) => {
    try {
      const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ASSET_STORE_NAME);
      const record: AssetRecord = { id, data: dataUri, updatedAt: Date.now() };
      store.put(record);

      // RESOLVE TRÊN TRANSACTION COMPLETE (Lỗi 5): Đảm bảo dữ liệu đã thực sự commit vào đĩa
      tx.oncomplete = () => {
        scopeCache?.set(contentHash, id);
        resolve(id);
      };
      tx.onerror = () => reject(tx.error || new Error('Lỗi transaction IndexedDB'));
      tx.onabort = () => reject(tx.error || new Error('Transaction IndexedDB bị hủy'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Lấy data URI từ Asset Store theo asset reference.
 * Nếu không phải asset ref, trả về nguyên dạng (URL HTTP hoặc legacy data URI).
 */
export async function getAsset(
  refOrUrl: string,
  options?: AssetStoreOptions
): Promise<string | null> {
  if (!refOrUrl) return null;
  if (!isAssetRef(refOrUrl)) {
    return refOrUrl;
  }

  const dbName = options?.dbName || DEFAULT_ASSET_DB;

  if (options?.driver) {
    return await options.driver.get(refOrUrl);
  }

  try {
    const db = await openDB(dbName);
    return await new Promise<string | null>((resolve, reject) => {
      try {
        const tx = db.transaction(ASSET_STORE_NAME, 'readonly');
        const store = tx.objectStore(ASSET_STORE_NAME);
        const req = store.get(refOrUrl);

        req.onsuccess = () => {
          const res = req.result as AssetRecord | undefined;
          resolve(res?.data || null);
        };
        req.onerror = () => reject(req.error || new Error('Lỗi đọc IndexedDB'));
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[AssetStore] Không thể đọc asset ${refOrUrl}:`, err);
    return null;
  }
}

export const IMAGE_FIELDS: (keyof MarketingState)[] = ['image', 'cutout', 'backgroundImage', 'bgUrl'];

/**
 * Lưu toàn bộ các trường ảnh data URI trong state sang Asset Store.
 * Trả về bản sao state với các trường ảnh được thay bằng asset reference.
 * Nếu một trường lưu thất bại, GIỮ NGUYÊN data URI trong bộ nhớ và ghi nhận vào failedFields.
 */
export async function persistStateAssets(
  state: MarketingState,
  options?: AssetStoreOptions
): Promise<{ state: MarketingState; failedFields: string[] }> {
  const result: MarketingState = { ...state };
  const failedFields: string[] = [];

  for (const field of IMAGE_FIELDS) {
    const val = state[field];
    if (typeof val === 'string' && val.startsWith('data:')) {
      try {
        const ref = await saveAsset(val, undefined, options);
        (result as any)[field] = ref;
      } catch (err) {
        console.warn(`[AssetStore] Lưu asset thất bại cho trường ${field}:`, err);
        failedFields.push(field);
        // Giữ nguyên in-memory data URI khi thất bại, không xóa rỗng
        (result as any)[field] = val;
      }
    }
  }

  return { state: result, failedFields };
}

/**
 * Giải mã các trường asset reference (mivy-asset:...) trong state thành data URI.
 * Giữ nguyên các trường HTTP URL hoặc legacy inline data URI.
 */
export async function resolveStateAssets(
  state: MarketingState,
  options?: AssetStoreOptions
): Promise<MarketingState> {
  const result: MarketingState = { ...state };

  await Promise.all(
    IMAGE_FIELDS.map(async (field) => {
      const val = state[field];
      if (typeof val === 'string' && isAssetRef(val)) {
        try {
          const resolved = await getAsset(val, options);
          if (resolved) {
            (result as any)[field] = resolved;
          }
        } catch (err) {
          console.warn(`[AssetStore] Giải mã asset thất bại cho trường ${field}:`, err);
        }
      }
    })
  );

  return result;
}
