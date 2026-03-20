---
"auth-scenario": minor
---

Initial implementation of the `auth-scenario` library.

**Core features:**

- Runtime YAML/JSON interpreter for Puppeteer authentication flows — no code generation, no build step
- Supported actions: `fill`, `click`, `waitForSelector`, `waitForNavigation`, `assertNotPresent`, `wait`
- TOTP/2FA support via `valueType: totp` (RFC 6238, compatible with Google Authenticator, Wordfence, Okta, etc.)
- Error detection via `errorSelector` on `waitForSelector` steps (Promise.race pattern)
- Post-authentication verifications: `url`, `cookie`, `localStorage`, `selector`, `title`
- `verificationMode: all | any` for flexible verification strategies
- Credentials always via environment variables (`valueEnv`), never in YAML

**Public API (`AuthScenario`):**

- `validate()` — validates config without launching a browser, returns `{ valid, errors }`
- `test({ headed, debug, screenshotsDir })` — runs the full auth flow with Puppeteer
- Screenshots on failure are opt-in (`screenshotsDir` required)

**CLI:**

- `auth-scenario validate config.yml`
- `auth-scenario test config.yml --headed --debug --screenshots ./debug`

**Lighthouse integration:**

- `scripts/puppeteer-generic.cjs` — CommonJS entry point for `--puppeteer-script`
- Auth config loaded via `AUTH_CONFIG` environment variable

**Bug fixes:**

- Fixed: browser was staying on `about:blank` (missing `page.goto()` before steps)
- Fixed: `checkEnvVars` now throws typed `ValidationError` instead of plain `Error`
- Fixed: timeout option no longer overridden by `undefined` when not specified

**Testing:**

- 45 unit tests (Vitest) covering all core components
- Keycloak e2e test suite (Docker): login, TOTP 2FA, error detection via `errorSelector`
