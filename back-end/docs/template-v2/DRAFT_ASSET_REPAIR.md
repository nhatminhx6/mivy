# Gemini: preserve draft assets without quota-blocked switching

Confirmed regression: reports/draft-image-loss-20261006.json. industry-drafts sanitization clears all data URIs, even tiny ones. Main page saveState also strips data URIs, so reload persistence requires repair too. Preserve other-agent category-switch fix; do not revert wholesale.

Scope: durable asset storage + draft save/restore only. Do not touch template renderer/property-edge implementation. Use existing project conventions. Return scoped patch for review, preserve concurrent modifications.

Required behavior:
- Store uploaded main/background/cutout independently in IndexedDB or existing local asset store; lightweight references in metadata. HTTP assets remain references. Do not silently replace images with empty strings.
- Persist asset before committing metadata reference; visible nonblocking failure if storage fails, retain current in-memory image. Never claim saved after failed write.
- Restore reference asynchronously with stale-request guards so rapid category switches cannot put an old image into the current category.
- Preserve per-role crop/fit/pan/blur and user intentional removal. Reload and switching A→B→A restore both layers. No automatic source asset deletion this batch.
- Handle existing inline-data drafts without destructive migration; do not erase old value until new asset/metadata save succeeds.
- Keep category UI responsive on quota failure; keep text/manual copy. Do not clear unrelated drafts to make room silently.

QC: tiny+large data URIs, separate main/background, reload, A→B→A, rapid switching, explicit image removal, denied/quota storage, migration failure, HTTP URLs; preview and downloaded PNG retain both roles. Tests must exercise actual storage paths; browser QC uses isolated test data, never overwrites anh's saved campaign.

Prepared specification only; no task dispatched yet.
