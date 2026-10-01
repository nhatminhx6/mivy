# Antigravity connection check — 2026-09-25

## Verified locally
- Antigravity.app version 2.17.0 installed.
- Old /opt/homebrew/bin/agy points to a removed IDE launcher, exit126.
- Installed official standalone CLI1.2.10 from https://antigravity.google/cli/install.sh at ~/.local/share/mivy-tools/bin/agy. Installer verified checksum and added this directory to shell profile PATHs. Old launcher not deleted.
- `agy --help` supports --print, --model, --output-format json/stream-json, --json-schema, --print-timeout, --sandbox.
- `agy models` succeeded without interactive login. Gemini IDs returned include gemini-3.1-pro-high and gemini-3.8-flash-high. Discovery is NOT an inference smoke test or quota verification.
- Claude models also exist through Antigravity. User forbids Claude for MIVY without explicit scoped confirmation, including Claude invoked through Antigravity.
- No model task, Claude invocation, API key setup or credit activation performed.
- ~/.gemini/antigravity-cli/settings.json absent. Official docs default useG1Credits=false; actual account quota/billing not independently verified.

## Implementation requirements for next stage
- Invoke absolute CLI path, explicit allowlisted Gemini model ID. Never use default model or Claude fallback.
- Codex and Antigravity adapters; role != provider. Keep task state/handoff artifacts, bounded retry and independent QC.
- Validate auth/provider configuration before live runs; do not silently switch to Gemini API-key billing. Enforce no paid-credit fallback.
- Stop/report quota or authentication failures; never infer quota from model listing.
- Respect tool denials, do not bypass permission checks with dangerously-skip-permissions.
- CLI/headless failures and denied_actions must block success status.
- Next validation: isolated minimal Gemini inference, then a bounded PO/Dev/QC task in isolated checkout. Neither has been performed yet.

## Official references
- https://antigravity.google/docs/cli/headless/
- https://antigravity.google/docs/cli/install
- https://antigravity.google/docs/cli/reference/
