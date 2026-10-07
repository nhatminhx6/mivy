# Contact preservation — Gemini follow-up specification

Observed: actual legacy draft ZIP action PNG has CTA but no contact; raw JD includes an email. IndustryForm.tsx line11 initializes recruitment fields with role/name, salary/offer, requirements/details only. It does not initialize contact; UI correctly flags missing contact. This explains empty structured contact, but renderer propagation still needs tracing before a fix.

Bounded follow-up after provider recovery:
- Preserve original raw JD, existing structured fields, manual copy and intentional clearing.
- For legacy migration only, detect explicit Email/E-mail/Liên hệ/Contact lines conservatively; do not infer numbers from salary or experience. Existing nonempty contact wins. Multiple contacts retain order.
- Distinguish unmigrated contact from intentionally cleared contact; do not repopulate after clear or reload.
- Ensure action render receives contact even when custom CTA/headline preserved. Do not silently rewrite manually edited copy.
- Review export of VI/EN fixtures with explicit email; phone; multiple contacts; no contact; salary-only numbers; existing contact; intentional clear; saved draft reload. Keep source data intact.
- Require real PNG visual check for readable contact, no overlap, and ZIP evidence. Current downloaded legacy images live in reports/browser-zip-20261005.

This is prepared work, not dispatched and not an implemented fix. Property edge task remains first priority; no duplicate provider job.
