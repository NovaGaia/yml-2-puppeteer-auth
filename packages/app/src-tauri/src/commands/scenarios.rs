use crate::models::{CreateScenarioPayload, Scenario, UpdateScenarioPayload};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const SELECT_ALL: &str =
    "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios ORDER BY updated_at DESC";
const SELECT_BY_ID: &str =
    "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE id = ?";
const SELECT_BY_NAME: &str =
    "SELECT id, name, yaml_content, created_at, updated_at FROM scenarios WHERE name = ?";

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

async fn db_insert_scenario(
    pool: &SqlitePool,
    name: String,
    yaml_content: String,
) -> Result<Scenario, String> {
    let now = now_ms();
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO scenarios (id, name, yaml_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&yaml_content)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Scenario { id, name, yaml_content, created_at: now, updated_at: now })
}

async fn db_update_scenario(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    yaml_content: &str,
) -> Result<(), String> {
    let now = now_ms();

    sqlx::query("UPDATE scenarios SET name = ?, yaml_content = ?, updated_at = ? WHERE id = ?")
        .bind(name)
        .bind(yaml_content)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn list_scenarios(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<Scenario>, String> {
    sqlx::query_as::<_, Scenario>(SELECT_ALL)
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scenario(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<Scenario>, String> {
    sqlx::query_as::<_, Scenario>(SELECT_BY_ID)
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
    db_insert_scenario(pool.inner(), payload.name, payload.yaml_content).await
}

#[tauri::command]
pub async fn update_scenario(
    payload: UpdateScenarioPayload,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    db_update_scenario(pool.inner(), &payload.id, &payload.name, &payload.yaml_content).await
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

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub name: String,
    pub content: String,
    pub existing_id: Option<String>,
}

#[tauri::command]
pub async fn import_yaml(
    file_path: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<ImportResult, String> {
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let name = extract_yaml_name(&content).unwrap_or_else(|| "Scénario importé".to_string());

    let existing: Option<Scenario> = sqlx::query_as(SELECT_BY_NAME)
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

#[tauri::command]
pub async fn confirm_import(
    name: String,
    yaml_content: String,
    replace_id: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Scenario, String> {
    if let Some(id) = replace_id {
        db_update_scenario(pool.inner(), &id, &name, &yaml_content).await?;
        return sqlx::query_as::<_, Scenario>(SELECT_BY_ID)
            .bind(&id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| e.to_string());
    }

    let unique_name = find_unique_name(&name, pool.inner()).await?;
    db_insert_scenario(pool.inner(), unique_name, yaml_content).await
}

#[tauri::command]
pub async fn export_yaml(
    file_path: String,
    yaml_content: String,
) -> Result<(), String> {
    std::fs::write(&file_path, yaml_content).map_err(|e| e.to_string())
}

fn extract_yaml_name(yaml: &str) -> Option<String> {
    let parsed: serde_yaml::Value = serde_yaml::from_str(yaml).ok()?;
    parsed["name"].as_str().map(|s| s.to_string())
}

async fn find_unique_name(base: &str, pool: &SqlitePool) -> Result<String, String> {
    // Fetch all potentially conflicting names in one query
    let existing: Vec<(String,)> =
        sqlx::query_as("SELECT name FROM scenarios WHERE name = ? OR name LIKE ?")
            .bind(base)
            .bind(format!("{}_%", base))
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    if existing.is_empty() {
        return Ok(base.to_string());
    }

    let names: std::collections::HashSet<String> = existing.into_iter().map(|(n,)| n).collect();
    if !names.contains(base) {
        return Ok(base.to_string());
    }

    for i in 2..=100 {
        let candidate = format!("{}_{}", base, i);
        if !names.contains(&candidate) {
            return Ok(candidate);
        }
    }

    Err("impossible de trouver un nom unique".to_string())
}

#[cfg(test)]
mod tests {
    use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
    use crate::models::Scenario;

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
