import { MarketingState } from '../types';
import {
  persistStateAssets,
  resolveStateAssets,
  isAssetRef,
  AssetStoreOptions,
} from './asset-store';

export const DEFAULT_DRAFT_KEY = 'mivy-industry-drafts-v2';

export interface DraftStorageOptions extends AssetStoreOptions {
  storageKey?: string;
}

/**
 * Chuẩn bị state metadata để lưu an toàn vào LocalStorage:
 * - Bảo toàn 100% asset references (mivy-asset:...) và HTTP URLs.
 * - Bảo toàn các thông số crop, fit, zoom, dim, blur, x, y.
 * - Cho phép data URI nhỏ (< 8KB) lưu trực tiếp.
 * - Với data URI lớn chưa được persist, giữ nguyên tối đa có thể (được bảo vệ bởi try/catch).
 */
export function prepareDraftForMetadataStorage(state: MarketingState): MarketingState {
  const sanitizeField = (val?: string) => {
    if (!val) return '';
    // Giữ nguyên asset ref hoặc URL thông thường
    if (isAssetRef(val) || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
      return val;
    }
    // Nếu là data URI, cho phép data URI nhỏ (< 8KB)
    if (val.startsWith('data:')) {
      return val;
    }
    return val;
  };

  return {
    ...state,
    image: sanitizeField(state.image),
    cutout: sanitizeField(state.cutout),
    backgroundImage: sanitizeField(state.backgroundImage),
    bgUrl: sanitizeField(state.bgUrl),
  };
}

/**
 * Tạo trạng thái ban đầu sạch mặc định cho một ngành khi chưa có bản nháp:
 * Trả về clean defaults, không tự động chèn sample preview vào campaign data mới.
 */
export function createDefaultIndustryState(
  category: string,
  industry: MarketingState['industry'],
  current?: Partial<MarketingState>
): MarketingState {
  const empty = { headline: '', subline: '', cta: '', caption: '', points: [] };

  return {
    ...(current || {}),
    categoryId: category,
    industry,
    conceptId: undefined,
    templateId: undefined,
    industryFields: {},
    name: '',
    brand: current?.brand || 'Mivy',
    offer: '',
    details: '',
    goal: category,
    image: '',
    cutout: '',
    backgroundImage: '',
    bgUrl: '',
    facts: [],
    storyPage: 0,
    copies: {
      launch: { ...empty },
      story: { ...empty },
      action: { ...empty },
    },
  } as MarketingState;
}

/**
 * Đọc toàn bộ danh sách bản nháp từ storage
 */
export function getAllDrafts(
  storage?: Pick<Storage, 'getItem'> | null,
  storageKey: string = DEFAULT_DRAFT_KEY
): Record<string, MarketingState> {
  if (!storage || typeof storage.getItem !== 'function') return {};
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Lưu bản nháp cho một ngành vào storage (Metadata layer).
 * Nếu gặp lỗi QuotaExceeded: bảo toàn toàn bộ dữ liệu storage trước đó,
 * tuyệt đối không xóa nháp ngành khác, trả về false để báo failure.
 */
export function saveIndustryDraft(
  state: MarketingState,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  storageKey: string = DEFAULT_DRAFT_KEY
): boolean {
  if (!storage || typeof storage.setItem !== 'function') return false;
  const id = state.categoryId || (state.industry === 'general' ? 'retail' : state.industry);
  const drafts = getAllDrafts(storage, storageKey);

  drafts[id] = prepareDraftForMetadataStorage(state);

  try {
    storage.setItem(storageKey, JSON.stringify(drafts));
    return true;
  } catch (err) {
    console.warn('[Drafts] Lỗi lưu drafts vào storage (quota):', err);
    // Bảo toàn storage cũ của các ngành khác, báo failure
    return false;
  }
}

/**
 * Hàm đồng bộ chuyển ngành:
 * - Lưu metadata của ngành cũ vào drafts.
 * - Khôi phục metadata của ngành mới nếu đã có, hoặc tạo mặc định từ CATEGORY_SAMPLES.
 */
export function switchIndustry(
  current: MarketingState,
  category: string,
  industry: MarketingState['industry'],
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  options?: DraftStorageOptions
): MarketingState {
  const key = options?.storageKey || DEFAULT_DRAFT_KEY;
  const id = current.categoryId || (current.industry === 'general' ? 'retail' : current.industry);
  if (id === category) return current;

  // 1. Lưu bản nháp ngành cũ vào metadata storage
  saveIndustryDraft(current, storage, key);

  // 2. Đọc lại danh sách bản nháp
  const drafts = getAllDrafts(storage, key);

  // 3. Nếu ngành mục tiêu đã có bản nháp, khôi phục và đảm bảo đúng categoryId & industry
  if (drafts[category]) {
    return {
      ...drafts[category],
      categoryId: category,
      industry,
    };
  }

  // 4. Nếu chưa có bản nháp, tạo mặc định đầy đủ nội dung mẫu
  return createDefaultIndustryState(category, industry, current);
}

/**
 * Hàm bất đồng bộ chuyển ngành đầy đủ cả 2 lớp (Two-tier switch):
 * - Persist các ảnh data URI của ngành hiện tại vào Asset Store (IndexedDB).
 * - Chuyển ngành và lưu metadata gọn nhẹ (chứa mivy-asset:...).
 * - Khôi phục các asset references của ngành mục tiêu từ Asset Store thành data URI.
 */
export async function switchIndustryAsync(
  current: MarketingState,
  category: string,
  industry: MarketingState['industry'],
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  options?: DraftStorageOptions
): Promise<{ nextState: MarketingState; failedFields: string[] }> {
  // 1. Lưu assets của ngành hiện tại vào Asset Store trước
  const { state: persistedCurrent, failedFields } = await persistStateAssets(current, options);

  // 2. Chuyển ngành metadata
  const nextMeta = switchIndustry(persistedCurrent, category, industry, storage, options);

  // 3. Khôi phục assets của ngành mới từ Asset Store
  const resolvedNext = await resolveStateAssets(nextMeta, options);

  return { nextState: resolvedNext, failedFields };
}
