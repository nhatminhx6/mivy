import { MarketingState, BrandKit } from '@/types';
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
import { clampStoryPageInState } from './balanced-pages';

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

  // Lifecycle & Cancellation
  public isDisposed = false;

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
    if (this.isDisposed) return;
    this.state = next;
    this.onStateChange(next);
  }

  /**
   * Hủy bỏ toàn bộ timer, token và ngăn chặn rò rỉ bộ nhớ / StrictMode race conditions.
   */
  public dispose(): void {
    this.isDisposed = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.activeSwitchToken++;
    this.activeSaveSeq++;
  }

  /**
   * Đồng bộ duy nhất trạng thái BrandKit qua controller (tránh React setState ngoài controller ghi đè).
   */
  public setBrandKit(brandKit?: BrandKit): void {
    if (this.isDisposed) return;
    const current = this.getState();
    const next = { ...current, brandKit };
    this.setState(next);
  }

  /**
   * Khôi phục bản nháp ban đầu khi mount trang.
   * Khắc phục Lỗi 4: Nếu người dùng đã gõ text trong lúc giải mã ảnh,
   * giữ nguyên text edit và vẫn giải mã ảnh thành công vào canvas.
   */
  public async loadInitialDraft(): Promise<void> {
    if (this.isDisposed) return;
    const initialRev = this.stateRevision;
    if (!this.storage) return;

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Nạp metadata ngay lập tức nếu chưa có thao tác người dùng nào
      if (!this.isDisposed && this.stateRevision === initialRev) {
        const curBrand = this.getState().brandKit;
        const initialMeta = {
          ...this.getState(),
          ...parsed,
          layoutMode: parsed.layoutMode || 'full_photo',
        };
        if (curBrand) {
          initialMeta.brandKit = curBrand;
        }
        this.setState(initialMeta);
      }

      // Bất đồng bộ giải mã asset references từ IndexedDB
      const resolved = await resolveStateAssets(parsed, this.assetOptions);
      if (this.isDisposed) return;

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
        if (cur[field] === parsed[field] && resolved[field] && resolved[field] !== parsed[field]) {
          (merged as any)[field] = resolved[field];
          updatedImages = true;
        }
      }

      if (cur.brandKit) {
        merged.brandKit = cur.brandKit;
      }

      if (updatedImages && !this.isDisposed) {
        this.setState(merged);
      }
    } catch (e) {
      console.warn('[DraftController] Lỗi nạp bản nháp ban đầu:', e);
    }
  }

  /**
   * Lưu state với debounce.
   * Tách biệt Transition Ownership và Field-level Edits:
   * Không tăng activeSwitchToken ở đây để không làm gián đoạn resolution của target assets.
   */
  public saveState(rawNewState: MarketingState, delayMs = 150): void {
    if (this.isDisposed) return;
    const newState = clampStoryPageInState(rawNewState);
    this.stateRevision++;
    const saveSeq = ++this.activeSaveSeq;

    this.setState(newState);

    const currentCat = newState.categoryId || (newState.industry === 'general' ? 'retail' : newState.industry);
    // Luôn lưu bản nháp mới nhất vào in-memory recoverable drafts
    this.inMemoryDrafts[currentCat] = newState;

    if (!this.storage) return;

    // Lưu metadata nhanh (nếu storage cho phép và đúng active category)
    const activeCat = this.getState().categoryId || (this.getState().industry === 'general' ? 'retail' : this.getState().industry);
    if (activeCat === currentCat) {
      try {
        this.storage.setItem(this.storageKey, JSON.stringify(newState));
      } catch {}
    }

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      if (this.isDisposed || this.activeSaveSeq !== saveSeq) return;

      try {
        const { state: persistedState, failedFields } = await persistStateAssets(newState, this.assetOptions);

        // GUARD SAU AWAIT: Nếu có save mới hơn hoặc controller đã dispose, hủy bỏ commit cũ ngay!
        if (this.isDisposed || this.activeSaveSeq !== saveSeq) return;

        if (failedFields.length > 0) {
          this.onStatusText?.('Không thể lưu ảnh vào bộ nhớ trình duyệt (hết dung lượng). Ảnh vẫn hiển thị trong phiên này.');
        }

        if (this.isDisposed || this.activeSaveSeq !== saveSeq) return;

        try {
          const currentActive = this.getState();
          const currentActiveCat = currentActive.categoryId || (currentActive.industry === 'general' ? 'retail' : currentActive.industry);
          const saveCat = newState.categoryId || (newState.industry === 'general' ? 'retail' : newState.industry);

          // OWNERSHIP GUARD: Chỉ ghi vào main storage key nếu controller vẫn đang active ở đúng ngành này!
          if (currentActiveCat === saveCat) {
            this.storage?.setItem(this.storageKey, JSON.stringify(persistedState));
          }

          const savedOk = saveIndustryDraft(persistedState, this.storage, this.draftKey);
          if (!savedOk) {
            this.onStatusText?.('Bản nháp chưa lưu được vào trình duyệt do đầy bộ nhớ. Bản nháp được lưu tạm trong bộ nhớ phiên này.');
          }
        } catch (err) {
          this.onStatusText?.('Bản nháp chưa lưu được vào trình duyệt. Anh giữ nguyên ngành hiện tại và tải nội dung trước.');
        }
      } catch (err) {
        if (this.isDisposed || this.activeSaveSeq !== saveSeq) return;
        console.warn('[DraftController] Lỗi saveState:', err);
      }
    }, delayMs);
  }

  /**
   * Chuyển đổi ngành an toàn với bảo vệ đa tầng.
   * Khắc phục Lỗi 1: Clear timer và invalidate activeSaveSeq để save A không đè lên B.
   * Khắc phục Lỗi 2: Guard sau mỗi await, bảo toàn thao tác edit/xóa ảnh của người dùng và giải mã ảnh còn lại.
   * Khắc phục Lỗi 3: Ưu tiên in-memory drafts trước storage để bảo vệ bản nháp mới hơn đĩa khi quota error.
   */
  public async changeCategory(categoryId: string, persistDelayMs = 0): Promise<void> {
    if (this.isDisposed) return;
    const category = CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;
    const currentState = this.getState();
    const currentCatId = currentState.categoryId || (currentState.industry === 'general' ? 'retail' : currentState.industry);
    if (currentCatId === categoryId) return;

    // 1. HỦY TOÀN BỘ SAVE IN-FLIGHT CỦA NGÀNH CŨ
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
      if (this.isDisposed || this.activeSwitchToken !== token) return;

      currentWithRefs = persistRes.state;
      if (persistRes.failedFields.length > 0) {
        this.onStatusText?.('Không thể lưu ảnh vào bộ nhớ trình duyệt (hết dung lượng). Ảnh vẫn hiển thị trong phiên này.');
      }
    } catch (err) {
      if (this.isDisposed || this.activeSwitchToken !== token) return;
      console.warn('[DraftController] Lỗi persist assets trước switch:', err);
    }

    if (this.isDisposed || this.activeSwitchToken !== token) return;

    // 3. Lưu bản nháp ngành cũ vào In-Memory Drafts & LocalStorage
    // BẢO VỆ EDIT MỚI TRONG OUTGOING PERSIST:
    // Nếu người dùng đã edit ngành cũ trong lúc outgoing persist đang await (qua saveState),
    // bản draft mới nhất của ngành cũ nằm trong this.inMemoryDrafts[currentCatId].
    // Ta lấy bản mới đó làm gốc để không làm mất edit của người dùng!
    const latestOutgoing = this.inMemoryDrafts[currentCatId] || currentState;
    const mergedOutgoing = { ...latestOutgoing };

    for (const field of IMAGE_FIELDS) {
      // Chỉ gán ref nếu trường ảnh trong latestOutgoing chưa bị người dùng thay đổi so với currentState ban đầu
      if (latestOutgoing[field] === currentState[field] && currentWithRefs[field]) {
        (mergedOutgoing as any)[field] = currentWithRefs[field];
      }
    }

    this.inMemoryDrafts[currentCatId] = mergedOutgoing;

    // Lưu vào LocalStorage
    if (this.storage) {
      const savedOk = saveIndustryDraft(mergedOutgoing, this.storage, this.draftKey);
      if (!savedOk) {
        this.onStatusText?.('Bộ nhớ trình duyệt đã đầy. Bản nháp ngành cũ được lưu tạm trong bộ nhớ phiên này. Anh nên tải nội dung về máy trước khi đóng trang.');
      }
    }

    // 4. Lấy metadata của ngành mới: ƯU TIÊN IN-MEMORY TRƯỚC STORAGE (Bảo vệ dữ liệu mới hơn đĩa khi quota)
    const storageDrafts = getAllDrafts(this.storage, this.draftKey);
    let nextMeta: MarketingState;

    if (this.inMemoryDrafts[category.id]) {
      nextMeta = { ...this.inMemoryDrafts[category.id], categoryId: category.id, industry: category.industry };
    } else if (storageDrafts[category.id]) {
      nextMeta = { ...storageDrafts[category.id], categoryId: category.id, industry: category.industry };
    } else {
      nextMeta = createDefaultIndustryState(category.id, category.industry, mergedOutgoing);
    }

    // Bảo toàn BrandKit xuyên suốt các ngành
    if (currentState.brandKit) {
      nextMeta.brandKit = currentState.brandKit;
    }

    if (this.isDisposed || this.activeSwitchToken !== token) return;

    // HỦY VÀ VÔ HIỆU HÓA TOÀN BỘ SAVE TIMERS ĐÃ TẠO TRONG LÚC OUTGOING PERSIST
    // Đảm bảo không có save timer cũ nào có thể commit đè lên active draft của ngành mới!
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.activeSaveSeq++;

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

      // GUARD SAU AWAIT 2
      if (this.isDisposed || this.activeSwitchToken !== token) return;

      // Merge thông minh: Nếu người dùng đã edit text hoặc gỡ 1 ảnh trong lúc giải mã, bảo toàn thao tác của user
      const activeCurrent = this.getState();
      const activeCurrentCat = activeCurrent.categoryId || (activeCurrent.industry === 'general' ? 'retail' : activeCurrent.industry);
      if (activeCurrentCat !== category.id) return;

      const merged = { ...activeCurrent };
      let updatedImages = false;

      for (const field of IMAGE_FIELDS) {
        // Chỉ cập nhật nếu trường ảnh trong activeCurrent vẫn khớp với nextMeta (chưa bị user gỡ hoặc sửa)
        // và resolvedState có kết quả giải mã khác với ref ban đầu
        if (activeCurrent[field] === nextMeta[field] && resolvedState[field] && resolvedState[field] !== nextMeta[field]) {
          (merged as any)[field] = resolvedState[field];
          updatedImages = true;
        }
      }

      if (updatedImages && !this.isDisposed) {
        this.setState(merged);
      }
    } catch (err) {
      if (this.isDisposed || this.activeSwitchToken !== token) return;
      console.warn('[DraftController] Lỗi giải mã asset ngành mới:', err);
    }
  }
}
