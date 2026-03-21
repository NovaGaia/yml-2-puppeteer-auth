# Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une couverture de tests significative sur les gaps identifiés dans `packages/lib` (vitest) et `packages/app` (Rust + React), sans lancer de vrai navigateur ni appeler Tauri IPC directement.

**Architecture:** Les tests lib sont des unit tests purs avec mocks vitest (`vi.fn()`, `vi.mock()`). Les tests Rust utilisent SQLite in-memory avec `#[tokio::test]`. Les tests React utilisent vitest + `@testing-library/react` avec `invoke` mocké globalement via `vi.mock('@tauri-apps/api/core')`.

**Tech Stack:** vitest 2.x (ESM), @testing-library/react 14.x, @testing-library/user-event, tokio::test, sqlx SQLite in-memory, otplib 12.x

---

## Structure des fichiers nouveaux

```
packages/lib/tests/
├── core/
│   ├── validator.test.js          EXISTANT — à enrichir
│   ├── config-loader.test.js      EXISTANT — à enrichir
│   └── interpreter.test.js        EXISTANT — à enrichir
├── helpers/
│   ├── verification.test.js       EXISTANT — à enrichir
│   └── errors.test.js             NOUVEAU
└── fixtures/
    └── (existants)

packages/app/
├── src/
│   ├── hooks/
│   │   └── useScenario.test.tsx   NOUVEAU
│   └── components/runner/
│       └── RunnerPanel.test.tsx   NOUVEAU
└── src-tauri/src/commands/
    ├── scenarios.rs               EXISTANT — à enrichir (mod tests)
    └── runner.rs                  EXISTANT — à enrichir (mod tests)
```

---

### Task 1 : lib — errors.js : types et messages

**Files:**
- Create: `packages/lib/tests/helpers/errors.test.js`

- [ ] **Step 1 : Écrire le fichier de test**

```javascript
// packages/lib/tests/helpers/errors.test.js
import { describe, it, expect } from 'vitest'
import {
  AuthScenarioError,
  FileNotFoundError,
  ParseError,
  ValidationError,
  InterpreterError,
  VerificationError,
} from '../../src/errors.js'

describe('AuthScenarioError', () => {
  it('has correct name and message', () => {
    const err = new AuthScenarioError('boom')
    expect(err.name).toBe('AuthScenarioError')
    expect(err.message).toBe('boom')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('FileNotFoundError', () => {
  it('includes the file path in the message', () => {
    const err = new FileNotFoundError('/tmp/auth.yml')
    expect(err.name).toBe('FileNotFoundError')
    expect(err.message).toContain('/tmp/auth.yml')
    expect(err).toBeInstanceOf(AuthScenarioError)
  })
})

describe('ParseError', () => {
  it('prefixes message with "Parse error:"', () => {
    const err = new ParseError('unexpected token')
    expect(err.name).toBe('ParseError')
    expect(err.message).toMatch(/^Parse error:/)
    expect(err.message).toContain('unexpected token')
  })
})

describe('ValidationError', () => {
  it('exposes errors array and joins messages', () => {
    const errors = [
      { path: 'name', message: 'Required field missing' },
      { path: 'authentication.url', message: 'Required field missing' },
    ]
    const err = new ValidationError(errors)
    expect(err.name).toBe('ValidationError')
    expect(err.errors).toBe(errors)
    expect(err.message).toContain('Required field missing')
  })
})

describe('InterpreterError', () => {
  it('stores stepIndex', () => {
    const err = new InterpreterError('click failed', 3)
    expect(err.name).toBe('InterpreterError')
    expect(err.stepIndex).toBe(3)
    expect(err.message).toContain('click failed')
    expect(err).toBeInstanceOf(AuthScenarioError)
  })
})

describe('VerificationError', () => {
  it('has correct name and message', () => {
    const err = new VerificationError('Cookie not found')
    expect(err.name).toBe('VerificationError')
    expect(err.message).toContain('Cookie not found')
    expect(err).toBeInstanceOf(AuthScenarioError)
  })
})
```

- [ ] **Step 2 : Vérifier que le test échoue avant toute modification**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|errors)"`

Expected: PASS immédiatement — les classes existent déjà. Si tout passe, c'est normal : le fichier teste les invariants.

- [ ] **Step 3 : Lancer les tests complets du module lib**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test`

Expected: tous les tests passent

- [ ] **Step 4 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/lib/tests/helpers/errors.test.js
git commit -m "test(lib): add errors.js type and message coverage"
```

---

### Task 2 : lib — validator.js : cas manquants

**Files:**
- Modify: `packages/lib/tests/core/validator.test.js`

Les cas déjà couverts : `name` manquant, `authentication.url` manquant, steps vide, `fill` sans selector/valueEnv, `wait` sans duration, action inconnue, verification block valide, verification missing required field.

Cas manquants : actions `click`/`waitForSelector`/`waitForNavigation`/`assertNotPresent` sans champ requis, `verificationMode` valide/invalide, valeur vide `""` vs `null` pour les champs requis, tous les types de verification (`cookie`, `localStorage`, `selector`, `title`).

- [ ] **Step 1 : Écrire les tests manquants (ajouter à la fin du fichier existant)**

```javascript
// À AJOUTER dans packages/lib/tests/core/validator.test.js

describe('Validator — remaining action types', () => {
  it('accepts click with selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'click', selector: 'button' }] },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails when click step is missing selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'click' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.selector/)
  })

  it('accepts waitForSelector with selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'waitForSelector', selector: 'input' }] },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails when waitForSelector step is missing selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'waitForSelector' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.selector/)
  })

  it('accepts waitForNavigation with no required fields', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'waitForNavigation' }] },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('accepts assertNotPresent with selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'assertNotPresent', selector: '.err' }] },
    }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails when assertNotPresent step is missing selector', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'assertNotPresent' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/steps\[0\]\.selector/)
  })
})

describe('Validator — verificationMode', () => {
  it('accepts verificationMode: all', () => {
    const config = { ...validConfig, options: { verificationMode: 'all' } }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('accepts verificationMode: any', () => {
    const config = { ...validConfig, options: { verificationMode: 'any' } }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails on unknown verificationMode', () => {
    const config = { ...validConfig, options: { verificationMode: 'none' } }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toBe('options.verificationMode')
    expect(errors[0].message).toContain("'none'")
  })

  it('accepts missing options (verificationMode is optional)', () => {
    const { valid } = Validator.validate(validConfig)
    expect(valid).toBe(true)
  })
})

describe('Validator — all verification types required fields', () => {
  it('accepts cookie with name', () => {
    const config = { ...validConfig, verification: [{ type: 'cookie', name: 'session' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails cookie without name', () => {
    const config = { ...validConfig, verification: [{ type: 'cookie' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.name/)
  })

  it('accepts localStorage with key', () => {
    const config = { ...validConfig, verification: [{ type: 'localStorage', key: 'auth-token' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails localStorage without key', () => {
    const config = { ...validConfig, verification: [{ type: 'localStorage' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.key/)
  })

  it('accepts selector with selector field', () => {
    const config = { ...validConfig, verification: [{ type: 'selector', selector: '.user-menu' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails selector without selector field', () => {
    const config = { ...validConfig, verification: [{ type: 'selector' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.selector/)
  })

  it('accepts title with contains', () => {
    const config = { ...validConfig, verification: [{ type: 'title', contains: 'Dashboard' }] }
    const { valid } = Validator.validate(config)
    expect(valid).toBe(true)
  })

  it('fails title without contains', () => {
    const config = { ...validConfig, verification: [{ type: 'title' }] }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/verification\[0\]\.contains/)
  })
})

describe('Validator — empty string edge cases', () => {
  it('fails when fill selector is empty string', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', selector: '', valueEnv: 'X' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/selector/)
  })

  it('fails when fill valueEnv is empty string', () => {
    const config = {
      ...validConfig,
      authentication: { ...validConfig.authentication, steps: [{ action: 'fill', selector: 'input', valueEnv: '' }] },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors[0].path).toMatch(/valueEnv/)
  })

  it('accumulates multiple errors across multiple steps', () => {
    const config = {
      ...validConfig,
      authentication: {
        ...validConfig.authentication,
        steps: [
          { action: 'click' },              // manque selector
          { action: 'fill', valueEnv: 'X' }, // manque selector
        ],
      },
    }
    const { valid, errors } = Validator.validate(config)
    expect(valid).toBe(false)
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier que les nouveaux passent**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/lib/tests/core/validator.test.js
git commit -m "test(lib): expand validator coverage — all action types, verificationMode, edge cases"
```

---

### Task 3 : lib — config-loader.js : JSON, env vars multiples

**Files:**
- Modify: `packages/lib/tests/core/config-loader.test.js`
- Create: `packages/lib/tests/fixtures/login-simple.json`

Cas manquants : chargement JSON, env var absente sur le deuxième step (pas le premier), config sans steps (`checkEnvVars` ne plante pas).

- [ ] **Step 1 : Créer la fixture JSON**

Contenu de `packages/lib/tests/fixtures/login-simple.json` :
```json
{
  "name": "Login JSON",
  "authentication": {
    "url": "https://example.com/login",
    "steps": [
      { "action": "fill", "selector": "input[type='email']", "valueEnv": "LOGIN_VALUE" },
      { "action": "click", "selector": "button[type='submit']" }
    ]
  }
}
```

- [ ] **Step 2 : Écrire les tests manquants (ajouter à la fin du fichier existant)**

```javascript
// À AJOUTER dans packages/lib/tests/core/config-loader.test.js

describe('ConfigLoader.load — JSON', () => {
  it('loads a valid JSON file', async () => {
    const config = await ConfigLoader.load(path.join(fixturesDir, 'login-simple.json'))
    expect(config.name).toBe('Login JSON')
    expect(config.authentication.url).toBe('https://example.com/login')
    expect(config.authentication.steps).toHaveLength(2)
  })

  it('throws FileNotFoundError for non-existent JSON file', async () => {
    await expect(ConfigLoader.load('/tmp/nonexistent-broken.json')).rejects.toThrow(FileNotFoundError)
  })
})

describe('ConfigLoader.checkEnvVars — multi-step', () => {
  it('throws for the second step env var if missing', () => {
    process.env.FIRST_VAR = 'ok'
    const config = {
      authentication: {
        steps: [
          { action: 'fill', selector: 'input', valueEnv: 'FIRST_VAR' },
          { action: 'fill', selector: 'input', valueEnv: 'MISSING_SECOND_VAR_XYZ' },
        ],
      },
    }
    expect(() => ConfigLoader.checkEnvVars(config)).toThrow(/MISSING_SECOND_VAR_XYZ/)
    delete process.env.FIRST_VAR
  })

  it('does not throw when config has no authentication steps', () => {
    const config = {}
    expect(() => ConfigLoader.checkEnvVars(config)).not.toThrow()
  })

  it('does not throw when steps have no valueEnv', () => {
    const config = {
      authentication: {
        steps: [
          { action: 'click', selector: 'button' },
          { action: 'waitForNavigation' },
        ],
      },
    }
    expect(() => ConfigLoader.checkEnvVars(config)).not.toThrow()
  })
})
```

- [ ] **Step 3 : Lancer les tests**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 4 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/lib/tests/core/config-loader.test.js packages/lib/tests/fixtures/login-simple.json
git commit -m "test(lib): expand config-loader coverage — JSON loading, multi-step env vars"
```

---

### Task 4 : lib — verification.js : cas manquants

**Files:**
- Modify: `packages/lib/tests/helpers/verification.test.js`

Cas manquants : `localStorage` retourne null/vide (échec), `selector` présent (succès) vs absent (échec), `title` non-match (échec), type inconnu (lève VerificationError), mode `all` avec un check `required:false` qui échoue mais ne bloque pas.

- [ ] **Step 1 : Écrire les tests manquants (ajouter à la fin du fichier existant)**

```javascript
// À AJOUTER dans packages/lib/tests/helpers/verification.test.js

describe('runVerifications — localStorage failures', () => {
  it('throws when localStorage key is absent (evaluate returns null)', async () => {
    const page = makePage({ evaluate: vi.fn().mockResolvedValue(null) })
    await expect(
      runVerifications(page, [{ type: 'localStorage', key: 'auth-token', required: true }])
    ).rejects.toThrow(VerificationError)
  })

  it('throws when localStorage key is empty string', async () => {
    const page = makePage({ evaluate: vi.fn().mockResolvedValue('') })
    await expect(
      runVerifications(page, [{ type: 'localStorage', key: 'auth-token', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — selector', () => {
  it('passes when selector is found', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue({ nodeType: 1 }) })
    await expect(
      runVerifications(page, [{ type: 'selector', selector: '.user-menu', required: true }])
    ).resolves.not.toThrow()
  })

  it('throws when selector is not found ($ returns null)', async () => {
    const page = makePage({ $: vi.fn().mockResolvedValue(null) })
    await expect(
      runVerifications(page, [{ type: 'selector', selector: '.user-menu', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — title failure', () => {
  it('throws when title does not contain expected string', async () => {
    const page = makePage({ title: vi.fn().mockResolvedValue('Login Page') })
    await expect(
      runVerifications(page, [{ type: 'title', contains: 'Dashboard', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — unknown type', () => {
  it('throws VerificationError for unknown verification type', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [{ type: 'unknown_type', required: true }])
    ).rejects.toThrow(VerificationError)
  })
})

describe('runVerifications — required:false does not block other checks', () => {
  it('skips failed optional check and passes required check', async () => {
    const page = makePage({
      url: vi.fn().mockReturnValue('https://example.com/login'),
      cookies: vi.fn().mockResolvedValue([{ name: 'session' }]),
    })
    await expect(
      runVerifications(page, [
        { type: 'url', contains: '/dashboard', required: false },
        { type: 'cookie', name: 'session', required: true },
      ])
    ).resolves.not.toThrow()
  })
})

describe('runVerifications — mode:any with empty verifications', () => {
  it('passes silently when verifications array is empty (mode: any)', async () => {
    const page = makePage()
    await expect(
      runVerifications(page, [], { verificationMode: 'any' })
    ).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2 : Lancer les tests**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/lib/tests/helpers/verification.test.js
git commit -m "test(lib): expand verification coverage — selector, localStorage failures, unknown type"
```

---

### Task 5 : lib — interpreter.js : fill edge cases + _resolveEnvVar

**Files:**
- Modify: `packages/lib/tests/core/interpreter.test.js`

Cas manquants : `_fill` quand `page.type` lève une erreur (wrapping en InterpreterError), `_click` quand `page.click` lève une erreur, `_waitForNavigation` timeout (lève InterpreterError), action inconnue (lève InterpreterError), `authenticate()` sans url dans le config.

- [ ] **Step 1 : Écrire les tests manquants (ajouter à la fin du fichier existant)**

```javascript
// À AJOUTER dans packages/lib/tests/core/interpreter.test.js

describe('Interpreter — fill error wrapping', () => {
  it('wraps page.type failure in InterpreterError', async () => {
    process.env.LOGIN_VALUE = 'user@test.com'
    const page = makePage({ type: vi.fn().mockRejectedValue(new Error('element detached')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'LOGIN_VALUE' }, 2)
    ).rejects.toThrow(InterpreterError)
    delete process.env.LOGIN_VALUE
  })

  it('InterpreterError from fill includes selector and step index', async () => {
    process.env.LOGIN_VALUE = 'user@test.com'
    const page = makePage({ type: vi.fn().mockRejectedValue(new Error('detached')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    let caught
    try {
      await interpreter.executeStep({ action: 'fill', selector: 'input#email', valueEnv: 'LOGIN_VALUE' }, 5)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(InterpreterError)
    expect(caught.stepIndex).toBe(5)
    expect(caught.message).toContain('input#email')
    delete process.env.LOGIN_VALUE
  })
})

describe('Interpreter — click error wrapping', () => {
  it('wraps page.click failure in InterpreterError', async () => {
    const page = makePage({ click: vi.fn().mockRejectedValue(new Error('not clickable')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'click', selector: 'button' }, 1)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — waitForNavigation timeout', () => {
  it('wraps timeout in InterpreterError', async () => {
    const page = makePage({ waitForNavigation: vi.fn().mockRejectedValue(new Error('Timeout')) })
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'waitForNavigation' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — unknown action', () => {
  it('throws InterpreterError for unknown action', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    await expect(
      interpreter.executeStep({ action: 'hover', selector: 'button' }, 0)
    ).rejects.toThrow(InterpreterError)
  })
})

describe('Interpreter — authenticate() without url', () => {
  it('does not call page.goto when authentication.url is absent', async () => {
    const page = makePage()
    const config = { authentication: { steps: [] } }
    const interpreter = new Interpreter(config, page)
    await interpreter.authenticate()
    expect(page.goto).not.toHaveBeenCalled()
  })
})

describe('Interpreter — _resolveEnvVar stepIndex propagation', () => {
  it('InterpreterError from missing env var carries the correct stepIndex', async () => {
    const page = makePage()
    const interpreter = new Interpreter({ authentication: { steps: [] } }, page)
    let caught
    try {
      await interpreter.executeStep({ action: 'fill', selector: 'input', valueEnv: 'NONEXISTENT_ABC' }, 7)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(InterpreterError)
    expect(caught.stepIndex).toBe(7)
  })
})
```

- [ ] **Step 2 : Lancer les tests**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/lib && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/lib/tests/core/interpreter.test.js
git commit -m "test(lib): expand interpreter coverage — error wrapping, unknown action, stepIndex propagation"
```

---

### Task 6 : app Rust — scenarios.rs : find_unique_name + confirm_import

**Files:**
- Modify: `packages/app/src-tauri/src/commands/scenarios.rs` (section `#[cfg(test)]`)

- [ ] **Step 1 : Écrire les tests dans le bloc `#[cfg(test)]` existant**

```rust
// À AJOUTER dans le bloc #[cfg(test)] de packages/app/src-tauri/src/commands/scenarios.rs

    #[tokio::test]
    async fn test_find_unique_name_no_conflict() {
        let pool = setup().await;
        let name = super::find_unique_name("MyScenario", &pool).await.unwrap();
        assert_eq!(name, "MyScenario");
    }

    #[tokio::test]
    async fn test_find_unique_name_conflict_generates_suffix_2() {
        let pool = setup().await;
        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("id-a").bind("Login").bind("yaml: a").bind(1000i64).bind(1000i64)
        .execute(&pool).await.unwrap();

        let name = super::find_unique_name("Login", &pool).await.unwrap();
        assert_eq!(name, "Login_2");
    }

    #[tokio::test]
    async fn test_find_unique_name_conflict_2_taken_generates_3() {
        let pool = setup().await;
        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("id-a").bind("Login").bind("yaml: a").bind(1000i64).bind(1000i64)
        .execute(&pool).await.unwrap();
        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("id-b").bind("Login_2").bind("yaml: b").bind(1000i64).bind(1000i64)
        .execute(&pool).await.unwrap();

        let name = super::find_unique_name("Login", &pool).await.unwrap();
        assert_eq!(name, "Login_3");
    }

    #[tokio::test]
    async fn test_db_update_preserves_created_at() {
        let pool = setup().await;
        let original_created_at = 999_000i64;
        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("id-orig").bind("Old Name").bind("old: yaml").bind(original_created_at).bind(original_created_at)
        .execute(&pool).await.unwrap();

        super::db_update_scenario(&pool, "id-orig", "New Name", "new: yaml").await.unwrap();

        let row: Scenario = sqlx::query_as(
            "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE id = ?"
        )
        .bind("id-orig")
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(row.created_at, original_created_at, "created_at must be preserved after update");
        assert_eq!(row.name, "New Name");
        assert!(row.updated_at > original_created_at, "updated_at must have advanced");
    }

    #[tokio::test]
    async fn test_db_insert_with_unique_name_avoids_conflict() {
        let pool = setup().await;
        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("id-existing").bind("Login").bind("yaml: existing").bind(1000i64).bind(1000i64)
        .execute(&pool).await.unwrap();

        let unique_name = super::find_unique_name("Login", &pool).await.unwrap();
        let new_scenario = super::db_insert_scenario(&pool, unique_name, "yaml: new".to_string())
            .await.unwrap();

        assert_eq!(new_scenario.name, "Login_2");
    }
```

- [ ] **Step 2 : Lancer les tests Rust**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app/src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo test -- --nocapture 2>&1 | tail -30`

Expected: `test result: ok. X passed; 0 failed`

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/app/src-tauri/src/commands/scenarios.rs
git commit -m "test(app/rust): scenarios — find_unique_name suffix generation, db_update preserves created_at"
```

---

### Task 7 : app Rust — runner.rs : check_node

**Files:**
- Modify: `packages/app/src-tauri/src/commands/runner.rs` (section `#[cfg(test)]`)

- [ ] **Step 1 : Écrire les tests dans le bloc `#[cfg(test)]` existant**

```rust
// À AJOUTER dans le bloc #[cfg(test)] de packages/app/src-tauri/src/commands/runner.rs

    #[test]
    fn test_check_node_returns_version_string() {
        let result = super::check_node();
        assert!(result.is_ok(), "check_node() failed: {:?}", result.err());
        let version = result.unwrap();
        assert!(
            version.starts_with('v'),
            "Expected version string starting with 'v', got: {}",
            version
        );
        let major: u32 = version
            .trim_start_matches('v')
            .split('.')
            .next()
            .unwrap()
            .parse()
            .expect("Expected numeric major version");
        assert!(major >= 18, "Expected Node >= 18, got {}", version);
    }

    #[test]
    fn test_node_not_found_message_constant() {
        assert!(super::NODE_NOT_FOUND.contains("Node.js"));
        assert!(super::NODE_NOT_FOUND.contains("nodejs.org"));
    }
```

- [ ] **Step 2 : Lancer les tests Rust**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app/src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo test -- --nocapture 2>&1 | tail -20`

Expected: `test result: ok. X passed; 0 failed`

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/app/src-tauri/src/commands/runner.rs
git commit -m "test(app/rust): runner — check_node version format, NODE_NOT_FOUND message"
```

---

### Task 8 : app React — setup vitest + testing-library

**Files:**
- Create: `packages/app/vitest.config.ts`
- Create: `packages/app/src/test-setup.ts`

- [ ] **Step 1 : Installer les dépendances manquantes**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app && pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`

- [ ] **Step 2 : Créer le fichier de configuration vitest**

Contenu de `packages/app/vitest.config.ts` :
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 3 : Créer le fichier de setup**

Contenu de `packages/app/src/test-setup.ts` :
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4 : Ajouter le script test dans package.json**

Dans `packages/app/package.json`, ajouter dans `"scripts"` :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5 : Vérifier que vitest démarre sans erreur**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app && pnpm test 2>&1 | head -20`

Expected: `No test files found` ou les tests existants passent (pas d'erreur de config)

- [ ] **Step 6 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/app/vitest.config.ts packages/app/src/test-setup.ts packages/app/package.json
git commit -m "chore(app): setup vitest + @testing-library/react for React unit tests"
```

---

### Task 9 : app React — useScenario hook tests

**Files:**
- Create: `packages/app/src/hooks/useScenario.test.tsx`

- [ ] **Step 1 : Créer le fichier de test**

```typescript
// packages/app/src/hooks/useScenario.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScenario } from './useScenario'
import type { Scenario } from '../types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
const mockInvoke = vi.mocked(invoke)

const makeScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  id: 'id-1',
  name: 'Test Scenario',
  yaml_content: 'name: Test',
  created_at: 1000,
  updated_at: 1000,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockInvoke.mockResolvedValue([])
})

describe('useScenario — initial load', () => {
  it('loads scenarios on mount', async () => {
    const s = makeScenario()
    mockInvoke.mockResolvedValueOnce([s])

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    expect(result.current.scenarios).toHaveLength(1)
    expect(result.current.scenarios[0].name).toBe('Test Scenario')
    expect(result.current.selected).toBeNull()
  })
})

describe('useScenario — create()', () => {
  it('prepends new scenario to list and selects it', async () => {
    const existing = makeScenario({ id: 'id-existing', name: 'Existing' })
    const created = makeScenario({ id: 'id-new', name: 'Nouveau scénario' })

    mockInvoke
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce(created)

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    await act(async () => {
      await result.current.create()
    })

    expect(result.current.scenarios[0].id).toBe('id-new')
    expect(result.current.scenarios).toHaveLength(2)
    expect(result.current.selected?.id).toBe('id-new')
  })
})

describe('useScenario — remove()', () => {
  it('removes scenario from list', async () => {
    const s1 = makeScenario({ id: 'id-1', name: 'S1' })
    const s2 = makeScenario({ id: 'id-2', name: 'S2' })
    mockInvoke
      .mockResolvedValueOnce([s1, s2])
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    await act(async () => {
      await result.current.remove('id-1')
    })

    expect(result.current.scenarios).toHaveLength(1)
    expect(result.current.scenarios[0].id).toBe('id-2')
  })

  it('deselects when removing the currently selected scenario', async () => {
    const s = makeScenario({ id: 'id-1' })
    mockInvoke
      .mockResolvedValueOnce([s])
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    act(() => { result.current.setSelected(s) })
    expect(result.current.selected?.id).toBe('id-1')

    await act(async () => {
      await result.current.remove('id-1')
    })

    expect(result.current.selected).toBeNull()
    expect(result.current.scenarios).toHaveLength(0)
  })

  it('does not deselect when removing a non-selected scenario', async () => {
    const s1 = makeScenario({ id: 'id-1', name: 'S1' })
    const s2 = makeScenario({ id: 'id-2', name: 'S2' })
    mockInvoke
      .mockResolvedValueOnce([s1, s2])
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    act(() => { result.current.setSelected(s1) })

    await act(async () => {
      await result.current.remove('id-2')
    })

    expect(result.current.selected?.id).toBe('id-1')
  })
})

describe('useScenario — rename()', () => {
  it('updates name in both selected and scenarios list', async () => {
    const s = makeScenario({ id: 'id-1', name: 'Old Name' })
    mockInvoke
      .mockResolvedValueOnce([s])
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useScenario())
    await act(async () => {})

    act(() => { result.current.setSelected(s) })

    await act(async () => {
      await result.current.rename('New Name')
    })

    expect(result.current.selected?.name).toBe('New Name')
    expect(result.current.scenarios[0].name).toBe('New Name')
  })
})
```

- [ ] **Step 2 : Lancer les tests**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/app/src/hooks/useScenario.test.tsx
git commit -m "test(app/react): useScenario — create/remove/rename state updates with mocked invoke"
```

---

### Task 10 : app React — RunnerPanel : extractValueEnvs + allFilled

**Files:**
- Create: `packages/app/src/components/runner/RunnerPanel.test.tsx`

- [ ] **Step 1 : Créer le fichier de test**

```typescript
// packages/app/src/components/runner/RunnerPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RunnerPanel from './RunnerPanel'
import type { Scenario } from '../../types'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

const makeScenario = (yaml_content: string): Scenario => ({
  id: 'id-1',
  name: 'Test',
  yaml_content,
  created_at: 1000,
  updated_at: 1000,
})

// Copie locale de la logique extractValueEnvs pour tester les invariants
function extractValueEnvs(yaml: string): string[] {
  const matches = yaml.matchAll(/valueEnv:\s*["']?(\w+)["']?/g)
  const keys = new Set<string>()
  for (const m of matches) keys.add(m[1])
  return Array.from(keys)
}

describe('extractValueEnvs — pure logic', () => {
  it('extracts a single valueEnv without quotes', () => {
    expect(extractValueEnvs('valueEnv: LOGIN_VALUE')).toEqual(['LOGIN_VALUE'])
  })

  it('extracts valueEnv with double quotes', () => {
    expect(extractValueEnvs('valueEnv: "LOGIN_VALUE"')).toEqual(['LOGIN_VALUE'])
  })

  it('extracts valueEnv with single quotes', () => {
    expect(extractValueEnvs("valueEnv: 'PASS_VALUE'")).toEqual(['PASS_VALUE'])
  })

  it('extracts multiple distinct valueEnv keys', () => {
    const yaml = 'valueEnv: LOGIN_VALUE\nvalueEnv: PASS_VALUE\nvalueEnv: TOTP_SECRET'
    const result = extractValueEnvs(yaml)
    expect(result).toContain('LOGIN_VALUE')
    expect(result).toContain('PASS_VALUE')
    expect(result).toContain('TOTP_SECRET')
    expect(result).toHaveLength(3)
  })

  it('deduplicates repeated valueEnv keys', () => {
    expect(extractValueEnvs('valueEnv: LOGIN_VALUE\nvalueEnv: LOGIN_VALUE')).toHaveLength(1)
  })

  it('returns empty array when no valueEnv present', () => {
    expect(extractValueEnvs('name: "No creds"\nauthentication:\n  url: "https://example.com"')).toHaveLength(0)
  })
})

describe('RunnerPanel — rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders credential inputs for each valueEnv found in yaml', () => {
    const yaml = [
      'name: "Test"',
      'authentication:',
      '  steps:',
      '    - action: fill',
      '      valueEnv: LOGIN_VALUE',
      '    - action: fill',
      '      valueEnv: PASS_VALUE',
    ].join('\n')

    render(<RunnerPanel scenario={makeScenario(yaml)} />)

    expect(screen.getByText('LOGIN_VALUE')).toBeDefined()
    expect(screen.getByText('PASS_VALUE')).toBeDefined()
  })

  it('disables the run button when credentials are not filled', () => {
    const yaml = 'name: "T"\nauthentication:\n  steps:\n    - action: fill\n      valueEnv: LOGIN_VALUE'
    render(<RunnerPanel scenario={makeScenario(yaml)} />)
    const button = screen.getByRole('button', { name: /Lancer/ })
    expect(button).toBeDisabled()
  })

  it('enables the run button when all credentials are filled', async () => {
    const user = userEvent.setup()
    const yaml = 'name: "T"\nauthentication:\n  steps:\n    - action: fill\n      valueEnv: LOGIN_VALUE'
    render(<RunnerPanel scenario={makeScenario(yaml)} />)

    const input = screen.getByPlaceholderText('valeur')
    await user.type(input, 'user@example.com')

    const button = screen.getByRole('button', { name: /Lancer/ })
    expect(button).not.toBeDisabled()
  })

  it('resets credentials when scenario id changes', () => {
    const yaml = 'name: "T"\nauthentication:\n  steps:\n    - action: fill\n      valueEnv: LOGIN_VALUE'
    const scenario1 = makeScenario(yaml)
    const { rerender } = render(<RunnerPanel scenario={scenario1} />)

    const scenario2 = { ...scenario1, id: 'id-2' }
    rerender(<RunnerPanel scenario={scenario2} />)

    const button = screen.getByRole('button', { name: /Lancer/ })
    expect(button).toBeDisabled()
  })
})
```

- [ ] **Step 2 : Lancer les tests**

Run: `cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth/packages/app && pnpm test -- --reporter=verbose`

Expected: tous les tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/renaudheluin/DEV/DEV_GREENIT/ecoindex-lighthouse/yml-2-puppeteer-auth
git add packages/app/src/components/runner/RunnerPanel.test.tsx
git commit -m "test(app/react): RunnerPanel — extractValueEnvs logic, allFilled button state"
```

---

## Résumé des commandes de run par package

```bash
# lib — tous les tests
cd packages/lib && pnpm test

# app — tests React (vitest)
cd packages/app && pnpm test

# app — tests Rust
cd packages/app/src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo test

# Depuis la racine (turbo)
pnpm turbo run test
```
