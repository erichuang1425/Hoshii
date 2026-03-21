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
            commands::thumbnails::generate_thumbnail,
            commands::thumbnails::evict_thumbnail_cache,
            commands::thumbnails::get_thumbnail_cache_size,
            commands::media_probe::probe_media,
            commands::video_remux::remux_video,
            commands::video_remux::convert_animated_avif,
            commands::check_ffmpeg::check_ffmpeg,
            commands::smart_groups::get_smart_groups,
            commands::smart_groups::get_smart_groups_for_root,
            commands::chrono_groups::get_chronological_groups,
            commands::chrono_groups::get_gallery_timeline,
            commands::tags::get_all_tags,
            commands::favorites::get_favorite_galleries,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::root_folders::get_root_folders,
            commands::root_folders::add_root_folder,
            commands::root_folders::remove_root_folder,
            commands::gallery_ops::toggle_favorite,
            commands::gallery_ops::update_reading_progress,
            commands::gallery_ops::get_recent_galleries,
            commands::gallery_ops::search_galleries,
            commands::tag_ops::get_gallery_tags,
            commands::tag_ops::add_tag,
            commands::tag_ops::remove_tag,
            commands::tag_ops::search_by_tags,
            commands::file_ops::get_unorganized_files,
            commands::file_ops::move_files_to_gallery,
            commands::file_ops::create_gallery_folder,
            commands::zip_ops::verify_zip_integrity,
            commands::zip_ops::restore_from_zip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hoshii");
}
