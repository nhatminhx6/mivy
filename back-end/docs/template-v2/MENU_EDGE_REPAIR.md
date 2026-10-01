# Gemini task: adaptive no-image food menu

Evidence: reports/menu-edge-20260929/contact-sheet.png; regenerate with web/render-menu-edge-qc.cjs.

Restrict implementation to food-menu no-main/no-background launch/action branch in industry-renderer.ts. Preserve supplied facts, image roles, story pagination, and other concepts.

Observed failures: one short item without price leaves almost entire poster blank, especially 9:16. Six lengthy rows at 1:1 shrink to unreadably small type. More than six source points are absent from main image without any continuation cue (remaining facts are in story/caption).

Required: sparse input should use a deliberate larger type composition with compact grouped contact/CTA, no invented content. Dense input should use readable bounded text sizes and visible localized continuation cue pointing to detail pages; never imply whole menu is shown when truncated. Coordinate point allocation with existing story retention; do not discard or rewrite facts. Preserve VI/EN. Return bounded patch, do not edit unrelated files.

QC: actual raster images for sparse/no-price and 11 long points at all three ratios, VI/EN, inspect text and balance; renderer/data tests. Existing native font substitution is not browser font parity. No commercial acceptance until visual review.
