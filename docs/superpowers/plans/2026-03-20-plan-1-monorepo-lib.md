# Auth Scenario — Plan 1 : Monorepo + Librairie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le monorepo et implémenter la librairie `auth-scenario` publiable sur npm — interprétation runtime de YAML pour authentifier avec Puppeteer, avec CLI (`validate`, `test`) et intégration Lighthouse.

**Architecture:** Un seul interpreter générique lit un YAML à runtime et exécute des steps Puppeteer atomiques (pas de génération de code, pas de modes prédéfinis). Le schéma YAML canonique est dans `docs/superpowers/specs/2026-03-20-auth-scenario-design.md`.

**Tech Stack:** pnpm workspaces, Turborepo, Changesets, Vitest, js-yaml, otplib, puppeteer (peer dep), commander

**Périmètre de ce plan :** `packages/lib` uniquement. Le plan 2 couvrira `packages/app` (Tauri + React).

---

## Structure des fichiers

```
/ (racine monorepo)
├── .gitignore
├── package.json                              # root workspace, scripts Turborepo
├── pnpm-workspace.yaml
├── turbo.json
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml                            # tests sur chaque PR
│       └── release.yml                       # publish npm sur Release PR merge
└── packages/
    └── lib/
        ├── package.json                      # name: "auth-scenario"
        ├── vitest.config.js
        ├── src/
        │   ├── index.js                      # export public AuthScenario
        │   ├── errors.js                     # classes d'erreur
        │   ├── core/
        │   │   ├── config-loader.js          # charge YAML/JSON, résout env vars
        │   │   ├── validator.js              # valide la structure { valid, errors }
        │   │   └── interpreter.js            # exécute les steps Puppeteer
        │   ├── helpers/
        │   │   ├── selector-utils.js         # stub — implémenté dans Plan 2 (app Tauri)
        │   │   ├── wait-utils.js             # stub — implémenté dans Plan 2 (app Tauri)
        │   │   └── verification.js           # vérifications post-auth
        │   └── cli/
        │       └── cli.js                    # commandes validate + test
        ├── scripts/
        │   └── puppeteer-generic.cjs         # point d'entrée Lighthouse (CommonJS)
        ├── tests/
        │   ├── core/
        │   │   ├── config-loader.test.js
        │   │   ├── validator.test.js
        │   │   └── interpreter.test.js
        │   ├── helpers/
        │   │   ├── verification.test.js
        │   │   └── auth-scenario.test.js     # tests de la classe publique AuthScenario
        │   └── fixtures/
        │       ├── login-simple.yml
        │       ├── login-invalid.yml
        │       └── login-broken.yml          # YAML malformé pour tester ParseError
        └── examples/
            ├── login-simple.yml
            ├── login-two-steps.yml
            ├── login-totp.yml
            ├── login-with-error-handling.yml
            └── login-one-page.yml
```

> **Note sur `selector-utils.js` et `wait-utils.js`** : ces fichiers sont des stubs vides dans ce plan. Ils seront utilisés par l'app Tauri (Plan 2) pour valider les sélecteurs en temps réel dans l'UI. Pour la lib, l'interpreter utilise directement l'API Puppeteer.

---

## Task 1 : Scaffold monorepo

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`

- [ ] **Step 1 : Créer `.gitignore`**

```
node_modules/
dist/
.turbo/
*.log
.env
*.env
```

- [ ] **Step 2 : Créer `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3 : Créer `package.json` racine**

```json
{
  "name": "auth-scenario-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@changesets/cli": "^2.27.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 4 : Créer `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 5 : Installer les dépendances racine**

```bash
pnpm install
```

- [ ] **Step 6 : Créer la structure de répertoires**

```bash
mkdir -p packages/lib/src/core packages/lib/src/helpers packages/lib/src/cli
mkdir -p packages/lib/scripts packages/lib/tests/core packages/lib/tests/helpers packages/lib/tests/fixtures packages/lib/examples
```

- [ ] **Step 7 : Commit**

```bash
git add .gitignore package.json pnpm-workspace.yaml turbo.json
git commit -m "chore: initialize monorepo with pnpm workspaces and turborepo"
```

---

## Task 2 : Scaffold `packages/lib`

**Files:**
- Create: `packages/lib/package.json`
- Create: `packages/lib/vitest.config.js`
- Create: `packages/lib/src/errors.js`

- [ ] **Step 1 : Créer `packages/lib/package.json`**

```json
{
  "name": "auth-scenario",
  "version": "0.1.0",
  "type": "module",
  "description": "Runtime YAML interpreter for Puppeteer authentication flows",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./errors": "./src/errors.js"
  },
  "bin": {
    "auth-scenario": "./src/cli/cli.js"
  },
  "files": [
    "src",
    "scripts"
  ],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0",
    "otplib": "^12.0.1"
  },
  "peerDependencies": {
    "puppeteer": ">=21.0.0"
  },
  "peerDependenciesMeta": {
    "puppeteer": { "optional": true }
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "puppeteer": "^23.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2 : Créer `packages/lib/vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Pas de globals: true — les imports explicites sont préférés pour la clarté
  },
})
```

- [ ] **Step 3 : Créer `packages/lib/src/errors.js`**

```javascript
export class AuthScenarioError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthScenarioError'
  }
}

export class FileNotFoundError extends AuthScenarioError {
  constructor(path) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

export class ParseError extends AuthScenarioError {
  constructor(message) {
    super(`Parse error: ${message}`)
    this.name = 'ParseError'
  }
}

export class ValidationError extends AuthScenarioError {
  constructor(errors) {
    super(`Validation failed: ${errors.map(e => e.message).join(', ')}`)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class InterpreterError extends AuthScenarioError {
  constructor(message, stepIndex) {
    super(message)
    this.name = 'InterpreterError'
    this.stepIndex = stepIndex
  }
}

export class VerificationError extends AuthScenarioError {
  constructor(message) {
    super(message)
    this.name = 'VerificationError'
  }
}
```

- [ ] **Step 4 : Créer les stubs vides pour Plan 2**

```javascript
// packages/lib/src/helpers/selector-utils.js
// Stub — utilisé par l'app Tauri (Plan 2) pour valider les sélecteurs dans l'UI
export function isValidSelector(selector) {
  if (!selector || typeof selector !== 'string') return false
  try {
    document.createDocumentFragment().querySelector(selector)
    return true
  } catch {
    return false
  }
}
```

```javascript
// packages/lib/src/helpers/wait-utils.js
// Stub — utilisé par l'app Tauri (Plan 2)
export const DEFAULT_TIMEOUT = 30000
```

- [ ] **Step 5 : Installer les dépendances lib**

```bash
cd packages/lib && pnpm install
```

- [ ] **Step 6 : Commit**

```bash
git add packages/lib/package.json packages/lib/vitest.config.js packages/lib/src/errors.js packages/lib/src/helpers/selector-utils.js packages/lib/src/helpers/wait-utils.js
git commit -m "chore: scaffold packages/lib with dependencies and error classes"
```

---

## Task 3 : ConfigLoader — chargement YAML/JSON

**Files:**
- Create: `packages/lib/src/core/config-loader.js`
- Create: `packages/lib/tests/core/config-loader.test.js`
- Create: `packages/lib/tests/fixtures/login-simple.yml`
- Create: `packages/lib/tests/fixtures/login-broken.yml`

- [ ] **Step 1 : Créer les fixtures**

```yaml
# packages/lib/tests/fixtures/login-simple.yml
name: "Login simple"
authentication:
  url: "https://example.com/login"
  steps:
    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"
    - action: click
      selector: "button[type='submit']"
verification:
  - type: url
    contains: "/dashboard"
    required: true
```

```
# packages/lib/tests/fixtures/login-broken.yml
name: broken
authentication:
  steps:
    - action: fill
      selector: [invalid yaml: {unclosed
```

- [ ] **Step 2 : Écrire les tests**

```javascript
// packages/lib/tests/core/config-loader.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigLoader } from '../../src/core/config-loader.js'
import { FileNotFoundError, ParseError } from '../../src/errors.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, '../fixtures')

describe('ConfigLoader.load', () => {
  it('loads a valid YAML file', async () => {
    const config = await ConfigLoader.load(path.join(fixturesDir, 'login-simple.yml'))
    expect(config.name).toBe('Login simple')
    expect(config.authentication.url).toBe('https://example.com/login')
    expect(config.authentication.steps).toHaveLength(2)
  })

  it('throws FileNotFoundError for missing file', async () => {
    await expect(ConfigLoader.load('/nonexistent/path/auth.yml')).rejects.toThrow(FileNotFoundError)
  })

  it('throws ParseError for malformed YAML', async () => {
    await expect(
      ConfigLoader.load(path.join(fixturesDir, 'login-broken.yml'))
    ).rejects.toThrow(ParseError)
  })
})

describe('ConfigLoader.checkEnvVars', () => {
  it('does not throw when all env vars are defined', () => {
    process.env.TEST_LOGIN = 'user@example.com'
    const config = {
      authentication: {
        steps: [{ action: 'fill', selector: 'input', valueEnv: 'TEST_LOGIN' }]
      }
    }
    expect(() => ConfigLoader.checkEnvVars(config)).not.toThrow()
    delete process.env.TEST_LOGIN
  })

  it('throws when a referenced env var is missing', () => {
    const config = {
      authentication: {
        steps: [{ action: 'fill', selector: 'input', valueEnv: 'NONEXISTENT_VAR_XYZ_123' }]
      }
    }
    expect(() => ConfigLoader.checkEnvVars(config)).toThrow(/Missing environment variable/)
  })
})
```

- [ ] **Step 3 : Vérifier que les tests échouent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : FAIL — `ConfigLoader` n'existe pas encore (5 tests)

- [ ] **Step 4 : Implémenter `config-loader.js`**

```javascript
// packages/lib/src/core/config-loader.js
import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'
import { FileNotFoundError, ParseError } from '../errors.js'

export class ConfigLoader {
  static async load(filePath) {
    let content
    try {
      content = await fs.readFile(filePath, 'utf8')
    } catch {
      throw new FileNotFoundError(filePath)
    }

    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.json') {
      try {
        return JSON.parse(content)
      } catch (e) {
        throw new ParseError(e.message)
      }
    }

    try {
      return yaml.load(content)
    } catch (e) {
      throw new ParseError(e.message)
    }
  }

  static checkEnvVars(config) {
    const steps = config.authentication?.steps ?? []
    for (const step of steps) {
      if (step.valueEnv && process.env[step.valueEnv] === undefined) {
        throw new Error(
          `Missing environment variable: ${step.valueEnv} (referenced in step action: ${step.action})`
        )
      }
    }
  }
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (5 tests)

- [ ] **Step 6 : Commit**

```bash
git add packages/lib/src/core/config-loader.js packages/lib/tests/core/config-loader.test.js packages/lib/tests/fixtures/
git commit -m "feat(lib): add ConfigLoader with YAML/JSON parsing and env var validation"
```

---

## Task 4 : Validator — validation de la structure

**Files:**
- Create: `packages/lib/src/core/validator.js`
- Create: `packages/lib/tests/core/validator.test.js`

- [ ] **Step 1 : Écrire les tests**

```javascript
// packages/lib/tests/core/validator.test.js
import { describe, it, expect } from 'vitest'
import { Validator } from '../../src/core/validator.js'

const validConfig = {
  name: 'Test',
  authentication: {
    url: 'https://example.com/login',
    steps: [
      { action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' },
      { action: 'click', selector: 'button' },
    ],
  },
}

describe('Validator', () => {
  it('validates a correct config', () => {
    const { valid, errors } = Validator.validate(validConfig)
    expect(valid).toBe(true)
    expect(errors).toHaveLength(0)
  })

  it('fails when name is missing', () => {
    const { name, ...config } = validConfig
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toBe('name')
  })

  it('fails when authentication.url is missing', () => {
    const config = { ...validConfig, authentication: { steps: validConfig.authentication.steps } }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors.some(e => e.path === 'authentication.url')).toBe(true)
  })

  it('fails when steps is empty', () => {
    const config = { ...validConfig, authentication: { ...validConfig.authentication, steps: [] } }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors.some(e => e.path === 'authentication.steps')).toBe(true)
  })

  it('fails when fill step is missing selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', valueEnv: 'X' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.selector/)
  })

  it('fails when fill step is missing valueEnv', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', selector: 'input' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.valueEnv/)
  })

  it('fails when wait step is missing duration', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'wait' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.duration/)
  })

  it('fails on unknown action', () => {
    const config = {
      ...validConfig,
      authentication: {
        ...validConfig.authentication,
        steps: [{ action: 'unknownAction', selector: 'x' }],
      },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(false)
  })

  it('validates verification block when present', () => {
    const config = { ...validConfig, verification: [{ type: 'cookie', name: 'session' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails on verification missing required field', () => {
    const config = { ...validConfig, verification: [{ type: 'url' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.contains/)
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : FAIL (10 tests, `Validator` n'existe pas)

- [ ] **Step 3 : Implémenter `validator.js`**

```javascript
// packages/lib/src/core/validator.js
const VALID_ACTIONS = ['fill', 'click', 'waitForSelector', 'waitForNavigation', 'assertNotPresent', 'wait']

const STEP_REQUIRED_FIELDS = {
  fill: ['selector', 'valueEnv'],
  click: ['selector'],
  waitForSelector: ['selector'],
  waitForNavigation: [],
  assertNotPresent: ['selector'],
  wait: ['duration'],
}

const VERIFICATION_REQUIRED_FIELDS = {
  cookie: ['name'],
  localStorage: ['key'],
  selector: ['selector'],
  url: ['contains'],
  title: ['contains'],
}

export class Validator {
  static validate(config) {
    const errors = []

    if (!config.name) errors.push({ path: 'name', message: 'Required field missing' })

    if (!config.authentication?.url) {
      errors.push({ path: 'authentication.url', message: 'Required field missing' })
    }

    const steps = config.authentication?.steps
    if (!steps || steps.length === 0) {
      errors.push({ path: 'authentication.steps', message: 'Must have at least one step' })
    } else {
      steps.forEach((step, i) => {
        if (!VALID_ACTIONS.includes(step.action)) {
          errors.push({ path: `authentication.steps[${i}].action`, message: `Unknown action: ${step.action}` })
          return
        }
        const required = STEP_REQUIRED_FIELDS[step.action] ?? []
        for (const field of required) {
          if (step[field] === undefined || step[field] === null || step[field] === '') {
            errors.push({ path: `authentication.steps[${i}].${field}`, message: 'Required field missing' })
          }
        }
      })
    }

    const verifications = config.verification ?? []
    verifications.forEach((v, i) => {
      const required = VERIFICATION_REQUIRED_FIELDS[v.type] ?? []
      for (const field of required) {
        if (!v[field]) {
          errors.push({ path: `verification[${i}].${field}`, message: 'Required field missing' })
        }
      }
    })

    return { valid: errors.length === 0, errors }
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (10 tests validator + 5 config-loader = 15 total)

- [ ] **Step 5 : Commit**

```bash
git add packages/lib/src/core/validator.js packages/lib/tests/core/validator.test.js
git commit -m "feat(lib): add Validator with step and verification schema validation"
```

---

## Task 5 : Helper — verification post-auth

**Files:**
- Create: `packages/lib/src/helpers/verification.js`
- Create: `packages/lib/tests/helpers/verification.test.js`

- [ ] **Step 1 : Écrire les tests**

```javascript
// packages/lib/tests/helpers/verification.test.js
import { describe, it, expect, vi } from 'vitest'
import { runVerifications } from '../../src/helpers/verification.js'
import { VerificationError } from '../../src/errors.js'

const makePage = (overrides = {}) => ({
  cookies: vi.fn().mockResolvedValue([]),
  evaluate: vi.fn().mockResolvedValue({}),
  url: vi.fn().mockReturnValue('https://example.com/dashboard'),
  title: vi.fn().mockResolvedValue('Dashboard'),
  $: vi.fn().mockResolvedValue(null),
  ...overrides,
})

describe('runVerifications — cookie', () => {
  it('passes when cookie name starts with expected prefix', async () => {
    const page = makePage({ cookies: vi.fn().mockResolvedValue([{ name: 'wordpress_logged_in_abc' }]) })
    await expect(
      runVerifications(page, [{ type: 'cookie', name: 'wordpress_logged_in_', required: true }])
    ).resolves.not.toThrow()
  })

  it('throws VerificationError when cookie is absent', async () => {
    const page = makePage({ cookies: vi.fn().mockResolvedValue([]) })
    await expect(
      runVerifications(page, [{ type: 'cookie', name: 'session', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — url', () => {
  it('passes when url contains expected string', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: true }])
    ).resolves.not.toThrow()
  })

  it('throws when url does not match', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — title', () => {
  it('passes when title contains expected string', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [{ type: 'title', contains: 'Dashboard', required: true }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — localStorage', () => {
  it('passes when key exists with a value', async () => {
    const page = makePage({ evaluate: vi.fn().mockResolvedValue({ 'auth-token': 'abc123' }) })
    await expect(
      runVerifications(page, [{ type: 'localStorage', key: 'auth-token', required: true }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — required:false', () => {
  it('does not throw on failure when required is false', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(page, [{ type: 'url', contains: '/dashboard', required: false }])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — verificationMode: any', () => {
  it('passes when at least one check succeeds (url passes, cookie fails)', async () => {
    const page = makePage()
    await expect(
      runVerifications(
        page,
        [{ type: 'url', contains: '/dashboard' }, { type: 'cookie', name: 'missing' }],
        { verificationMode: 'any' }
      )
    ).resolves.not.toThrow()
  })

  it('throws when all checks fail under mode:any', async () => {
    const page = makePage({ url: vi.fn().mockReturnValue('https://example.com/login') })
    await expect(
      runVerifications(
        page,
        [{ type: 'url', contains: '/dashboard' }, { type: 'cookie', name: 'missing' }],
        { verificationMode: 'any' }
      )
    ).rejects.toThrow(VerificationError)
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : FAIL (9 tests verification)

- [ ] **Step 3 : Implémenter `verification.js`**

```javascript
// packages/lib/src/helpers/verification.js
import { VerificationError } from '../errors.js'

async function checkOne(page, v) {
  switch (v.type) {
    case 'cookie': {
      const cookies = await page.cookies()
      const found = cookies.some(c => c.name.startsWith(v.name))
      if (!found) throw new VerificationError(`Cookie "${v.name}" not found`)
      break
    }
    case 'localStorage': {
      const storage = await page.evaluate(() => {
        const data = {}
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          data[k] = localStorage.getItem(k)
        }
        return data
      })
      if (!storage[v.key]) throw new VerificationError(`localStorage key "${v.key}" not found or empty`)
      break
    }
    case 'url': {
      const url = page.url()
      if (!url.includes(v.contains)) {
        throw new VerificationError(`URL "${url}" does not contain "${v.contains}"`)
      }
      break
    }
    case 'title': {
      const title = await page.title()
      if (!title.includes(v.contains)) {
        throw new VerificationError(`Title "${title}" does not contain "${v.contains}"`)
      }
      break
    }
    case 'selector': {
      const el = await page.$(v.selector)
      if (!el) throw new VerificationError(`Selector "${v.selector}" not found`)
      break
    }
    default:
      throw new VerificationError(`Unknown verification type: ${v.type}`)
  }
}

export async function runVerifications(page, verifications, options = {}) {
  const mode = options.verificationMode ?? 'all'

  if (mode === 'any') {
    let anyPassed = false
    for (const v of verifications) {
      try { await checkOne(page, v); anyPassed = true; break } catch {}
    }
    if (!anyPassed && verifications.length > 0) {
      throw new VerificationError('No verification passed (verificationMode: any)')
    }
    return
  }

  for (const v of verifications) {
    try {
      await checkOne(page, v)
    } catch (err) {
      if (v.required !== false) throw err
    }
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (24 tests total)

- [ ] **Step 5 : Commit**

```bash
git add packages/lib/src/helpers/verification.js packages/lib/tests/helpers/verification.test.js
git commit -m "feat(lib): add verification helpers (cookie, localStorage, url, title, selector)"
```

---

## Task 6 : Interpreter — exécution des steps

**Files:**
- Create: `packages/lib/src/core/interpreter.js`
- Modify: `packages/lib/tests/core/interpreter.test.js`

- [ ] **Step 1 : Écrire les tests**

```javascript
// packages/lib/tests/core/interpreter.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Interpreter } from '../../src/core/interpreter.js'
import { InterpreterError } from '../../src/errors.js'

const makePage = (overrides = {}) => ({
  type: vi.fn().mockResolvedValue(undefined),
  click: vi.fn().mockResolvedValue(undefined),
  waitForSelector: vi.fn().mockResolvedValue({ evaluate: async () => '' }),
  waitForNavigation: vi.fn().mockResolvedValue(undefined),
  $: vi.fn().mockResolvedValue(null),
  evaluate: vi.fn().mockResolvedValue({}),
  cookies: vi.fn().mockResolvedValue([{ name: 'session_abc' }]),
  url: vi.fn().mockReturnValue('https://example.com/dashboard'),
  title: vi.fn().mockResolvedValue('Dashboard'),
  screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
  ...overrides,
})

describe('Interpreter — fill', () => {
  it('types the env var value', async () => {
    process.env.LOGIN_VALUE = 'user@example.com'
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' }, 0)
    expect(page.type).toHaveBeenCalledWith('input', 'user@example.com')
    delete process.env.LOGIN_VALUE
  })

  it('generates a TOTP code when valueType is totp', async () => {
    // TOTP_SECRET is a valid base32 secret
    process.env.TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep(
      { action: 'fill', selector: 'input[name="otp"]', valueEnv: 'TOTP_SECRET', valueType: 'totp' },
      0
    )
    // TOTP code is a 6-digit string
    const calledWith = page.type.mock.calls[0][1]
    expect(calledWith).toMatch(/^\d{6}$/)
    delete process.env.TOTP_SECRET
  })

  it('throws InterpreterError when env var is missing', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'NONEXISTENT_XYZ' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — click', () => {
  it('calls page.click with the selector', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'click', selector: 'button' }, 0)
    expect(page.click).toHaveBeenCalledWith('button')
  })
})

describe('Interpreter — wait', () => {
  it('sleeps for the specified duration', async () => {
    vi.useFakeTimers()
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    const promise = interpreter.executeStep({ action: 'wait', duration: 1000 }, 0)
    vi.advanceTimersByTime(1000)
    await promise
    vi.useRealTimers()
  })
})

describe('Interpreter — waitForSelector', () => {
  it('calls page.waitForSelector with timeout', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForSelector', selector: 'input', timeout: 5000 }, 0)
    expect(page.waitForSelector).toHaveBeenCalledWith('input', { timeout: 5000 })
  })

  it('throws InterpreterError on timeout', async () => {
    const page = makePage({ waitForSelector: vi.fn().mockRejectedValue(new Error('Timeout')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'waitForSelector', selector: 'input' }, 0)
    ).rejects.toThrow(InterpreterError)
  })

  it('throws InterpreterError when errorSelector wins the Promise.race', async () => {
    const page = makePage({
      waitForSelector: vi.fn().mockImplementation(selector => {
        if (selector === '.error') {
          return Promise.resolve({ evaluate: async () => 'Bad credentials' })
        }
        return new Promise(() => {}) // main selector never resolves
      }),
    })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep(
        { action: 'waitForSelector', selector: 'input', errorSelector: '.error' },
        0
      )
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — assertNotPresent', () => {
  it('passes when element is absent ($ returns null)', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue(null) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'assertNotPresent', selector: '.error' }, 0)
    ).resolves.not.toThrow()
  })

  it('throws InterpreterError when element is present', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue({}) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'assertNotPresent', selector: '.error' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — waitForNavigation', () => {
  it('uses default waitUntil: load when not specified', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForNavigation' }, 0)
    expect(page.waitForNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ waitUntil: 'load' })
    )
  })

  it('uses specified waitUntil option', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await interpreter.executeStep({ action: 'waitForNavigation', waitUntil: 'networkidle0' }, 0)
    expect(page.waitForNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ waitUntil: 'networkidle0' })
    )
  })
})

describe('Interpreter — authenticate() and verify()', () => {
  it('executes all steps in order', async () => {
    process.env.LOGIN_VALUE = 'user@test.com'
    const page = makePage()
    const config = {
      authentication: {
        steps: [
          { action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' },
          { action: 'click', selector: 'button' },
        ],
      },
    }
    const interpreter = new Interpreter(config, page)
    await interpreter.authenticate()
    expect(page.type).toHaveBeenCalledTimes(1)
    expect(page.click).toHaveBeenCalledTimes(1)
    delete process.env.LOGIN_VALUE
  })

  it('verify() calls runVerifications with config verifications', async () => {
    const page = makePage()
    const config = {
      authentication: { steps: [] },
      verification: [{ type: 'url', contains: '/dashboard', required: true }],
    }
    const interpreter = new Interpreter(config, page)
    await expect(interpreter.verify()).resolves.not.toThrow()
  })

  it('verify() reads verificationMode from config.options', async () => {
    // url fails (login page), cookie also fails — but mode:any means at least one must pass
    // We set url to dashboard so it passes — proving mode is forwarded
    const page = makePage()  // url returns /dashboard by default
    const config = {
      authentication: { steps: [] },
      verification: [
        { type: 'url', contains: '/dashboard' },
        { type: 'cookie', name: 'missing_cookie' },
      ],
      options: { verificationMode: 'any' },
    }
    const interpreter = new Interpreter(config, page)
    await expect(interpreter.verify()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : FAIL (15 tests interpreter)

- [ ] **Step 3 : Implémenter `interpreter.js`**

```javascript
// packages/lib/src/core/interpreter.js
import { authenticator } from 'otplib'
import { InterpreterError } from '../errors.js'
import { runVerifications } from '../helpers/verification.js'

export class Interpreter {
  constructor(config, page, options = {}) {
    this.config = config
    this.page = page
    this.options = { timeout: 30000, ...options }
  }

  async executeStep(step, index) {
    switch (step.action) {
      case 'fill': return this._fill(step, index)
      case 'click': return this._click(step, index)
      case 'wait': return this._wait(step, index)
      case 'waitForSelector': return this._waitForSelector(step, index)
      case 'waitForNavigation': return this._waitForNavigation(step, index)
      case 'assertNotPresent': return this._assertNotPresent(step, index)
      default: throw new InterpreterError(`Unknown action: ${step.action}`, index)
    }
  }

  async authenticate() {
    const steps = this.config.authentication?.steps ?? []
    for (let i = 0; i < steps.length; i++) {
      await this.executeStep(steps[i], i)
    }
  }

  async verify() {
    const verifications = this.config.verification ?? []
    const mode = this.config.options?.verificationMode ?? 'all'
    await runVerifications(this.page, verifications, { verificationMode: mode })
  }

  async _fill(step, index) {
    let value
    if (step.valueType === 'totp') {
      const secret = process.env[step.valueEnv]
      if (!secret) throw new InterpreterError(`Missing env var: ${step.valueEnv}`, index)
      value = authenticator.generate(secret)
    } else {
      value = process.env[step.valueEnv]
      if (value === undefined) {
        throw new InterpreterError(`Missing env var: ${step.valueEnv}`, index)
      }
    }
    try {
      await this.page.type(step.selector, value)
    } catch (e) {
      throw new InterpreterError(`fill failed on "${step.selector}": ${e.message}`, index)
    }
  }

  async _click(step, index) {
    try {
      await this.page.click(step.selector)
    } catch (e) {
      throw new InterpreterError(`click failed on "${step.selector}": ${e.message}`, index)
    }
  }

  async _wait(step) {
    await new Promise(resolve => setTimeout(resolve, step.duration))
  }

  async _waitForSelector(step, index) {
    const timeout = step.timeout ?? this.options.timeout
    try {
      if (step.errorSelector) {
        const main = this.page.waitForSelector(step.selector, { timeout })
        const error = this.page.waitForSelector(step.errorSelector, { timeout }).then(async el => {
          const text = await el.evaluate(e => e.textContent).catch(() => step.errorSelector)
          throw new InterpreterError(
            `errorSelector "${step.errorSelector}" appeared: "${text}"`,
            index
          )
        })
        await Promise.race([main, error])
      } else {
        await this.page.waitForSelector(step.selector, { timeout })
      }
    } catch (e) {
      if (e instanceof InterpreterError) throw e
      throw new InterpreterError(
        `waitForSelector timeout for "${step.selector}" after ${timeout}ms`,
        index
      )
    }
  }

  async _waitForNavigation(step, index) {
    const timeout = step.timeout ?? this.options.timeout
    const waitUntil = step.waitUntil ?? 'load'
    try {
      await this.page.waitForNavigation({ waitUntil, timeout })
    } catch (e) {
      throw new InterpreterError(`waitForNavigation timeout after ${timeout}ms`, index)
    }
  }

  async _assertNotPresent(step, index) {
    const el = await this.page.$(step.selector)
    if (el !== null) {
      throw new InterpreterError(`assertNotPresent: "${step.selector}" is present in the DOM`, index)
    }
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (39 tests total)

- [ ] **Step 5 : Commit**

```bash
git add packages/lib/src/core/interpreter.js packages/lib/tests/core/interpreter.test.js
git commit -m "feat(lib): add Interpreter with all step actions, TOTP support, and errorSelector race"
```

---

## Task 7 : Public API — classe `AuthScenario`

**Files:**
- Create: `packages/lib/src/index.js`
- Create: `packages/lib/tests/helpers/auth-scenario.test.js`

- [ ] **Step 1 : Écrire les tests**

```javascript
// packages/lib/tests/helpers/auth-scenario.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, '../fixtures')

// Mock puppeteer avant d'importer AuthScenario
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        on: vi.fn(),
        type: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue({ evaluate: async () => '' }),
        waitForNavigation: vi.fn().mockResolvedValue(undefined),
        $: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue({}),
        cookies: vi.fn().mockResolvedValue([]),
        url: vi.fn().mockReturnValue('https://example.com/dashboard'),
        title: vi.fn().mockResolvedValue('Dashboard'),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

describe('AuthScenario', () => {
  let AuthScenario

  beforeEach(async () => {
    const mod = await import('../../src/index.js')
    AuthScenario = mod.AuthScenario
  })

  describe('validate()', () => {
    it('returns { valid: true, errors: [] } for a valid config', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      delete process.env.LOGIN_VALUE
    })

    it('returns { valid: false, errors } for an invalid config', async () => {
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-invalid.yml'))
      const result = await scenario.validate()
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('throws when env var is missing', async () => {
      delete process.env.LOGIN_VALUE
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      await expect(scenario.validate()).rejects.toThrow(/Missing environment variable/)
    })
  })

  describe('test()', () => {
    it('returns { success: true } when auth flow completes', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.test({ headed: false })
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      delete process.env.LOGIN_VALUE
    })

    it('returns { success: false } when a step fails', async () => {
      process.env.LOGIN_VALUE = 'user@example.com'
      const puppeteer = await import('puppeteer')
      puppeteer.default.launch.mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue({
          on: vi.fn(),
          type: vi.fn().mockRejectedValue(new Error('Element not found')),
          click: vi.fn(),
          $: vi.fn().mockResolvedValue(null),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
          url: vi.fn().mockReturnValue(''),
          title: vi.fn().mockResolvedValue(''),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      })
      const scenario = new AuthScenario(path.join(fixturesDir, 'login-simple.yml'))
      const result = await scenario.test()
      expect(result.success).toBe(false)
      expect(result.failedStep).toBe(0)
      expect(Array.isArray(result.screenshots)).toBe(true)
      delete process.env.LOGIN_VALUE
    })
  })
})
```

- [ ] **Step 2 : Créer `packages/lib/tests/fixtures/login-invalid.yml`**

```yaml
# login-invalid.yml — manque name et url
authentication:
  steps:
    - action: fill
      valueEnv: "LOGIN_VALUE"
      # selector manquant
```

- [ ] **Step 3 : Vérifier que les tests échouent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : FAIL (5 tests `AuthScenario`)

- [ ] **Step 4 : Créer `src/index.js`**

```javascript
// packages/lib/src/index.js
import puppeteer from 'puppeteer'
import { ConfigLoader } from './core/config-loader.js'
import { Validator } from './core/validator.js'
import { Interpreter } from './core/interpreter.js'
import { ValidationError } from './errors.js'

export class AuthScenario {
  constructor(configPath, options = {}) {
    this.configPath = configPath
    this.options = { timeout: 30000, debug: false, ...options }
  }

  async validate() {
    const raw = await ConfigLoader.load(this.configPath)
    const result = Validator.validate(raw)
    if (result.valid) {
      ConfigLoader.checkEnvVars(raw)  // throws if env var is missing
    }
    return result  // always { valid, errors }
  }

  async test(options = {}) {
    const { headed = false, debug = false, screenshotsDir = null } = options
    const raw = await ConfigLoader.load(this.configPath)
    const validationResult = Validator.validate(raw)
    if (!validationResult.valid) throw new ValidationError(validationResult.errors)
    ConfigLoader.checkEnvVars(raw)

    const browser = await puppeteer.launch({ headless: !headed })
    const page = await browser.newPage()
    if (debug) page.on('console', msg => console.log('[browser]', msg.text()))

    const interpreter = new Interpreter(raw, page, { timeout: this.options.timeout })
    const startTime = Date.now()
    const stepResults = []

    try {
      const steps = raw.authentication?.steps ?? []
      for (let i = 0; i < steps.length; i++) {
        const t0 = Date.now()
        try {
          await interpreter.executeStep(steps[i], i)
          stepResults.push({ index: i, action: steps[i].action, duration: Date.now() - t0, status: 'success', error: null })
          if (debug && screenshotsDir) {
            await page.screenshot({ path: `${screenshotsDir}/step-${i}-${steps[i].action}.png` })
          }
        } catch (err) {
          const screenshotPath = await this._saveFailureScreenshot(page, screenshotsDir, i)
          stepResults.push({ index: i, action: steps[i].action, duration: Date.now() - t0, status: 'failed', error: err.message })
          return {
            success: false, duration: Date.now() - startTime,
            error: err.message, failedStep: i,
            screenshots: screenshotPath ? [screenshotPath] : [],
            steps: stepResults,
          }
        }
      }
      await interpreter.verify()
      return { success: true, duration: Date.now() - startTime, error: null, failedStep: null, screenshots: [], steps: stepResults }
    } finally {
      await browser.close()
    }
  }

  async _saveFailureScreenshot(page, screenshotsDir, stepIndex) {
    try {
      const dir = screenshotsDir ?? '.'
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const filePath = `${dir}/auth-failure-step${stepIndex}-${ts}.png`
      await page.screenshot({ path: filePath })
      return filePath
    } catch {
      return null
    }
  }
}

export * from './errors.js'
```

- [ ] **Step 5 : Vérifier que tous les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (44 tests total)

- [ ] **Step 6 : Commit**

```bash
git add packages/lib/src/index.js packages/lib/tests/helpers/auth-scenario.test.js packages/lib/tests/fixtures/login-invalid.yml
git commit -m "feat(lib): add AuthScenario public API with validate() and test()"
```

---

## Task 8 : Script Lighthouse — `puppeteer-generic.cjs`

**Files:**
- Create: `packages/lib/scripts/puppeteer-generic.cjs`

- [ ] **Step 1 : Créer `scripts/puppeteer-generic.cjs`**

```javascript
// packages/lib/scripts/puppeteer-generic.cjs
// CommonJS entry point for Lighthouse --puppeteer-script
'use strict'

module.exports = async (props) => {
  const { ConfigLoader } = await import('../src/core/config-loader.js')
  const { Validator } = await import('../src/core/validator.js')
  const { Interpreter } = await import('../src/core/interpreter.js')
  const { ValidationError } = await import('../src/errors.js')

  const configPath = process.env.AUTH_CONFIG
  if (!configPath) {
    throw new Error(
      'Missing AUTH_CONFIG environment variable — set it to the path of your YAML config file'
    )
  }

  const { page } = props
  const raw = await ConfigLoader.load(configPath)
  const validationResult = Validator.validate(raw)
  if (!validationResult.valid) throw new ValidationError(validationResult.errors)
  ConfigLoader.checkEnvVars(raw)

  const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000
  const debug = process.env.DEBUG === 'true'

  if (debug) {
    page.on('console', msg => console.log('[auth-scenario]', msg.text()))
    console.log(`[auth-scenario] config: ${configPath}`)
    console.log(`[auth-scenario] steps: ${raw.authentication.steps.length}`)
  }

  const interpreter = new Interpreter(raw, page, { timeout })
  await interpreter.authenticate()
  await interpreter.verify()

  if (debug) console.log('[auth-scenario] Authentication successful')
}
```

- [ ] **Step 2 : Vérifier la syntaxe**

```bash
node --check packages/lib/scripts/puppeteer-generic.cjs
```
Résultat attendu : aucune erreur (commande silencieuse = succès)

- [ ] **Step 3 : Commit**

```bash
git add packages/lib/scripts/puppeteer-generic.cjs
git commit -m "feat(lib): add puppeteer-generic.cjs Lighthouse entry point"
```

---

## Task 9 : CLI — commandes `validate` et `test`

**Files:**
- Create: `packages/lib/src/cli/cli.js`

- [ ] **Step 1 : Créer `src/cli/cli.js`**

```javascript
#!/usr/bin/env node
// packages/lib/src/cli/cli.js
import { program } from 'commander'
import path from 'path'
import { AuthScenario } from '../index.js'
import { ConfigLoader } from '../core/config-loader.js'
import { Validator } from '../core/validator.js'

program
  .name('auth-scenario')
  .description('Runtime YAML interpreter for Puppeteer authentication flows')
  .version('0.1.0')

program
  .command('validate <config>')
  .description('Validate YAML config structure and check env vars — no browser launched')
  .action(async (configArg) => {
    const configPath = path.resolve(configArg)
    try {
      const raw = await ConfigLoader.load(configPath)
      const result = Validator.validate(raw)

      if (!result.valid) {
        console.error('✗ YAML invalid:')
        result.errors.forEach(e => console.error(`  ${e.path}: ${e.message}`))
        process.exit(1)
      }

      console.log('✓ YAML valid')

      try {
        ConfigLoader.checkEnvVars(raw)
        const envRefs = (raw.authentication?.steps ?? [])
          .filter(s => s.valueEnv)
          .map(s => s.valueEnv)
        if (envRefs.length > 0) {
          console.log(`✓ Environment variables present (${envRefs.join(', ')})`)
        }
      } catch (e) {
        console.error(`✗ ${e.message}`)
        process.exit(1)
      }

      const steps = raw.authentication?.steps ?? []
      console.log(`\nSteps: ${steps.length}`)
      steps.forEach((s, i) => {
        const detail = s.valueEnv ? ` ← ${s.valueEnv}` : ''
        const selector = s.selector ? ` "${s.selector}"` : ''
        console.log(`  [${i}] ${s.action}${selector}${detail}`)
      })
    } catch (e) {
      console.error(`✗ Error: ${e.message}`)
      process.exit(1)
    }
  })

program
  .command('test <config>')
  .description('Run authentication flow with Puppeteer')
  .option('--headed', 'Open a visible browser window')
  .option('--debug', 'Verbose logs and screenshot at each step')
  .option('--screenshots <dir>', 'Directory to save screenshots')
  .option('--timeout <ms>', 'Override global timeout (ms)', parseInt)
  .action(async (configArg, options) => {
    const configPath = path.resolve(configArg)
    const scenario = new AuthScenario(configPath, { timeout: options.timeout })

    try {
      const result = await scenario.test({
        headed: options.headed ?? false,
        debug: options.debug ?? false,
        screenshotsDir: options.screenshots ?? null,
      })

      if (result.success) {
        console.log(`✓ Authentication successful (${result.duration}ms)`)
        result.steps.forEach(s => console.log(`  ✓ [${s.index}] ${s.action} (${s.duration}ms)`))
      } else {
        console.error(`✗ Failed at step ${result.failedStep}: ${result.error}`)
        if (result.screenshots.length > 0) console.error(`  Screenshot: ${result.screenshots[0]}`)
        process.exit(1)
      }
    } catch (e) {
      console.error(`✗ ${e.message}`)
      process.exit(1)
    }
  })

program.parse()
```

- [ ] **Step 2 : Rendre le fichier exécutable**

```bash
chmod +x packages/lib/src/cli/cli.js
```

- [ ] **Step 3 : Tester `validate` manuellement**

```bash
cd packages/lib
node src/cli/cli.js validate tests/fixtures/login-simple.yml
```
Résultat attendu :
```
✗ Error: Missing environment variable: LOGIN_VALUE ...
```

```bash
LOGIN_VALUE=test node src/cli/cli.js validate tests/fixtures/login-simple.yml
```
Résultat attendu :
```
✓ YAML valid
✓ Environment variables present (LOGIN_VALUE)

Steps: 2
  [0] fill "input[type='email']" ← LOGIN_VALUE
  [1] click "button[type='submit']"
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
cd packages/lib && pnpm test
```
Résultat attendu : PASS (tous)

- [ ] **Step 5 : Commit**

```bash
git add packages/lib/src/cli/cli.js
git commit -m "feat(lib): add CLI with validate and test commands"
```

---

## Task 10 : Fichiers YAML d'exemples

**Files:**
- Create: `packages/lib/examples/login-simple.yml`
- Create: `packages/lib/examples/login-two-steps.yml`
- Create: `packages/lib/examples/login-totp.yml`
- Create: `packages/lib/examples/login-with-error-handling.yml`
- Create: `packages/lib/examples/login-one-page.yml`

- [ ] **Step 1 : Créer les 5 exemples** — copier depuis `EXAMPLES.md` sections 1 à 5

- [ ] **Step 2 : Commit**

```bash
git add packages/lib/examples/
git commit -m "docs(lib): add 5 example YAML configs"
```

---

## Task 11 : Changesets

**Files:**
- Create: `.changeset/config.json`

- [ ] **Step 1 : Initialiser Changesets**

```bash
pnpm changeset init
```

- [ ] **Step 2 : Modifier `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3 : Commit**

```bash
git add .changeset/
git commit -m "chore: initialize changesets for versioning"
```

---

## Task 12 : GitHub Actions — CI et Release

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1 : Créer `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test
```

- [ ] **Step 2 : Créer `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # requis par changesets pour détecter les changements
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> Ajouter le secret `NPM_TOKEN` dans GitHub : Settings → Secrets and variables → Actions → `NPM_TOKEN` (token npm avec permission `publish`).

- [ ] **Step 3 : Commit**

```bash
git add .github/
git commit -m "ci: add CI and release workflows"
```

---

## Vérification finale

- [ ] **Lancer tous les tests**

```bash
pnpm test
```
Résultat attendu : PASS (tous les tests)

- [ ] **Vérifier les exports publics**

```bash
cd packages/lib && node -e "import('./src/index.js').then(m => console.log(Object.keys(m)))"
```
Résultat attendu : `[ 'AuthScenario', 'AuthScenarioError', 'FileNotFoundError', 'ParseError', 'ValidationError', 'InterpreterError', 'VerificationError' ]`

- [ ] **Vérifier le script Lighthouse**

```bash
node --check packages/lib/scripts/puppeteer-generic.cjs && echo "✓ Syntax OK"
```
Résultat attendu : `✓ Syntax OK`

- [ ] **Vérifier la commande validate**

```bash
LOGIN_VALUE=test node packages/lib/src/cli/cli.js validate packages/lib/tests/fixtures/login-simple.yml
```
Résultat attendu : `✓ YAML valid` + liste des steps

---

## Notes pour le Plan 2 (app Tauri)

Le Plan 2 couvrira :
- Setup `packages/app` avec Tauri 2 + React + Vite
- UI éditeur de scénario (formulaires → aperçu YAML en temps réel)
- Runner de tests avec logs en temps réel (IPC Tauri → subprocess Node.js qui exécute la lib)
- Stockage des credentials dans le keychain OS (`tauri-plugin-stronghold`)
- Auto-updater Tauri via GitHub Releases
- GitHub Actions matrix build (macOS x64+arm64, Windows, Linux)
- Script post-changeset : sync `packages/app/package.json` → `src-tauri/tauri.conf.json`
