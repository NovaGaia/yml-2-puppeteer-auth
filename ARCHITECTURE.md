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
│   ├── lib/          # Librairie npm (auth-scenario)
│   └── app/          # Application Tauri (à venir)
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
│   └── index.js                # API publique (AuthScenario)
├── scripts/
│   └── puppeteer-generic.cjs   # Point d'entrée Lighthouse (CommonJS)
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

**`puppeteer-generic.cjs`** — point d'entrée CommonJS pour Lighthouse `--puppeteer-script`. Lit `AUTH_CONFIG` depuis les variables d'environnement, instancie l'`Interpreter`, et rend le contrôle à Lighthouse une fois authentifié.

---

## Flux d'exécution

```
1. Charger le YAML (ConfigLoader.load)
2. Valider la structure (Validator.validate)
3. Vérifier les env vars (ConfigLoader.checkEnvVars)
4. Lancer Puppeteer (browser + page)
5. Naviguer vers authentication.url (page.goto)
6. Exécuter chaque step (Interpreter.executeStep)
7. Vérifier le résultat (Interpreter.verify)
8. Fermer le browser
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
