---
title: auth-scenario — Application desktop Tauri
date: 2026-03-20
status: draft
---

# auth-scenario — Application desktop Tauri

## Contexte

La librairie `auth-scenario` permet de décrire des flows d'authentification en YAML et de les exécuter avec Puppeteer. L'application desktop complète cet outil avec un éditeur visuel et un runner intégré, pour créer et tester des scénarios sans écrire de YAML à la main.

---

## Périmètre

### Ce qui est dans le projet

- Éditeur visuel de scénarios (drag & drop + split-view YAML synchronisé)
- Stockage des scénarios en SQLite, import/export `.yml`
- Runner intégré (headless/headful, logs en temps réel)
- Credentials saisis dans l'UI, gardés en mémoire le temps de la session uniquement — jamais persistés
- Build cross-platform (macOS, Windows, Linux)

### Ce qui n'est pas dans le projet

- Vault de credentials / keychain OS
- Authentification utilisateur dans l'app
- Intégration Lighthouse (gérée par la lib, pas l'app)
- Nettoyage des fichiers temporaires au démarrage de l'app

---

## Architecture

### Stack

- **Backend** : Tauri v2 (Rust) — filesystem, SQLite, spawn de subprocess Node.js
- **Frontend** : React + Vite + TypeScript
- **Drag & drop** : `@dnd-kit/core`
- **Éditeur YAML** : CodeMirror 6 (coloration syntaxique YAML)
- **DB** : SQLite via `sqlx` (Rust)

### Structure

```
packages/app/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── editor/               # Éditeur drag & drop + split-view YAML
│   │   ├── runner/               # Logs en direct + toggle headless
│   │   └── credentials/          # Formulaire credentials (session only)
│   └── App.tsx
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── commands/
│   │   │   ├── scenarios.rs      # CRUD SQLite + import/export YAML
│   │   │   └── runner.rs         # Spawn Node.js subprocess
│   │   └── db/                   # SQLite (migrations, modèles)
│   └── tauri.conf.json
└── package.json
```

### Permissions Tauri v2

À déclarer dans `capabilities/default.json` :

```json
{
  "permissions": [
    "fs:read-all",
    "fs:write-all",
    "dialog:open",
    "dialog:save",
    "shell:execute"
  ]
}
```

---

## Schéma SQLite

```sql
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,          -- UUID v4, généré côté Rust
  name TEXT NOT NULL,
  yaml_content TEXT NOT NULL,   -- YAML complet sérialisé (source de vérité)
  created_at INTEGER NOT NULL,  -- Unix timestamp ms
  updated_at INTEGER NOT NULL
);
```

La colonne `yaml_content` stocke le YAML brut complet. Pas de décomposition en colonnes — le parsing est fait à la demande côté frontend.

---

## Composants

### 1. Éditeur de scénario

Split-view bidirectionnel : blocs drag & drop à gauche, YAML à droite.

```
┌─────────────────────────┬──────────────────────────┐
│  Blocs (drag & drop)    │  YAML (lecture/écriture) │
│                         │                          │
│ [+ Ajouter un step]     │  name: "Mon scénario"    │
│                         │  authentication:         │
│ ≡ waitForSelector       │    url: "https://..."    │
│   selector: input[...]  │    steps:                │
│                         │      - action: fill      │
│ ≡ fill                  │        selector: ...     │
│   LOGIN_VALUE → email   │        valueEnv: LOGIN   │
│                         │                          │
│ ≡ click                 │  verification:           │
│   button[type=submit]   │    - type: url           │
│                         │      contains: /dash     │
└─────────────────────────┴──────────────────────────┘
```

**Champs exposés par type de bloc (steps uniquement) :**
- `fill` → selector, valueEnv, valueType (totp optionnel)
- `waitForSelector` → selector, timeout, errorSelector (optionnel)
- `click` → selector
- `waitForNavigation` → waitUntil, timeout
- `assertNotPresent` → selector
- `wait` → duration

**Sections `verification` et `options` :** éditables uniquement via la colonne YAML (pas de blocs visuels pour ces sections). L'éditeur ne synchronise les blocs que pour `authentication.steps`.

**Synchronisation YAML↔blocs :**
- Modifier un bloc → YAML mis à jour instantanément (blocs → YAML, toujours valide)
- Modifier le YAML :
  - Debounce de 300ms après la dernière frappe
  - Parse YAML : si invalide → erreur inline dans CodeMirror, blocs inchangés
  - Si valide syntaxiquement mais invalide selon le `Validator` (action inconnue, champs manquants) → blocs mis à jour quand même (le YAML est valide, la validation sémantique est informative seulement dans l'éditeur)
  - Si valide → blocs mis à jour

### 2. Stockage des scénarios

- Stockage principal : SQLite (colonne `yaml_content` = YAML brut)
- **Import** : file picker → lire le `.yml` → insérer en DB
  - Si un scénario du même `name` existe déjà : dialogue de confirmation "Un scénario nommé X existe déjà. Remplacer ou créer un doublon ?"
  - Options : **Remplacer** (upsert par `name`) | **Créer un doublon** (nouveau `id`, `name` suffixé avec `_2`, `_3`, … de façon incrémentale jusqu'à trouver un nom disponible)
- **Export** : sélectionner un scénario → save picker → écrire le `yaml_content` dans le fichier choisi

### 3. Runner

```
┌─────────────────────────────────────────────────┐
│  Runner                              [▶ Lancer]  │
│                                                  │
│  Credentials:                                    │
│  LOGIN_VALUE  [user@example.com        ]         │
│  PASS_VALUE   [••••••••                ]         │
│  TOTP_SECRET  [JBSWY3DPEHPK3PXP       ] (totp)  │
│                                                  │
│  ○ Headless   ● Headful                          │
│                                                  │
│ ─────────────────────────────────────────────── │
│  [0] waitForSelector "input[type='email']"       │
│      → found (287ms)                    ✓        │
│  [1] fill "input[type='email']"                  │
│      → filled                           ✓        │
│  [2] click "button[type='submit']"               │
│      → ...                              ⏳        │
└─────────────────────────────────────────────────┘
```

**Détection des credentials :**
- L'UI parse le YAML du scénario et collecte tous les `valueEnv` distincts
- Pour chaque `valueEnv` :
  - Si le nom contient `PASS` → champ masqué (type `password`)
  - Si le nom contient `SECRET` → champ masqué (type `password`) + label "(totp)" si le step a `valueType: totp`
  - Sinon → champ texte visible
- Le bouton "Lancer" est désactivé tant qu'un `valueEnv` est vide

**Credentials en mémoire :** `useState` React, durée de vie = session app (fermée = effacés), jamais envoyés vers SQLite ni le filesystem.

**Exécution :**

Au clic "Lancer", Rust reçoit `(scenario_id, credentials_map, headed: bool)` :

1. Lit `yaml_content` depuis SQLite
2. Écrit un fichier YAML temporaire dans `std::env::temp_dir()` (ex. `/tmp/auth-scenario-<uuid>.yml`)
3. Construit la commande :
   ```
   node <chemin_absolu_cli> test <yaml_tmp> [--headed]
   ```
   - **Résolution du chemin CLI :**
     - `cli.js` est déclaré dans `tauri.conf.json` → `bundle.resources` pour être inclus dans le bundle distribué
     - En production : `tauri::path::resource_dir()` + `cli.js` (résolu au démarrage)
     - En développement (`TAURI_ENV=development`) : chemin absolu vers `packages/lib/src/cli/cli.js` depuis la racine du workspace
   - **Détection de Node.js :** vérifiée au démarrage de l'app via `which node` (unix) / `where node` (windows). Si absent, une bannière d'erreur s'affiche dans le runner et le bouton "Lancer" est désactivé. La vérification n'est pas relancée à chaque run.
   - `--headed` ajouté si `headed: true`
4. Injecte les credentials comme env vars dans le subprocess (env isolé)
5. Streame stdout/stderr ligne par ligne via `tauri::emit("runner-log", line)` → **affichage brut des lignes dans l'UI** (pas de parsing côté Rust). Le wireframe du runner est illustratif ; l'UI affiche les lignes telles que la CLI les émet.
6. Supprime le fichier YAML temporaire après exécution (succès ou échec)
   - En cas de crash Rust (SIGKILL) : le fichier reste dans le répertoire temp système — pas de credentials dedans (ils sont en env vars), nettoyage hors scope
7. Résultat final émis via `tauri::emit("runner-result", { success, duration, error })`

**Headless/Headful :**
- Toggle dans l'UI : headful par défaut (meilleur pour le debugging)
- Rust passe `--headed` si headful sélectionné ; rien si headless (défaut CLI = headless)

**Node.js non trouvé :** si `node` n'est pas dans le PATH, le runner affiche un message d'erreur explicite avec un lien vers nodejs.org.

---

## Flux de données — sécurité credentials

```
Utilisateur saisit credentials
    ↓
useState React (mémoire, session uniquement)
    ↓
tauri invoke("run_scenario", { credentials_map, headed })
    ↓
Rust : env vars injectées dans subprocess (env isolé)
    ↓
Node.js subprocess (auth-scenario lib)
    ↓
Résultat streamé via tauri::emit → UI
```

Les credentials ne transitent jamais vers SQLite, le filesystem, ou un réseau.

---

## Gestion des erreurs

| Situation | Comportement |
|-----------|-------------|
| YAML invalide | Erreur inline dans l'éditeur YAML (CodeMirror gutter), les blocs ne se mettent pas à jour |
| Credential manquant | Bouton "Lancer" désactivé jusqu'à ce que tous les `valueEnv` soient renseignés |
| Node.js non trouvé | Message d'erreur dans le runner avec lien vers nodejs.org |
| Step échoué | Log coloré en rouge + message d'erreur du step, résultat ✗ |
| Import : conflit de nom | Dialogue "Remplacer ou créer un doublon ?" |

---

## CI/CD

- Build via `tauri-apps/tauri-action` (matrix : ubuntu, macos, windows)
- Version synchronisée depuis `package.json` → `tauri.conf.json` via script Changesets
- Auto-updater via GitHub Releases

---

## Hors périmètre (post-MVP)

- Vault de credentials persistants (keychain OS)
- Node.js bundlé (sidecar) pour utilisateurs non-développeurs
- Historique des runs
- Partage de scénarios
- Édition visuelle des sections `verification` et `options`
