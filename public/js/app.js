/**
 * Anime Music Player - Main Application
 * Vanilla JavaScript Music Player with Anime Theme
 */

// =============== UTILITIES ===============

/**
 * Debounce function to limit rate of function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Cache utilities for localStorage with expiration
 */
const CacheUtils = {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes

    get(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > this.CACHE_TTL) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    },

    set(key, data) {
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Cache write failed:', e);
        }
    },

    clear(key) {
        localStorage.removeItem(`cache_${key}`);
    }
};

/**
 * Toast notification helper
 */
const Toast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2';
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500/90',
            error: 'bg-red-500/90',
            info: 'bg-white/20',
            warning: 'bg-yellow-500/90'
        };

        toast.className = `toast ${colors[type] || colors.info} text-white px-4 py-3 rounded-lg backdrop-blur-sm shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
            toast.classList.add('translate-x-0');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

class MusicPlayer {
    constructor() {
        // Audio element
        this.audio = document.getElementById('audio-player');

        // UI Elements
        this.playBtn = document.getElementById('play-btn');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.progressContainer = document.getElementById('progress-container');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeValue = document.getElementById('volume-value');
        this.songTitle = document.getElementById('song-title');
        this.songArtist = document.getElementById('song-artist');
        this.songList = document.getElementById('song-list'); // Modal song list
        this.albumArt = document.querySelector('.album-art');

        // Background elements
        this.bgVideo = document.getElementById('bg-video');
        this.bgImage = document.getElementById('bg-image');
        this.backgroundList = document.getElementById('background-list');

        // Settings modal
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettings = document.getElementById('close-settings');

        // Song List Modal
        this.songListBtn = document.getElementById('song-list-btn');
        this.songListModal = document.getElementById('song-list-modal');
        this.closeSongListBtn = document.getElementById('close-song-list');
        // Handle modal song list specifically
        this.modalSongList = document.querySelector('#song-list-modal #song-list');

        this.modalOverlays = document.querySelectorAll('.modal-overlay');

        // Lyrics & Upload Elements
        this.albumArtContainer = document.getElementById('album-art-container');
        this.albumArtInput = document.getElementById('album-art-input');
        this.uploadArtBtn = document.getElementById('upload-art-btn');

        this.lyricsContainer = document.getElementById('lyrics-container');
        this.lyricsText = document.getElementById('lyrics-text');
        this.editLyricsBtn = document.getElementById('edit-lyrics-btn');

        this.lyricsModal = document.getElementById('lyrics-modal');
        this.lyricsInput = document.getElementById('lyrics-input');
        this.saveLyricsBtn = document.getElementById('save-lyrics-btn');
        this.cancelLyricsBtn = document.getElementById('cancel-lyrics-btn');
        this.lyricsModalOverlay = document.querySelector('.lyrics-modal-overlay');

        // Edit Song Modal
        this.editSongModal = document.getElementById('edit-song-modal');
        this.editSongTitle = document.getElementById('edit-song-title');
        this.editSongArtist = document.getElementById('edit-song-artist');
        this.editSongGenre = document.getElementById('edit-song-genre');
        this.saveEditSongBtn = document.getElementById('save-edit-song');
        this.cancelEditSongBtn = document.getElementById('cancel-edit-song');
        this.editSongOverlay = document.querySelector('.edit-song-overlay');

        // Genre Management
        this.tabBackground = document.getElementById('tab-background');
        this.tabGenres = document.getElementById('tab-genres');
        this.tabContentBackground = document.getElementById('tab-content-background');
        this.tabContentGenres = document.getElementById('tab-content-genres');
        this.genreList = document.getElementById('genre-list');
        this.newGenreInput = document.getElementById('new-genre-input');
        this.addGenreBtn = document.getElementById('add-genre-btn');
        this.genreFilterContainer = document.getElementById('genre-filter-container');

        // Upload Song
        this.uploadSongInput = document.getElementById('upload-song-input');
        this.uploadSongBtn = document.getElementById('upload-song-btn');

        // Upload Background
        this.uploadBackgroundInput = document.getElementById('upload-background-input');
        this.uploadBackgroundBtn = document.getElementById('upload-background-btn');

        // State
        this.songs = [];
        this.backgrounds = [];
        this.genres = [];
        this.selectedGenreFilter = ''; // '' means all
        this.currentIndex = 0;
        this.isPlaying = false;
        this.editingSongId = null;
        
        // Shuffle & Repeat State
        this.isShuffleOn = false;
        this.repeatMode = 'off'; // 'off', 'all', 'one'
        this.shuffledIndices = []; // Array of shuffled song indices
        this.shufflePosition = 0; // Current position in shuffled array
        
        // Shuffle & Repeat UI Elements
        this.shuffleBtn = document.getElementById('shuffle-btn');
        this.repeatBtn = document.getElementById('repeat-btn');
        this.repeatIconOff = document.getElementById('repeat-icon-off');
        this.repeatIconAll = document.getElementById('repeat-icon-all');
        this.repeatIconOne = document.getElementById('repeat-icon-one');

        // Lyrics State
        this.lyricsLines = []; // [{time: 12.5, text: "Lyric line"}]
        this.hasSyncedLyrics = false;
        this.currentLineIndex = -1;

        // Initialize
        this.init();
    }

    async init() {
        // Load saved preferences
        this.loadPreferences();

        // Show loading state
        this.showLoading();

        // Fetch data (with caching)
        await Promise.all([
            this.fetchSongs(),
            this.fetchBackgrounds(),
            this.fetchGenres()
        ]);

        // Hide loading
        this.hideLoading();

        // Setup event listeners
        this.setupEventListeners();

        // Apply saved background
        this.applySavedBackground();

        // Initial lyrics padding with debounced resize
        this.updateLyricsPadding();
        this.debouncedUpdateLyricsPadding = debounce(() => this.updateLyricsPadding(), 150);
        window.addEventListener('resize', this.debouncedUpdateLyricsPadding);
    }

    showLoading() {
        if (this.modalSongList) {
            this.modalSongList.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="loading w-8 h-8 border-2 border-white/20 border-t-white rounded-full"></div>
                </div>`;
        }
    }

    hideLoading() {
        // Loading is cleared when content is rendered
    }

    updateLyricsPadding() {
        if (this.lyricsText) {
            const height = this.lyricsText.clientHeight;
            const padding = height / 2;
            this.lyricsText.style.paddingTop = `${padding}px`;
            this.lyricsText.style.paddingBottom = `${padding}px`;
        }
    }

    // =============== DATA FETCHING ===============

    async fetchSongs() {
        // Try cache first
        const cached = CacheUtils.get('songs');
        if (cached) {
            this.songs = cached;
            this.renderSongList();
            // Fetch fresh in background
            this.fetchSongsFromServer();
            return;
        }

        await this.fetchSongsFromServer();
    }

    async fetchSongsFromServer() {
        try {
            const response = await fetch('/api/songs');
            if (!response.ok) throw new Error('Network error');
            this.songs = await response.json();
            CacheUtils.set('songs', this.songs);
            this.renderSongList();
        } catch (error) {
            console.error('Error fetching songs:', error);
            if (this.modalSongList && this.songs.length === 0) {
                this.modalSongList.innerHTML = '<div class="text-red-400 text-center py-4">Gagal memuat lagu</div>';
            }
            Toast.show('Gagal memuat daftar lagu', 'error');
        }
    }

    async fetchBackgrounds() {
        // Try cache first
        const cached = CacheUtils.get('backgrounds');
        if (cached) {
            this.backgrounds = cached;
            this.renderBackgroundList();
            // Fetch fresh in background
            this.fetchBackgroundsFromServer();
            return;
        }

        await this.fetchBackgroundsFromServer();
    }

    async fetchBackgroundsFromServer() {
        try {
            const response = await fetch('/api/backgrounds');
            if (!response.ok) throw new Error('Network error');
            this.backgrounds = await response.json();
            CacheUtils.set('backgrounds', this.backgrounds);
            this.renderBackgroundList();
        } catch (error) {
            console.error('Error fetching backgrounds:', error);
            Toast.show('Gagal memuat daftar background', 'error');
        }
    }

    async fetchGenres() {
        try {
            const response = await fetch('/api/genres');
            if (!response.ok) throw new Error('Network error');
            this.genres = await response.json();
            this.renderGenreList();
        } catch (error) {
            console.error('Error fetching genres:', error);
        }
    }

    // =============== RENDERING ===============

    renderSongList() {
        const targetList = this.modalSongList;
        if (!targetList) return;

        // Filter songs by selected genre
        const filteredSongs = this.selectedGenreFilter
            ? this.songs.filter(s => s.genre === this.selectedGenreFilter)
            : this.songs;

        if (filteredSongs.length === 0) {
            const message = this.selectedGenreFilter
                ? `Tidak ada lagu dengan genre "${this.selectedGenreFilter}"`
                : 'Tidak ada lagu';
            targetList.innerHTML = `<div class="text-white/50 text-center py-8">${message}</div>`;
            return;
        }

        targetList.innerHTML = filteredSongs.map((song) => {
            const originalIndex = this.songs.indexOf(song);
            return `
      <div class="song-item flex items-center gap-3 ${originalIndex === this.currentIndex ? 'active' : ''}" data-index="${originalIndex}">
        <div class="song-number">${originalIndex + 1}</div>
        <div class="flex-1 min-w-0 song-info cursor-pointer">
          <div class="text-white font-medium truncate">${this.escapeHtml(song.title)}</div>
          <div class="text-white/60 text-sm truncate flex items-center gap-2">
            ${this.escapeHtml(song.artist)}
            ${song.genre ? `<span class="text-xs bg-white/10 px-2 py-0.5 rounded-full">${this.escapeHtml(song.genre)}</span>` : ''}
          </div>
        </div>
        <button class="edit-song-btn p-2 rounded-full hover:bg-white/20 text-white/40 hover:text-white transition-colors" data-id="${song.id}" title="Edit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
          </svg>
        </button>
      </div>`;
        }).join('');

        // Add click listeners for playing song
        targetList.querySelectorAll('.song-info').forEach(info => {
            info.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = info.closest('.song-item');
                const index = parseInt(item.dataset.index);
                this.playSong(index);
            });
        });

        // Add click listeners for edit button
        targetList.querySelectorAll('.edit-song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = parseInt(btn.dataset.id);
                this.openEditSongModal(songId);
            });
        });
    }

    renderBackgroundList() {
        const savedBg = localStorage.getItem('selectedBackground') || '';

        this.backgroundList.innerHTML = this.backgrounds.map(bg => {
            if (bg.type === 'video') {
                // Video thumbnail with lazy load (preload="none")
                return `
      <div class="bg-thumb ${bg.url === savedBg ? 'active' : ''}" 
           data-url="${bg.url}" 
           data-type="${bg.type}"
           title="${bg.name}">
        <video class="w-full h-full object-cover pointer-events-none" muted loop preload="none">
          <source src="${bg.url}" type="video/mp4">
        </video>
      </div>`;
            } else {
                // Image thumbnail with lazy loading
                return `
      <div class="bg-thumb ${bg.url === savedBg ? 'active' : ''}" 
           data-url="${bg.url}" 
           data-type="${bg.type}"
           title="${bg.name}">
        <img src="${bg.url}" alt="${bg.name}" class="w-full h-full object-cover" loading="lazy">
      </div>`;
            }
        }).join('');

        // Combined event listeners (optimized - single loop)
        this.backgroundList.querySelectorAll('.bg-thumb').forEach(thumb => {
            const video = thumb.querySelector('video');

            // Video hover handlers
            if (video) {
                thumb.addEventListener('mouseenter', () => video.play());
                thumb.addEventListener('mouseleave', () => {
                    video.pause();
                    video.currentTime = 0;
                });
            }

            // Click handler
            thumb.addEventListener('click', () => {
                this.setBackground(thumb.dataset.url, thumb.dataset.type);
                this.backgroundList.querySelectorAll('.bg-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }

    renderGenreFilterChips() {
        if (!this.genreFilterContainer) return;

        // Get unique genres from songs
        const usedGenres = [...new Set(this.songs.map(s => s.genre).filter(g => g))];

        // Combine managed genres and used genres
        const allGenres = [...new Set([...this.genres, ...usedGenres])].sort();

        // Start with "All" chip
        let html = `<button class="genre-chip ${this.selectedGenreFilter === '' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'} px-3 py-1.5 rounded-full text-sm text-white font-medium transition-colors" data-genre="">Semua</button>`;

        // Add genre chips
        allGenres.forEach(genre => {
            const isActive = this.selectedGenreFilter === genre;
            html += `<button class="genre-chip ${isActive ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'} px-3 py-1.5 rounded-full text-sm text-white transition-colors" data-genre="${this.escapeHtml(genre)}">${this.escapeHtml(genre)}</button>`;
        });

        this.genreFilterContainer.innerHTML = html;

        // Add click listeners
        this.genreFilterContainer.querySelectorAll('.genre-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.selectedGenreFilter = chip.dataset.genre;
                this.renderGenreFilterChips();
                this.renderSongList();
            });
        });
    }

    renderGenreList() {
        if (!this.genreList) return;

        if (this.genres.length === 0) {
            this.genreList.innerHTML = '<div class="text-white/50 text-center py-4 text-sm">Belum ada genre</div>';
            return;
        }

        this.genreList.innerHTML = this.genres.map(genre => `
            <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span class="text-white text-sm">${this.escapeHtml(genre)}</span>
                <button class="delete-genre-btn text-white/40 hover:text-red-400 transition-colors" data-genre="${this.escapeHtml(genre)}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        // Add delete handlers
        this.genreList.querySelectorAll('.delete-genre-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteGenre(btn.dataset.genre));
        });
    }

    updateGenreDropdown() {
        if (!this.editSongGenre) return;

        const currentValue = this.editSongGenre.value;
        this.editSongGenre.innerHTML = '<option value="">-- Pilih Genre --</option>' +
            this.genres.map(g => `<option value="${this.escapeHtml(g)}">${this.escapeHtml(g)}</option>`).join('');
        this.editSongGenre.value = currentValue;
    }

    async addGenre() {
        const name = this.newGenreInput.value.trim();
        if (!name) {
            Toast.show('Nama genre tidak boleh kosong', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/genres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const result = await response.json();
            if (result.success) {
                this.genres.push(name);
                this.genres.sort();
                this.renderGenreList();
                this.newGenreInput.value = '';
                Toast.show('Genre berhasil ditambahkan', 'success');
            } else {
                Toast.show(result.error || 'Gagal menambahkan genre', 'error');
            }
        } catch (error) {
            console.error('Add genre failed:', error);
            Toast.show('Terjadi kesalahan', 'error');
        }
    }

    async deleteGenre(name) {
        try {
            const response = await fetch(`/api/genres/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                this.genres = this.genres.filter(g => g !== name);
                this.renderGenreList();
                Toast.show('Genre berhasil dihapus', 'success');
            } else {
                Toast.show(result.error || 'Gagal menghapus genre', 'error');
            }
        } catch (error) {
            console.error('Delete genre failed:', error);
            Toast.show('Terjadi kesalahan', 'error');
        }
    }

    switchSettingsTab(tab) {
        const isBackground = tab === 'background';

        this.tabBackground.classList.toggle('text-white/80', isBackground);
        this.tabBackground.classList.toggle('border-white', isBackground);
        this.tabBackground.classList.toggle('font-medium', isBackground);
        this.tabBackground.classList.toggle('text-white/50', !isBackground);
        this.tabBackground.classList.toggle('border-transparent', !isBackground);

        this.tabGenres.classList.toggle('text-white/80', !isBackground);
        this.tabGenres.classList.toggle('border-white', !isBackground);
        this.tabGenres.classList.toggle('font-medium', !isBackground);
        this.tabGenres.classList.toggle('text-white/50', isBackground);
        this.tabGenres.classList.toggle('border-transparent', isBackground);

        this.tabContentBackground.classList.toggle('hidden', !isBackground);
        this.tabContentGenres.classList.toggle('hidden', isBackground);
    }

    // =============== SHUFFLE & REPEAT LOGIC ===============

    toggleShuffle() {
        this.isShuffleOn = !this.isShuffleOn;
        
        // Update UI
        const shuffleIcon = this.shuffleBtn.querySelector('svg');
        if (this.isShuffleOn) {
            shuffleIcon.classList.remove('text-white/50');
            shuffleIcon.classList.add('text-white');
            Toast.show('Shuffle mode ON', 'info', 1500);
            
            // Generate shuffled indices
            this.generateShuffledIndices();
        } else {
            shuffleIcon.classList.remove('text-white');
            shuffleIcon.classList.add('text-white/50');
            Toast.show('Shuffle mode OFF', 'info', 1500);
        }
    }

    toggleRepeat() {
        // Cycle through repeat modes: off -> all -> one -> off
        const modes = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        // Update UI
        this.repeatIconOff.classList.add('hidden');
        this.repeatIconAll.classList.add('hidden');
        this.repeatIconOne.classList.add('hidden');
        
        switch (this.repeatMode) {
            case 'off':
                this.repeatIconOff.classList.remove('hidden');
                Toast.show('Repeat mode OFF', 'info', 1500);
                break;
            case 'all':
                this.repeatIconAll.classList.remove('hidden');
                Toast.show('Repeat all songs', 'info', 1500);
                break;
            case 'one':
                this.repeatIconOne.classList.remove('hidden');
                Toast.show('Repeat current song', 'info', 1500);
                break;
        }
    }

    generateShuffledIndices() {
        // Create array of all song indices
        const indices = Array.from({ length: this.songs.length }, (_, i) => i);
        
        // Fisher-Yates shuffle algorithm
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Ensure current song is not first in shuffled list
        const currentIndex = indices.indexOf(this.currentIndex);
        if (currentIndex !== -1) {
            // Move current song to the end so it doesn't play next immediately
            indices.splice(currentIndex, 1);
            indices.push(this.currentIndex);
        }
        
        this.shuffledIndices = indices;
        this.shufflePosition = 0;
    }

    getNextSongIndex() {
        if (this.repeatMode === 'one') {
            return this.currentIndex; // Repeat current song
        }
        
        if (this.isShuffleOn && this.shuffledIndices.length > 0) {
            // Get next song from shuffled list
            const nextIndex = this.shuffledIndices[this.shufflePosition];
            this.shufflePosition = (this.shufflePosition + 1) % this.shuffledIndices.length;
            
            // If we've gone through all shuffled songs, reshuffle
            if (this.shufflePosition === 0) {
                this.generateShuffledIndices();
            }
            
            return nextIndex;
        } else {
            // Normal sequential playback
            return (this.currentIndex + 1) % this.songs.length;
        }
    }

    getPrevSongIndex() {
        if (this.repeatMode === 'one') {
            return this.currentIndex; // Repeat current song
        }
        
        if (this.isShuffleOn && this.shuffledIndices.length > 0) {
            // Get previous song from shuffled list
            this.shufflePosition = (this.shufflePosition - 1 + this.shuffledIndices.length) % this.shuffledIndices.length;
            return this.shuffledIndices[this.shufflePosition];
        } else {
            // Normal sequential playback
            return (this.currentIndex - 1 + this.songs.length) % this.songs.length;
        }
    }

    // =============== PLAYBACK CONTROLS ===============

    playSong(index) {
        if (this.songs.length === 0) return;

        this.currentIndex = index;
        const song = this.songs[index];
        
        // Update shuffle position if shuffle is on
        if (this.isShuffleOn && this.shuffledIndices.length > 0) {
            const shuffleIndex = this.shuffledIndices.indexOf(index);
            if (shuffleIndex !== -1) {
                this.shufflePosition = shuffleIndex;
            }
        }

        // Update audio source
        this.audio.src = `/music/${song.filename}`;
        this.audio.load();

        // Update UI
        this.songTitle.textContent = song.title;
        this.songArtist.textContent = song.artist;

        // Update Album Art
        if (song.picture) {
            this.albumArtContainer.style.backgroundImage = `url('${song.picture}')`;
            this.albumArtContainer.innerHTML = '';
        } else {
            this.albumArtContainer.style.backgroundImage = '';
            this.albumArtContainer.innerHTML = '<span class="text-6xl md:text-7xl">🎧</span>';
        }

        // Process Lyrics
        this.parseAndRenderLyrics(song.lyrics);

        // Update song list active state
        if (this.modalSongList) {
            this.modalSongList.querySelectorAll('.song-item').forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
        }

        // Play
        this.play();
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.albumArt.classList.add('playing');
        }).catch(err => {
            console.error('Playback failed:', err);
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.albumArt.classList.remove('playing');
    }

    togglePlay() {
        if (this.songs.length === 0) return;

        if (!this.audio.src || this.audio.src === window.location.href) {
            this.playSong(0);
            return;
        }

        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    playNext() {
        if (this.songs.length === 0) return;
        const nextIndex = this.getNextSongIndex();
        this.playSong(nextIndex);
    }

    playPrev() {
        if (this.songs.length === 0) return;
        const prevIndex = this.getPrevSongIndex();
        this.playSong(prevIndex);
    }

    updatePlayButton() {
        this.playIcon.classList.toggle('hidden', this.isPlaying);
        this.pauseIcon.classList.toggle('hidden', !this.isPlaying);
    }

    // =============== LYRICS SYNC ===============

    parseAndRenderLyrics(lyricsRaw) {
        this.lyricsText.innerHTML = '';
        this.lyricsLines = [];
        this.currentLineIndex = -1;
        this.hasSyncedLyrics = false;

        if (!lyricsRaw) {
            this.lyricsText.innerHTML = '<span class="text-white/40 italic my-auto">Lirik tidak tersedia</span>';
            return;
        }

        const lines = lyricsRaw.split('\n');
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        let hasTimestamps = false;

        const parsedLines = lines.map(line => {
            const match = timeRegex.exec(line);
            if (match) {
                hasTimestamps = true;
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const ms = parseInt(match[3].padEnd(3, '0').substring(0, 3)); // Ensure safe 3 digits
                const time = minutes * 60 + seconds + ms / 1000;
                const text = line.replace(timeRegex, '').trim();
                return { time, text };
            }
            return { time: null, text: line.trim() };
        }).filter(line => line.text !== ''); // Filter empty lines

        this.hasSyncedLyrics = hasTimestamps;
        this.lyricsLines = parsedLines;

        if (hasTimestamps) {
            // Sort by time just in case
            this.lyricsLines.sort((a, b) => a.time - b.time);

            // Render synced lyrics lines
            this.lyricsLines.forEach((line, index) => {
                const p = document.createElement('p');
                p.textContent = line.text;
                p.dataset.index = index;
                p.className = 'lyric-line text-white/50 text-xl md:text-2xl font-bold py-2 transition-all duration-300 transform scale-95 cursor-pointer hover:text-white/80';
                p.addEventListener('click', () => {
                    this.audio.currentTime = line.time;
                    this.play();
                });
                this.lyricsText.appendChild(p);
            });
        } else {
            // Plain text rendering
            const div = document.createElement('div');
            div.className = 'text-white/80 text-base leading-relaxed whitespace-pre-wrap';
            div.textContent = lyricsRaw;
            this.lyricsText.appendChild(div);
        }
    }

    syncLyrics() {
        if (!this.hasSyncedLyrics || this.lyricsLines.length === 0) return;

        const currentTime = this.audio.currentTime;

        // Find current line
        let newIndex = this.lyricsLines.findIndex((line, i) => {
            const nextLine = this.lyricsLines[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });

        if (newIndex !== -1 && newIndex !== this.currentLineIndex) {
            this.currentLineIndex = newIndex;
            this.updateActiveLyricLine();
        }
    }

    updateActiveLyricLine() {
        const lines = this.lyricsText.querySelectorAll('.lyric-line');
        lines.forEach((line, index) => {
            const isActive = index === this.currentLineIndex;

            // Reset base classes
            line.className = 'lyric-line py-2 transition-all duration-300 transform cursor-pointer hover:text-white/80';

            if (isActive) {
                line.classList.add('text-white', 'text-xl', 'md:text-2xl', 'font-bold', 'opacity-100', 'drop-shadow-lg');

                // Manual scroll to avoid layout shifting (100% safe)
                const container = this.lyricsText;
                const offset = line.offsetTop;
                const containerHeight = container.clientHeight;
                const lineHeight = line.clientHeight;

                container.scrollTo({
                    top: offset - containerHeight / 2 + lineHeight / 2,
                    behavior: 'smooth'
                });
            } else {
                line.classList.add('text-white/40', 'text-lg', 'md:text-xl', 'font-medium', 'scale-100');
            }
        });
    }

    // =============== PROGRESS & VOLUME ===============

    updateProgress() {
        if (this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.style.width = `${percent}%`;
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);

            // Sync lyrics
            if (this.hasSyncedLyrics) {
                this.syncLyrics();
            }
        }
    }

    setProgress(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }

    setVolume(value) {
        this.audio.volume = value / 100;
        this.volumeValue.textContent = `${value}%`;
        localStorage.setItem('volume', value);
    }

    // =============== BACKGROUND ===============

    setBackground(url, type) {
        if (type === 'video') {
            this.bgVideo.querySelector('source').src = url;
            this.bgVideo.load();
            this.bgVideo.classList.remove('hidden');
            this.bgImage.classList.add('hidden');
        } else {
            this.bgImage.src = url;
            this.bgImage.classList.remove('hidden');
            this.bgVideo.classList.add('hidden');
            this.bgVideo.pause();
        }

        localStorage.setItem('selectedBackground', url);
        localStorage.setItem('backgroundType', type);
    }

    applySavedBackground() {
        const savedUrl = localStorage.getItem('selectedBackground');
        const savedType = localStorage.getItem('backgroundType');


        if (savedUrl) {
            this.setBackground(savedUrl, savedType);
        } else if (this.backgrounds.length > 0) {
            // Use first background as default
            const first = this.backgrounds[0];
            this.setBackground(first.url, first.type);
        }
    }

    // =============== PREFERENCES ===============

    loadPreferences() {
        const savedVolume = localStorage.getItem('volume');
        if (savedVolume) {
            this.volumeSlider.value = savedVolume;
            this.audio.volume = savedVolume / 100;
            this.volumeValue.textContent = `${savedVolume}%`;
        } else {
            this.audio.volume = 0.75;
        }
    }

    // =============== EVENT LISTENERS ===============

    setupEventListeners() {
        // Play controls
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrev());
        this.nextBtn.addEventListener('click', () => this.playNext());
        
        // Shuffle & Repeat controls
        if (this.shuffleBtn) {
            this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }
        if (this.repeatBtn) {
            this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }

        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => {
            this.durationEl.textContent = this.formatTime(this.audio.duration);
        });
        this.audio.addEventListener('ended', () => this.playNext());

        // Progress bar
        this.progressContainer.addEventListener('click', (e) => this.setProgress(e));

        // Volume
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Song List
        if (this.songListBtn) {
            this.songListBtn.addEventListener('click', () => this.openSongListModal());
        }
        if (this.closeSongListBtn) {
            this.closeSongListBtn.addEventListener('click', () => this.closeSongListModal());
        }

        // Settings modal
        this.settingsBtn.addEventListener('click', () => {
            this.settingsModal.classList.remove('hidden');
            this.settingsModal.classList.add('flex');
        });

        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());

        // Close settings X button
        const closeSettingsX = document.getElementById('close-settings-x');
        if (closeSettingsX) {
            closeSettingsX.addEventListener('click', () => this.closeSettingsModal());
        }

        // Settings tabs
        if (this.tabBackground) {
            this.tabBackground.addEventListener('click', () => this.switchSettingsTab('background'));
        }
        if (this.tabGenres) {
            this.tabGenres.addEventListener('click', () => this.switchSettingsTab('genres'));
        }
        if (this.addGenreBtn) {
            this.addGenreBtn.addEventListener('click', () => this.addGenre());
        }
        if (this.newGenreInput) {
            this.newGenreInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.addGenre();
            });
        }

        // Upload Song
        if (this.uploadSongBtn) {
            this.uploadSongBtn.addEventListener('click', () => this.uploadSongInput.click());
        }
        if (this.uploadSongInput) {
            this.uploadSongInput.addEventListener('change', (e) => this.uploadSong(e));
        }

        // Upload Background
        if (this.uploadBackgroundBtn) {
            this.uploadBackgroundBtn.addEventListener('click', () => this.uploadBackgroundInput.click());
        }
        if (this.uploadBackgroundInput) {
            this.uploadBackgroundInput.addEventListener('change', (e) => this.uploadBackground(e));
        }

        // Close modals when clicking overlay
        this.modalOverlays.forEach(overlay => {
            overlay.addEventListener('click', () => {
                this.closeSettingsModal();
                this.closeSongListModal();
                this.closeLyricsModal();
            });
        });

        // Album Art Upload
        this.uploadArtBtn.addEventListener('click', () => this.albumArtInput.click());
        this.albumArtInput.addEventListener('change', (e) => this.handleUpload(e));

        // Lyrics
        this.editLyricsBtn.addEventListener('click', () => this.openLyricsModal());
        this.saveLyricsBtn.addEventListener('click', () => this.saveLyrics());
        this.cancelLyricsBtn.addEventListener('click', () => this.closeLyricsModal());

        // Edit Song
        this.saveEditSongBtn.addEventListener('click', () => this.saveEditSong());
        this.cancelEditSongBtn.addEventListener('click', () => this.closeEditSongModal());
        if (this.editSongOverlay) {
            this.editSongOverlay.addEventListener('click', () => this.closeEditSongModal());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowRight':
                    this.playNext();
                    break;
                case 'ArrowLeft':
                    this.playPrev();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.volumeSlider.value = Math.min(100, parseInt(this.volumeSlider.value) + 5);
                    this.setVolume(this.volumeSlider.value);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.volumeSlider.value = Math.max(0, parseInt(this.volumeSlider.value) - 5);
                    this.setVolume(this.volumeSlider.value);
                    break;
                case 'KeyM':
                    // Toggle mute
                    if (this.audio.volume > 0) {
                        this.lastVolume = this.audio.volume;
                        this.setVolume(0);
                        this.volumeSlider.value = 0;
                        Toast.show('Muted', 'info', 1500);
                    } else {
                        const vol = Math.round((this.lastVolume || 0.75) * 100);
                        this.setVolume(vol);
                        this.volumeSlider.value = vol;
                        Toast.show('Unmuted', 'info', 1500);
                    }
                    break;
                case 'KeyS':
                    // Toggle shuffle
                    if (this.shuffleBtn) {
                        this.toggleShuffle();
                    }
                    break;
                case 'KeyR':
                    // Toggle repeat
                    if (this.repeatBtn) {
                        this.toggleRepeat();
                    }
                    break;
                case 'Escape':
                    // Close all modals
                    this.closeSettingsModal();
                    this.closeSongListModal();
                    this.closeLyricsModal();
                    this.closeEditSongModal();
                    break;
            }
        });
    }

    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
        this.settingsModal.classList.remove('flex');
    }

    openSongListModal() {
        this.renderGenreFilterChips();
        this.songListModal.classList.remove('hidden');
        this.songListModal.classList.add('flex');
    }

    closeSongListModal() {
        this.songListModal.classList.add('hidden');
        this.songListModal.classList.remove('flex');
    }

    openLyricsModal() {
        const song = this.songs[this.currentIndex];
        this.lyricsInput.value = song ? (song.lyrics || '') : '';
        this.lyricsModal.classList.remove('hidden');
        this.lyricsModal.classList.add('flex');
    }

    closeLyricsModal() {
        this.lyricsModal.classList.add('hidden');
        this.lyricsModal.classList.remove('flex');
    }

    openEditSongModal(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;

        this.editingSongId = songId;
        this.editSongTitle.value = song.title;
        this.editSongArtist.value = song.artist;

        // Update genre dropdown options
        this.updateGenreDropdown();
        this.editSongGenre.value = song.genre || '';

        this.editSongModal.classList.remove('hidden');
        this.editSongModal.classList.add('flex');
        this.editSongTitle.focus();
    }

    closeEditSongModal() {
        this.editSongModal.classList.add('hidden');
        this.editSongModal.classList.remove('flex');
        this.editingSongId = null;
    }

    async saveEditSong() {
        if (!this.editingSongId) return;

        const title = this.editSongTitle.value.trim();
        const artist = this.editSongArtist.value.trim();
        const genre = this.editSongGenre.value || null;

        if (!title || !artist) {
            Toast.show('Judul dan artis harus diisi', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/songs/${this.editingSongId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, artist, genre })
            });

            const result = await response.json();
            if (result.success) {
                // Update local data
                const song = this.songs.find(s => s.id === this.editingSongId);
                if (song) {
                    song.title = title;
                    song.artist = artist;
                    song.genre = genre;
                }

                // Update display if current song
                const currentSong = this.songs[this.currentIndex];
                if (currentSong && currentSong.id === this.editingSongId) {
                    this.songTitle.textContent = title;
                    this.songArtist.textContent = artist;
                }

                // Re-render song list
                this.renderSongList();
                this.closeEditSongModal();
                Toast.show('Lagu berhasil diupdate', 'success');
            } else {
                Toast.show('Gagal menyimpan perubahan', 'error');
            }
        } catch (error) {
            console.error('Update failed:', error);
            Toast.show('Terjadi kesalahan', 'error');
        }
    }

    async handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('cover', file);

        const song = this.songs[this.currentIndex];
        if (!song) return;

        try {
            const response = await fetch(`/api/upload/${song.id}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                // Update local data
                song.picture = result.path;
                this.albumArtContainer.style.backgroundImage = `url('${result.path}')`;
                this.albumArtContainer.innerHTML = '';
                Toast.show('Gambar berhasil diupload', 'success');
            } else {
                Toast.show('Gagal mengupload gambar', 'error');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            Toast.show('Terjadi kesalahan saat upload', 'error');
        }
    }

    async uploadSong(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['audio/mpeg', 'audio/webm', 'video/webm'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|webm)$/i)) {
            Toast.show('Hanya file MP3 dan WebM yang diizinkan', 'warning');
            return;
        }

        // Show loading
        this.uploadSongBtn.disabled = true;
        this.uploadSongBtn.innerHTML = '<span class="loading">⏳</span> Mengupload...';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload-song', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                // Refresh song list
                await this.fetchSongsFromServer();
                this.renderSongList();
                this.renderGenreFilterChips();
                Toast.show('Lagu berhasil diupload!', 'success');
            } else {
                Toast.show(result.error || 'Gagal mengupload lagu', 'error');
            }
        } catch (error) {
            console.error('Upload song failed:', error);
            Toast.show('Terjadi kesalahan saat upload', 'error');
        } finally {
            // Reset button
            this.uploadSongBtn.disabled = false;
            this.uploadSongBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-8l-4 4m4-4l4 4m-4-4v12"></path>
                </svg>
                Upload Lagu`;
            // Reset input
            this.uploadSongInput.value = '';
        }
    }

    async uploadBackground(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            Toast.show('Format file tidak didukung', 'warning');
            return;
        }

        // Show loading
        this.uploadBackgroundBtn.disabled = true;
        this.uploadBackgroundBtn.innerHTML = '<span class="loading">⏳</span> Mengupload...';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload-background', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                // Refresh background list
                await this.fetchBackgroundsFromServer();
                this.renderBackgroundList();
                Toast.show('Background berhasil diupload!', 'success');
            } else {
                Toast.show(result.error || 'Gagal mengupload background', 'error');
            }
        } catch (error) {
            console.error('Upload background failed:', error);
            Toast.show('Terjadi kesalahan saat upload', 'error');
        } finally {
            // Reset button
            this.uploadBackgroundBtn.disabled = false;
            this.uploadBackgroundBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-8l-4 4m4-4l4 4m-4-4v12"></path>
                </svg>
                Upload Background`;
            // Reset input
            this.uploadBackgroundInput.value = '';
        }
    }

    async saveLyrics() {
        const lyrics = this.lyricsInput.value;
        const song = this.songs[this.currentIndex];
        if (!song) return;

        try {
            const response = await fetch(`/api/lyrics/${song.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lyrics })
            });

            const result = await response.json();
            if (result.success) {
                song.lyrics = lyrics;
                // Re-render lyrics to check for new sync data
                this.parseAndRenderLyrics(lyrics);
                this.closeLyricsModal();
                Toast.show('Lirik berhasil disimpan', 'success');
            } else {
                Toast.show('Gagal menyimpan lirik', 'error');
            }
        } catch (error) {
            console.error('Save lyrics failed:', error);
            Toast.show('Terjadi kesalahan saat menyimpan lirik', 'error');
        }
    }

    // =============== UTILITIES ===============

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.player = new MusicPlayer();
});
