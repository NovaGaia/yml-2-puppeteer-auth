use tauri::Manager;

mod commands;
mod db;
mod models;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
            commands::scenarios::import_yaml,
            commands::scenarios::confirm_import,
            commands::scenarios::export_yaml,
            commands::runner::run_scenario,
            commands::runner::check_node,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
