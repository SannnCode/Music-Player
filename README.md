# 🎵 Anime Music Player

Aplikasi web pemutar musik bertema anime dengan tampilan modern glassmorphism. Dibangun menggunakan **Rust (Actix-web)** sebagai backend dan **HTML/CSS/JavaScript** sebagai frontend.

> Dibuat oleh **SannnCode**

---

## ✨ Fitur Utama

- 🎨 **UI Glassmorphism** — Tampilan modern dengan efek kaca transparan
- 🎵 **Auto-scan Musik** — Otomatis memindai folder musik untuk file MP3/WebM
- 📝 **Lirik Lagu** — Dukungan lirik yang bisa ditambahkan dan diedit langsung
- 🖼️ **Album Art Custom** — Upload cover/album art untuk setiap lagu
- 🎬 **Background Dinamis** — Pilih background video (MP4/WebM) atau gambar (JPG/PNG/GIF)
- 🔀 **Shuffle & Repeat** — Mode shuffle acak dan repeat (semua/satu lagu)
- 🏷️ **Manajemen Genre** — Tambah, hapus, dan filter lagu berdasarkan genre
- ⬆️ **Upload via Browser** — Upload lagu dan background langsung dari browser
- ⌨️ **Keyboard Shortcuts** — Kontrol cepat lewat keyboard
- 💾 **Persistent Data** — Metadata lagu tersimpan di file JSON

---

## 🛠️ Tech Stack

| Komponen   | Teknologi                            |
|------------|--------------------------------------|
| Frontend   | HTML, Tailwind CSS (CDN), JavaScript |
| Backend    | Rust (Actix-web 4)                   |
| Database   | JSON file (`data.json`)              |
| Font       | Google Fonts (Outfit)                |

### Dependencies (Cargo.toml)

| Crate             | Kegunaan                          |
|-------------------|-----------------------------------|
| `actix-web`       | Web framework                     |
| `actix-files`     | Serve file statis & musik         |
| `actix-multipart` | Handle upload file (multipart)    |
| `tokio`           | Async runtime                     |
| `serde`           | Serialization/deserialization     |
| `serde_json`      | JSON parsing                      |
| `futures-util`    | Utilitas async stream             |
| `uuid`            | Generate unique ID                |

---

## 📋 Prasyarat

- [Rust](https://rustup.rs/) terinstall (edisi 2021 atau lebih baru)

---

## 🚀 Cara Menjalankan

### 1. Clone / Download Project

```bash
git clone <repository-url>
cd anime-music-player
```

### 2. Build Project

```bash
cargo build --release
```

### 3. Jalankan Server

```bash
cargo run --release
```

Atau jalankan binary langsung:

```bash
./target/release/server.exe
```

### 4. Buka di Browser

Buka: **http://localhost:3000**

> 💡 Port default adalah `3000`. Bisa diubah dengan environment variable `PORT`:
> ```bash
> set PORT=8080
> cargo run --release
> ```

---

## 📂 Dimana Menaruh Lagu & Background?

### 🎵 Menaruh File Lagu

Taruh file musik kamu di folder:

```
📁 server/music/
```

**Format file yang didukung:**
- `.mp3`
- `.webm`

**Format penamaan file (rekomendasi):**

```
Artist - Judul Lagu.mp3
```

Contoh:
```
server/music/
├── YOASOBI - Idol.mp3
├── LiSA - Gurenge.mp3
├── Ado - New Genesis.webm
├── Unravel.mp3                  ← (tanpa artis, otomatis jadi "Unknown Artist")
```

> 📌 **Catatan:**
> - Jika nama file menggunakan format `Artist - Title.mp3`, maka artis dan judul akan otomatis di-parse
> - Jika tidak ada tanda ` - `, seluruh nama file akan menjadi judul dan artis menjadi "Unknown Artist"
> - Judul dan artis bisa diedit langsung dari UI web setelah lagu dimuat
> - Lagu juga bisa di-**upload langsung via browser** melalui tombol "Upload Lagu" di playlist

---

### 🖼️ Menaruh File Background

Taruh file background kamu di folder:

```
📁 public/assets/backgrounds/
```

**Format file yang didukung:**

| Tipe   | Format                |
|--------|-----------------------|
| Gambar | `.jpg`, `.jpeg`, `.png`, `.gif` |
| Video  | `.mp4`, `.webm`       |

Contoh:
```
public/assets/backgrounds/
├── sakura-night.mp4
├── anime-city.webm
├── aesthetic-sky.jpg
├── lofi-rain.gif
```

> 📌 **Catatan:**
> - Background video akan diputar otomatis, loop, dan tanpa suara (muted)
> - Background bisa dipilih/diganti melalui menu **⚙️ Pengaturan → Background**
> - Background juga bisa di-**upload langsung via browser** melalui tombol "Upload Background" di settings

---

### 🖼️ Cover / Album Art Lagu

Cover art lagu tersimpan otomatis di folder:

```
📁 public/assets/covers/
```

> ⚠️ Kamu **tidak perlu** menaruh file secara manual di sini. Cover art diupload langsung dari UI web dengan cara **hover di gambar album → klik "Upload Art"**.

---

## 📁 Struktur Project

```
anime-music-player/
│
├── 📁 src/                         # Source code Rust (Backend)
│   ├── main.rs                     # Entry point & routing server
│   ├── handlers.rs                 # API handlers (controller)
│   ├── models.rs                   # Struct/model data (Song, Background, dll)
│   └── db.rs                       # Database layer (JSON file-based)
│
├── 📁 public/                      # Frontend (disajikan sebagai static files)
│   ├── index.html                  # Halaman utama
│   ├── 📁 css/
│   │   └── style.css               # Custom CSS (glassmorphism, animasi, dll)
│   ├── 📁 js/
│   │   └── app.js                  # Logic frontend (player, API calls, UI)
│   └── 📁 assets/
│       ├── 📁 backgrounds/         # ⬅️ TARUH BACKGROUND DI SINI
│       └── 📁 covers/              # Cover art lagu (auto-generated via upload)
│
├── 📁 server/
│   └── 📁 music/                   # ⬅️ TARUH LAGU DI SINI
│
├── data.json                       # Database JSON (metadata lagu, genre)
├── Cargo.toml                      # Konfigurasi & dependencies Rust
├── Cargo.lock                      # Lock file dependencies
└── .gitignore
```

---

## 🔌 API Endpoints

| Method   | Endpoint                | Deskripsi                           |
|----------|-------------------------|-------------------------------------|
| `GET`    | `/api/songs`            | Ambil semua lagu                    |
| `GET`    | `/api/songs/{id}`       | Ambil detail lagu berdasarkan ID    |
| `PUT`    | `/api/songs/{id}`       | Update info lagu (judul, artis, genre) |
| `POST`   | `/api/upload/{id}`      | Upload cover/album art              |
| `POST`   | `/api/lyrics/{id}`      | Update lirik lagu                   |
| `POST`   | `/api/upload-song`      | Upload file lagu baru (MP3/WebM)    |
| `POST`   | `/api/upload-background`| Upload file background baru         |
| `GET`    | `/api/backgrounds`      | Ambil daftar background             |
| `GET`    | `/api/genres`           | Ambil daftar genre                  |
| `POST`   | `/api/genres`           | Tambah genre baru                   |
| `DELETE` | `/api/genres/{name}`    | Hapus genre                         |

---

## ⌨️ Keyboard Shortcuts

| Tombol        | Aksi                     |
|---------------|--------------------------|
| `Space`       | Play / Pause             |
| `←`           | Lagu sebelumnya          |
| `→`           | Lagu berikutnya          |
| `↑`           | Volume naik              |
| `↓`           | Volume turun             |
| `M`           | Mute / Unmute            |
| `S`           | Toggle Shuffle           |
| `R`           | Toggle Repeat            |
| `Escape`      | Tutup modal              |

---

## 📄 Cara Kerja Singkat

1. **Saat server dijalankan**, backend akan memindai folder `server/music/` untuk mencari file `.mp3` dan `.webm`
2. **Metadata** (judul custom, artis, lirik, cover, genre) disimpan di `data.json`
3. **Frontend** mengambil data lagu via API dan menampilkannya di browser
4. **File musik** di-serve langsung dari path `/music/` oleh Actix-files
5. **File statis** (HTML, CSS, JS, assets) di-serve dari folder `public/`

---

## 📝 License

MIT
