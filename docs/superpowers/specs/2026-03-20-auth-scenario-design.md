---
title: Auth Scenario — Design global
date: 2026-03-20
status: approved
---

# Auth Scenario — Design global

> **Note** : Ce document est la référence canonique. Il supersède les versions antérieures
> de `CLAUDE.md` et `ARCHITECTURE.md` sur les points suivants : il n'y a pas de `src/modes/`,
> pas de `ModeFactory`, pas de `BaseMode`, pas de champ `mode` dans le YAML. Le schéma YAML
> de référence est celui décrit dans ce document (steps atomiques plats).

---

## Contexte

L'utilisateur dispose d'un lanceur Lighthouse maison et de scripts d'authentification existants
écrits en JavaScript. Chaque nouveau formulaire de login nécessite d'écrire du code.
L'objectif est de pouvoir décrire un scénario d'authentification en YAML déclaratif,
sans écrire de JavaScript.

Le projet produit deux artefacts :
1. **Une librairie npm** (`yml-2-puppeteer-auth`) — interprète les YAML et exécute les authentifications avec Puppeteer
2. **Une application desktop Tauri** — UI pour créer les YAML et tester les scénarios

---

## Périmètre

### Ce qui est dans le projet
- Interprétation runtime de configs YAML/JSON (pas de génération de code)
- Steps atomiques Puppeteer : `fill`, `click`, `waitForSelector`, `waitForNavigation`, `assertNotPresent`, `wait`
- Support TOTP (2FA) via `valueType: totp` (compatible tous providers : Google, Microsoft, Okta...)
- Détection d'erreurs inline : `errorSelector` sur `waitForSelector`, step `assertNotPresent`
- Vérifications post-auth : cookie, localStorage, selector, url, title
- CLI : `validate` et `test` (avec `--headed`, `--debug`, `--screenshots`)
- App Tauri avec éditeur visuel et runner de tests intégré
- Build cross-platform (macOS x64+arm64, Windows, Linux) avec auto-updater
- Publication lib sur npm

### Ce qui n'est pas dans le projet
- Génération de code JavaScript
- Modes prédéfinis (WordPress, Okta sont des exemples YAML, pas du code)
- Intégration ecoindex (`startEcoindexPageMesure` etc. — géré en dehors)

---

## Architecture monorepo

```
/
├── packages/
│   ├── lib/                    # Librairie npm (yml-2-puppeteer-auth)
│   └── app/                    # Application Tauri
├── pnpm-workspace.yaml
├── turbo.json
├── .changeset/
└── package.json
```

**Outils** :
- pnpm workspaces — gestion des dépendances inter-packages
- Turborepo — orchestration (lib buildée avant app)
- Changesets — versioning et changelogs indépendants par package

---

## Package : `lib`

### Principe

Un script générique unique (`scripts/puppeteer-generic.cjs`) lit un fichier YAML à runtime
et exécute les étapes d'authentification avec Puppeteer. Pas de génération de code,
pas de modes prédéfinis, pas de `ModeFactory`. Un seul interpreter générique.

```
YAML/JSON config
    ↓
ConfigLoader → Validator → Interpreter (runtime)
                                ↓
                    scripts/puppeteer-generic.cjs
                                ↓
                         Lighthouse audit
```

### Structure

```
packages/lib/
├── src/
│   ├── core/
│   │   ├── config-loader.js    # Charge YAML/JSON, résout les env vars
│   │   ├── validator.js        # Valide la structure ({ valid, errors })
│   │   └── interpreter.js      # Exécute les steps Puppeteer à runtime
│   ├── helpers/
│   │   ├── selector-utils.js   # Validation de sélecteurs CSS
│   │   ├── wait-utils.js       # Utilitaires Puppeteer (waits)
│   │   └── verification.js     # Vérifications post-auth
│   └── cli/
│       └── cli.js              # validate + test
├── scripts/
│   └── puppeteer-generic.cjs   # Point d'entrée Lighthouse (CommonJS)
├── examples/
│   ├── login-simple.yml
│   ├── login-two-steps.yml
│   ├── login-totp.yml
│   └── login-with-error-handling.yml
└── package.json                # name: "yml-2-puppeteer-auth"
```

### Format YAML — schéma canonique

```yaml
name: "Nom du scénario"           # obligatoire

authentication:
  url: "https://example.com/login"  # obligatoire
  steps:                            # obligatoire, tableau non vide
    - action: waitForSelector
      selector: "input[type='email']"
      timeout: 10000                # optionnel, défaut: options.timeout
      errorSelector: ".error-banner" # optionnel — si présent et trouvé avant selector → échec immédiat

    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"       # nom de la variable d'environnement

    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp               # génère le code OTP à runtime (RFC 6238)

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation
      waitUntil: load               # optionnel : load | domcontentloaded | networkidle0 | networkidle2
      timeout: 15000

    - action: assertNotPresent
      selector: ".error-message"    # vérification immédiate (pas de polling) — échec si présent dans le DOM

    - action: wait
      duration: 3000                # sleep fixe en ms — à utiliser en dernier recours

verification:                       # optionnel — vérifications post-auth
  - type: cookie
    name: "session_id"              # startsWith
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
    required: false                 # échec loggé mais non bloquant

options:
  timeout: 30000
  debug: false
  verificationMode: all             # all | any
```

**`verificationMode`** :
- `all` (défaut) : toutes les vérifications `required: true` doivent passer
- `any` : au moins une vérification doit passer, le flag `required` est ignoré

**`errorSelector`** : l'interpreter lance un `Promise.race()` entre `waitForSelector(selector)` et
`waitForSelector(errorSelector)`. Si `errorSelector` gagne la course → échec immédiat avec le
texte de l'élément. Si `selector` gagne → succès, poursuite des steps.

**`wait`** : à utiliser uniquement quand aucun signal DOM ou réseau n'est disponible
(certains flows SSO). Préférer `waitForSelector` ou `waitForNavigation`.

### Screenshots sur échec

- Si `screenshotsDir` est défini (via `--screenshots <dir>` ou `test({ screenshotsDir })`),
  un screenshot est sauvegardé automatiquement au step qui a échoué.
- Si `screenshotsDir` n'est pas défini, le screenshot est sauvegardé dans le répertoire
  courant (`./auth-failure-<timestamp>.png`).
- En mode `--debug`, des screenshots sont pris à chaque step (pas seulement sur échec).

### API publique

```javascript
import { AuthScenario } from 'yml-2-puppeteer-auth'

const scenario = new AuthScenario('./auth.yml')

// Valider sans Puppeteer
const { valid, errors } = await scenario.validate()
// errors: [{ path: 'authentication.steps[2].selector', message: '...' }]

// Tester avec Puppeteer
const result = await scenario.test({
  headed: false,
  debug: false,
  screenshotsDir: null
})
// result: { success, duration, error, failedStep, screenshots, steps }
```

### CLI

```bash
npx yml-2-puppeteer-auth validate config.yml
npx yml-2-puppeteer-auth test config.yml --headed --debug --screenshots ./debug
```

Les credentials viennent des variables d'environnement — jamais en argument CLI
(les arguments CLI apparaissent dans l'historique du shell).

Chargement d'un fichier `.env` en local :
```bash
node --env-file=.env ./node_modules/.bin/yml-2-puppeteer-auth test config.yml --headed
```

### Intégration Lighthouse

```bash
export AUTH_CONFIG="./auth.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

lighthouse https://example.com \
  --puppeteer-script=./node_modules/yml-2-puppeteer-auth/scripts/puppeteer-generic.cjs
```

---

## Package : `app`

### Principe

Application desktop Tauri avec frontend React. Permet de créer et éditer des configs YAML
via des formulaires visuels, et de lancer les tests directement depuis l'interface.

### Stack

- **Backend** : Tauri (Rust) — accès filesystem, lancement de processus, auto-updater, keychain
- **Frontend** : React — UI de l'éditeur et du runner
- **Lien lib** : `packages/app` consomme `packages/lib` via pnpm workspace

### Fonctionnalités

1. **Éditeur de scénario** : formulaires pour construire les steps sans écrire de YAML
2. **Aperçu YAML** : voir le YAML généré en temps réel
3. **Runner de tests** : lancer `validate` et `test` depuis l'UI, voir les logs en direct
4. **Gestion des credentials** : stockage sécurisé via le keychain OS

### Gestion des credentials (Tauri → lib)

Les secrets sont stockés dans le keychain OS via `tauri-plugin-stronghold` (ou `keyring-rs`),
scoped par nom de scénario. Quand l'app lance un test, le backend Rust :
1. Lit les secrets depuis le keychain
2. Les injecte comme variables d'environnement dans le subprocess Node.js qui exécute la lib
3. Le subprocess n'a accès qu'aux variables du scénario concerné

Les secrets ne transitent jamais par le frontend React.

### Structure

```
packages/app/
├── src/                        # Frontend React
├── src-tauri/                  # Backend Rust
│   ├── tauri.conf.json         # version synchronisée depuis package.json par Changesets
│   └── src/
└── package.json
```

---

## CI/CD

### Séquence de release

1. Les développeurs créent des fichiers `.changeset/` décrivant les changements
2. Le bot Changesets ouvre une **Release PR** qui :
   - Bumpe les versions dans `packages/lib/package.json` et `packages/app/package.json`
   - Exécute un script qui reporte la version dans `packages/app/src-tauri/tauri.conf.json`
   - Met à jour les CHANGELOGs
3. À la merge de la Release PR, deux jobs GitHub Actions se lancent en parallèle :
   - **`publish-npm`** : `pnpm changeset publish` → publie `yml-2-puppeteer-auth` sur npm
   - **`build-tauri`** : build cross-platform + publication en GitHub Release

### Build Tauri (matrix)

```yaml
matrix:
  os: [ubuntu-latest, macos-latest, windows-latest]
```

| Runner | Artefacts |
|--------|-----------|
| `ubuntu-latest` | `.deb`, `.AppImage` |
| `macos-latest` | `.dmg` (x64 + arm64 via universal binary) |
| `windows-latest` | `.msi`, `.exe` |

Action utilisée : `tauri-apps/tauri-action`

### Auto-updater

- Tauri vérifie les nouvelles versions au démarrage via l'endpoint GitHub Releases
- Notification à l'utilisateur + téléchargement + installation au redémarrage
- Les binaires sont signés (requis pour que l'updater accepte les mises à jour)

---

## Versioning

Changesets gère les versions de façon indépendante :
- `yml-2-puppeteer-auth` (lib) → semver, publié sur npm
- `yml-2-puppeteer-auth-app` (app) → semver, version synchronisée dans `src-tauri/tauri.conf.json`
  via un script post-version

---

## Gestion des erreurs

| Situation | Comportement |
|-----------|-------------|
| YAML invalide | Erreur au démarrage avec chemin précis (`authentication.steps[2].selector`) |
| Env var manquante | Erreur au démarrage avant toute action Puppeteer |
| `waitForSelector` timeout | Erreur avec sélecteur + durée, screenshot automatique |
| `errorSelector` détecté | Erreur avec texte de l'élément, screenshot automatique |
| `assertNotPresent` échoue | Erreur avec sélecteur trouvé, screenshot automatique |
| Vérification post-auth échouée | Erreur avec détails de la vérification, screenshot automatique |
