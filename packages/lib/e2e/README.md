# Tests E2E — yml-2-puppeteer-auth

Tests d'intégration utilisant un serveur Keycloak local (via Docker) comme fournisseur d'identité.

## Prérequis

- Docker et Docker Compose
- pnpm installé

## Démarrage du serveur Keycloak

```bash
cd packages/lib/e2e
docker compose up -d
```

Keycloak démarre sur `http://localhost:8080`. Le realm `test-auth` est importé automatiquement depuis `keycloak/realm-export.json`.

Attendre que le healthcheck soit OK (environ 30–60 secondes) :

```bash
docker compose ps
```

**Console d'administration** : `http://localhost:8080` — login `admin` / `admin`

## Configuration des variables d'environnement

Copier le fichier d'exemple :

```bash
cp .env.e2e.example .env.e2e
```

Le fichier `.env.e2e` contient les credentials correspondant au realm importé :

| Variable | Valeur | Description |
|---|---|---|
| `KC_USER` | `testuser` | Utilisateur simple (sans 2FA) |
| `KC_PASS` | `testpass123` | Mot de passe commun |
| `KC_USER_TOTP` | `testuser-totp` | Utilisateur avec TOTP activé |
| `KC_TOTP_SECRET` | `JBSWY3DPEHPK3PXP` | Secret TOTP base32 (RFC 6238) |
| `KC_PASS_WRONG` | `wrongpassword` | Mauvais mot de passe (scénario d'erreur) |

## Scénarios disponibles

### `scenarios/login-simple.yml` — Login basique

Login avec `testuser` / `testpass123`, sans 2FA.

**Vérification** : l'URL de redirection contient `code=` (authorization code OAuth2).

```bash
AUTH_CONFIG=packages/lib/e2e/scenarios/login-simple.yml \
KC_USER=testuser \
KC_PASS=testpass123 \
node packages/lib/src/cli/cli.js test
```

### `scenarios/login-totp.yml` — Login avec TOTP

Login avec `testuser-totp`, suivi d'une étape OTP générée dynamiquement depuis `KC_TOTP_SECRET`.

```bash
AUTH_CONFIG=packages/lib/e2e/scenarios/login-totp.yml \
KC_USER_TOTP=testuser-totp \
KC_PASS=testpass123 \
KC_TOTP_SECRET=JBSWY3DPEHPK3PXP \
node packages/lib/src/cli/cli.js test
```

### `scenarios/login-error.yml` — Détection d'erreur (scénario négatif)

Ce scénario **doit échouer** : il soumet un mauvais mot de passe et vérifie que `errorSelector: '#input-error'` est détecté avant que la page 2FA n'apparaisse. Valide le mécanisme de détection d'erreur précoce.

```bash
AUTH_CONFIG=packages/lib/e2e/scenarios/login-error.yml \
KC_USER_TOTP=testuser-totp \
KC_PASS_WRONG=wrongpassword \
node packages/lib/src/cli/cli.js test
```

Résultat attendu : erreur `errorSelector detected`.

## Lancer tous les tests via pnpm

Depuis la racine du monorepo :

```bash
pnpm --filter lib test:e2e
```

Ou depuis `packages/lib` :

```bash
pnpm test:e2e
```

Les variables d'environnement sont chargées depuis `.env.e2e` automatiquement.

## Arrêter Keycloak

```bash
cd packages/lib/e2e
docker compose down
```
