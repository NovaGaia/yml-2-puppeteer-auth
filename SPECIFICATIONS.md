# SPECIFICATIONS.md

## 1. Principe

Un fichier YAML décrit une séquence d'actions Puppeteer à exécuter pour authentifier un utilisateur. Le script générique (`scripts/puppeteer-generic.cjs`) lit ce YAML à runtime et l'exécute — aucune génération de code, aucun mode prédéfini.

Le YAML est la source de vérité. Modifier le YAML suffit pour modifier le comportement.

---

## 2. Structure générale

```yaml
name: "Nom du scénario"           # obligatoire
description: "..."                # optionnel

authentication:
  url: "https://example.com/login"  # URL de la page de login (obligatoire)
  steps: []                         # séquence d'actions (obligatoire)

verification: []                  # vérifications post-auth (optionnel)

options: {}                       # options globales (optionnel)
```

---

## 3. Steps — actions atomiques

`authentication.steps` est une **séquence ordonnée d'actions**. L'interpreter les exécute dans l'ordre. Un step qui échoue interrompt l'exécution et remonte une erreur.

### 3.1 `fill` — remplir un champ

```yaml
- action: fill
  selector: "input[type='email']"
  valueEnv: "LOGIN_VALUE"         # nom de la variable d'environnement
```

Avec TOTP (authentification à deux facteurs) :

```yaml
- action: fill
  selector: "input[name='otp']"
  valueEnv: "TOTP_SECRET"         # contient le secret base32
  valueType: totp                 # génère le code OTP à runtime via otplib
```

`valueType` supporte :
- *(absent)* : lecture directe de la variable d'environnement (défaut)
- `totp` : génère un code TOTP depuis le secret (compatible Google, Microsoft, Okta, GitHub...)

### 3.2 `click` — cliquer sur un élément

```yaml
- action: click
  selector: "button[type='submit']"
```

### 3.3 `waitForSelector` — attendre qu'un élément soit présent

```yaml
- action: waitForSelector
  selector: "input[type='password']"
  timeout: 10000                  # ms, optionnel (défaut: options.timeout)
  errorSelector: ".error-message" # si cet élément apparaît → échec immédiat
```

`errorSelector` est optionnel. S'il est présent et que l'élément correspondant apparaît dans le DOM avant que `selector` soit trouvé, l'interpreter remonte une erreur avec le texte de l'élément d'erreur.

### 3.4 `waitForNavigation` — attendre une navigation

```yaml
- action: waitForNavigation
  timeout: 15000                  # ms, optionnel
  waitUntil: load                 # optionnel : load | domcontentloaded | networkidle0 | networkidle2
```

Note : `networkidle0` et `networkidle2` peuvent ne pas fonctionner sur certains SPAs. Préférer `waitForSelector` sur un élément de la page suivante quand c'est possible.

### 3.5 `assertNotPresent` — vérifier l'absence d'un élément

```yaml
- action: assertNotPresent
  selector: ".alert-error"
```

Échoue immédiatement si l'élément est présent dans le DOM au moment de l'exécution.

### 3.6 `wait` — pause fixe

```yaml
- action: wait
  duration: 3000                  # ms
```

À utiliser quand aucune autre méthode d'attente ne fonctionne (ex. certains flows SSO).

---

## 4. Verification — vérifications post-auth

Exécutées après la dernière étape, pour confirmer que l'authentification a réussi.

```yaml
verification:
  - type: cookie
    name: "session_id"            # nom du cookie (startsWith)
    required: true

  - type: localStorage
    key: "okta-token-storage"     # clé dans localStorage
    required: true

  - type: selector
    selector: ".user-menu"        # élément DOM attendu
    required: true

  - type: url
    contains: "/dashboard"        # l'URL doit contenir cette chaîne
    required: true

  - type: title
    contains: "Dashboard"         # le titre de la page doit contenir cette chaîne
    required: false
```

**`required`** : si `true` (défaut), l'échec de cette vérification remonte une erreur. Si `false`, l'échec est loggé mais n'interrompt pas.

**`verificationMode`** (dans `options`) : `all` (défaut) — toutes les vérifications `required` doivent passer. `any` — au moins une suffit.

---

## 5. Options globales

```yaml
options:
  timeout: 30000          # timeout par défaut pour tous les waits (ms)
  debug: false            # active les logs détaillés
  verificationMode: all   # all | any
```

---

## 6. Variables d'environnement

Les credentials et secrets ne sont **jamais** dans le YAML. Ils sont toujours dans des variables d'environnement référencées par `valueEnv`.

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Chemin vers le fichier YAML (lu par le script générique) |
| `LOGIN_VALUE` | Identifiant / email |
| `PASS_VALUE` | Mot de passe |
| `TOTP_SECRET` | Secret base32 pour TOTP (2FA) |
| `DEBUG` | Active les logs détaillés (`true\|false`) |
| `TIMEOUT` | Override du timeout global (ms) |

N'importe quel nom de variable peut être utilisé via `valueEnv`.

---

## 7. Gestion des erreurs

| Situation | Comportement |
|-----------|-------------|
| Config YAML invalide | Erreur au démarrage, avant toute action Puppeteer |
| Variable d'environnement manquante | Erreur au démarrage |
| `waitForSelector` timeout | Erreur avec le sélecteur attendu et le timeout |
| `errorSelector` détecté | Erreur avec le texte de l'élément d'erreur |
| `assertNotPresent` échoue | Erreur avec le sélecteur trouvé |
| Vérification post-auth échouée | Erreur avec les détails de la vérification |

---

## 8. Exemples complets

### Login simple (un formulaire, une page)

```yaml
name: "Login simple"

authentication:
  url: "https://example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[name='email']"
      errorSelector: ".site-error"

    - action: fill
      selector: "input[name='email']"
      valueEnv: "LOGIN_VALUE"

    - action: fill
      selector: "input[name='password']"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation
      timeout: 10000

verification:
  - type: url
    contains: "/dashboard"
    required: true
```

### Login deux pages (email puis mot de passe)

```yaml
name: "Login deux étapes"

authentication:
  url: "https://sso.example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[type='email']"
      timeout: 10000
      errorSelector: ".error-banner"

    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"

    - action: click
      selector: "button[type='submit']"

    - action: waitForSelector
      selector: "input[type='password']"
      timeout: 15000
      errorSelector: ".error-message"

    - action: fill
      selector: "input[type='password']"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "button[type='submit']"

    - action: wait
      duration: 3000

verification:
  - type: localStorage
    key: "auth-token"
    required: true
```

### Login avec TOTP (2FA)

```yaml
name: "Login avec double authentification"

authentication:
  url: "https://secure.example.com/login"
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

    - action: waitForSelector
      selector: "input[name='otp']"
      timeout: 15000

    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation

verification:
  - type: selector
    selector: ".user-avatar"
    required: true
```

---

## 9. Testing local

Avant d'intégrer un YAML dans un pipeline Lighthouse, il doit pouvoir être testé en local contre le vrai site.

### Commandes CLI

```bash
# Valider la structure du YAML sans lancer Puppeteer
npx yml-2-puppeteer-auth validate config.yml

# Tester le flow complet avec Puppeteer (navigateur headless)
npx yml-2-puppeteer-auth test config.yml

# Tester avec navigateur visible (pour déboguer)
npx yml-2-puppeteer-auth test config.yml --headed

# Tester avec logs détaillés
npx yml-2-puppeteer-auth test config.yml --debug
```

### Comportement de `validate`

- Parse le YAML
- Vérifie la structure (champs obligatoires, types, sélecteurs valides)
- Vérifie que les variables d'environnement référencées sont définies
- Affiche les erreurs avec le chemin exact (`authentication.steps[2].selector`)
- **Ne lance pas Puppeteer**

### Comportement de `test`

- Exécute `validate` d'abord
- Lance Puppeteer (headless par défaut, headful avec `--headed`)
- Exécute les steps un par un avec logs en temps réel
- Exécute les vérifications post-auth
- Affiche un résumé succès/échec
- En cas d'échec : log du step qui a échoué + screenshot automatique

### Output exemple

```
✓ YAML valid
✓ Environment variables present

Running authentication flow...
  ✓ waitForSelector "input[type='email']" (320ms)
  ✓ fill "input[type='email']"
  ✓ fill "input[type='password']"
  ✓ click "button[type='submit']"
  ✗ waitForNavigation — timeout after 10000ms
    → errorSelector ".alert-error" found: "Invalid credentials"

Screenshot saved: ./auth-test-failure-2024-01-15T10-30-00.png
```

### Variables d'environnement pour les tests

Les credentials sont passés via les mêmes variables d'environnement qu'en production :

```bash
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"
export TOTP_SECRET="4qwasw2ycmiwdjifwge25wojkzhpvdb7"
npx yml-2-puppeteer-auth test config.yml --headed
```

Ou via un fichier `.env` local (non commité) :

```bash
# .env
LOGIN_VALUE=user@example.com
PASS_VALUE=secret
TOTP_SECRET=4qwasw2ycmiwdjifwge25wojkzhpvdb7
```

```bash
npx dotenv yml-2-puppeteer-auth test config.yml
```

---

## 10. Validation du YAML

### Champs obligatoires

- `name` : string non vide
- `authentication.url` : URL valide
- `authentication.steps` : tableau non vide

### Contraintes par action

| Action | Champs obligatoires |
|--------|-------------------|
| `fill` | `selector`, `valueEnv` |
| `click` | `selector` |
| `waitForSelector` | `selector` |
| `waitForNavigation` | *(aucun)* |
| `assertNotPresent` | `selector` |
| `wait` | `duration` |

### Contraintes par type de vérification

| Type | Champs obligatoires |
|------|-------------------|
| `cookie` | `name` |
| `localStorage` | `key` |
| `selector` | `selector` |
| `url` | `contains` |
| `title` | `contains` |
