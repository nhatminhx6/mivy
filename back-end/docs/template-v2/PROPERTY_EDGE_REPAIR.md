# Property architecture — next Gemini repair

Scope: only property-architecture, no background and no main image, non-story branch in web/src/lib/industry-renderer.ts. Preserve other concepts and all image/story branches. Return bounded patch for review; do not write source directly.

Evidence: reports/property-edge-20261004/contact-sheet.png; fixtures web/render-property-edge-qc.cjs. Sparse VI leaves a giant hole. Long EN compresses tile values, amenities and contact into tiny text.

Requirements:
- Lay out only supplied sections; collapse absent price/spec/address/amenity blocks. Sparse composition must intentionally group title/contact rather than leave reserved empty slots. Do not invent data or decorative image placeholders.
- Measure wrapping and allocate height before drawing. Reserve readable footer and continuation space first; no footer painted over content.
- Body minimum 30px at width1080, scaled with width. Long area/bedroom text may stack as full-width rows rather than shrink into half-width tiles.
- Keep full source intact. Fit a readable amenity prefix with accurate localized remainder count; never silently drop facts. Preserve pointsEdited including empty array and manual headline/subline/CTA.
- Retain VI/EN labels, cream/forest concept, all three ratios. Avoid expanding footer to fill remaining sparse canvas.
- Validate normal, sparse, long and manual-edit fixtures. Native raster pass is not commercial approval; browser font/export parity remains separate.

Review before integration: source snapshot equality, bounded diff, TypeScript, renderer tests, actual PNG contact sheets. Do not accept passed:true as test evidence.
