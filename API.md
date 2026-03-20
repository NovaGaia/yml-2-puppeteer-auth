# API.md

## API publique — Authentication Scenario

---

## 1. Utilisation en tant que librairie (Node.js)

### Installation

```bash
pnpm add auth-scenario
```

### Import

```javascript
import { AuthScenario } from 'auth-scenario'
// ou CommonJS
const { AuthScenario } = require('auth-scenario')
```

---

## 2. Classe principale : `AuthScenario`

### Constructor

```javascript
const scenario = new AuthScenario(configPath, options)
```

**Paramètres** :
- `configPath` (string) : Chemin vers le fichier YAML ou JSON
- `options` (object, optionnel) :
  - `timeout` (number) : Override du timeout global (ms). Default: `30000`
  - `debug` (boolean) : Active les logs détaillés. Default: `false`

---

### Méthode : `validate()`

Valide la structure du YAML sans lancer Puppeteer.

```javascript
const result = await scenario.validate()
```

**Retourne** :
```javascript
{
  valid: boolean,
  errors: [
    {
      path: 'authentication.steps[2].selector',
      message: 'Required field missing'
    }
  ]
}
```

**Exceptions** :
- `FileNotFoundError` : Fichier non trouvé
- `ParseError` : YAML/JSON invalide

**Exemple** :
```javascript
const scenario = new AuthScenario('./auth.yml')
const result = await scenario.validate()

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`${err.path}: ${err.message}`)
  })
  process.exit(1)
}
```

---

### Méthode : `test(options)`

Exécute le flow d'authentification avec Puppeteer contre le vrai site.
Les credentials sont lus depuis les variables d'environnement (jamais passés en paramètre).

```javascript
const result = await scenario.test(options)
```

**Options** :
- `headed` (boolean) : Ouvre un navigateur visible. Default: `false`
- `debug` (boolean) : Logs détaillés + screenshot à chaque step. Default: `false`
- `screenshotsDir` (string) : Répertoire pour les screenshots. Default: `null`

**Retourne** :
```javascript
{
  success: boolean,
  duration: number,           // ms
  error: string | null,
  failedStep: number | null,  // index du step qui a échoué
  screenshots: string[],      // chemins des fichiers
  steps: [
    {
      index: number,
      action: string,
      duration: number,
      status: 'success' | 'failed',
      error: string | null
    }
  ]
}
```

**Exemple** :
```javascript
const scenario = new AuthScenario('./auth.yml')
const result = await scenario.test({ headed: true, debug: true })

if (result.success) {
  console.log(`✓ Auth successful in ${result.duration}ms`)
} else {
  console.error(`✗ Failed at step ${result.failedStep}: ${result.error}`)
}
```

---

## 3. Classes d'erreur

```javascript
import {
  AuthScenarioError,    // Classe de base
  FileNotFoundError,    // Fichier de config introuvable
  ParseError,           // YAML/JSON invalide
  ValidationError,      // Config invalide (structure)
  InterpreterError,     // Erreur pendant l'exécution Puppeteer
  VerificationError,    // Vérification post-auth échouée
} from 'auth-scenario/errors'
```

**Exemple** :
```javascript
try {
  await scenario.test()
} catch (error) {
  if (error instanceof VerificationError) {
    console.error('Auth succeeded but verification failed:', error.message)
  } else if (error instanceof InterpreterError) {
    console.error(`Step ${error.stepIndex} failed:`, error.message)
  } else {
    throw error
  }
}
```

---

## 4. Utilisation en CLI

### `validate`

```bash
npx auth-scenario validate <config>
```

Vérifie la structure du YAML et la présence des variables d'environnement.
Ne lance pas Puppeteer.

```bash
npx auth-scenario validate scenarios/my-app.yml
# ✓ YAML valid
# ✓ Environment variables present (LOGIN_VALUE, PASS_VALUE)
```

---

### `test`

```bash
npx auth-scenario test <config> [options]
```

**Options** :
- `--headed` : Ouvre un navigateur visible
- `--debug` : Logs détaillés + screenshots à chaque step
- `--screenshots <dir>` : Répertoire pour les screenshots
- `--timeout <ms>` : Override du timeout global

Les credentials viennent des variables d'environnement :

```bash
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"
export TOTP_SECRET="4qwasw2ycmiwdjifwge25wojkzhpvdb7"  # si 2FA

npx auth-scenario test scenarios/my-app.yml --headed --debug
```

Ou via `.env` :
```bash
# .env (non commité)
LOGIN_VALUE=user@example.com
PASS_VALUE=secret

node --env-file=.env ./node_modules/.bin/auth-scenario test scenarios/my-app.yml
```

---

## 5. Intégration Lighthouse

Le fichier `scripts/puppeteer-generic.cjs` est le point d'entrée pour Lighthouse.
Il lit le YAML depuis la variable `AUTH_CONFIG`.

```bash
export AUTH_CONFIG="./scenarios/my-app.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

lighthouse https://example.com/dashboard \
  --puppeteer-script=./node_modules/auth-scenario/scripts/puppeteer-generic.cjs
```

---

## 6. Dépannage

### Config non trouvée

```javascript
// Chemin relatif à process.cwd()
const scenario = new AuthScenario('./scenarios/auth.yml')
```

### Variable d'environnement manquante

```
ValidationError: Missing environment variable: LOGIN_VALUE
  referenced in: authentication.steps[0].valueEnv
```

Définir la variable avant d'exécuter :
```bash
export LOGIN_VALUE="user@example.com"
```

### Step en timeout

```
InterpreterError: waitForSelector timeout after 10000ms
  selector: "input[type='password']"
  step: 3
```

Augmenter le timeout dans le YAML :
```yaml
- action: waitForSelector
  selector: "input[type='password']"
  timeout: 30000
```

Ou utiliser `--headed --debug` pour voir ce qui se passe dans le navigateur.
