use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Result};
use futures_util::StreamExt;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::RwLock;

use crate::db::JsonDatabase;
use crate::models::{ApiResponse, Background, GenreInput, LyricsUpdate, Song, SongUpdate};

pub struct AppState {
    pub db: JsonDatabase,
    pub songs: RwLock<Vec<Song>>,
}

// GET /api/songs
pub async fn get_songs(state: web::Data<AppState>) -> Result<HttpResponse> {
    let songs = state.songs.read().unwrap();
    Ok(HttpResponse::Ok().json(&*songs))
}

// GET /api/songs/{id}
pub async fn get_song(state: web::Data<AppState>, path: web::Path<u64>) -> Result<HttpResponse> {
    let id = path.into_inner();
    let songs = state.songs.read().unwrap();
    
    match songs.iter().find(|s| s.id == id) {
        Some(song) => Ok(HttpResponse::Ok().json(song)),
        None => Ok(HttpResponse::NotFound().json(ApiResponse {
            success: false,
            path: None,
            error: Some("Song not found".to_string()),
        })),
    }
}

// GET /api/backgrounds
pub async fn get_backgrounds() -> Result<HttpResponse> {
    let backgrounds_dir = Path::new("public/assets/backgrounds");

    if !backgrounds_dir.exists() {
        return Ok(HttpResponse::Ok().json(Vec::<Background>::new()));
    }

    let backgrounds: Vec<Background> = fs::read_dir(backgrounds_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_lowercase();
                    name.ends_with(".mp4")
                        || name.ends_with(".webm")
                        || name.ends_with(".jpg")
                        || name.ends_with(".jpeg")
                        || name.ends_with(".png")
                        || name.ends_with(".gif")
                })
                .map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    let bg_type = if name.to_lowercase().ends_with(".mp4")
                        || name.to_lowercase().ends_with(".webm")
                    {
                        "video".to_string()
                    } else {
                        "image".to_string()
                    };
                    Background {
                        url: format!("/assets/backgrounds/{}", name),
                        name,
                        bg_type,
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(HttpResponse::Ok().json(backgrounds))
}

// POST /api/upload/{id}
pub async fn upload_cover(
    state: web::Data<AppState>,
    path: web::Path<u64>,
    mut payload: Multipart,
) -> Result<HttpResponse> {
    let song_id = path.into_inner();
    let covers_dir = Path::new("public/assets/covers");
    fs::create_dir_all(covers_dir).ok();

    // Find song filename by id
    let filename = {
        let songs = state.songs.read().unwrap();
        songs.iter().find(|s| s.id == song_id).map(|s| s.filename.clone())
    };

    let song_filename = match filename {
        Some(f) => f,
        None => {
            return Ok(HttpResponse::NotFound().json(ApiResponse {
                success: false,
                path: None,
                error: Some("Song not found".to_string()),
            }));
        }
    };

    while let Some(field) = payload.next().await {
        let mut field = match field {
            Ok(f) => f,
            Err(_) => continue,
        };

        let content_disposition = field.content_disposition();
        let orig_filename = content_disposition
            .get_filename()
            .map(|f| f.to_string())
            .unwrap_or_else(|| "cover.jpg".to_string());

        // Generate unique filename
        let unique_name = format!("cover-{}-{}", timestamp(), orig_filename);
        let filepath = covers_dir.join(&unique_name);
        let relative_path = format!("/assets/covers/{}", unique_name);

        let mut file = match fs::File::create(&filepath) {
            Ok(f) => f,
            Err(_) => {
                return Ok(HttpResponse::InternalServerError().json(ApiResponse {
                    success: false,
                    path: None,
                    error: Some("Failed to create file".to_string()),
                }));
            }
        };

        while let Some(chunk) = field.next().await {
            let data = chunk.unwrap();
            file.write_all(&data).ok();
        }

        // Update database
        state.db.update_picture(&song_filename, &relative_path);
        
        // Update in-memory songs
        {
            let mut songs = state.songs.write().unwrap();
            if let Some(song) = songs.iter_mut().find(|s| s.id == song_id) {
                song.picture = Some(relative_path.clone());
            }
        }

        return Ok(HttpResponse::Ok().json(ApiResponse {
            success: true,
            path: Some(relative_path),
            error: None,
        }));
    }

    Ok(HttpResponse::BadRequest().json(ApiResponse {
        success: false,
        path: None,
        error: Some("No file uploaded".to_string()),
    }))
}

// POST /api/lyrics/{id}
pub async fn update_lyrics(
    state: web::Data<AppState>,
    path: web::Path<u64>,
    body: web::Json<LyricsUpdate>,
) -> Result<HttpResponse> {
    let song_id = path.into_inner();

    // Find song filename by id
    let filename = {
        let songs = state.songs.read().unwrap();
        songs.iter().find(|s| s.id == song_id).map(|s| s.filename.clone())
    };

    let song_filename = match filename {
        Some(f) => f,
        None => {
            return Ok(HttpResponse::NotFound().json(ApiResponse {
                success: false,
                path: None,
                error: Some("Song not found".to_string()),
            }));
        }
    };

    // Update database
    state.db.update_lyrics(&song_filename, &body.lyrics);

    // Update in-memory songs
    {
        let mut songs = state.songs.write().unwrap();
        if let Some(song) = songs.iter_mut().find(|s| s.id == song_id) {
            song.lyrics = Some(body.lyrics.clone());
        }
    }

    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        path: None,
        error: None,
    }))
}

fn timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

// POST /api/upload-song
pub async fn upload_song(
    state: web::Data<AppState>,
    mut payload: Multipart,
) -> Result<HttpResponse> {
    let music_dir = Path::new("server/music");
    fs::create_dir_all(music_dir).ok();

    while let Some(item) = payload.next().await {
        let mut field = item?;
        let content_disposition = field.content_disposition();
        
        if let Some(original_name) = content_disposition.get_filename() {
            let lower_name = original_name.to_lowercase();
            
            // Validate file extension
            if !lower_name.ends_with(".mp3") && !lower_name.ends_with(".webm") {
                return Ok(HttpResponse::BadRequest().json(ApiResponse {
                    success: false,
                    path: None,
                    error: Some("Only MP3 and WebM files are allowed".to_string()),
                }));
            }
            
            // Generate unique filename to avoid conflicts
            let safe_name = original_name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
            let final_name = format!("{}_{}", timestamp(), safe_name);
            let file_path = music_dir.join(&final_name);
            
            // Save file
            let mut file = fs::File::create(&file_path)?;
            while let Some(chunk) = field.next().await {
                let data = chunk?;
                use std::io::Write;
                file.write_all(&data)?;
            }
            
            // Rescan music folder to include new song
            let songs = state.db.scan_music_folder("server/music", "public/assets/covers");
            
            // Update state
            let mut songs_state = state.songs.write().unwrap();
            *songs_state = songs;
            
            return Ok(HttpResponse::Ok().json(ApiResponse {
                success: true,
                path: Some(format!("/music/{}", final_name)),
                error: None,
            }));
        }
    }

    Ok(HttpResponse::BadRequest().json(ApiResponse {
        success: false,
        path: None,
        error: Some("No file uploaded".to_string()),
    }))
}

// POST /api/upload-background
pub async fn upload_background(
    mut payload: Multipart,
) -> Result<HttpResponse> {
    let backgrounds_dir = Path::new("public/assets/backgrounds");
    fs::create_dir_all(backgrounds_dir).ok();

    while let Some(item) = payload.next().await {
        let mut field = item?;
        let content_disposition = field.content_disposition();
        
        if let Some(original_name) = content_disposition.get_filename() {
            let lower_name = original_name.to_lowercase();
            
            // Validate file extension
            if !lower_name.ends_with(".jpg") 
                && !lower_name.ends_with(".jpeg") 
                && !lower_name.ends_with(".png") 
                && !lower_name.ends_with(".gif")
                && !lower_name.ends_with(".mp4")
                && !lower_name.ends_with(".webm") 
            {
                return Ok(HttpResponse::BadRequest().json(ApiResponse {
                    success: false,
                    path: None,
                    error: Some("Only images (JPG, PNG, GIF) and videos (MP4, WebM) are allowed".to_string()),
                }));
            }
            
            // Generate unique filename
            let safe_name = original_name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
            let final_name = format!("{}_{}", timestamp(), safe_name);
            let file_path = backgrounds_dir.join(&final_name);
            
            // Save file
            let mut file = fs::File::create(&file_path)?;
            while let Some(chunk) = field.next().await {
                let data = chunk?;
                use std::io::Write;
                file.write_all(&data)?;
            }
            
            return Ok(HttpResponse::Ok().json(ApiResponse {
                success: true,
                path: Some(format!("/assets/backgrounds/{}", final_name)),
                error: None,
            }));
        }
    }

    Ok(HttpResponse::BadRequest().json(ApiResponse {
        success: false,
        path: None,
        error: Some("No file uploaded".to_string()),
    }))
}

// PUT /api/songs/{id}
pub async fn update_song(
    state: web::Data<AppState>,
    path: web::Path<u64>,
    body: web::Json<SongUpdate>,
) -> Result<HttpResponse> {
    let song_id = path.into_inner();

    // Find song filename by id
    let filename = {
        let songs = state.songs.read().unwrap();
        songs.iter().find(|s| s.id == song_id).map(|s| s.filename.clone())
    };

    let song_filename = match filename {
        Some(f) => f,
        None => {
            return Ok(HttpResponse::NotFound().json(ApiResponse {
                success: false,
                path: None,
                error: Some("Song not found".to_string()),
            }));
        }
    };

    // Update database
    state.db.update_song_info(&song_filename, &body.title, &body.artist, body.genre.as_deref());

    // Update in-memory songs
    {
        let mut songs = state.songs.write().unwrap();
        if let Some(song) = songs.iter_mut().find(|s| s.id == song_id) {
            song.title = body.title.clone();
            song.artist = body.artist.clone();
            song.genre = body.genre.clone();
        }
    }

    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        path: None,
        error: None,
    }))
}

// GET /api/genres
pub async fn get_genres(state: web::Data<AppState>) -> Result<HttpResponse> {
    let genres = state.db.get_genres();
    Ok(HttpResponse::Ok().json(genres))
}

// POST /api/genres
pub async fn add_genre(
    state: web::Data<AppState>,
    body: web::Json<GenreInput>,
) -> Result<HttpResponse> {
    let success = state.db.add_genre(&body.name);
    Ok(HttpResponse::Ok().json(ApiResponse {
        success,
        path: None,
        error: if success { None } else { Some("Genre already exists or invalid".to_string()) },
    }))
}

// DELETE /api/genres/{name}
pub async fn delete_genre(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let name = path.into_inner();
    let success = state.db.remove_genre(&name);
    Ok(HttpResponse::Ok().json(ApiResponse {
        success,
        path: None,
        error: if success { None } else { Some("Genre not found".to_string()) },
    }))
}
