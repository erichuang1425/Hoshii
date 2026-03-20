// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod services;

use std::sync::Mutex;
use tauri::Manager;

fn main() {
    env_logger::init();

    log::info!("Starting Hoshii application");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .map_err(|e| {
                    log::error!("Failed to resolve app local data dir: {}", e);
                    e
                })?;

            log::info!("App data directory: {}", app_data_dir.display());

            let conn = db::init_db(&app_data_dir).map_err(|e| {
                log::error!("Failed to initialize database: {}", e);
                e.to_string()
            })?;

            app.manage(db::AppDatabase {
                conn: Mutex::new(conn),
            });

            log::info!("Database initialized and managed by Tauri");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::volumes::detect_volumes,
            commands::volumes::get_volumes,
            commands::volumes::refresh_volume_status,
            commands::scan_roots::scan_root_folder,
            commands::scan_gallery::scan_gallery,
            commands::scan_gallery::get_gallery_media,
            commands::scan_gallery::get_media_groups,
            commands::scan_gallery::get_artists,
            commands::scan_gallery::get_galleries,
            commands::incremental_scan::incremental_scan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hoshii");
}
