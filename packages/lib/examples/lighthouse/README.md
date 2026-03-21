# Lighthouse integration examples

Exemples d'intégration de `yml-2-puppeteer-auth` avec `lighthouse-plugin-ecoindex`.

Ces scripts sont passés à Lighthouse via `--puppeteer-script` (ou l'option équivalente dans `lighthouse-plugin-ecoindex`). Lighthouse fournit la page déjà ouverte — pas de `puppeteer.launch()`.

## Comparaison des approches

| | [`without-lib/`](./without-lib/) | [`with-lib/`](./with-lib/) |
|---|---|---|
| Flow auth | JS impératif (`wpConnect`, `oktaConnect`) | YAML déclaratif |
| Sélecteurs | Via env vars (`LOGIN_FIELD`, `PASS_FIELD`) | Dans le YAML |
| Mode dispatching | `AUTH_MODE=wordpress\|okta` | `AUTH_CONFIG=./auth-wordpress.yml` |
| Vérification | Manuelle (cookie/token) | Dans le YAML (`verification:`) |
| Ecoindex helpers | `puppeteer-helper.js` (auth + ecoindex) | `ecoindex-helper.js` (ecoindex uniquement) |

L'approche `with-lib` est recommandée : le flow d'authentification est entièrement décrit en YAML, sans code JS à maintenir.

## Variables d'environnement communes

| Variable | Description |
|----------|-------------|
| `AUTH_CONFIG` | Chemin vers le fichier YAML d'authentification (with-lib uniquement) |
| `AUTH_URL` | URL de la page de login |
| `LOGIN_VALUE` | Identifiant |
| `PASS_VALUE` | Mot de passe |
| `DEBUG` | Logs détaillés (`true\|false`) |

## Utilisation

```bash
# with-lib (recommandé)
export AUTH_CONFIG="./auth-wordpress.yml"
export AUTH_URL="https://mon-site.fr/wp-login.php"
export LOGIN_VALUE="admin"
export PASS_VALUE="secret"

npx lighthouse-plugin-ecoindex collect \
  -u https://mon-site.fr/wp-login.php \
  -u https://mon-site.fr/wp-admin/ \
  --puppeteer-script ./with-lib/index.cjs
```

Voir les README respectifs pour plus de détails :
- [with-lib/README.md](./with-lib/README.md)
- [without-lib/README.md](./without-lib/README.md)
