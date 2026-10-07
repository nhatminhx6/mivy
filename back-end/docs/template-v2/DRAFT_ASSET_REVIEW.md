# Codex review — NOT ACCEPTED

Gemini result exists; self-reported nine mock tests/TypeScript are not independent acceptance. Static review finds blocking issues:

1. `changeCategory` awaits persistStateAssets before switchIndustry/setState, but checks token only after resolveStateAssets. A slower earlier switch can overwrite a later switch before the guard. Check token immediately after every await before any metadata or UI mutation.
2. Initial restore awaits asset resolution and spreads the entire old state over current state using only mount-liveness guard. Edits/category switches made during loading can be overwritten. Guard against state revisions, not just unmount.
3. Debounced save has no revision check after asset persistence. In-flight older save can commit after newer save and restore stale draft on reload. Canceling timeout cannot cancel already-running callback.
4. `createDefaultIndustryState` now inserts CATEGORY_SAMPLES and background URLs into fresh campaigns. This violates plan: samples belong to library preview, not campaign data. Restore clean defaults without touching existing real drafts.
5. saveIndustryDraft catches quota and overwrites all drafts with only current category; silently discards other categories. Preserve previous storage; report failure instead.
6. persist/resolve fields exclude legacy bgUrl data URI. Include all supported image roles or migrate it explicitly without losing data.

Do not revert all changes. Fix narrow causes, then test actual page lifecycle (deferred saves and out-of-order promises), not a hand-written token simulation. Browser asset-store tests still required. Do not run build into live .next.
