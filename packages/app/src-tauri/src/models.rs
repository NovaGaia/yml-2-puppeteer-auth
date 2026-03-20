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
