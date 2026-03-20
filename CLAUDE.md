# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Package manager**: pnpm workspaces + Turborepo
- **Modules**: `type: module` (ES modules in source)
- **Entry point**: `packages/lib/scripts/puppeteer-generic.cjs` (CommonJS — required by Lighthouse `--puppeteer-script`)

## Architecture

**Runtime interpretation** (not code generation): a single generic Puppeteer script reads and executes YAML configurations dynamically at runtime. The YAML is the source of truth — no build step, no generated files to manage. No modes, no code generation, no ModeFactory.

```
YAML/JSON config
    ↓
ConfigLoader → Validator → Interpreter (runtime)
                                ↓
                    scripts/puppeteer-generic.cjs
                                ↓
                        Lighthouse audit
```

### Key components (`packages/lib`)

- **`src/core/config-loader.js`** — loads and parses YAML/JSON, resolves env vars
- **`src/core/validator.js`** — validates config against schema, returns `{ valid, errors }`
- **`src/core/interpreter.js`** — executes auth steps with Puppeteer at runtime (`authenticate()`, `verify()`, `test()`)
- **`src/helpers/`** — selector validation, wait utilities, verification handlers
- **`src/cli/cli.js`** — CLI interface (`validate`, `test`)
- **`scripts/puppeteer-generic.cjs`** — CommonJS entry point for Lighthouse; loads YAML via `AUTH_CONFIG` env var

There is no `src/modes/` directory — a single generic interpreter handles all scenarios.

## Config format (YAML/JSON)

```yaml
name: "Scenario name"

authentication:
  url: "https://example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[type='email']"
      timeout: 10000
      errorSelector: ".error-banner"   # fail immediately if this element appears

    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"          # reads from process.env.LOGIN_VALUE

    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp                  # generates OTP code at runtime (RFC 6238)

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation
      timeout: 15000

    - action: assertNotPresent
      selector: ".error-message"

    - action: wait
      duration: 3000                   # hard sleep — use only when no selector signal available

verification:
  - type: cookie
    name: "session_id"
    required: true
  - type: localStorage
    key: "auth-token"
    required: true
  - type: url
    contains: "/dashboard"
    required: true
  - type: selector
    selector: ".user-menu"
    required: true
  - type: title
    contains: "Dashboard"
    required: false

options:
  timeout: 30000
  debug: false
  verificationMode: all             # all | any
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Path to the YAML config file (read by the generic script) |
| `LOGIN_VALUE` | Login credential |
| `PASS_VALUE` | Password credential |
| `TOTP_SECRET` | Base32 TOTP secret for 2FA |
| `DEBUG` | Enable verbose logging (`true\|false`) |
| `TIMEOUT` | Override global timeout (ms) |

Credentials are never in YAML — always via `valueEnv` pointing to an env var.

## Lighthouse integration

```bash
export AUTH_CONFIG="./auth.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"
lighthouse https://example.com --puppeteer-script=packages/lib/scripts/puppeteer-generic.cjs
```

The script receives `{ page, session, flow, position, urls }` from Lighthouse props.

## Monorepo structure

```
/
├── packages/
│   ├── lib/    — Node.js library (published to npm as auth-scenario)
│   └── app/    — Tauri desktop app with React frontend
├── pnpm-workspace.yaml
├── turbo.json
└── .changeset/
```
