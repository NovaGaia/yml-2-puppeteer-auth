# yml-2-puppeteer-auth

<p align="center">
  <img src="https://raw.githubusercontent.com/NovaGaia/yml-2-puppeteer-auth/main/packages/app/icons-src/v3/icon-pupp-2-yml.png" alt="yml-2-puppeteer-auth" width="128" />
</p>

Runtime YAML interpreter for Puppeteer authentication flows. Describe any login form in YAML — no JavaScript required.

```bash
npm install yml-2-puppeteer-auth
```

> **Requires**: Node.js ≥ 20, Google Chrome (or Chromium) installed on the system. The package uses `puppeteer-core` — no Chromium is downloaded on install.

---

## How it works

Write a YAML file describing your authentication steps. `yml-2-puppeteer-auth` reads it at runtime and executes each step with Puppeteer. No code generation, no build step.

```
YAML config → ConfigLoader → Validator → Interpreter → Puppeteer
```

---

## Quick start

```yaml
# auth.yml
name: "My app login"

authentication:
  url: "https://example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[type='email']"

    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"

    - action: fill
      selector: "input[type='password']"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation

verification:
  - type: url
    contains: "/dashboard"
    required: true

options:
  timeout: 30000
```

```bash
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

npx yml-2-puppeteer-auth validate auth.yml
npx yml-2-puppeteer-auth test auth.yml --headed
```

---

## YAML reference

### Actions

| Action | Required fields | Optional fields |
|--------|----------------|-----------------|
| `waitForSelector` | `selector` | `timeout`, `errorSelector` |
| `fill` | `selector`, `valueEnv` | `valueType: totp` |
| `click` | `selector` | |
| `waitForNavigation` | | `waitUntil`, `timeout` |
| `assertNotPresent` | `selector` | |
| `wait` | `duration` | |

### `errorSelector`

Runs a `Promise.race()` between `selector` and `errorSelector`. If the error element appears first, the step fails immediately with the element's text content.

```yaml
- action: waitForSelector
  selector: "#dashboard"
  errorSelector: ".error-message"
```

### TOTP / 2FA

```yaml
- action: fill
  selector: "#otp-input"
  valueEnv: "TOTP_SECRET"
  valueType: totp   # generates a live OTP code from the base32 secret (RFC 6238)
```

Compatible with Google Authenticator, Microsoft Authenticator, Wordfence, Okta, and any RFC 6238 provider.

### Verifications

```yaml
verification:
  - type: url
    contains: "/dashboard"
    required: true

  - type: cookie
    name: "session_id"       # startsWith match
    required: true

  - type: localStorage
    key: "auth-token"
    required: true

  - type: selector
    selector: ".user-menu"
    required: true

  - type: title
    contains: "Dashboard"
    required: false           # failure is logged but non-blocking

options:
  verificationMode: all       # all (default) | any
```

---

## Environment variables

Credentials are **never** stored in YAML. Always use `valueEnv` pointing to an environment variable.

```bash
# Load from a .env file
node --env-file=.env ./node_modules/.bin/yml-2-puppeteer-auth test auth.yml
```

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Path to YAML config (used by the Lighthouse script) |
| `LOGIN_VALUE` | Login credential |
| `PASS_VALUE` | Password credential |
| `TOTP_SECRET` | Base32 TOTP secret for 2FA |

---

## CLI

```bash
# Validate YAML without launching a browser
npx yml-2-puppeteer-auth validate auth.yml

# Run the full auth flow
npx yml-2-puppeteer-auth test auth.yml

# Options
npx yml-2-puppeteer-auth test auth.yml --headed              # show browser
npx yml-2-puppeteer-auth test auth.yml --debug               # log browser console
npx yml-2-puppeteer-auth test auth.yml --screenshots ./debug # save screenshots on failure
```

---

## Node.js API

```javascript
import { AuthScenario } from 'yml-2-puppeteer-auth'

const scenario = new AuthScenario('./auth.yml')

// Validate without Puppeteer
const { valid, errors } = await scenario.validate()
// errors: [{ path: 'authentication.steps[2].selector', message: '...' }]

// Run the full flow
const result = await scenario.test({
  headed: false,
  debug: false,
  screenshotsDir: null   // screenshots are opt-in
})
// result: { success, duration, error, failedStep, screenshots, steps }
```

---

## Lighthouse integration

`yml-2-puppeteer-auth` provides a ready-to-use Puppeteer script for Lighthouse. Lighthouse calls this script with a `{ page }` prop — no browser launch, no extra setup.

### Using the bundled script (simplest)

```bash
export AUTH_CONFIG="./auth.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

lighthouse https://example.com \
  --puppeteer-script=./node_modules/yml-2-puppeteer-auth/scripts/puppeteer-generic.cjs
```

### Writing your own script (custom logic)

Copy `scripts/puppeteer-with-package.cjs` from the package into your project, or create one from scratch using the `lighthouse` export:

```javascript
// my-auth-script.cjs
'use strict'

module.exports = async (props) => {
  const { authenticateWithPage } = await import('yml-2-puppeteer-auth/lighthouse')

  await authenticateWithPage(props.page, process.env.AUTH_CONFIG, {
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : undefined,
    debug: process.env.DEBUG === 'true',
  })
}
```

```bash
lighthouse https://example.com --puppeteer-script=./my-auth-script.cjs
```

### Environment variables for Lighthouse

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Path to YAML config file (required) |
| `DEBUG` | Enable verbose logging (`true\|false`) |
| `TIMEOUT` | Override global timeout (ms) |

---

## Lighthouse integration examples

See [`examples/lighthouse/`](./examples/lighthouse/) for complete integration examples with `lighthouse-plugin-ecoindex`:

- [`with-lib/`](./examples/lighthouse/with-lib/) — using `yml-2-puppeteer-auth` (recommended)
- [`without-lib/`](./examples/lighthouse/without-lib/) — vanilla Puppeteer for reference

---

## Examples

See [`examples/`](./examples/) for ready-to-use scenarios:

- `login-simple.yml` — single-step form
- `login-two-steps.yml` — multi-step flow
- `login-totp.yml` — with 2FA (TOTP)
- `login-with-error-handling.yml` — inline error detection
- `wordpress-2fa.yml` — WordPress + Wordfence 2FA

---

## Error handling

| Situation | Behavior |
|-----------|----------|
| Invalid YAML | Fails immediately with precise path (`authentication.steps[2].selector`) |
| Missing env var | Fails before any Puppeteer action |
| `waitForSelector` timeout | Error with selector + duration |
| `errorSelector` triggered | Error with element text content |
| `assertNotPresent` fails | Error with found selector |
| Failed verification | Error with verification details |

---

## License

MIT
