# Custom Puppeteer Script — avec yml-2-puppeteer-auth

Même exemple que `../without-lib`, mais en utilisant la librairie `yml-2-puppeteer-auth`.

Le flow d'authentification est décrit dans un fichier YAML — plus de code JS à maintenir pour les étapes de login. Les helpers Ecoindex (viewport, scroll, timing) restent en JS car ils sont spécifiques à EcoIndex et non liés à l'authentification.

## Différences avec without-lib

| | without-lib | with-lib |
|---|---|---|
| Flow auth | JS impératif (`wpConnect`, `oktaConnect`) | YAML déclaratif |
| Sélecteurs | Via env vars (`LOGIN_FIELD`, `PASS_FIELD`) | Dans le YAML (un fichier par site) |
| Mode dispatching | `AUTH_MODE=wordpress\|okta` | `AUTH_CONFIG=./auth-wordpress.yml` |
| Vérification | Manuelle (cookie/token) | Dans le YAML (`verification:`) |
| Ecoindex helpers | `puppeteer-helper.js` (auth + ecoindex) | `ecoindex-helper.js` (ecoindex uniquement) |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Chemin vers le fichier YAML d'authentification |
| `AUTH_URL` | URL de la page de login (doit correspondre à l'`url` dans le YAML) |
| `LOGIN_VALUE` | Identifiant |
| `PASS_VALUE` | Mot de passe |
| `DEBUG` | Logs détaillés (`true\|false`) |

## Utilisation

```shell
# WordPress
export AUTH_CONFIG="./auth-wordpress.yml"
export AUTH_URL="https://mon-site.fr/wp-login.php"
export LOGIN_VALUE="admin"
export PASS_VALUE="secret"

npx lighthouse-plugin-ecoindex collect \
  -u https://mon-site.fr/wp-login.php \
  -u https://mon-site.fr/wp-admin/ \
  --puppeteer-script ./index.cjs

# Okta (two steps)
export AUTH_CONFIG="./auth-okta-twosteps.yml"
export AUTH_URL="https://mondomaine.okta.com/login"
npx lighthouse-plugin-ecoindex collect ...
```

## Fichiers YAML fournis

- `auth-wordpress.yml` — login WordPress standard (`#user_login` / `#user_pass`)
- `auth-okta-twosteps.yml` — login Okta email puis mot de passe (deux écrans)
- `auth-okta-onestep.yml` — login Okta email + mot de passe sur la même page

Copiez et adaptez le YAML correspondant à votre site.
