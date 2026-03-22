# Custom Puppeteer Script — sans yml-2-puppeteer-auth

Exemple de référence : script Puppeteer impératif (JS pur) pour l'authentification WordPress et Okta avec `lighthouse-plugin-ecoindex`.

Cet exemple illustre l'approche **sans librairie** — l'authentification est codée directement en JS. L'approche [`with-lib/`](../with-lib/) est recommandée pour les nouveaux projets.

## Fichiers

- **`index.cjs`** — script principal passé à `--puppeteer-script`. Lit `AUTH_MODE` pour dispatcher vers WordPress ou Okta.
- **`puppeteer-helper.js`** — helpers d'authentification (`wpConnect`, `oktaConnect`) et helpers EcoIndex (`startEcoindexPageMesure`, `endEcoindexPageMesure`).
- **`.env.example`** — modèle de variables d'environnement à copier en `.env`.

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `AUTH_MODE` | Mode d'auth : `wordpress` ou `okta` |
| `AUTH_URL` | URL de la page de login |
| `LOGIN_FIELD` | Sélecteur CSS du champ login (défaut : `#user_login`) |
| `LOGIN_VALUE` | Identifiant |
| `PASS_FIELD` | Sélecteur CSS du champ mot de passe (défaut : `#user_pass`) |
| `PASS_VALUE` | Mot de passe |
| `ONE_STEP_LOGIN` | `true` si email + mot de passe sont sur la même page (Okta) |
| `HOME_TITLE` | Titre de la page d'accueil post-login (vérification) |
| `DEBUG` | `true` pour activer les logs détaillés |

## Utilisation

```bash
cp .env.example .env
# remplir .env avec vos valeurs

npx lighthouse-plugin-ecoindex collect \
  -u https://mon-site.fr/wp-login.php \
  -u https://mon-site.fr/wp-admin/ \
  --puppeteer-script ./index.cjs
```

## Comparaison avec with-lib

| | without-lib | with-lib |
|---|---|---|
| Flow auth | JS impératif (`wpConnect`, `oktaConnect`) | YAML déclaratif |
| Sélecteurs | Via env vars (`LOGIN_FIELD`, `PASS_FIELD`) | Dans le YAML |
| Mode dispatching | `AUTH_MODE=wordpress\|okta` | `AUTH_CONFIG=./auth-wordpress.yml` |
| Vérification | Manuelle (cookie / token) | Dans le YAML (`verification:`) |
| EcoIndex helpers | `puppeteer-helper.js` (auth + ecoindex) | `ecoindex-helper.js` (ecoindex uniquement) |
