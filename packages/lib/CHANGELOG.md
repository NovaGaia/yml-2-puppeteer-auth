# yml-2-puppeteer-auth

## 0.2.0-rc.1

### Patch Changes

- 39f3a2c: Remove redundant documentation files at monorepo root.

  - Remove `API.md` — content fully covered by `packages/lib/README.md`
  - Remove `EXAMPLES.md` — content fully covered by `packages/lib/examples/*.yml`
  - Remove `PROJECT.md` — initial design document, obsolete since implementation is complete
  - Remove `SPECIFICATIONS.md` — content fully covered by `packages/lib/README.md` (YAML reference) and `ARCHITECTURE.md`
  - Keep `ARCHITECTURE.md` — unique content: execution flows, extensibility guide, error type mapping
  - Keep `TESTING.md` — unique content: debugging guide with real error messages and solutions
  - Update root `README.md` to link `ARCHITECTURE.md` and `TESTING.md`

## 0.2.0-rc.0

### Minor Changes

- 7721dff: Initial implementation of the `yml-2-puppeteer-auth` library.

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

  - `yml-2-puppeteer-auth validate config.yml`
  - `yml-2-puppeteer-auth test config.yml --headed --debug --screenshots ./debug`

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

- 75c16dc: Add `lighthouse` export with `authenticateWithPage()` for Lighthouse integrations.

  - Add `src/lighthouse.js` — public API for Lighthouse: `authenticateWithPage(page, configPath, options)` accepts an existing Puppeteer page without launching a browser
  - Add `scripts/puppeteer-with-package.cjs` — ready-to-copy CJS template for custom Lighthouse scripts using package imports
  - Switch from `puppeteer` to `puppeteer-core` — no Chromium downloaded on install; Chrome detected automatically from standard system locations (`/Applications/Google Chrome.app`, Homebrew, `/usr/bin/chromium`, Volta, NVM, etc.)
  - Expose new export path: `yml-2-puppeteer-auth/lighthouse`
  - Update all documentation: API.md, ARCHITECTURE.md, EXAMPLES.md, README.md
