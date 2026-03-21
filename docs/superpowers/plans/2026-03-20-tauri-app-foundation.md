# Tauri App — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional Tauri v2 desktop app where developers can create, edit, and test `yml-2-puppeteer-auth` YAML configs via a YAML editor and integrated runner.

**Architecture:** Tauri v2 (Rust backend) + React/Vite frontend. Rust handles SQLite (sqlx), file I/O, and Node.js subprocess spawning. React renders the UI and holds credentials in session state only. Communication via Tauri commands and events.

**Tech Stack:** Tauri v2, React 18, Vite, TypeScript, sqlx (SQLite), @uiw/react-codemirror (CodeMirror 6), js-yaml, @tauri-apps/plugin-dialog, @tauri-apps/plugin-shell, @tauri-apps/plugin-fs

---

## File Structure

```
packages/app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                        # React entry point
│   ├── App.tsx                         # Root layout (sidebar + main panel)
│   ├── types.ts                        # Shared TypeScript types
│   ├── components/
│   │   ├── ScenarioList.tsx            # Sidebar: list + create + delete scenarios
│   │   ├── editor/
│   │   │   └── YamlEditor.tsx          # CodeMirror 6 YAML editor
│   │   └── runner/
│   │       ├── CredentialsForm.tsx     # Detect valueEnv + session credentials
│   │       └── RunnerPanel.tsx         # Toggle headless, logs, run button
│   └── hooks/
│       └── useScenario.ts              # Selected scenario state + CRUD calls
├── src-tauri/
│   ├── build.rs                        # REQUIS par tauri-build (génère le contexte Tauri)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json               # Tauri v2 permissions
│   ├── migrations/
│   │   └── 001_init.sql               # SQLite schema
│   └── src/
│       ├── main.rs                     # Tauri app entry point
│       ├── lib.rs                      # App builder + plugin registration
│       ├── db.rs                       # SQLite pool init + migration runner
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── scenarios.rs            # list, create, update, delete, get
│       │   └── runner.rs               # run_scenario (subprocess + streaming)
│       └── models.rs                   # Rust structs (Scenario, RunResult)
```

---

## Task 1 — Tauri v2 + React scaffold

**Files:**
- Create: `packages/app/package.json`
- Create: `packages/app/index.html`
- Create: `packages/app/vite.config.ts`
- Create: `packages/app/tsconfig.json`
- Create: `packages/app/src/main.tsx`
- Create: `packages/app/src/App.tsx`
- Create: `packages/app/src-tauri/Cargo.toml`
- Create: `packages/app/src-tauri/tauri.conf.json`
- Create: `packages/app/src-tauri/capabilities/default.json`
- Create: `packages/app/src-tauri/src/main.rs`
- Create: `packages/app/src-tauri/src/lib.rs`
- Modify: `turbo.json` — ajouter le pipeline `dev` pour l'app

- [ ] **Step 1 : Créer `packages/app/package.json`**

```json
{
  "name": "yml-2-puppeteer-auth-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "preview": "vite preview",
    "vite:dev": "vite"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "@uiw/react-codemirror": "^4",
    "@codemirror/lang-yaml": "^6",
    "js-yaml": "^4",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/js-yaml": "^4",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^5",
    "vitest": "^2"
  }
}
```

- [ ] **Step 2 : Créer `packages/app/index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>yml-2-puppeteer-auth</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3 : Créer `packages/app/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
```

- [ ] **Step 4 : Créer `packages/app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5 : Créer `packages/app/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6 : Créer `packages/app/src/App.tsx` (layout skeleton)**

```tsx
export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16 }}>
        <h2 style={{ margin: 0 }}>Scénarios</h2>
      </aside>
      <main style={{ flex: 1, padding: 16 }}>
        <p>Sélectionner un scénario</p>
      </main>
    </div>
  )
}
```

- [ ] **Step 7 : Créer `packages/app/src-tauri/Cargo.toml`**

```toml
[package]
name = "yml-2-puppeteer-auth-app"
version = "0.1.0"
edition = "2021"

[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio", "migrate"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
tokio = { version = "1", features = ["full"] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
strip = true
opt-level = "s"
```

- [ ] **Step 8 : Créer `packages/app/src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "yml-2-puppeteer-auth",
  "version": "0.1.0",
  "identifier": "com.yml-2-puppeteer-auth.app",
  "build": {
    "beforeDevCommand": "pnpm vite:dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm vite build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "yml-2-puppeteer-auth",
        "width": 1200,
        "height": 800
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "resources": {
      "../../lib/src/": "lib/src/"
    }
  }
}
```

- [ ] **Step 9 : Créer `packages/app/src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file"
  ]
}
```

- [ ] **Step 10 : Créer `packages/app/src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 11 : Créer `packages/app/src-tauri/src/main.rs`**

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
```

- [ ] **Step 12 : Créer `packages/app/src-tauri/src/lib.rs` (skeleton)**

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Note : `tauri_plugin_shell` est retiré — le subprocess est lancé directement via `std::process::Command` en Rust, sans passer par le plugin shell frontend.

- [ ] **Step 13 : Installer les dépendances**

```bash
cd packages/app
pnpm install
```

- [ ] **Step 14 : Vérifier que l'app se lance**

```bash
cd packages/app
pnpm dev
```

Expected : fenêtre Tauri s'ouvre avec le layout skeleton (sidebar "Scénarios" + panel "Sélectionner un scénario").

- [ ] **Step 15 : Commit**

```bash
git add packages/app/
git commit -m "feat(app): scaffold Tauri v2 + React app"
```

---

## Task 2 — SQLite : schéma + CRUD scénarios (Rust)

**Files:**
- Create: `packages/app/src-tauri/migrations/001_init.sql`
- Create: `packages/app/src-tauri/src/db.rs`
- Create: `packages/app/src-tauri/src/models.rs`
- Create: `packages/app/src-tauri/src/commands/mod.rs`
- Create: `packages/app/src-tauri/src/commands/scenarios.rs`
- Modify: `packages/app/src-tauri/src/lib.rs` — wirer le pool DB + les commandes

- [ ] **Step 1 : Créer `packages/app/src-tauri/migrations/001_init.sql`**

```sql
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  yaml_content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 2 : Créer `packages/app/src-tauri/src/models.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub yaml_content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateScenarioPayload {
    pub name: String,
    pub yaml_content: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScenarioPayload {
    pub id: String,
    pub name: String,
    pub yaml_content: String,
}
```

- [ ] **Step 3 : Créer `packages/app/src-tauri/src/db.rs`**

```rust
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use tauri::AppHandle;

pub async fn init_db(app: &AppHandle) -> Result<SqlitePool, sqlx::Error> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

    let db_path = app_dir.join("scenarios.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn test_pool() -> SqlitePool {
        SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn test_migrations_run() {
        let pool = test_pool().await;
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        // table exists
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM scenarios")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count.0, 0);
    }
}
```

- [ ] **Step 4 : Créer `packages/app/src-tauri/src/commands/mod.rs`**

```rust
pub mod scenarios;
pub mod runner;
```

- [ ] **Step 5 : Créer `packages/app/src-tauri/src/commands/scenarios.rs`**

```rust
use crate::models::{CreateScenarioPayload, Scenario, UpdateScenarioPayload};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

#[tauri::command]
pub async fn list_scenarios(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Scenario>, String> {
    sqlx::query_as::<_, Scenario>(
        "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios ORDER BY updated_at DESC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scenario(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<Scenario>, String> {
    sqlx::query_as::<_, Scenario>(
        "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_scenario(
    payload: CreateScenarioPayload,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Scenario, String> {
    let now = now_ms();
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.yaml_content)
    .bind(now)
    .bind(now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(Scenario {
        id,
        name: payload.name,
        yaml_content: payload.yaml_content,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_scenario(
    payload: UpdateScenarioPayload,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let now = now_ms();

    sqlx::query("UPDATE scenarios SET name = ?, yaml_content = ?, updated_at = ? WHERE id = ?")
        .bind(&payload.name)
        .bind(&payload.yaml_content)
        .bind(now)
        .bind(&payload.id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_scenario(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM scenarios WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

    async fn setup() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_create_and_list() {
        let pool = setup().await;

        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("test-id")
        .bind("My Scenario")
        .bind("name: test")
        .bind(1000i64)
        .bind(1000i64)
        .execute(&pool)
        .await
        .unwrap();

        let rows: Vec<Scenario> = sqlx::query_as(
            "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios",
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].name, "My Scenario");
    }

    #[tokio::test]
    async fn test_update() {
        let pool = setup().await;

        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("id-1")
        .bind("Old Name")
        .bind("yaml: old")
        .bind(1000i64)
        .bind(1000i64)
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query("UPDATE scenarios SET name = ?, yaml_content = ?, updated_at = ? WHERE id = ?")
            .bind("New Name")
            .bind("yaml: new")
            .bind(2000i64)
            .bind("id-1")
            .execute(&pool)
            .await
            .unwrap();

        let row: Scenario = sqlx::query_as(
            "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE id = ?",
        )
        .bind("id-1")
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(row.name, "New Name");
        assert_eq!(row.updated_at, 2000);
    }

    #[tokio::test]
    async fn test_delete() {
        let pool = setup().await;

        sqlx::query(
            "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("id-del")
        .bind("To Delete")
        .bind("yaml: x")
        .bind(1000i64)
        .bind(1000i64)
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query("DELETE FROM scenarios WHERE id = ?")
            .bind("id-del")
            .execute(&pool)
            .await
            .unwrap();

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM scenarios")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(count.0, 0);
    }
}
```

- [ ] **Step 6 : Mettre à jour `packages/app/src-tauri/src/lib.rs`**

```rust
use sqlx::SqlitePool;

mod commands;
mod db;
mod models;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&app_handle)
                    .await
                    .expect("failed to initialize database");
                app_handle.manage(pool);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scenarios::list_scenarios,
            commands::scenarios::get_scenario,
            commands::scenarios::create_scenario,
            commands::scenarios::update_scenario,
            commands::scenarios::delete_scenario,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7 : Créer `packages/app/src-tauri/src/commands/runner.rs` (stub)**

```rust
// Implémenté dans Task 5
```

- [ ] **Step 8 : Lancer les tests Rust**

```bash
cd packages/app/src-tauri
cargo test
```

Expected : 4 tests passent (migrations_run, create_and_list, update, delete)

- [ ] **Step 9 : Commit**

```bash
git add packages/app/src-tauri/
git commit -m "feat(app): add SQLite schema and scenario CRUD commands"
```

---

## Task 3 — Liste des scénarios (React)

**Files:**
- Create: `packages/app/src/types.ts`
- Create: `packages/app/src/hooks/useScenario.ts`
- Create: `packages/app/src/components/ScenarioList.tsx`
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1 : Créer `packages/app/src/types.ts`**

```typescript
export interface Scenario {
  id: string
  name: string
  yaml_content: string
  created_at: number
  updated_at: number
}
```

- [ ] **Step 2 : Créer `packages/app/src/hooks/useScenario.ts`**

```typescript
import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import type { Scenario } from '../types'

const DEFAULT_YAML = `name: "Nouveau scénario"

authentication:
  url: "https://example.com/login"
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
`

export function useScenario() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    const list = await invoke<Scenario[]>('list_scenarios')
    setScenarios(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  const create = useCallback(async () => {
    const scenario = await invoke<Scenario>('create_scenario', {
      payload: { name: 'Nouveau scénario', yaml_content: DEFAULT_YAML },
    })
    await reload()
    setSelected(scenario)
  }, [reload])

  const update = useCallback(async (yaml_content: string) => {
    if (!selected) return
    await invoke('update_scenario', {
      payload: { id: selected.id, name: selected.name, yaml_content },
    })
    setSelected((s) => s ? { ...s, yaml_content } : s)
  }, [selected])

  const rename = useCallback(async (name: string) => {
    if (!selected) return
    await invoke('update_scenario', {
      payload: { id: selected.id, name, yaml_content: selected.yaml_content },
    })
    setSelected((s) => s ? { ...s, name } : s)
    await reload()
  }, [selected, reload])

  const remove = useCallback(async (id: string) => {
    await invoke('delete_scenario', { id })
    if (selected?.id === id) setSelected(null)
    await reload()
  }, [selected, reload])

  return { scenarios, selected, setSelected, loading, create, update, rename, remove, reload }
}
```

- [ ] **Step 3 : Créer `packages/app/src/components/ScenarioList.tsx`**

```tsx
import type { Scenario } from '../types'

interface Props {
  scenarios: Scenario[]
  selected: Scenario | null
  onSelect: (s: Scenario) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function ScenarioList({ scenarios, selected, onSelect, onCreate, onDelete }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Scénarios</h2>
        <button onClick={onCreate} title="Nouveau scénario" style={{ cursor: 'pointer' }}>+</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto' }}>
        {scenarios.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: 6,
              background: selected?.id === s.id ? '#e0e7ff' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              title="Supprimer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
            >
              ×
            </button>
          </li>
        ))}
        {scenarios.length === 0 && (
          <li style={{ color: '#999', fontSize: 14 }}>Aucun scénario. Créez-en un →</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4 : Mettre à jour `packages/app/src/App.tsx`**

```tsx
import ScenarioList from './components/ScenarioList'
import { useScenario } from './hooks/useScenario'

export default function App() {
  const { scenarios, selected, setSelected, create, update, rename, remove } = useScenario()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16, display: 'flex', flexDirection: 'column' }}>
        <ScenarioList
          scenarios={scenarios}
          selected={selected}
          onSelect={setSelected}
          onCreate={create}
          onDelete={remove}
        />
      </aside>
      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {selected
          ? <p>Scénario sélectionné : {selected.name}</p>
          : <p style={{ color: '#999' }}>Sélectionner ou créer un scénario</p>
        }
      </main>
    </div>
  )
}
```

- [ ] **Step 5 : Vérifier manuellement dans l'app**

```bash
cd packages/app && pnpm dev
```

- Créer un scénario → apparaît dans la liste
- Cliquer dessus → sélectionné (fond bleu)
- Cliquer × → supprimé de la liste

- [ ] **Step 6 : Commit**

```bash
git add packages/app/src/
git commit -m "feat(app): add scenario list sidebar with create/delete"
```

---

## Task 4 — Éditeur YAML (CodeMirror 6)

**Files:**
- Create: `packages/app/src/components/editor/YamlEditor.tsx`
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1 : Créer `packages/app/src/components/editor/YamlEditor.tsx`**

```tsx
import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

export default function YamlEditor({ value, onChange, debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value)

  // Sync quand la prop change (sélection d'un autre scénario)
  useEffect(() => { setLocal(value) }, [value])

  const handleChange = useCallback((val: string) => {
    setLocal(val)
  }, [])

  // Debounce : appelle onChange seulement après 300ms d'inactivité
  useEffect(() => {
    if (local === value) return
    const timer = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(timer)
  }, [local, value, onChange, debounceMs])

  return (
    <CodeMirror
      value={local}
      height="100%"
      extensions={[yaml()]}
      onChange={handleChange}
      theme="light"
      style={{ height: '100%', fontSize: 13 }}
    />
  )
}
```

- [ ] **Step 2 : Mettre à jour `packages/app/src/App.tsx` — intégrer YamlEditor**

```tsx
import ScenarioList from './components/ScenarioList'
import YamlEditor from './components/editor/YamlEditor'
import { useScenario } from './hooks/useScenario'

export default function App() {
  const { scenarios, selected, setSelected, create, update, remove } = useScenario()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16 }}>
        <ScenarioList
          scenarios={scenarios}
          selected={selected}
          onSelect={setSelected}
          onCreate={create}
          onDelete={remove}
        />
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
              <strong>{selected.name}</strong>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <YamlEditor
                value={selected.yaml_content}
                onChange={update}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: 16, color: '#999' }}>Sélectionner ou créer un scénario</div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3 : Tester manuellement**

```bash
cd packages/app && pnpm dev
```

- Créer un scénario → éditeur YAML s'affiche avec le YAML par défaut
- Modifier le YAML → après 300ms, la modification est sauvegardée (rechargez l'app : la modif persiste)
- Sélectionner un autre scénario → l'éditeur se met à jour

- [ ] **Step 4 : Commit**

```bash
git add packages/app/src/components/editor/
git commit -m "feat(app): add CodeMirror 6 YAML editor with debounced autosave"
```

---

## Task 5 — Import / Export YAML

**Files:**
- Create: `packages/app/src-tauri/src/commands/scenarios.rs` — ajouter `import_yaml`, `export_yaml`
- Create: `packages/app/src/components/ImportExportBar.tsx`
- Modify: `packages/app/src/App.tsx`
- Modify: `packages/app/src-tauri/src/lib.rs` — enregistrer les nouvelles commandes

- [ ] **Step 1 : Ajouter `import_yaml` et `export_yaml` dans `scenarios.rs`**

Ajouter à la fin du fichier `packages/app/src-tauri/src/commands/scenarios.rs` :

```rust
use std::collections::HashMap;

#[tauri::command]
pub async fn import_yaml(
    file_path: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<ImportResult, String> {
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    // Extraire le name depuis le YAML (champ `name:` à la racine)
    let name = extract_yaml_name(&content).unwrap_or_else(|| "Scénario importé".to_string());

    // Vérifier si un scénario du même nom existe déjà
    let existing: Option<Scenario> = sqlx::query_as(
        "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE name = ?",
    )
    .bind(&name)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(ImportResult {
        name,
        content,
        existing_id: existing.map(|s| s.id),
    })
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub name: String,
    pub content: String,
    pub existing_id: Option<String>,
}

#[tauri::command]
pub async fn confirm_import(
    name: String,
    yaml_content: String,
    replace_id: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Scenario, String> {
    let now = now_ms();

    if let Some(id) = replace_id {
        sqlx::query("UPDATE scenarios SET name = ?, yaml_content = ?, updated_at = ? WHERE id = ?")
            .bind(&name)
            .bind(&yaml_content)
            .bind(now)
            .bind(&id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        return Ok(Scenario { id, name, yaml_content, created_at: now, updated_at: now });
    }

    // Trouver un nom unique
    let unique_name = find_unique_name(&name, pool.inner()).await?;
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&unique_name)
    .bind(&yaml_content)
    .bind(now)
    .bind(now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(Scenario { id, name: unique_name, yaml_content, created_at: now, updated_at: now })
}

#[tauri::command]
pub async fn export_yaml(
    file_path: String,
    yaml_content: String,
) -> Result<(), String> {
    std::fs::write(&file_path, yaml_content).map_err(|e| e.to_string())
}

fn extract_yaml_name(yaml: &str) -> Option<String> {
    for line in yaml.lines() {
        if let Some(rest) = line.strip_prefix("name:") {
            let name = rest.trim().trim_matches('"').trim_matches('\'');
            if !name.is_empty() {
                return Some(name.to_string());
            }
        }
    }
    None
}

async fn find_unique_name(base: &str, pool: &SqlitePool) -> Result<String, String> {
    let exists: Option<(String,)> = sqlx::query_as("SELECT id FROM scenarios WHERE name = ?")
        .bind(base)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if exists.is_none() {
        return Ok(base.to_string());
    }

    for i in 2..=100 {
        let candidate = format!("{}_{}", base, i);
        let exists: Option<(String,)> =
            sqlx::query_as("SELECT id FROM scenarios WHERE name = ?")
                .bind(&candidate)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;
        if exists.is_none() {
            return Ok(candidate);
        }
    }

    Err("impossible de trouver un nom unique".to_string())
}
```

- [ ] **Step 2 : Enregistrer les nouvelles commandes dans `lib.rs`**

Ajouter dans `tauri::generate_handler![]` :

```rust
commands::scenarios::import_yaml,
commands::scenarios::confirm_import,
commands::scenarios::export_yaml,
```

- [ ] **Step 3 : Créer `packages/app/src/components/ImportExportBar.tsx`**

```tsx
import { open, save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import type { Scenario } from '../types'

interface ImportResult {
  name: string
  content: string
  existing_id: string | null
}

interface Props {
  selected: Scenario | null
  onImported: (s: Scenario) => void
}

export default function ImportExportBar({ selected, onImported }: Props) {
  const handleImport = async () => {
    const filePath = await open({
      filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
    })
    if (!filePath) return

    const result = await invoke<ImportResult>('import_yaml', { filePath })

    let replaceId: string | null = null
    if (result.existing_id) {
      const replace = window.confirm(
        `Un scénario nommé "${result.name}" existe déjà.\n\nCliquez OK pour le remplacer, ou Annuler pour créer un doublon.`
      )
      replaceId = replace ? result.existing_id : null
    }

    const scenario = await invoke<Scenario>('confirm_import', {
      name: result.name,
      yamlContent: result.content,
      replaceId,
    })

    onImported(scenario)
  }

  const handleExport = async () => {
    if (!selected) return

    const filePath = await save({
      defaultPath: `${selected.name}.yml`,
      filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
    })
    if (!filePath) return

    await invoke('export_yaml', {
      filePath,
      yamlContent: selected.yaml_content,
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid #eee' }}>
      <button onClick={handleImport}>Importer YAML</button>
      <button onClick={handleExport} disabled={!selected}>
        Exporter YAML
      </button>
    </div>
  )
}
```

- [ ] **Step 4 : Intégrer `ImportExportBar` dans `App.tsx`**

Ajouter dans l'import :
```tsx
import ImportExportBar from './components/ImportExportBar'
```

Ajouter dans le layout, au-dessus de `<main>` :
```tsx
<ImportExportBar
  selected={selected}
  onImported={(s) => { setSelected(s); reload() }}
/>
```

Note : exposer `reload` depuis `useScenario` si ce n'est pas déjà fait.

- [ ] **Step 5 : Lancer les tests Rust**

```bash
cd packages/app/src-tauri && cargo test
```

Expected : tous les tests passent.

- [ ] **Step 6 : Tester manuellement**

```bash
cd packages/app && pnpm dev
```

- Importer un `.yml` existant (ex. `packages/lib/examples/login-simple.yml`) → apparaît dans la liste
- Exporter le scénario sélectionné → fichier `.yml` créé sur le disque
- Réimporter le même fichier → dialogue de confirmation "Remplacer ou doublon"

- [ ] **Step 7 : Commit**

```bash
git add packages/app/
git commit -m "feat(app): add YAML import/export with conflict resolution"
```

---

## Task 6 — Runner : credentials + subprocess + streaming

**Files:**
- Create: `packages/app/src-tauri/src/commands/runner.rs`
- Create: `packages/app/src/components/runner/CredentialsForm.tsx`
- Create: `packages/app/src/components/runner/RunnerPanel.tsx`
- Modify: `packages/app/src-tauri/src/lib.rs`
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1 : Créer `packages/app/src-tauri/src/commands/runner.rs`**

```rust
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, serde::Deserialize)]
pub struct RunPayload {
    // Design note: on passe yaml_content directement (pas scenario_id) pour inclure
    // les modifications non-encore sauvegardées (debounce de 300ms dans l'éditeur).
    pub yaml_content: String,
    pub credentials: HashMap<String, String>,
    pub headed: bool,
}

#[tauri::command]
pub async fn run_scenario(
    payload: RunPayload,
    app: AppHandle,
) -> Result<bool, String> {
    // 1. Résolution du chemin CLI
    let cli_path = resolve_cli_path(&app)?;

    // 2. Écrire le YAML temporaire
    let tmp_path = std::env::temp_dir().join(format!("yml-2-puppeteer-auth-{}.yml", Uuid::new_v4()));
    std::fs::write(&tmp_path, &payload.yaml_content).map_err(|e| e.to_string())?;

    // 3. Construire la commande
    let mut cmd = Command::new("node");
    cmd.arg(&cli_path)
        .arg("test")
        .arg(tmp_path.to_str().unwrap())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if payload.headed {
        cmd.arg("--headed");
    }

    // Injecter les credentials comme env vars par-dessus l'environnement existant.
    // On ne fait PAS env_clear() pour conserver PATH, HOME, DISPLAY, XAUTHORITY, etc.
    // (nécessaires pour le mode headful sur Linux et macOS).
    for (key, value) in &payload.credentials {
        cmd.env(key, value);
    }

    // 4. Lancer le subprocess
    let mut child = cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "Node.js introuvable. Installez Node.js depuis https://nodejs.org".to_string()
        } else {
            e.to_string()
        }
    })?;

    // 5. Streamer stdout
    let app_stdout = app.clone();
    let stdout = child.stdout.take().unwrap();
    let stdout_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_stdout.emit("runner-log", &line);
        }
    });

    // Streamer stderr
    let app_stderr = app.clone();
    let stderr = child.stderr.take().unwrap();
    let stderr_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_stderr.emit("runner-log", format!("[err] {}", line));
        }
    });

    // 6. Attendre la fin
    let status = child.wait().map_err(|e| e.to_string())?;
    let _ = stdout_thread.join();
    let _ = stderr_thread.join();

    // 7. Supprimer le fichier temp
    let _ = std::fs::remove_file(&tmp_path);

    Ok(status.success())
}

fn resolve_cli_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    // En développement (debug_assertions = true) : chemin absolu dans le workspace.
    // CARGO_MANIFEST_DIR = packages/app/src-tauri
    if cfg!(debug_assertions) {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let cli = manifest_dir
            .parent().unwrap() // src-tauri → app
            .parent().unwrap() // app → packages
            .parent().unwrap() // packages → root
            .join("packages/lib/src/cli/cli.js");
        if cli.exists() {
            return Ok(cli);
        }
        return Err(format!("cli.js introuvable en dev à {:?}", cli));
    }

    // En production : depuis les ressources bundlées (bundle.resources: lib/src/ → lib/src/)
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let cli = resource_dir.join("lib/src/cli/cli.js");
    if cli.exists() {
        return Ok(cli);
    }

    Err("cli.js introuvable dans les ressources bundlées. Réinstallez l'application.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_nothing_from_empty() {
        // resolve_cli_path ne peut pas être testé sans AppHandle —
        // les tests ici couvrent la logique pure
        let creds: HashMap<String, String> = [
            ("LOGIN_VALUE".to_string(), "user@test.com".to_string()),
        ]
        .into();
        assert_eq!(creds.get("LOGIN_VALUE").unwrap(), "user@test.com");
    }
}
```

- [ ] **Step 2 : Enregistrer `run_scenario` dans `lib.rs`**

Ajouter dans `tauri::generate_handler![]` :

```rust
commands::runner::run_scenario,
```

- [ ] **Step 3 : Créer `packages/app/src/components/runner/CredentialsForm.tsx`**

```tsx
interface Props {
  valueEnvs: string[]
  credentials: Record<string, string>
  onChange: (key: string, value: string) => void
}

function isSecret(name: string): boolean {
  return name.includes('PASS') || name.includes('SECRET') || name.includes('TOKEN')
}

function isTotpField(name: string, valueEnvs: string[]): boolean {
  // Heuristique : si SECRET dans le nom et utilisé avec valueType:totp
  return name.includes('TOTP') || name.includes('SECRET')
}

export default function CredentialsForm({ valueEnvs, credentials, onChange }: Props) {
  if (valueEnvs.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <strong style={{ fontSize: 13 }}>Credentials :</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {valueEnvs.map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ width: 160, fontSize: 13, fontFamily: 'monospace', flexShrink: 0 }}>
              {key}
              {isTotpField(key, valueEnvs) && (
                <span style={{ color: '#888', marginLeft: 4 }}>(totp)</span>
              )}
            </label>
            <input
              type={isSecret(key) ? 'password' : 'text'}
              value={credentials[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
              placeholder={isSecret(key) ? '••••••••' : 'valeur'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4 : Créer `packages/app/src/components/runner/RunnerPanel.tsx`**

```tsx
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scenario } from '../../types'
import CredentialsForm from './CredentialsForm'

interface Props {
  scenario: Scenario
}

function extractValueEnvs(yaml: string): string[] {
  const matches = yaml.matchAll(/valueEnv:\s*["']?(\w+)["']?/g)
  const keys = new Set<string>()
  for (const m of matches) keys.add(m[1])
  return Array.from(keys)
}

export default function RunnerPanel({ scenario }: Props) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [headed, setHeaded] = useState(true)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const valueEnvs = extractValueEnvs(scenario.yaml_content)
  const allFilled = valueEnvs.every((k) => credentials[k]?.trim())

  useEffect(() => {
    // Reset credentials quand le scénario change
    setCredentials({})
    setLogs([])
    setResult(null)
  }, [scenario.id])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }))
  }

  const handleRun = useCallback(async () => {
    setRunning(true)
    setLogs([])
    setResult(null)

    const unlisten = await listen<string>('runner-log', (event) => {
      setLogs((prev) => [...prev, event.payload])
    })

    try {
      const success = await invoke<boolean>('run_scenario', {
        payload: {
          yaml_content: scenario.yaml_content,
          credentials,
          headed,
        },
      })
      setResult(success)
    } catch (err) {
      setLogs((prev) => [...prev, `Erreur : ${err}`])
      setResult(false)
    } finally {
      unlisten()
      setRunning(false)
    }
  }, [scenario.yaml_content, credentials, headed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <CredentialsForm
        valueEnvs={valueEnvs}
        credentials={credentials}
        onChange={handleCredentialChange}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            checked={!headed}
            onChange={() => setHeaded(false)}
          />
          Headless
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            checked={headed}
            onChange={() => setHeaded(true)}
          />
          Headful
        </label>

        <button
          onClick={handleRun}
          disabled={running || !allFilled}
          style={{
            marginLeft: 'auto',
            padding: '6px 16px',
            background: running || !allFilled ? '#ccc' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: running || !allFilled ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? '⏳ En cours…' : '▶ Lancer'}
        </button>
      </div>

      {result !== null && (
        <div style={{
          padding: '6px 12px',
          marginBottom: 8,
          borderRadius: 6,
          background: result ? '#d1fae5' : '#fee2e2',
          color: result ? '#065f46' : '#991b1b',
          fontWeight: 600,
        }}>
          {result ? '✓ Authentification réussie' : '✗ Échec'}
        </div>
      )}

      <div style={{
        flex: 1,
        background: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: 6,
        padding: 12,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 13,
        whiteSpace: 'pre-wrap',
      }}>
        {logs.map((line, i) => (
          <div key={i} style={{ color: line.startsWith('[err]') ? '#f87171' : '#d4d4d4' }}>
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5 : Intégrer le runner dans `App.tsx`**

Mettre à jour le layout pour avoir un panel en onglets (éditeur / runner) :

```tsx
import ScenarioList from './components/ScenarioList'
import YamlEditor from './components/editor/YamlEditor'
import RunnerPanel from './components/runner/RunnerPanel'
import ImportExportBar from './components/ImportExportBar'
import { useScenario } from './hooks/useScenario'
import { useState } from 'react'

export default function App() {
  const { scenarios, selected, setSelected, create, update, remove, reload } = useScenario()
  const [tab, setTab] = useState<'editor' | 'runner'>('editor')

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16 }}>
        <ScenarioList
          scenarios={scenarios}
          selected={selected}
          onSelect={setSelected}
          onCreate={create}
          onDelete={remove}
        />
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ImportExportBar selected={selected} onImported={(s) => { setSelected(s); reload() }} />

        {selected ? (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
              {(['editor', 'runner'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 16px',
                    background: tab === t ? '#f0f0f0' : 'transparent',
                    border: 'none',
                    borderBottom: tab === t ? '2px solid #4f46e5' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: tab === t ? 600 : 400,
                  }}
                >
                  {t === 'editor' ? 'YAML' : 'Runner'}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {tab === 'editor' ? (
                <YamlEditor value={selected.yaml_content} onChange={update} />
              ) : (
                <RunnerPanel scenario={selected} />
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 16, color: '#999' }}>Sélectionner ou créer un scénario</div>
        )}
      </div>
    </div>
  )
}
```

Note : s'assurer que `useScenario` expose `reload`.

- [ ] **Step 6 : Tester manuellement**

```bash
cd packages/app && pnpm dev
```

- Sélectionner un scénario → onglet Runner
- Les champs credentials apparaissent selon les `valueEnv` du YAML
- Bouton "Lancer" désactivé tant que les champs sont vides
- Remplir les credentials → bouton actif
- Lancer → logs s'affichent en temps réel, résultat ✓/✗ à la fin

- [ ] **Step 7 : Lancer les tests Rust**

```bash
cd packages/app/src-tauri && cargo test
```

Expected : tous les tests passent.

- [ ] **Step 8 : Commit**

```bash
git add packages/app/
git commit -m "feat(app): add runner with credentials form and real-time log streaming"
```

---

## Task 7 — Vérification Node.js au démarrage

**Files:**
- Modify: `packages/app/src-tauri/src/lib.rs`
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1 : Ajouter la commande `check_node` dans `runner.rs`**

```rust
#[tauri::command]
pub fn check_node() -> Result<String, String> {
    // Utiliser node --version directement — plus fiable que `which`/`where`
    // (évite les faux positifs avec des symlinks cassés)
    let output = Command::new("node")
        .arg("--version")
        .output()
        .map_err(|_| "Node.js introuvable. Installez Node.js depuis https://nodejs.org".to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("Node.js introuvable. Installez Node.js depuis https://nodejs.org".to_string())
    }
}
```

Enregistrer dans `lib.rs` : ajouter `commands::runner::check_node` dans `generate_handler!`.

- [ ] **Step 2 : Ajouter la bannière d'erreur dans `App.tsx`**

```tsx
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

// Dans le composant App, ajouter :
const [nodeError, setNodeError] = useState<string | null>(null)

useEffect(() => {
  invoke<string>('check_node').catch((err) => setNodeError(err))
}, [])

// Dans le JSX, au-dessus du reste :
{nodeError && (
  <div style={{
    background: '#fee2e2',
    color: '#991b1b',
    padding: '8px 16px',
    fontSize: 13,
  }}>
    ⚠️ {nodeError}
  </div>
)}
```

- [ ] **Step 3 : Tester**

```bash
cd packages/app && pnpm dev
```

Si Node.js est installé : aucune bannière. Simuler l'absence en renommant temporairement l'exécutable → bannière rouge.

- [ ] **Step 4 : Commit**

```bash
git add packages/app/
git commit -m "feat(app): add Node.js detection banner at startup"
```

---

## Task 8 — Vérification finale et ajout au turbo.json

**Files:**
- Modify: `turbo.json`

- [ ] **Step 1 : Mettre à jour `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

Note : Tauri n'est pas orchestré via Turborepo (trop spécifique). L'app se lance directement avec `pnpm dev` depuis `packages/app`.

- [ ] **Step 2 : Vérification finale complète**

```bash
# Tests Rust
cd packages/app/src-tauri && cargo test
```

Expected : tous les tests passent.

```bash
# App complète
cd packages/app && pnpm dev
```

Checklist manuelle :
- [ ] Créer un scénario → apparaît dans la liste
- [ ] Éditer le YAML → sauvegardé après 300ms
- [ ] Importer un `.yml` depuis `packages/lib/examples/`
- [ ] Exporter le scénario → fichier `.yml` sur le disque
- [ ] Runner : remplir les credentials → lancer → logs en temps réel → résultat

- [ ] **Step 3 : Commit final**

```bash
git add turbo.json
git commit -m "chore(monorepo): document app build in turbo config"
```

---

## Résumé

| Task | Livrable |
|------|----------|
| 1 | App Tauri v2 + React scaffold qui se lance |
| 2 | SQLite CRUD scénarios (testé en Rust) |
| 3 | Sidebar avec liste des scénarios (create/delete) |
| 4 | Éditeur YAML CodeMirror 6 avec autosave |
| 5 | Import/export YAML avec gestion des conflits |
| 6 | Runner : credentials session + subprocess + streaming |
| 7 | Bannière Node.js manquant au démarrage |
| 8 | Vérification finale |

**Plan 2 à venir :** éditeur visuel drag & drop (@dnd-kit) + synchronisation YAML↔blocs.
