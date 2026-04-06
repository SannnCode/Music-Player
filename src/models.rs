use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Song {
    pub id: u64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: u64,
    pub filename: String,
    pub picture: Option<String>,
    pub lyrics: Option<String>,
    pub genre: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SongMetadata {
    pub picture: Option<String>,
    pub lyrics: Option<String>,
    pub custom_title: Option<String>,
    pub custom_artist: Option<String>,
    pub genre: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Database {
    /// Map from filename to metadata (lyrics, picture)
    pub songs: HashMap<String, SongMetadata>,
    /// List of available genres
    #[serde(default)]
    pub genres: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Background {
    pub name: String,
    #[serde(rename = "type")]
    pub bg_type: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct LyricsUpdate {
    pub lyrics: String,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SongUpdate {
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub genre: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenreInput {
    pub name: String,
}
