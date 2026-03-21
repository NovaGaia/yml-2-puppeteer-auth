# TODO

Priorités : 🔴 Urgent · 🟠 Important · 🟡 Utile · 🟢 Nice-to-have

---

## 🔴 [URGENT] Options UI dans l'app

La section `options:` du YAML (timeout, debug, verificationMode) n'a pas d'UI dans l'éditeur — même problème que `verification` avant le fix récent. Éditable uniquement en YAML manuel.

**À implémenter** (même pattern que VerificationBlock) :
- `timeout` (ms) — input number
- `debug` — checkbox ou select true/false
- `verificationMode` — select `all | any`

Fichiers à modifier :
- `packages/app/src/types.ts` — ajouter interface `Options`
- `packages/app/src/hooks/useStepSync.ts` — ajouter `yamlToOptions()` / `patchYamlOptions()`
- `packages/app/src/components/editor/OptionsPanel.tsx` — nouveau composant
- `packages/app/src/components/editor/BlockEditor.tsx` — ajouter la section
- `packages/app/src/components/editor/SplitEditor.tsx` — passer les props

---

## 🔴 [URGENT] Plan de tests manuels

Valider avant toute release publique.

### Lib (`yml-2-puppeteer-auth`)

#### CLI — validate

```bash
cd packages/lib
node src/cli/cli.js validate examples/login-simple.yml
node src/cli/cli.js validate examples/login-two-steps.yml
node src/cli/cli.js validate examples/login-totp.yml
node src/cli/cli.js validate examples/login-with-error-handling.yml
node src/cli/cli.js validate examples/wordpress-2fa.yml
# Cas d'erreur attendu :
echo "authentication:\n  url: 123" | node src/cli/cli.js validate /dev/stdin
```

**Attendu** : `✓ Valid` pour les exemples, erreur descriptive pour le YAML invalide.

#### CLI — test (nécessite un site réel)

```bash
export AUTH_CONFIG="examples/login-simple.yml"
export LOGIN_VALUE="user@example.com"
export PASS_VALUE="secret"
node src/cli/cli.js test
```

**Attendu** : `✓ Authentication successful` + résultats de vérification.

#### Script Lighthouse générique

```bash
export AUTH_CONFIG="./examples/login-simple.yml"
export LOGIN_VALUE="..."
export PASS_VALUE="..."
npx lighthouse https://example.com \
  --puppeteer-script=scripts/puppeteer-generic.cjs \
  --output=json --output-path=/dev/null
```

**Attendu** : pas d'erreur puppeteer, audit Lighthouse complété.

#### Exemple with-lib (Ecoindex)

```bash
cd examples/lighthouse/with-lib
npm install
export AUTH_CONFIG="./auth-wordpress.yml"
export AUTH_URL="https://mon-site.fr/wp-login.php"
export LOGIN_VALUE="admin"
export PASS_VALUE="secret"
npx lighthouse-plugin-ecoindex collect \
  -u https://mon-site.fr/wp-login.php \
  --puppeteer-script ./index.cjs
```

**Attendu** : collecte Ecoindex sans erreur d'authentification.

### App Tauri (dev)

```bash
pnpm tauri dev
```

| Scénario | Attendu |
|----------|---------|
| Créer un scénario | Scénario créé, visible dans la liste |
| Éditer l'URL d'auth | YAML mis à jour en temps réel |
| Ajouter/supprimer/réordonner des steps | YAML synchronisé |
| Ajouter/supprimer des vérifications | YAML synchronisé |
| Modifier les options (timeout, debug, verificationMode) | YAML synchronisé |
| Modifier le YAML manuellement | Blocs mis à jour (debounce 300ms) |
| YAML invalide | Bandeau rouge, blocs non modifiés |
| Lancer un test (onglet Runner) | Exécution visible, résultat affiché |
| Chrome non trouvé | Message d'erreur explicite |
| Node.js non trouvé | Message d'erreur explicite |

### Build GitHub — release lib npm

1. Créer un changeset : `pnpm changeset`
2. Choisir le package `yml-2-puppeteer-auth`, bump `patch`
3. Commiter et pusher
4. Vérifier que le workflow `release.yml` crée une PR "Version Packages"
5. Merger la PR
6. Vérifier que le workflow publie sur npm : `npm view yml-2-puppeteer-auth`

---

## 🟠 Secrets GitHub à configurer

**GitHub → Settings → Secrets and variables → Actions**

Configurer avant la première release (lib ou app).

### Pour la lib (workflow `release.yml`)

| Secret | Comment l'obtenir | Obligatoire |
|--------|-------------------|-------------|
| `NPM_TOKEN` | npmjs.com → Account → Access Tokens → type **Automation** | Oui |

> `GITHUB_TOKEN` est automatique, pas besoin de le créer.

### Pour l'app Tauri (workflow `build-app.yml`)

#### Signature des mises à jour Tauri (updater)

Générer la paire de clés :
```bash
pnpm tauri signer generate -w ~/.tauri/app.key
# Affiche la clé publique → à copier dans tauri.conf.json > plugins.updater.pubkey
# La clé privée → secret GitHub
```

⚠️ La clé publique doit être ajoutée dans `tauri.conf.json` :
```json
{
  "plugins": {
    "updater": {
      "pubkey": "COLLER_LA_CLE_PUBLIQUE_ICI"
    }
  }
}
```

| Secret | Valeur | Obligatoire |
|--------|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contenu de `~/.tauri/app.key` | Si updater activé |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe saisi à la génération | Si updater activé |

#### Code signing macOS (distribution hors Mac App Store)

Prérequis : compte **Apple Developer** (99 $/an)

| Secret | Comment l'obtenir | Obligatoire |
|--------|-------------------|-------------|
| `APPLE_CERTIFICATE` | Exporter le certificat **Developer ID Application** depuis Keychain Access → base64 : `base64 -i cert.p12 \| pbcopy` | Oui |
| `APPLE_CERTIFICATE_PASSWORD` | Mot de passe saisi à l'export du `.p12` | Oui |
| `APPLE_SIGNING_IDENTITY` | Nom exact dans Keychain, ex : `Developer ID Application: Prénom NOM (XXXXXXXXXX)` | Oui |
| `APPLE_ID` | Ton adresse email Apple Developer | Oui (notarisation) |
| `APPLE_PASSWORD` | App-specific password : appleid.apple.com → Sécurité → Mots de passe spécifiques | Oui (notarisation) |
| `APPLE_TEAM_ID` | developer.apple.com → Account → Team ID (10 caractères) | Oui (notarisation) |

#### Code signing Windows (optionnel, voir tâche Windows/Linux)

| Secret | Comment l'obtenir |
|--------|-------------------|
| `WINDOWS_CERTIFICATE` | Certificat `.pfx` en base64 (DigiCert, Sectigo, etc.) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Mot de passe du `.pfx` |

> Sans certificat Windows, l'app se build mais déclenche un avertissement SmartScreen à l'installation.

#### Déclenchement d'une release app

```bash
git tag app-v0.1.0
git push origin app-v0.1.0
```

Le workflow `build-app.yml` se déclenche sur les tags `app-v*`.

---

## 🟠 Windows et Linux — app Tauri

### 1. Adapter `find_node()` (Rust)

Fichier : `packages/app/src-tauri/src/commands/runner.rs`

Ajouter la détection sur Windows :
- `%APPDATA%\nvm\v*\node.exe` (nvm-windows)
- `%ProgramFiles%\nodejs\node.exe`
- `%ProgramFiles(x86)%\nodejs\node.exe`
- `node` dans le PATH (fallback)

Ajouter la détection sur Linux :
- `~/.nvm/versions/node/*/bin/node`
- `~/.volta/bin/node`
- `~/.fnm/node-versions/*/installation/bin/node`
- `/usr/local/bin/node`
- `/usr/bin/node`

### 2. Adapter `findChrome()` (JS)

Fichier : `packages/lib/src/index.js`

Ajouter les chemins Windows :
- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

Ajouter les chemins Linux :
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/chromium-browser`
- `/usr/bin/chromium`

### 3. Mettre à jour le workflow `.github/workflows/build-app.yml`

Ajouter dans la matrix :

```yaml
- target: x86_64-pc-windows-msvc
  runner: windows-latest
- target: x86_64-unknown-linux-gnu
  runner: ubuntu-22.04
```

---

## 🟡 Documenter le prérequis `pnpm bundle` pour contributeurs

`dist/cli.bundle.cjs` est généré (dans `.gitignore`) mais nécessaire pour le build Tauri.
Le `beforeBuildCommand` dans `tauri.conf.json` le régénère automatiquement avant chaque build,
mais un contributeur qui lance `pnpm tauri dev` sans avoir bundlé obtiendra une erreur silencieuse.

Ajouter dans `CONTRIBUTING.md` (à créer) ou `packages/app/README.md` :

```bash
# Première installation
pnpm install
pnpm --filter yml-2-puppeteer-auth bundle  # génère dist/cli.bundle.cjs
pnpm tauri dev
```

---

## 🟢 Universal binary macOS

Le workflow actuel produit deux `.dmg` séparés (arm64 + x86_64).
Un universal binary combinerait les deux en un seul fichier, plus simple pour l'utilisateur.

```yaml
# Remplacer les deux runners macOS par :
- target: universal-apple-darwin
  runner: macos-latest
```

Nécessite d'ajouter la target Rust : `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
