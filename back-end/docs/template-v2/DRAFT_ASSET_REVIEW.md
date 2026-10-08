# Codex review — NOT ACCEPTED

Gemini result exists; self-reported nine mock tests/TypeScript are not independent acceptance. Static review finds blocking issues:

1. `changeCategory` awaits persistStateAssets before switchIndustry/setState, but checks token only after resolveStateAssets. A slower earlier switch can overwrite a later switch before the guard. Check token immediately after every await before any metadata or UI mutation.
2. Initial restore awaits asset resolution and spreads the entire old state over current state using only mount-liveness guard. Edits/category switches made during loading can be overwritten. Guard against state revisions, not just unmount.
3. Debounced save has no revision check after asset persistence. In-flight older save can commit after newer save and restore stale draft on reload. Canceling timeout cannot cancel already-running callback.
4. `createDefaultIndustryState` now inserts CATEGORY_SAMPLES and background URLs into fresh campaigns. This violates plan: samples belong to library preview, not campaign data. Restore clean defaults without touching existing real drafts.
5. saveIndustryDraft catches quota and overwrites all drafts with only current category; silently discards other categories. Preserve previous storage; report failure instead.
6. persist/resolve fields exclude legacy bgUrl data URI. Include all supported image roles or migrate it explicitly without losing data.

Do not revert all changes. Fix narrow causes, then test actual page lifecycle (deferred saves and out-of-order promises), not a hand-written token simulation. Browser asset-store tests still required. Do not run build into live .next.

## Revision review — 2026-10-07 14:45 UTC (still not accepted)
Independent run of lifecycle suite passes 6/6, but tests 4–6 reimplement simplified machines rather than executing page handlers. Their “actual lifecycle” claim is incorrect. Remaining blocking paths in current source:
1. `changeCategory` does not invalidate activeSaveSeqRef or clear pending save timer. An A save can finish after switch B and write A into mivy-marketing-v1; reload opens wrong campaign. Test save→switch overlap using actual handlers.
2. `saveState` does not invalidate activeSwitchTokenRef. Edit/remove image while target assets resolve, then `setState(resolvedState)` overwrites new edit/removal. Also edit while outgoing persistence awaits can save an older source draft. Coordinate edits/switches with one revision ownership mechanism; preserve edits and intentional image clears.
3. `switchIndustry` discards saveIndustryDraft false. changeCategory continues and replaces active state/main metadata even when outgoing draft failed, losing unsaved work. Keep current campaign or retain recoverable in-memory per-category draft and visibly report failure. Test actual switch with quota error.
4. Initial restore aborts ALL resolution upon any text edit, leaving mivy-asset refs in visible state forever. Merge resolved image fields only where corresponding original ref is still unchanged; preserve text edits and cleared/replaced image fields. Test text edit + successful image restoration.
5. IndexedDB save resolves on request success, before transaction completion. Resolve on tx.oncomplete; abort after request success must reject. No implicit memory-only success for durable persistence when IndexedDB unavailable; surface failure and preserve existing metadata/inline assets.
6. Each text save creates new records for unchanged raw images; repeated edits grow storage without bound. Reuse immutable content refs/cache safely, ensuring failed writes are not cached as durable and removal does not resurrect assets.

Implement only these persistence/lifecycle repairs and realistic tests. Extract shared production controller or execute real page handlers in test harness; do not copy desired behavior into test-only functions. Preserve other-agent brand/logo work. No renderer changes, live .next build, paid services, or real-user localStorage manipulation. Update DRAFT_ASSET_RESULT.md with limitations honestly. Browser isolated real-IDB roundtrip remains required before final acceptance.

## Controller revision review — 2026-10-07 15:40 UTC (not accepted)
- CONFIRMED via production saveAsset/getAsset: sampled hash ignores most bytes. Two same-length inputs differing at index101 return same ref and second restores first content. Cache also crosses driver/db namespaces: a fresh store receives a cached ref without its data. Evidence reports/asset-cache-review-20261007.json. Use full-content identity and store-scoped cache, verify existence or lifecycle invalidation; test both cases without clearing cache between stores.
- DraftController selects storageDrafts before inMemoryDrafts. If existing A was saved earlier, latest A save hits quota, A→B→A returns stale disk A instead of newer recovered A. Test pre-existing stale draft, not empty storage only.
- saveState increments activeSwitchToken; target resolve immediately returns at token guard, so text-only edit still prevents remaining target image refs from resolving. Separate transition ownership from field-level edits; assert untouched image resolves in same edit+clear test.
- page applies loadBrand via React setState outside controller. Controller may then emit state lacking newest brandKit, overwriting it. Keep a single synchronized state owner.
- No controller dispose/unmount cancellation; pending timers/restores survive cleanup (including StrictMode effect replay). Add ownership/liveness cleanup and production tests.
Follow-up not yet dispatched: Mac locked. Preserve concurrent work. No full acceptance or visual claim.
