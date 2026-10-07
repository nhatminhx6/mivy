// Actual Production DraftController Lifecycle & Concurrency QC
const fs = require('node:fs');
const assert = require('node:assert');
const ts = require('typescript');

// Hook TypeScript compiler
require.extensions['.ts'] = (m, f) => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/from\s+['"]@\/types['"]/g, "from '../types'");
  content = content.replace(/from\s+['"]@\/lib\//g, "from './");
  const transpiled = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  m._compile(transpiled, f);
};

const {
  isAssetRef,
  saveAsset,
  persistStateAssets,
  resolveStateAssets,
  clearAssetCache,
  IMAGE_FIELDS,
} = require('./src/lib/asset-store.ts');

const {
  switchIndustry,
  saveIndustryDraft,
  createDefaultIndustryState,
} = require('./src/lib/industry-drafts.ts');

const { DraftController } = require('./src/lib/draft-controller.ts');

function createIsolatedStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    dump: () => Object.fromEntries(store.entries()),
  };
}

function createDelayedMockAssetDriver(delayMap = {}) {
  const store = new Map();
  return {
    async get(id) {
      const delay = delayMap[id] || 0;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return store.get(id) || null;
    },
    async set(id, data) {
      const delay = delayMap[id] || 0;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      store.set(id, data);
    },
    async delete(id) {
      store.delete(id);
    },
    size() {
      return store.size;
    },
  };
}

async function runRealLifecycleQC() {
  console.log('=== RUNNING PRODUCTION DRAFTCONTROLLER LIFECYCLE QC ===\n');

  // TEST 1: Đường 1 - save→switch race condition
  // Đang ở A, saveState(A_edited) được gọi với debounce. Ngay sau đó user switch sang B.
  // Draft của A KHÔNG ĐƯỢC phép đè lên B trong storage hay state!
  {
    console.log('--- Test 1: Production save→switch race (DraftController) ---');
    const storageKey = 'test-save-switch-storage';
    const draftKey = 'test-save-switch-drafts';
    const storage = createIsolatedStorage();
    const driver = createDelayedMockAssetDriver();

    let controllerState = null;
    const controller = new DraftController({
      storage,
      storageKey,
      draftKey,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Initial A',
        image: 'data:image/png;base64,A_IMAGE',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: (s) => { controllerState = s; },
    });

    // 1. User edit A -> saveState được hẹn giờ
    controller.saveState({
      ...controller.getState(),
      name: 'Edited A In-Flight',
      image: 'data:image/png;base64,A_IMAGE_EDITED',
    }, 40);

    // 2. Trước khi timer của A kịp commit, user switch sang B (property)
    await new Promise((r) => setTimeout(r, 10)); // Cho timer chạy nhưng chưa hết 40ms
    await controller.changeCategory('property');

    // 3. Đợi thêm thời gian để xem save cũ của A có bị commit đè lên không
    await new Promise((r) => setTimeout(r, 100));

    // Storage và controller state PHẢI LÀ B, không bị A đè lên!
    const committedMain = JSON.parse(storage.getItem(storageKey));
    assert.strictEqual(controller.getState().categoryId, 'property', 'Active category must be property');
    assert.strictEqual(committedMain.categoryId, 'property', 'Committed storage must be property, not overwritten by A');

    console.log('✓ Passed: save→switch race prevented, switch B owns storage and state');
  }

  // TEST 2: Đường 2 - edit→switch restore race condition
  // Switch sang B (assets của B đang resolve chậm). Trong lúc resolve, user gõ text hoặc gỡ ảnh.
  // Khi resolve B xong, thao tác edit / xóa ảnh của user PHẢI ĐƯỢC BẢO TOÀN, không bị đè!
  {
    console.log('\n--- Test 2: Production edit→switch restore race (DraftController) ---');
    const storage = createIsolatedStorage();
    const bgDataB = 'data:image/png;base64,BG_PROPERTY_IMAGE';
    const driver = createDelayedMockAssetDriver({ 'mivy-asset:prop_bg': 60 });
    await driver.set('mivy-asset:prop_bg', bgDataB);

    // Lưu trước draft của property với asset ref
    const existingDrafts = {
      property: {
        categoryId: 'property',
        industry: 'service',
        name: 'Property Existing Draft',
        backgroundImage: 'mivy-asset:prop_bg',
        image: '',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
    };
    storage.setItem('mivy-industry-drafts-v2', JSON.stringify(existingDrafts));

    let controllerState = null;
    const controller = new DraftController({
      storage,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Recruitment',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: (s) => { controllerState = s; },
    });

    // 1. User switch sang property (target asset prop_bg resolve mất 60ms)
    const switchPromise = controller.changeCategory('property');

    // 2. Sau 15ms (trong lúc prop_bg đang resolve), user sửa tiêu đề và GỠ ẢNH NỀN
    await new Promise((r) => setTimeout(r, 15));
    controller.saveState({
      ...controller.getState(),
      name: 'User Edited Title During Resolve',
      backgroundImage: '', // Intentional removal!
    }, 20);

    // 3. Đợi switch hoàn thành resolve
    await switchPromise;
    await new Promise((r) => setTimeout(r, 80));

    // Kiểm tra: Edit của user và thao tác gỡ ảnh PHẢI ĐƯỢC GIỮ NGUYÊN!
    const finalState = controller.getState();
    assert.strictEqual(finalState.name, 'User Edited Title During Resolve', 'User title must be preserved');
    assert.strictEqual(finalState.backgroundImage, '', 'User intentional image removal must NOT be resurrected by resolve');

    console.log('✓ Passed: User edit and image removal preserved during in-flight asset resolution');
  }

  // TEST 3: Đường 3 - Quota error khi switch không làm mất bản chưa lưu
  // Khi switch A -> B, nếu LocalStorage ném QuotaExceededError:
  // - onStatusText báo lỗi rõ ràng.
  // - Bản nháp của A vẫn được giữ trong inMemoryDrafts.
  // - Khi switch B -> A, dữ liệu của A được khôi phục trọn vẹn!
  {
    console.log('\n--- Test 3: Quota error during switch preserves unsaved draft (DraftController) ---');
    const store = new Map();
    let quotaErrorActive = true;
    const quotaStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => {
        if (quotaErrorActive && k === 'mivy-industry-drafts-v2') {
          throw new Error('QuotaExceededError: DOMException');
        }
        store.set(k, String(v));
      },
    };

    let statusReports = [];
    const controller = new DraftController({
      storage: quotaStorage,
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Crucial Unsaved Recruitment Work',
        details: 'Dữ liệu cực kỳ quan trọng không được để mất',
        copies: { launch: { headline: 'H', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
      onStatusText: (msg) => statusReports.push(msg),
    });

    // 1. Chuyển sang property khi storage bị lỗi quota
    await controller.changeCategory('property');

    // Kiểm tra: Có báo lỗi bộ nhớ cho người dùng
    assert.ok(statusReports.some((m) => m.includes('đầy')), 'Visible failure reported to user on quota');
    assert.strictEqual(controller.getState().categoryId, 'property', 'Switched to property');

    // 2. Chuyển quay lại recruitment
    await controller.changeCategory('recruitment');

    // Kiểm tra: Recruitment được khôi phục nguyên vẹn từ in-memory recoverable draft!
    const recoveredA = controller.getState();
    assert.strictEqual(recoveredA.categoryId, 'recruitment', 'Switched back to recruitment');
    assert.strictEqual(recoveredA.name, 'Crucial Unsaved Recruitment Work', 'Unsaved draft name recovered 100%');
    assert.strictEqual(recoveredA.details, 'Dữ liệu cực kỳ quan trọng không được để mất', 'Unsaved draft details recovered 100%');

    console.log('✓ Passed: Quota error surfaces visible failure and preserves unsaved draft via in-memory fallback');
  }

  // TEST 4: Đường 4 - Text edit trong lúc initial restore không làm mất ảnh
  // LocalStorage có draft lưu asset ref. Trong lúc resolve, user gõ text.
  // Kết quả: Text edit mới được giữ VÀ ảnh vẫn được giải mã thành công!
  {
    console.log('\n--- Test 4: Text edit during initial restore keeps text AND resolves images (DraftController) ---');
    const storage = createIsolatedStorage();
    const rawImage = 'data:image/png;base64,RAW_INITIAL_AVATAR_' + 'X'.repeat(200);
    const driver = createDelayedMockAssetDriver({ 'mivy-asset:initial_avatar': 60 });
    await driver.set('mivy-asset:initial_avatar', rawImage);

    const storedDraft = {
      categoryId: 'recruitment',
      industry: 'recruitment',
      name: 'Old Name From Storage',
      image: 'mivy-asset:initial_avatar',
      copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
    };
    storage.setItem('mivy-marketing-v1', JSON.stringify(storedDraft));

    let controllerState = null;
    const controller = new DraftController({
      storage,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: '',
        image: '',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: (s) => { controllerState = s; },
    });

    // 1. Bắt đầu loadInitialDraft (resolve mất 60ms)
    const loadPromise = controller.loadInitialDraft();

    // 2. Sau 15ms, user gõ tiêu đề mới
    await new Promise((r) => setTimeout(r, 15));
    controller.saveState({
      ...controller.getState(),
      name: 'User Typed Fresh Title Immediately',
    }, 20);

    // 3. Đợi loadInitialDraft hoàn tất
    await loadPromise;
    await new Promise((r) => setTimeout(r, 80));

    const finalState = controller.getState();
    assert.strictEqual(finalState.name, 'User Typed Fresh Title Immediately', 'Text edit preserved 100%');
    assert.strictEqual(finalState.image, rawImage, 'Image was resolved successfully into data URI, not stuck in ref!');

    console.log('✓ Passed: Text edit preserved AND image successfully resolved into data URI');
  }

  // TEST 5: Đường 5 - IDB transaction completion & no implicit memory-only success
  {
    console.log('\n--- Test 5: IDB transaction error handling & no fake durability ---');
    clearAssetCache();

    // Driver that throws error on write
    const failingDriver = {
      async get() { return null; },
      async set() { throw new Error('TransactionAbortedError: IndexedDB transaction aborted'); },
    };

    let caughtError = null;
    try {
      await saveAsset('data:image/png;base64,DATA_WILL_FAIL', undefined, { driver: failingDriver });
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, 'saveAsset MUST reject when storage transaction fails');
    assert.ok(caughtError.message.includes('aborted'), 'Error must surface transaction failure');

    // persistStateAssets must retain in-memory data URI and report failed field
    const testState = {
      image: 'data:image/png;base64,IN_MEMORY_PRESERVED',
      name: 'State',
      copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
    };
    const { state: resState, failedFields } = await persistStateAssets(testState, { driver: failingDriver });
    assert.strictEqual(failedFields.length, 1);
    assert.strictEqual(resState.image, 'data:image/png;base64,IN_MEMORY_PRESERVED', 'Raw image preserved in-memory on failure');

    console.log('✓ Passed: Transaction failure rejects properly, no fake durability claimed');
  }

  // TEST 6: Đường 6 - Tránh nhân bản asset khi sửa chữ (Deduplication Cache)
  {
    console.log('\n--- Test 6: Asset deduplication cache prevents unbounded growth on text edits ---');
    clearAssetCache();

    let writeCount = 0;
    const countingDriver = {
      store: new Map(),
      async get(id) { return this.store.get(id) || null; },
      async set(id, data) {
        writeCount++;
        this.store.set(id, data);
      },
      size() { return this.store.size; },
    };

    const rawImage = 'data:image/png;base64,IMMUTABLE_AVATAR_' + 'Z'.repeat(500);

    // Save 1st time
    const ref1 = await saveAsset(rawImage, undefined, { driver: countingDriver });
    assert.strictEqual(writeCount, 1, 'First write creates 1 record');
    assert.strictEqual(countingDriver.size(), 1);

    // User edits text 5 times with the same raw image
    for (let i = 0; i < 5; i++) {
      const refNext = await saveAsset(rawImage, undefined, { driver: countingDriver });
      assert.strictEqual(refNext, ref1, 'Reused exact same asset ref');
    }

    // Write count must STILL be 1! No new records created!
    assert.strictEqual(writeCount, 1, 'Write count must not grow on unchanged image');
    assert.strictEqual(countingDriver.size(), 1, 'Database size remains exactly 1');

    console.log('✓ Passed: Asset deduplication cache safely reuses ref without unbounded storage growth');
  }

  console.log('\n=== ALL 6 REAL CONTROLLER LIFECYCLE TESTS PASSED 100%! ===');
}

runRealLifecycleQC().catch((err) => {
  console.error('LIFECYCLE QC FAILED:', err);
  process.exit(1);
});
