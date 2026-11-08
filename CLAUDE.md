# Notes for Claude

- **Before every commit that changes the app** (`index.html`, `manifest.webmanifest`, icons, `vendor/`), run `./bump-version.sh` and stage `version.js` and `sw.js`. The footer shows this version and the service worker uses it to refresh the offline cache; without it, installed copies keep serving the old version. A pre-commit hook in `.githooks/` enforces this (enable with `git config core.hooksPath .githooks`).
- Don't write to any BLE characteristic other than `0xFFE2` without asking the user first. Never touch service `f000ffc0-0451-4000-b000-000000000000` (looks like a firmware-update service).
- Don't commit the battery's MAC address or full serial number; match on `namePrefix: 'L-'`.
- Test with a mocked `navigator.bluetooth` in headless Chromium (Playwright is pre-installed); there is no hardware here.
