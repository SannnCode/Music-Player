mod db;
mod handlers;
mod models;

use actix_files::Files;
use actix_web::{web, App, HttpServer, middleware};
use db::JsonDatabase;
use handlers::AppState;
use std::sync::RwLock;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);

    // Initialize database
    let db = JsonDatabase::new();
    
    // Scan music folder and get songs
    let songs = db.scan_music_folder("server/music", "public/assets/covers");

    // Create shared state
    let app_state = web::Data::new(AppState {
        db,
        songs: RwLock::new(songs),
    });

    println!("🎵 Anime Music Player running at http://localhost:{}", port);

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            // Enable logger
            .wrap(middleware::Logger::default())
            // API routes
            .route("/api/songs", web::get().to(handlers::get_songs))
            .route("/api/songs/{id}", web::get().to(handlers::get_song))
            .route("/api/songs/{id}", web::put().to(handlers::update_song))
            .route("/api/backgrounds", web::get().to(handlers::get_backgrounds))
            .route("/api/upload/{id}", web::post().to(handlers::upload_cover))
            .route("/api/lyrics/{id}", web::post().to(handlers::update_lyrics))
            .route("/api/upload-song", web::post().to(handlers::upload_song))
            .route("/api/upload-background", web::post().to(handlers::upload_background))
            // Genre API
            .route("/api/genres", web::get().to(handlers::get_genres))
            .route("/api/genres", web::post().to(handlers::add_genre))
            .route("/api/genres/{name}", web::delete().to(handlers::delete_genre))
            // Serve music files
            .service(Files::new("/music", "server/music").show_files_listing())
            // Serve static files (public folder)
            .service(Files::new("/", "public").index_file("index.html"))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
