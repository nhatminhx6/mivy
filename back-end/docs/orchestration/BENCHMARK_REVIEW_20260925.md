# Review benchmark MIVY — 25/09/2026

## Live image evidence
The existing pilot manifest reports 6 SUCCESS and 18 BLOCKED. Every SUCCESS is offline_fixture; no real output is eligible for visual QC. The visual gate returned BLOCKED_NO_REAL_IMAGES. No new paid image API was invoked. Antigravity coding access does not prove image-generation API access.

## Code findings
- GeminiImageProvider is configured as Imagen3, not the proposed Gemini native image model; capability labels are not proof of tests.
- All three cloud adapters declare reference support but payloads do not include source images; product preservation is untested.
- QwenImageProvider submits a Wanx task but has no polling implementation and returns empty bytes.
- Harness runs forbidden-fact checks against the prompt, not OCR/observed output; cannot establish output factuality.
- validate_image_file returns valid=True even if aspect_ok=False. This bounded defect is the first real orchestration task on a private MIVY snapshot; review patch before applying to primary checkout.

## Next acceptance gate
Correct provider contracts and enforce explicit permitted cost policy before any live cloud call. A credential alone is not spending authorization. Supply a usable free/local full-design provider, then run real outputs through visual_qc.py. Do not substitute fixture output to unblock design approval.
