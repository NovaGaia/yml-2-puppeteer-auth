# Architecture

## Principe

Un seul script générique lit et exécute des configs YAML à runtime avec Puppeteer. Pas de génération de code, pas de modes prédéfinis, pas de build step.

```
YAML/JSON config
    ↓
ConfigLoader → Validator → Interpreter (runtime)
                                ↓
                    scripts/puppeteer-generic.cjs
                                ↓
                         Lighthouse audit
```

---

## Monorepo

```
/
├── packages/
│   ├── lib/          # Librairie npm (yml-2-puppeteer-auth)
│   └── app/          # Application Tauri (éditeur visuel + runner)
├── pnpm-workspace.yaml
├── turbo.json
└── .changeset/
```

**Outils** :
- pnpm workspaces — gestion des dépendances
- Turborepo — orchestration (lib buildée avant app)
- Changesets — versioning et changelogs indépendants

---

## Package `lib`

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
│   │   ├── wait-utils.js       # Utilitaires Puppeteer
│   │   └── verification.js     # Vérifications post-auth
│   ├── cli/
│   │   └── cli.js              # CLI : validate + test
│   ├── errors.js               # Classes d'erreur typées
│   ├── index.js                # API publique (AuthScenario) — lance son propre navigateur
│   └── lighthouse.js           # API Lighthouse (authenticateWithPage) — page fournie en paramètre
├── scripts/
│   ├── puppeteer-generic.cjs       # Point d'entrée Lighthouse bundlé (CommonJS)
│   └── puppeteer-with-package.cjs  # Template à copier pour scripts custom
├── examples/                   # Exemples YAML
├── e2e/                        # Tests e2e Keycloak (Docker)
└── tests/                      # Tests unitaires (Vitest)
```

### Composants

**`ConfigLoader`** — charge YAML ou JSON, résout les variables d'environnement référencées par `valueEnv`.

**`Validator`** — valide la structure du config contre le schéma. Retourne `{ valid: boolean, errors: [] }`. Ne lance jamais Puppeteer.

**`Interpreter`** — exécute les steps avec Puppeteer à runtime :
- Navigue vers `authentication.url` via `page.goto()`
- Exécute chaque step : `fill`, `click`, `waitForSelector`, `waitForNavigation`, `assertNotPresent`, `wait`
- Pour `fill` avec `valueType: totp` : génère le code TOTP live via `otplib`
- Pour `waitForSelector` avec `errorSelector` : `Promise.race()` entre les deux sélecteurs
- Appelle `runVerifications()` après tous les steps

**`verification.js`** — vérifie les conditions post-auth : `url`, `cookie`, `localStorage`, `selector`, `title`. Supporte `verificationMode: all | any`.

**`lighthouse.js`** — API publique pour Lighthouse : `authenticateWithPage(page, configPath, options)`. Accepte un `page` Puppeteer existant (fourni par Lighthouse), sans lancer de navigateur. Export accessible via `yml-2-puppeteer-auth/lighthouse`.

**`puppeteer-generic.cjs`** — point d'entrée CommonJS prêt à l'emploi pour Lighthouse `--puppeteer-script`. Lit `AUTH_CONFIG` depuis les variables d'environnement, délègue à `authenticateWithPage`.

**`puppeteer-with-package.cjs`** — template CJS à copier dans son projet pour créer un script Lighthouse personnalisé utilisant les imports package (pas de chemins relatifs).

**Dépendance navigateur** — la lib utilise `puppeteer-core` (sans Chromium embarqué). Pour `AuthScenario.test()`, Chrome est détecté automatiquement via `findChrome()` dans les emplacements standards (`/Applications/Google Chrome.app`, Homebrew, `/usr/bin/chromium`, etc.). Pour Lighthouse, le navigateur est fourni par Lighthouse lui-même.

---

## Flux d'exécution

**Avec `AuthScenario.test()` (CLI / Node.js API) :**
```
1. Charger le YAML (ConfigLoader.load)
2. Valider la structure (Validator.validate)
3. Vérifier les env vars (ConfigLoader.checkEnvVars)
4. Détecter Chrome (findChrome)
5. Lancer Puppeteer via puppeteer-core (browser + page)
6. Naviguer vers authentication.url (page.goto)
7. Exécuter chaque step (Interpreter.executeStep)
8. Vérifier le résultat (Interpreter.verify)
9. Fermer le browser
```

**Avec `authenticateWithPage()` (Lighthouse) :**
```
1. Charger le YAML (ConfigLoader.load)
2. Valider la structure (Validator.validate)
3. Vérifier les env vars (ConfigLoader.checkEnvVars)
4. Naviguer vers authentication.url (page.goto)  ← page fournie par Lighthouse
5. Exécuter chaque step (Interpreter.executeStep)
6. Vérifier le résultat (Interpreter.verify)
   → Lighthouse reprend le contrôle
```

---

## Gestion des erreurs

| Situation | Type d'erreur |
|-----------|---------------|
| Fichier YAML introuvable | `FileNotFoundError` |
| YAML malformé | `ParseError` |
| Structure invalide | `ValidationError` (avec `errors[]`) |
| Env var manquante | `ValidationError` |
| Step Puppeteer échoué | `InterpreterError` (avec `stepIndex`) |
| Vérification échouée | `VerificationError` |

---

## Tests

**Tests unitaires** (`tests/`) — Vitest, Puppeteer mocké. 45 tests couvrant ConfigLoader, Validator, Interpreter, Verification, AuthScenario.

**Tests e2e** (`e2e/`) — Keycloak en Docker. 3 scénarios : login simple, login TOTP, détection d'erreur via `errorSelector`.

---

## Extensibilité

### Ajouter une action

1. Ajouter le handler dans `src/core/interpreter.js` (méthode `_myAction`)
2. Ajouter le cas dans `executeStep()`
3. Ajouter la validation dans `src/core/validator.js`

### Ajouter un type de vérification

1. Ajouter le handler dans `src/helpers/verification.js`
2. Ajouter la validation dans `src/core/validator.js`
