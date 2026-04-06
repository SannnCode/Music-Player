use std::fs;
use std::path::Path;
use std::sync::RwLock;

use crate::models::{Database, Song, SongMetadata};

const DB_FILE: &str = "data.json";

pub struct JsonDatabase {
    data: RwLock<Database>,
}

impl JsonDatabase {
    pub fn new() -> Self {
        let data = if Path::new(DB_FILE).exists() {
            let content = fs::read_to_string(DB_FILE).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Database::default()
        };

        println!("📦 Database initialized");

        JsonDatabase {
            data: RwLock::new(data),
        }
    }

    fn save(&self) {
        let data = self.data.read().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = fs::write(DB_FILE, json);
        }
    }

    pub fn scan_music_folder(&self, music_dir: &str, covers_dir: &str) -> Vec<Song> {
        // Ensure directories exist
        fs::create_dir_all(music_dir).ok();
        fs::create_dir_all(covers_dir).ok();

        let files: Vec<String> = fs::read_dir(music_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| {
                        let name = e.file_name().to_string_lossy().to_lowercase();
                        name.ends_with(".mp3") || name.ends_with(".webm")
                    })
                    .map(|e| e.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();

        if files.is_empty() {
            println!("📂 No music files found in music folder");
            return vec![];
        }

        println!("🎵 Found {} music file(s)", files.len());

        let data = self.data.read().unwrap();

        files
            .into_iter()
            .enumerate()
            .map(|(idx, filename)| {
                let (default_title, default_artist) = parse_filename(&filename);
                let metadata = data.songs.get(&filename).cloned().unwrap_or_default();

                Song {
                    id: (idx + 1) as u64,
                    title: metadata.custom_title.unwrap_or(default_title),
                    artist: metadata.custom_artist.unwrap_or(default_artist),
                    album: "Unknown Album".to_string(),
                    duration: 0,
                    filename,
                    picture: metadata.picture,
                    lyrics: metadata.lyrics,
                    genre: metadata.genre,
                }
            })
            .collect()
    }

    pub fn update_picture(&self, filename: &str, path: &str) {
        let mut data = self.data.write().unwrap();
        let metadata = data.songs.entry(filename.to_string()).or_default();
        metadata.picture = Some(path.to_string());
        drop(data);
        self.save();
    }

    pub fn update_lyrics(&self, filename: &str, lyrics: &str) {
        let mut data = self.data.write().unwrap();
        let metadata = data.songs.entry(filename.to_string()).or_default();
        metadata.lyrics = Some(lyrics.to_string());
        drop(data);
        self.save();
    }

    #[allow(dead_code)]
    pub fn get_metadata(&self, filename: &str) -> Option<SongMetadata> {
        let data = self.data.read().unwrap();
        data.songs.get(filename).cloned()
    }

    pub fn update_song_info(&self, filename: &str, title: &str, artist: &str, genre: Option<&str>) {
        let mut data = self.data.write().unwrap();
        let metadata = data.songs.entry(filename.to_string()).or_default();
        metadata.custom_title = Some(title.to_string());
        metadata.custom_artist = Some(artist.to_string());
        metadata.genre = genre.map(|g| g.to_string());
        drop(data);
        self.save();
    }

    // Genre list management
    pub fn get_genres(&self) -> Vec<String> {
        let data = self.data.read().unwrap();
        data.genres.clone()
    }

    pub fn add_genre(&self, name: &str) -> bool {
        let mut data = self.data.write().unwrap();
        let name = name.trim().to_string();
        if name.is_empty() || data.genres.contains(&name) {
            return false;
        }
        data.genres.push(name);
        data.genres.sort();
        drop(data);
        self.save();
        true
    }

    pub fn remove_genre(&self, name: &str) -> bool {
        let mut data = self.data.write().unwrap();
        let initial_len = data.genres.len();
        data.genres.retain(|g| g != name);
        let removed = data.genres.len() < initial_len;
        if removed {
            drop(data);
            self.save();
        }
        removed
    }
}

fn parse_filename(filename: &str) -> (String, String) {
    let name_without_ext = filename
        .trim_end_matches(".mp3")
        .trim_end_matches(".MP3")
        .trim_end_matches(".webm")
        .trim_end_matches(".WEBM");

    if let Some(idx) = name_without_ext.find(" - ") {
        let artist = name_without_ext[..idx].trim().to_string();
        let title = name_without_ext[idx + 3..].trim().to_string();
        (title, artist)
    } else {
        (name_without_ext.trim().to_string(), "Unknown Artist".to_string())
    }
}
