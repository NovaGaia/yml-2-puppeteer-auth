# EXAMPLES.md

Fichiers YAML d'exemple à utiliser comme point de départ.
Les credentials ne sont jamais dans le YAML — toujours via variables d'environnement.

---

## 1. Login simple — un formulaire, une page

```yaml
name: "Login simple"

authentication:
  url: "https://example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[name='email']"
      timeout: 10000
      errorSelector: ".error-banner"

    - action: fill
      selector: "input[name='email']"
      valueEnv: "LOGIN_VALUE"

    - action: fill
      selector: "input[name='password']"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation
      timeout: 15000

verification:
  - type: url
    contains: "/dashboard"
    required: true

options:
  timeout: 30000
```

```bash
export AUTH_CONFIG="./login-simple.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

lighthouse https://example.com \
  --puppeteer-script=./node_modules/yml-2-puppeteer-auth/scripts/puppeteer-generic.cjs
```

---

## 2. Login deux pages — email puis mot de passe

Typique des SSO qui séparent l'email et le mot de passe sur deux pages distinctes.

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

  - type: url
    contains: "/app"
    required: false
```

---

## 3. Login avec TOTP (double authentification)

Fonctionne avec Google Authenticator, Microsoft Authenticator, Okta Verify,
GitHub 2FA — tout provider utilisant le standard TOTP (RFC 6238).

```yaml
name: "Login avec 2FA TOTP"

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
      errorSelector: ".login-error"

    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp              # génère le code OTP depuis le secret base32

    - action: click
      selector: "button[type='submit']"

    - action: waitForNavigation
      timeout: 15000

verification:
  - type: selector
    selector: ".user-avatar"
    required: true
```

```bash
# Le secret se trouve dans l'URL otpauth:// de ton authenticator
# otpauth://totp/...?secret=4qwasw2ycmiwdjifwge25wojkzhpvdb7&...
export TOTP_SECRET="4qwasw2ycmiwdjifwge25wojkzhpvdb7"
```

---

## 4. Login avec détection d'erreur explicite

Quand une erreur n'entraîne pas de timeout mais affiche un message immédiat.

```yaml
name: "Login avec gestion d'erreur"

authentication:
  url: "https://example.com/signin"
  steps:
    - action: waitForSelector
      selector: "form.login-form"
      timeout: 10000

    - action: fill
      selector: "#email"
      valueEnv: "LOGIN_VALUE"

    - action: fill
      selector: "#password"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "#submit-btn"

    # Vérifier immédiatement l'absence d'erreur inline
    - action: assertNotPresent
      selector: ".field-error"

    - action: waitForNavigation
      timeout: 15000

    - action: assertNotPresent
      selector: ".alert-danger"

verification:
  - type: cookie
    name: "session"
    required: true

  - type: title
    contains: "Tableau de bord"
    required: false
```

---

## 5. Login une page — tous champs visibles

Cas le plus simple : email et mot de passe sur la même page, visibles dès le chargement.

```yaml
name: "Login une page"

authentication:
  url: "https://app.example.com/wp-login.php"
  steps:
    - action: waitForSelector
      selector: "#user_login"
      timeout: 10000

    - action: fill
      selector: "#user_login"
      valueEnv: "LOGIN_VALUE"

    - action: fill
      selector: "#user_pass"
      valueEnv: "PASS_VALUE"

    - action: click
      selector: "#wp-submit"

    - action: waitForNavigation
      timeout: 15000

verification:
  - type: cookie
    name: "wordpress_logged_in_"
    required: true
```

---

## Tester un exemple en local

```bash
# 1. Copier l'exemple
cp examples/login-simple.yml mon-site.yml

# 2. Adapter les sélecteurs à ton site

# 3. Définir les credentials
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"

# 4. Valider la structure
npx yml-2-puppeteer-auth validate mon-site.yml

# 5. Tester avec navigateur visible
npx yml-2-puppeteer-auth test mon-site.yml --headed --debug

# 6. Utiliser avec Lighthouse
export AUTH_CONFIG="./mon-site.yml"
lighthouse https://example.com \
  --puppeteer-script=./node_modules/yml-2-puppeteer-auth/scripts/puppeteer-generic.cjs
```
