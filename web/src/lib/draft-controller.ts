import { MarketingState } from '@/types';
import { CATEGORIES } from './template-catalog';
import {
  persistStateAssets,
  resolveStateAssets,
  AssetStoreOptions,
  IMAGE_FIELDS,
} from './asset-store';
import {
  switchIndustry,
  saveIndustryDraft,
  getAllDrafts,
  createDefaultIndustryState,
  DEFAULT_DRAFT_KEY,
} from './industry-drafts';

export interface DraftControllerConfig {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  draftKey?: string;
  assetOptions?: AssetStoreOptions;
  initialState: MarketingState;
  onStateChange: (state: MarketingState) => void;
  onStatusText?: (text: string) => void;
}

/**
 * Production DraftController: Quản lý toàn bộ vòng đời lưu trữ,
 * chuyển đổi ngành, phục hồi bản nháp và đồng bộ bất đồng bộ.
 * Đảm bảo tính toàn vẹn dữ liệu, giải quyết race conditions và quota issues.
 */
export class DraftController {
  private storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  private storageKey: string;
  private draftKey: string;
  private assetOptions?: AssetStoreOptions;

  private state: MarketingState;
  private onStateChange: (state: MarketingState) => void;
  private onStatusText?: (text: string) => void;

  // Concurrency & Revision Management
  public activeSwitchToken = 0;
  public activeSaveSeq = 0;
  public stateRevision = 0;
  public saveTimer: NodeJS.Timeout | null = null;

  // Recoverable In-Memory Drafts Map (Bảo vệ dữ liệu khi LocalStorage đầy quota)
  public inMemoryDrafts: Record<string, MarketingState> = {};

  constructor(config: DraftControllerConfig) {
    this.storage = config.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    this.storageKey = config.storageKey || 'mivy-marketing-v1';
    this.draftKey = config.draftKey || DEFAULT_DRAFT_KEY;
    this.assetOptions = config.assetOptions;
    this.state = config.initialState;
    this.onStateChange = config.onStateChange;
    this.onStatusText = config.onStatusText;
  }

  public getState(): MarketingState {
    return this.state;
  }

  public setState(next: MarketingState): void {
    this.state = next;
    this.onStateChange(next);
  }

  /**
   * Khôi phục bản nháp ban đầu khi mount trang.
   * Khắc phục Lỗi 4: Nếu người dùng đã gõ text trong lúc giải mã ảnh,
   * giữ nguyên text edit và vẫn giải mã ảnh thành công vào canvas.
   */
  public async loadInitialDraft(): Promise<void> {
    const initialRev = this.stateRevision;
    if (!this.storage) return;

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Nạp metadata ngay lập tức nếu chưa có thao tác người dùng nào
      if (this.stateRevision === initialRev) {
        this.setState({
          ...this.getState(),
          ...parsed,
          layoutMode: parsed.layoutMode || 'full_photo',
        });
      }

      // Bất đồng bộ giải mã asset references từ IndexedDB
      const resolved = await resolveStateAssets(parsed, this.assetOptions);

      // MERGE THÔNG MINH: Giữ nguyên text edits của người dùng, giải mã các trường ảnh chưa bị thay đổi
      const cur = this.getState();
      const curCat = cur.categoryId || (cur.industry === 'general' ? 'retail' : cur.industry);
      const parsedCat = parsed.categoryId || (parsed.industry === 'general' ? 'retail' : parsed.industry);
      if (curCat !== parsedCat) {
        return; // Người dùng đã chuyển ngành khác trong lúc chờ
      }

      const merged = { ...cur };
      let updatedImages = false;

      for (const field of IMAGE_FIELDS) {
        // Nếu trường ảnh trong state hiện tại vẫn khớp với ref ban đầu được load từ metadata
        if (cur[field] === parsed[field]) {
          (merged as any)[field] = resolved[field];
          updatedImages = true;
        }
      }

      if (updatedImages) {
        this.setState(merged);
      }
    } catch (e) {
      console.warn('[DraftController] Lỗi nạp bản nháp ban đầu:', e);
    }
  }

  /**
   * Lưu state với debounce.
   * Khắc phục Lỗi 2: Invalidate activeSwitchToken để resolve cũ không đè edit mới.
   * Khắc phục Lỗi 3: In-memory drafts lưu trước, báo lỗi rõ ràng nếu LocalStorage đầy.
   */
  public saveState(newState: MarketingState, delayMs = 150): void {
    this.stateRevision++;
    const saveSeq = ++this.activeSaveSeq;
    // Invalidate bất kỳ in-flight target asset resolution nào của switch cũ
    this.activeSwitchToken++;

    this.setState(newState);

    const currentCat = newState.categoryId || (newState.industry === 'general' ? 'retail' : newState.industry);
    // Luôn lưu bản nháp mới nhất vào in-memory recoverable drafts
    this.inMemoryDrafts[currentCat] = newState;

    if (!this.storage) return;

    // Lưu metadata nhanh (nếu storage cho phép)
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(newState));
    } catch {}

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      if (this.activeSaveSeq !== saveSeq) return;

      try {
        const { state: persistedState, failedFields } = await persistStateAssets(newState, this.assetOptions);

        // GUARD SAU AWAIT: Nếu có save mới hơn đã được gọi, hủy bỏ commit cũ ngay!
        if (this.activeSaveSeq !== saveSeq) return;

        if (failedFields.length > 0) {
          this.onStatusText?.('Không thể lưu ảnh vào bộ nhớ trình duyệt (hết dung lượng). Ảnh vẫn hiển thị trong phiên này.');
        }

        if (this.activeSaveSeq !== saveSeq) return;

        try {
          this.storage?.setItem(this.storageKey, JSON.stringify(persistedState));
          const savedOk = saveIndustryDraft(persistedState, this.storage, this.draftKey);
          if (!savedOk) {
            this.onStatusText?.('Bản nháp chưa lưu được vào trình duyệt do đầy bộ nhớ. Bản nháp được lưu tạm trong bộ nhớ phiên này.');
          }
        } catch (err) {
          this.onStatusText?.('Bản nháp chưa lưu được vào trình duyệt. Anh giữ nguyên ngành hiện tại và tải nội dung trước.');
        }
      } catch (err) {
        if (this.activeSaveSeq !== saveSeq) return;
        console.warn('[DraftController] Lỗi saveState:', err);
      }
    }, delayMs);
  }

  /**
   * Chuyển đổi ngành an toàn với bảo vệ đa tầng.
   * Khắc phục Lỗi 1: Clear timer và invalidate activeSaveSeq để save A không đè lên B.
   * Khắc phục Lỗi 2: Guard sau mỗi await, bảo toàn thao tác edit/xóa ảnh của người dùng.
   * Khắc phục Lỗi 3: In-memory per-category fallback bảo vệ bản nháp chưa lưu khi LocalStorage quota error.
   */
  public async changeCategory(categoryId: string, persistDelayMs = 0): Promise<void> {
    const category = CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;
    const currentState = this.getState();
    const currentCatId = currentState.categoryId || (currentState.industry === 'general' ? 'retail' : currentState.industry);
    if (currentCatId === categoryId) return;

    // 1. HỦY TOÀN BỘ SAVE IN-FLIGHT CỦA NGÀNH CŨ (Lỗi 1)
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.activeSaveSeq++;

    const token = ++this.activeSwitchToken;
    this.stateRevision++;

    // 2. Persist assets của ngành hiện tại vào Asset Store
    let currentWithRefs = currentState;
    try {
      if (persistDelayMs > 0) {
        await new Promise((r) => setTimeout(r, persistDelayMs));
      }
      const persistRes = await persistStateAssets(currentState, this.assetOptions);

      // GUARD SAU AWAIT 1
      if (this.activeSwitchToken !== token) return;

      currentWithRefs = persistRes.state;
      if (persistRes.failedFields.length > 0) {
        this.onStatusText?.('Không thể lưu ảnh vào bộ nhớ trình duyệt (hết dung lượng). Ảnh vẫn hiển thị trong phiên này.');
      }
    } catch (err) {
      if (this.activeSwitchToken !== token) return;
      console.warn('[DraftController] Lỗi persist assets trước switch:', err);
    }

    if (this.activeSwitchToken !== token) return;

    // 3. Lưu bản nháp ngành cũ vào In-Memory Drafts (Lỗi 3)
    this.inMemoryDrafts[currentCatId] = currentWithRefs;

    // Lưu vào LocalStorage
    if (this.storage) {
      const savedOk = saveIndustryDraft(currentWithRefs, this.storage, this.draftKey);
      if (!savedOk) {
        this.onStatusText?.('Bộ nhớ trình duyệt đã đầy. Bản nháp ngành cũ được lưu tạm trong bộ nhớ phiên này. Anh nên tải nội dung về máy trước khi đóng trang.');
      }
    }

    // 4. Lấy metadata của ngành mới (Ưu tiên storage, fallback sang in-memory drafts)
    const storageDrafts = getAllDrafts(this.storage, this.draftKey);
    let nextMeta: MarketingState;

    if (storageDrafts[category.id]) {
      nextMeta = { ...storageDrafts[category.id], categoryId: category.id, industry: category.industry };
    } else if (this.inMemoryDrafts[category.id]) {
      nextMeta = { ...this.inMemoryDrafts[category.id], categoryId: category.id, industry: category.industry };
    } else {
      nextMeta = createDefaultIndustryState(category.id, category.industry, currentWithRefs);
    }

    if (this.activeSwitchToken !== token) return;

    // 5. Optimistic UI update
    this.setState(nextMeta);

    try {
      if (this.storage) {
        this.storage.setItem(this.storageKey, JSON.stringify(nextMeta));
      }
    } catch {}

    // 6. Bất đồng bộ giải mã asset references của ngành mới
    try {
      const resolvedState = await resolveStateAssets(nextMeta, this.assetOptions);

      // GUARD SAU AWAIT 2 (Lỗi 2)
      if (this.activeSwitchToken !== token) return;

      // Merge thông minh: Nếu người dùng đã edit hoặc gỡ ảnh trong lúc giải mã, bảo toàn thao tác của user
      const activeCurrent = this.getState();
      const activeCurrentCat = activeCurrent.categoryId || (activeCurrent.industry === 'general' ? 'retail' : activeCurrent.industry);
      if (activeCurrentCat !== category.id) return;

      const merged = { ...activeCurrent };
      for (const field of IMAGE_FIELDS) {
        // Chỉ cập nhật nếu trường ảnh trong activeCurrent vẫn khớp với nextMeta (chưa bị user gỡ hoặc sửa)
        if (activeCurrent[field] === nextMeta[field]) {
          (merged as any)[field] = resolvedState[field];
        }
      }

      this.setState(merged);
    } catch (err) {
      if (this.activeSwitchToken !== token) return;
      console.warn('[DraftController] Lỗi giải mã asset ngành mới:', err);
    }
  }
}
