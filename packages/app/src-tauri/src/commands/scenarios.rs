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
