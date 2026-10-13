// Production DraftController Lifecycle, Concurrency & Asset Identity QC Suite
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
  getAsset,
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
  console.log('=== RUNNING PRODUCTION DRAFTCONTROLLER LIFECYCLE & IDENTITY QC ===\n');

  // TEST 1: Full-content identity (Chống lỗi Sampled Hash lờ byte)
  // Hai data URI cùng độ dài nhưng khác nhau tại index 101 phải sinh 2 ref khác nhau
  // và khôi phục đúng nội dung của từng ảnh (ngăn chặn lỗi trong reports/asset-cache-review-20261007.json)
  {
    console.log('--- Test 1: Full-content identity (differ at index 101) ---');
    clearAssetCache();
    const driver = createDelayedMockAssetDriver();

    const basePrefix = 'data:image/png;base64,';
    const filler1 = 'A'.repeat(101) + 'X' + 'A'.repeat(98);
    const filler2 = 'A'.repeat(101) + 'Y' + 'A'.repeat(98);
    const uri1 = basePrefix + filler1;
    const uri2 = basePrefix + filler2;

    assert.strictEqual(uri1.length, uri2.length, 'Hai chuỗi phải có độ dài tuyệt đối bằng nhau');
    assert.notStrictEqual(uri1, uri2, 'Hai chuỗi phải khác nhau');

    const ref1 = await saveAsset(uri1, undefined, { driver });
    const ref2 = await saveAsset(uri2, undefined, { driver });

    assert.notStrictEqual(ref1, ref2, 'Hai ảnh khác nhau dù cùng độ dài PHẢI sinh 2 ref khác nhau');

    const restored1 = await getAsset(ref1, { driver });
    const restored2 = await getAsset(ref2, { driver });

    assert.strictEqual(restored1, uri1, 'Asset 1 phải khôi phục chính xác nội dung 1');
    assert.strictEqual(restored2, uri2, 'Asset 2 phải khôi phục chính xác nội dung 2, không bị nhầm sang 1');

    console.log('✓ Passed: Full-content identity produces unique refs and restores correct contents');
  }

  // TEST 2: Store-scoped cache & cross-driver isolation (Không clear cache giữa chừng)
  // Lưu ảnh vào driver1. Sau đó lưu cùng ảnh vào driver2 mà KHÔNG clear cache.
  // driver2 phải lưu dữ liệu vào store của mình, không được trả ref mồ côi (missing in driver2).
  {
    console.log('\n--- Test 2: Store-scoped cache across drivers without manual clearAssetCache ---');
    // KHÔNG gọi clearAssetCache() ở đây để kiểm tra tính cô lập thực tế giữa các namespace
    const driver1 = createDelayedMockAssetDriver();
    const driver2 = createDelayedMockAssetDriver();

    const testUri = 'data:image/png;base64,TEST_ISOLATION_' + 'M'.repeat(300);

    const refDriver1 = await saveAsset(testUri, undefined, { driver: driver1 });
    assert.ok(isAssetRef(refDriver1));
    assert.strictEqual(await driver1.get(refDriver1), testUri, 'driver1 chứa asset data');
    assert.strictEqual(await driver2.get(refDriver1), null, 'driver2 ban đầu không có asset data');

    // Lưu vào driver2 - không được tái sử dụng ref nếu driver2 chưa có data
    const refDriver2 = await saveAsset(testUri, undefined, { driver: driver2 });
    assert.ok(isAssetRef(refDriver2));
    const restoredDriver2 = await driver2.get(refDriver2);
    assert.strictEqual(restoredDriver2, testUri, 'driver2 PHẢI chứa asset data, không bị missing/rỗng');

    console.log('✓ Passed: Store-scoped cache isolates drivers without cross-namespace reference leaking');
  }

  // TEST 3: Pre-existing stale disk draft vs newer in-memory draft on quota (A→B→A)
  // Disk đã có sẵn draft cũ của A. Draft mới của A bị quota error.
  // User switch A → B → A. DraftController PHẢI khôi phục draft A mới nhất từ in-memory, KHÔNG lấy bản cũ trên disk!
  {
    console.log('\n--- Test 3: Pre-existing stale disk draft vs newer in-memory draft on quota (A→B→A) ---');
    const storageKey = 'test-quota-storage-v1';
    const draftKey = 'test-quota-drafts-v2';

    // Disk đã có sẵn draft cũ của recruitment
    const diskDrafts = {
      recruitment: {
        categoryId: 'recruitment',
        industry: 'recruitment',
        name: 'Stale A from previous session on disk',
        details: 'Old details on disk',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
    };
    const storage = createIsolatedStorage({
      [draftKey]: JSON.stringify(diskDrafts),
    });

    // Giả lập quota error khi ghi draftKey
    const originalSetItem = storage.setItem;
    storage.setItem = (k, v) => {
      if (k === draftKey) {
        throw new Error('QuotaExceededError: DOMException');
      }
      originalSetItem(k, v);
    };

    let reportedStatus = '';
    const controller = new DraftController({
      storage,
      storageKey,
      draftKey,
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Brand New Edits Made by User In Session',
        details: 'Vital unsaved edits',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
      onStatusText: (t) => { reportedStatus = t; },
    });

    // 1. Chuyển sang property (gặp quota error khi lưu recruitment cũ)
    await controller.changeCategory('property');
    assert.strictEqual(controller.getState().categoryId, 'property');
    assert.ok(reportedStatus.includes('đầy'), 'Có thông báo lỗi đầy bộ nhớ');

    // 2. Chuyển quay lại recruitment
    await controller.changeCategory('recruitment');

    // Khẳng định: Phải khôi phục bản nháp MỚI NHẤT từ inMemoryDrafts, KHÔNG bị đè bởi bản cũ trên disk!
    const activeRecruitment = controller.getState();
    assert.strictEqual(activeRecruitment.categoryId, 'recruitment');
    assert.strictEqual(activeRecruitment.name, 'Brand New Edits Made by User In Session', 'New in-memory draft takes precedence over stale disk draft');
    assert.strictEqual(activeRecruitment.details, 'Vital unsaved edits', 'Details preserved from session');

    console.log('✓ Passed: In-memory draft prioritized over stale disk draft on quota error (A→B→A)');
  }

  // TEST 4: Tách biệt Transition Ownership & Field Edits (Untouched image resolves while text edited + 1 image cleared)
  // Khi switch sang B, target asset resolve mất 60ms.
  // Trong lúc resolve: user gõ text VÀ gỡ backgroundImage = ''.
  // Khi resolve kết thúc: text mới giữ nguyên, backgroundImage không hồi sinh, và image (untouched) ĐƯỢC RESOLVE THÀNH DATA URI!
  {
    console.log('\n--- Test 4: Untouched image resolves while text is edited and one image is cleared ---');
    const storage = createIsolatedStorage();
    const avatarData = 'data:image/png;base64,TARGET_AVATAR_' + 'Q'.repeat(200);
    const bgData = 'data:image/png;base64,TARGET_BG_' + 'W'.repeat(200);

    const driver = createDelayedMockAssetDriver({
      'mivy-asset:b_avatar': 60,
      'mivy-asset:b_bg': 60,
    });
    await driver.set('mivy-asset:b_avatar', avatarData);
    await driver.set('mivy-asset:b_bg', bgData);

    const existingDrafts = {
      property: {
        categoryId: 'property',
        industry: 'service',
        name: 'Property Initial Title',
        image: 'mivy-asset:b_avatar',
        backgroundImage: 'mivy-asset:b_bg',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
    };
    storage.setItem('mivy-industry-drafts-v2', JSON.stringify(existingDrafts));

    const controller = new DraftController({
      storage,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Recruitment',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
    });

    // 1. Chuyển sang property (bắt đầu resolve 2 ảnh avatar và bg)
    const switchPromise = controller.changeCategory('property');

    // 2. Sau 15ms (trong lúc assets đang resolve), user sửa text và gỡ ảnh nền (backgroundImage = '')
    await new Promise((r) => setTimeout(r, 15));
    controller.saveState({
      ...controller.getState(),
      name: 'User Edited Headline While Loading',
      backgroundImage: '', // Chủ động gỡ ảnh nền
    }, 20);

    // 3. Đợi switch hoàn tất toàn bộ resolve
    await switchPromise;
    await new Promise((r) => setTimeout(r, 80));

    const finalState = controller.getState();
    assert.strictEqual(finalState.categoryId, 'property');
    assert.strictEqual(finalState.name, 'User Edited Headline While Loading', 'Text edit phải được giữ nguyên');
    assert.strictEqual(finalState.backgroundImage, '', 'Ảnh nền bị gỡ KHÔNG được hồi sinh lại');
    assert.strictEqual(finalState.image, avatarData, 'Ảnh untouched PHẢI được resolve thành công thành data URI!');

    console.log('✓ Passed: Untouched image resolves to data URI, text preserved, cleared image not resurrected');
  }

  // TEST 5: Đồng bộ trạng thái BrandKit qua DraftController
  {
    console.log('\n--- Test 5: Synchronized BrandKit state owner through DraftController ---');
    const storage = createIsolatedStorage();
    const controller = new DraftController({
      storage,
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Initial State',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
    });

    const testBrand = {
      name: 'Mivy Studio Pro',
      logo: 'data:image/png;base64,MIVY_LOGO_DATA',
      colors: ['#ff0055', '#000000'],
    };

    // Cập nhật brandKit qua controller
    controller.setBrandKit(testBrand);
    assert.deepStrictEqual(controller.getState().brandKit, testBrand, 'State có brandKit được cập nhật');

    // Chuyển sang ngành khác: brandKit phải được bảo toàn xuyên suốt các ngành
    await controller.changeCategory('property');
    assert.strictEqual(controller.getState().categoryId, 'property');
    assert.deepStrictEqual(controller.getState().brandKit, testBrand, 'BrandKit preserved across category switch');

    console.log('✓ Passed: BrandKit synchronized and preserved across state changes and category switches');
  }

  // TEST 6: Lifecycle Dispose & Unmount Cancellation (StrictMode effect replay guard)
  {
    console.log('\n--- Test 6: Lifecycle Dispose & Unmount Cancellation ---');
    const storage = createIsolatedStorage();
    let stateUpdatesAfterDispose = 0;

    const controller = new DraftController({
      storage,
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Pre-Dispose State',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {
        if (controller.isDisposed) {
          stateUpdatesAfterDispose++;
        }
      },
    });

    // 1. Gọi saveState với delay
    controller.saveState({
      ...controller.getState(),
      name: 'Should Not Commit After Dispose',
    }, 50);

    // 2. Component unmount -> controller.dispose()
    controller.dispose();
    assert.strictEqual(controller.isDisposed, true, 'Controller marked as disposed');

    // 3. Đợi timer cũ của saveState
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(stateUpdatesAfterDispose, 0, 'No onStateChange calls allowed after dispose');
    assert.strictEqual(controller.saveTimer, null, 'Save timer cleared on dispose');

    console.log('✓ Passed: Dispose cleanly halts timers and cancels in-flight state mutations');
  }

  // TEST 7: save→switch race condition
  {
    console.log('\n--- Test 7: Production save→switch race (DraftController) ---');
    const storageKey = 'test-save-switch-storage';
    const storage = createIsolatedStorage();
    const driver = createDelayedMockAssetDriver();

    const controller = new DraftController({
      storage,
      storageKey,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Initial A',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
    });

    controller.saveState({
      ...controller.getState(),
      name: 'Edited A In-Flight',
    }, 40);

    await new Promise((r) => setTimeout(r, 10));
    await controller.changeCategory('property');
    await new Promise((r) => setTimeout(r, 80));

    const committedMain = JSON.parse(storage.getItem(storageKey));
    assert.strictEqual(controller.getState().categoryId, 'property');
    assert.strictEqual(committedMain.categoryId, 'property', 'Committed storage must be property, not overwritten by A');

    console.log('✓ Passed: save→switch race prevented, switch B owns storage and state');
  }

  // TEST 8: IDB transaction failure & rejection
  {
    console.log('\n--- Test 8: IDB transaction error handling & no fake durability ---');
    clearAssetCache();

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

    const testState = {
      image: 'data:image/png;base64,IN_MEMORY_PRESERVED',
      name: 'State',
      copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
    };
    const { state: resState, failedFields } = await persistStateAssets(testState, { driver: failingDriver });
    assert.strictEqual(failedFields.length, 1);
    assert.strictEqual(resState.image, 'data:image/png;base64,IN_MEMORY_PRESERVED');

    console.log('✓ Passed: Transaction failure rejects properly, no fake durability claimed');
  }

  // TEST 9: Exact Outgoing Persist Edit Regression Sequence (Evidence reports/outgoing-edit-review-20261008.json)
  // recruitment name: 'Before'; start changeCategory('property', 50); saveState({ ...getState(), name: 'Latest edit' }, 1000) while outgoing persist pending;
  // await switch; assert property active and untouched target image resolves; switch back recruitment -> assert name: 'Latest edit'!
  {
    console.log('\n--- Test 9: Outgoing persist edit regression sequence (reports/outgoing-edit-review-20261008.json) ---');
    const storage = createIsolatedStorage();
    const propAvatar = 'data:image/png;base64,PROPERTY_TARGET_AVATAR_' + 'P'.repeat(150);
    const driver = createDelayedMockAssetDriver({ 'mivy-asset:prop_logo': 40 });
    await driver.set('mivy-asset:prop_logo', propAvatar);

    // Draft của property có untouched target image
    const initialDrafts = {
      property: {
        categoryId: 'property',
        industry: 'service',
        name: 'Property Initial',
        image: 'mivy-asset:prop_logo',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
    };
    storage.setItem('mivy-industry-drafts-v2', JSON.stringify(initialDrafts));

    const controller = new DraftController({
      storage,
      assetOptions: { driver },
      initialState: {
        industry: 'recruitment',
        categoryId: 'recruitment',
        name: 'Before',
        image: 'data:image/png;base64,RAW_RECRUITMENT_AVATAR',
        copies: { launch: { headline: '', subline: '', cta: '', caption: '', points: [] }, story: { headline: '', subline: '', cta: '', caption: '', points: [] }, action: { headline: '', subline: '', cta: '', caption: '', points: [] } },
      },
      onStateChange: () => {},
    });

    // 1. Bắt đầu chuyển sang property với persistDelayMs = 50ms
    const switchPromise = controller.changeCategory('property', 50);

    // 2. Sau 15ms (trong lúc outgoing persist của recruitment đang pending await), user sửa name thành 'Latest edit'
    await new Promise((r) => setTimeout(r, 15));
    controller.saveState({
      ...controller.getState(),
      name: 'Latest edit',
    }, 100);

    // 3. Đợi hoàn tất chuyển sang property (50ms)
    await switchPromise;

    // 4. QUAN TRỌNG: Đợi 150ms để save timer (100ms) của outgoing edit hoàn toàn settle trong lúc B (property) VẪN ĐANG ACTIVE!
    // Tuyệt đối không switch back ngay hay dispose để không che giấu lỗi timer!
    await new Promise((r) => setTimeout(r, 150));

    // Khẳng định: UI category là property, và untouched target image đã resolve thành data URI
    const propState = controller.getState();
    assert.strictEqual(propState.categoryId, 'property', 'UI category must remain property');
    assert.strictEqual(propState.image, propAvatar, 'Untouched target image in property resolved to data URI without disruption');

    // Khẳng định theo evidence reports/outgoing-save-review-20261008.json:
    // Main storage (mivy-marketing-v1) PHẢI LÀ property, KHÔNG ĐƯỢC bị save timer của recruitment đè bẹp!
    const persistedMain = JSON.parse(storage.getItem('mivy-marketing-v1'));
    assert.strictEqual(persistedMain.categoryId, 'property', 'Persisted main draft mivy-marketing-v1 must remain property while B is active!');

    // 5. Sau đó mới chuyển quay lại recruitment
    await controller.changeCategory('recruitment');
    await new Promise((r) => setTimeout(r, 60));

    // Khẳng định: Bản nháp recruitment PHẢI giữ nguyên 'Latest edit', KHÔNG bị 'Before' của outgoing persist cũ đè bẹp!
    const recruitState = controller.getState();
    assert.strictEqual(recruitState.categoryId, 'recruitment');
    assert.strictEqual(recruitState.name, 'Latest edit', 'Bản edit mới nhất "Latest edit" được bảo toàn 100%!');

    console.log('✓ Passed: Outgoing save timer cannot overwrite main storage while B is active; latest edit restored on switch back');
  }

  // TEST 10: Cache equality comparison on candidate data (Chống hash collision trả về nhầm ảnh khác)
  // Khi driver chứa dữ liệu khác với candidate (mô phỏng collision hoặc dữ liệu bị sửa),
  // cache PHẢI so sánh full data và KHÔNG ĐƯỢC tái sử dụng ref cũ, mà phải lưu mới và trả ref mới!
  {
    console.log('\n--- Test 10: Cache equality comparison prevents hash collision reuse ---');
    clearAssetCache();

    let storageMap = new Map();
    let collisionDriver = {
      async get(id) {
        return storageMap.get(id) || null;
      },
      async set(id, data) {
        storageMap.set(id, data);
      },
    };

    const imageAlpha = 'data:image/png;base64,IMAGE_ALPHA_' + 'A'.repeat(200);
    const imageBeta = 'data:image/png;base64,IMAGE_BETA_' + 'B'.repeat(200);

    // Lưu imageAlpha
    const refAlpha = await saveAsset(imageAlpha, undefined, { driver: collisionDriver });
    assert.ok(isAssetRef(refAlpha));
    assert.strictEqual(await collisionDriver.get(refAlpha), imageAlpha);

    // Giả lập collision: Đổi nội dung của refAlpha trong store thành dữ liệu khác
    // để kiểm tra bước equality check `existingData === dataUri`
    storageMap.set(refAlpha, 'data:image/png;base64,CORRUPTED_OR_DIFFERENT_IMAGE');

    // Gọi lại saveAsset với imageAlpha
    // Code phải đọc full data từ store, phát hiện không bằng imageAlpha, xóa cache entry và lưu mới!
    const refRecheck = await saveAsset(imageAlpha, undefined, { driver: collisionDriver });
    assert.notStrictEqual(refRecheck, refAlpha, 'Khi dữ liệu trong store không khớp, KHÔNG được tái sử dụng ref');
    assert.strictEqual(await collisionDriver.get(refRecheck), imageAlpha, 'Store nhận đúng dữ liệu của imageAlpha với ref mới');

    console.log('✓ Passed: Cache validates full data equality before reuse; mismatched candidate rejected');
  }

  console.log('\n=== ALL 10 PRODUCTION LIFECYCLE & IDENTITY TESTS PASSED 100%! ===');
}

runRealLifecycleQC().catch((err) => {
  console.error('LIFECYCLE QC FAILED:', err);
  process.exit(1);
});
