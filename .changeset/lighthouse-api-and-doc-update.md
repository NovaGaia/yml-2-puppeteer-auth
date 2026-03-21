---
"yml-2-puppeteer-auth": minor
---

Add `lighthouse` export with `authenticateWithPage()` for Lighthouse integrations.

- Add `src/lighthouse.js` — public API for Lighthouse: `authenticateWithPage(page, configPath, options)` accepts an existing Puppeteer page without launching a browser
- Add `scripts/puppeteer-with-package.cjs` — ready-to-copy CJS template for custom Lighthouse scripts using package imports
- Switch from `puppeteer` to `puppeteer-core` — no Chromium downloaded on install; Chrome detected automatically from standard system locations (`/Applications/Google Chrome.app`, Homebrew, `/usr/bin/chromium`, Volta, NVM, etc.)
- Expose new export path: `yml-2-puppeteer-auth/lighthouse`
- Update all documentation: API.md, ARCHITECTURE.md, EXAMPLES.md, README.md
