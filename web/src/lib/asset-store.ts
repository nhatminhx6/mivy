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

// Mở IndexedDB an toàn
function openDB(dbName: string = DEFAULT_ASSET_DB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không khả dụng trong môi trường hiện tại'));
      return;
    }

    const req = window.indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Không thể mở IndexedDB'));
  });
}

/**
 * Lưu chuỗi data URI vào Asset Store (IndexedDB).
 * Nếu đã là URL thông thường hoặc asset ref, trả về nguyên dạng.
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

  const id = customId || generateAssetId();
  const dbName = options?.dbName || DEFAULT_ASSET_DB;

  if (options?.driver) {
    await options.driver.set(id, dataUri);
    return id;
  }

  try {
    const db = await openDB(dbName);
    return await new Promise<string>((resolve, reject) => {
      try {
        const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
        const store = tx.objectStore(ASSET_STORE_NAME);
        const record: AssetRecord = { id, data: dataUri, updatedAt: Date.now() };
        const req = store.put(record);

        req.onsuccess = () => resolve(id);
        req.onerror = () => reject(req.error || new Error('Lỗi ghi IndexedDB'));
        tx.onabort = () => reject(tx.error || new Error('Transaction IndexedDB bị hủy'));
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    // Nếu môi trường không hỗ trợ IndexedDB, thử lưu vào in-memory fallback
    if (typeof window === 'undefined' || !window.indexedDB) {
      await inMemoryDriver.set(id, dataUri);
      return id;
    }
    // Ném lỗi để caller biết lưu thất bại, không tự nhận lưu thành công
    throw err;
  }
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
    if (typeof window === 'undefined' || !window.indexedDB) {
      return await inMemoryDriver.get(refOrUrl);
    }
    console.warn(`[AssetStore] Không thể đọc asset ${refOrUrl}:`, err);
    return null;
  }
}

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

  const fields: (keyof MarketingState)[] = ['image', 'cutout', 'backgroundImage'];

  for (const field of fields) {
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
  const fields: (keyof MarketingState)[] = ['image', 'cutout', 'backgroundImage'];

  await Promise.all(
    fields.map(async (field) => {
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
