# TESTING.md - Tester les scénarios d'authentification

## 1. Vue d'ensemble

Avant d'utiliser un YAML avec Lighthouse, le tester en local pour vérifier :
- ✅ La structure du YAML est valide
- ✅ Les sélecteurs CSS pointent vers les bons éléments
- ✅ Le flow d'authentification s'exécute correctement
- ✅ Les vérifications post-auth passent

---

## 2. Workflow

```
Écrire le YAML
    ↓
validate — vérifier la structure sans Puppeteer
    ↓
test --headed --debug — voir le navigateur, corriger les sélecteurs
    ↓
test — vérifier que ça passe en headless
    ↓
✓ Prêt pour Lighthouse
```

---

## 3. Commandes

### `validate` — vérifier la structure

```bash
npx auth-scenario validate scenarios/my-app.yml
```

Vérifie :
- Syntaxe YAML valide
- Champs obligatoires présents (`name`, `authentication.url`, `authentication.steps`)
- Actions reconnues avec leurs champs requis
- Variables d'environnement référencées définies dans le process

**Sortie** :
```
✓ YAML valid
✓ Environment variables present (LOGIN_VALUE, PASS_VALUE)

Steps: 6
  [0] waitForSelector "input[type='email']"
  [1] fill "input[type='email']" ← LOGIN_VALUE
  [2] fill "input[type='password']" ← PASS_VALUE
  [3] click "button[type='submit']"
  [4] waitForNavigation
  [5] (verification) url contains "/dashboard"
```

---

### `test` — exécuter le flow complet

Les credentials viennent des variables d'environnement — jamais en argument CLI
(les arguments CLI sont visibles dans l'historique du shell).

```bash
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

npx auth-scenario test scenarios/my-app.yml
```

**Options** :

| Option | Description |
|--------|-------------|
| `--headed` | Ouvre un navigateur visible |
| `--debug` | Logs détaillés + screenshot à chaque step |
| `--screenshots <dir>` | Répertoire pour les screenshots |
| `--timeout <ms>` | Override du timeout global |

---

### Tester avec navigateur visible

```bash
npx auth-scenario test scenarios/my-app.yml --headed
```

Indispensable pour déboguer : on voit exactement ce que Puppeteer fait.

---

### Tester avec logs complets

```bash
npx auth-scenario test scenarios/my-app.yml --headed --debug --screenshots ./debug
```

**Sortie** :
```
✓ YAML valid
✓ Environment variables present

Running authentication flow...

  [0] waitForSelector "input[type='email']"
      timeout: 10000ms
      → found (287ms)

  [1] fill "input[type='email']"
      → filled

  [2] fill "input[type='password']"
      → filled

  [3] click "button[type='submit']"
      → clicked

  [4] waitForNavigation
      timeout: 15000ms
      → completed (1823ms) → https://example.com/dashboard

Running verifications...

  [✓] url contains "/dashboard" → https://example.com/dashboard

✓ Authentication successful (3.4s)
Screenshots saved to: ./debug/
```

---

## 4. Variables d'environnement

Utiliser un fichier `.env` local pour ne pas avoir à les redéfinir à chaque fois :

```bash
# .env  ← ne jamais commiter ce fichier
LOGIN_VALUE=user@example.com
PASS_VALUE=secret
TOTP_SECRET=4qwasw2ycmiwdjifwge25wojkzhpvdb7
```

Charger avec Node.js 20+ :
```bash
node --env-file=.env ./node_modules/.bin/auth-scenario test scenarios/my-app.yml --headed
```

Ou avec `dotenv-cli` :
```bash
npx dotenv -e .env -- auth-scenario test scenarios/my-app.yml --headed
```

Ajouter `.env` au `.gitignore` :
```
.env
*.env
```

---

## 5. Déboguer les problèmes courants

### Sélecteur non trouvé

```
✗ waitForSelector timeout after 10000ms
  selector: "input[type='email']"
```

1. Lancer avec `--headed` et ouvrir les DevTools du navigateur
2. Dans la console : `document.querySelector("input[type='email']")`
3. Si `null` → le sélecteur est incorrect
4. Corriger dans le YAML et retester

---

### Erreur détectée avant le timeout

```
✗ waitForSelector — errorSelector found: ".error-message"
  text: "Identifiant ou mot de passe incorrect"
```

→ Les credentials sont incorrects, ou le sélecteur `errorSelector` pointe vers un élément
  qui est toujours présent même sans erreur. Vérifier dans le navigateur.

---

### Navigation en timeout

```
✗ waitForNavigation timeout after 15000ms
```

Options à essayer dans le YAML :
1. Augmenter le timeout : `timeout: 30000`
2. Remplacer `waitForNavigation` par `waitForSelector` sur un élément de la page suivante
3. Ajouter un `wait` (sleep) si le SSO a besoin de temps : `duration: 3000`

---

### Vérification échouée

```
✗ Verification failed
  type: url
  expected contains: "/dashboard"
  actual: "https://example.com/login?error=1"
```

→ L'authentification n'a pas réussi. Utiliser `--headed --debug` pour voir ce qui s'est passé.

---

## 6. Workflow complet

```bash
# 1. Créer le YAML
cat > scenarios/my-app.yml << 'EOF'
name: "My App Login"
authentication:
  url: "https://app.example.com/login"
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
EOF

# 2. Valider la structure
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"
npx auth-scenario validate scenarios/my-app.yml

# 3. Tester avec navigateur visible
npx auth-scenario test scenarios/my-app.yml --headed --debug

# 4. Tester en headless (comme en prod)
npx auth-scenario test scenarios/my-app.yml

# 5. Utiliser avec Lighthouse
export AUTH_CONFIG="./scenarios/my-app.yml"
lighthouse https://app.example.com \
  --puppeteer-script=./scripts/puppeteer-generic.cjs
```

---

## 7. Tests e2e Keycloak (développement de la lib)

Pour contribuer à `auth-scenario`, une suite de tests e2e tourne contre un Keycloak local (Docker). Elle couvre les cas critiques sans dépendre d'un service externe.

**Prérequis** : Docker ou OrbStack

```bash
cd packages/lib

pnpm e2e:start     # démarre Keycloak (~30s)

pnpm e2e:login     # login simple username/password
pnpm e2e:totp      # login + TOTP 2FA
pnpm e2e:error     # détection d'erreur via errorSelector (doit échouer)

pnpm e2e:stop      # arrête Keycloak
```

Les credentials Keycloak sont dans `e2e/.env.e2e.example` — copier en `e2e/.env.e2e` (déjà configuré, aucune modification nécessaire).

---

## 8. Résumé

| Tâche | Commande |
|-------|----------|
| Vérifier la structure YAML | `npx auth-scenario validate config.yml` |
| Tester avec navigateur visible | `npx auth-scenario test config.yml --headed` |
| Tester avec logs complets | `npx auth-scenario test config.yml --headed --debug` |
| Tester en headless | `npx auth-scenario test config.yml` |
| Utiliser avec Lighthouse | `AUTH_CONFIG=config.yml lighthouse ... --puppeteer-script=...` |
| Tests unitaires (lib) | `cd packages/lib && pnpm test` |
| Tests e2e Keycloak (lib) | `cd packages/lib && pnpm e2e:start && pnpm e2e:login` |
