use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

const NODE_NOT_FOUND: &str =
    "Node.js introuvable. Installez Node.js depuis https://nodejs.org";

fn find_node() -> Option<std::path::PathBuf> {
    // 1. Chercher dans le PATH courant
    if let Ok(output) = Command::new("which").arg("node").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(std::path::PathBuf::from(path));
            }
        }
    }

    // 2. Emplacements standards (Homebrew, pkg installer, NVM, Volta, fnm, asdf)
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        "/usr/local/bin/node".to_string(),
        "/opt/homebrew/bin/node".to_string(),
        "/usr/bin/node".to_string(),
        format!("{}/.volta/bin/node", home),
        format!("{}/.fnm/aliases/default/bin/node", home),
    ];

    for path in &candidates {
        let p = std::path::Path::new(path);
        if p.exists() {
            return Some(p.to_path_buf());
        }
    }

    // 3. NVM : chercher la version active dans ~/.nvm/alias/default
    let nvm_alias = format!("{}/.nvm/alias/default", home);
    if let Ok(version) = std::fs::read_to_string(&nvm_alias) {
        let version = version.trim();
        let node = format!("{}/.nvm/versions/node/{}/bin/node", home, version);
        let p = std::path::Path::new(&node);
        if p.exists() {
            return Some(p.to_path_buf());
        }
    }

    // 4. NVM : prendre la version la plus récente disponible
    let nvm_versions = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_versions) {
        let mut versions: Vec<_> = entries.flatten().collect();
        versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
        for entry in versions {
            let node = entry.path().join("bin/node");
            if node.exists() {
                return Some(node);
            }
        }
    }

    None
}

#[derive(Debug, serde::Deserialize)]
pub struct RunPayload {
    // Design note: we pass yaml_content directly (not scenario_id) so that
    // unsaved edits (within the 300ms debounce window) are included in the run.
    pub yaml_content: String,
    pub credentials: HashMap<String, String>,
    pub headed: bool,
}

#[tauri::command]
pub async fn run_scenario(
    payload: RunPayload,
    app: AppHandle,
) -> Result<bool, String> {
    let cli_path = resolve_cli_path(&app)?;

    let tmp_path = std::env::temp_dir().join(format!("yml-2-puppeteer-auth-{}.yml", Uuid::new_v4()));
    std::fs::write(&tmp_path, &payload.yaml_content).map_err(|e| e.to_string())?;

    let node = find_node().ok_or_else(|| NODE_NOT_FOUND.to_string())?;
    let mut cmd = Command::new(&node);
    cmd.arg(&cli_path)
        .arg("test")
        .arg(tmp_path.to_str().unwrap())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if payload.headed {
        cmd.arg("--headed");
    }

    // Add credentials on top of existing env (do NOT env_clear — needed for PATH, DISPLAY, etc.)
    for (key, value) in &payload.credentials {
        cmd.env(key, value);
    }

    let mut child = cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            NODE_NOT_FOUND.to_string()
        } else {
            e.to_string()
        }
    })?;

    let app_stdout = app.clone();
    let stdout = child.stdout.take().unwrap();
    let stdout_thread = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            let _ = app_stdout.emit("runner-log", &line);
        }
    });

    let app_stderr = app.clone();
    let stderr = child.stderr.take().unwrap();
    let stderr_thread = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            let _ = app_stderr.emit("runner-log", format!("[err] {}", line));
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    let _ = stdout_thread.join();
    let _ = stderr_thread.join();

    let _ = std::fs::remove_file(&tmp_path);

    Ok(status.success())
}

#[tauri::command]
pub fn check_node() -> Result<String, String> {
    let node = find_node().ok_or_else(|| NODE_NOT_FOUND.to_string())?;
    let output = Command::new(&node)
        .arg("--version")
        .output()
        .map_err(|_| NODE_NOT_FOUND.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(NODE_NOT_FOUND.to_string())
    }
}

fn resolve_cli_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    // In development (debug build): resolve from workspace root via CARGO_MANIFEST_DIR
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
        return Err(format!("cli.js not found in dev at {:?}", cli));
    }

    // In production: from bundled resources (cli.bundle.cjs — all deps inlined)
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let cli = resource_dir.join("cli.bundle.cjs");
    if cli.exists() {
        return Ok(cli);
    }

    Err("cli.bundle.cjs not found in bundled resources. Please reinstall the application.".to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_credentials_map() {
        let mut creds = std::collections::HashMap::new();
        creds.insert("LOGIN_VALUE".to_string(), "user@test.com".to_string());
        assert_eq!(creds.get("LOGIN_VALUE").unwrap(), "user@test.com");
    }
}
