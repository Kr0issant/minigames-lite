document.addEventListener('DOMContentLoaded', () => {
    // === IFRAME / CHILD LOGIC ===
    if (window.self !== window.top) {
        // We are inside an iframe (Game Page). 
        // 1. Do NOT create a second Music Player.
        // 2. Intercept "Back" buttons to tell Parent to close the iframe.
        const backBtns = document.querySelectorAll('a[href*="index.html"], .back-btn');
        backBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.parent.postMessage('closeGame', '*');
            });
        });
        return; // STOP execution here for child pages
    }

    // === PARENT / MAIN LOGIC ===
    // Listen for "Back" signals from Game Iframes
    window.addEventListener('message', (event) => {
        if (event.data === 'closeGame') {
            if (window.closeGame) window.closeGame();
        }
    });

    // === CONFIGURATION ===
    const playlist = [
        { title: "Elektronomia - Sky High [NCS Release]", file: "Elektronomia - Sky High [NCS Release].mp3" },
        { title: "OMFG - Hello", file: "OMFG   Hello.mp3" }
    ];

    const STORAGE_KEY = 'minigames_music_state';
    const isPagesDir = window.location.pathname.includes('/pages/');
    const pathPrefix = isPagesDir ? '../assets/music/' : 'src/assets/music/';

    // === STATE MANAGEMENT ===
    // Default: Playing. "Unless I press pause, the music doesn't pause."
    const defaultState = {
        isPlaying: true,
        isMuted: false,
        volume: 0.5,
        currentSongIndex: 0,
        currentTime: 0
    };

    let savedState = localStorage.getItem(STORAGE_KEY);
    let state = savedState ? JSON.parse(savedState) : defaultState;

    // === DOM CREATION ===
    const widget = document.createElement('div');
    widget.className = 'music-player-v3 minimized'; // Default to minimized
    widget.innerHTML = `
        <button class="music-toggle-btn" id="music-toggle-btn">🎵</button>
        <div class="music-content-wrapper" id="music-content">
            <div class="song-info-container">
                <div class="song-title-scroll" id="song-title"></div>
            </div>
            
            <div class="progress-area" id="progress-area">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            
            <div class="controls-main">
                <button class="ctrl-btn" id="prev-btn" title="Previous">⏮️</button>
                <button class="ctrl-btn play-pause-btn" id="play-btn" title="Play/Pause">
                    ${state.isPlaying ? '⏸️' : '▶️'}
                </button>
                <button class="ctrl-btn" id="next-btn" title="Next">⏭️</button>
            </div>
            
            <div class="volume-area">
                <button class="vol-btn" id="vol-down" title="Volume Down">➖</button>
                <input type="range" class="vol-slider" id="vol-slider" min="0" max="1" step="0.05" value="${state.volume}">
                <button class="vol-btn" id="vol-up" title="Volume Up">➕</button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // === ELEMENTS ===
    const audio = new Audio();
    const titleEl = document.getElementById('song-title');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressArea = document.getElementById('progress-area');
    const progressFill = document.getElementById('progress-fill');
    const volumeSlider = document.getElementById('vol-slider');
    const volDownBtn = document.getElementById('vol-down');
    const volUpBtn = document.getElementById('vol-up');
    const toggleBtn = document.getElementById('music-toggle-btn');
    const contentWrapper = document.getElementById('music-content');

    // === TOGGLE LOGIC ===
    toggleBtn.addEventListener('click', (e) => {
        // Prevent bubbling if we decide to click the widget to open
        e.stopPropagation(); 
        widget.classList.toggle('minimized');
    });

    // === CORE FUNCTIONS ===
    const saveState = () => {
        state.currentTime = audio.currentTime;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };

    const loadSong = (index) => {
        // Ensure index is valid
        if (index < 0) index = playlist.length - 1;
        if (index >= playlist.length) index = 0;
        state.currentSongIndex = index;

        const song = playlist[state.currentSongIndex];
        audio.src = pathPrefix + song.file;
        titleEl.textContent = song.title + "   ***   " + song.title + "   ***   "; // Duplicate for smooth scroll

        audio.currentTime = state.currentTime;
        audio.volume = state.volume;
        audio.muted = state.isMuted;
    };

    const togglePlay = () => {
        if (audio.paused) {
            audio.play().then(() => {
                state.isPlaying = true;
                playBtn.innerHTML = '⏸️'; // Pause icon
                saveState();
            }).catch(e => console.warn("Play blocked:", e));
        } else {
            audio.pause();
            state.isPlaying = false;
            playBtn.innerHTML = '▶️'; // Play icon
            // Explicitly verify paused state before saving to be safe
            if (audio.paused) saveState();
        }
    };

    // Load initial song
    loadSong(state.currentSongIndex);

    // === AUTOPLAY LOGIC ===
    if (state.isPlaying) {
        playBtn.innerHTML = '⏸️';
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay blocked. waiting for user interaction...");

                const forcePlay = () => {
                    audio.play().then(() => {
                        // Success! Remove listeners
                        ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt =>
                            document.removeEventListener(evt, forcePlay, { capture: true }) // Capture phase to be first
                        );
                    }).catch(e => {
                        // Still failed? Keep listening.
                    });
                };

                // Listen for ANY interaction to start music
                ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt =>
                    document.addEventListener(evt, forcePlay, { capture: true, once: false })
                );
            });
        }
    } else {
        playBtn.innerHTML = '▶️';
    }

    // === EVENT LISTENERS ===

    // 1. Play/Pause
    playBtn.addEventListener('click', togglePlay);

    // 2. Navigation
    prevBtn.addEventListener('click', () => {
        state.currentTime = 0; // Reset time on change
        loadSong(state.currentSongIndex - 1);
        if (state.isPlaying) audio.play();
        saveState();
    });

    nextBtn.addEventListener('click', () => {
        state.currentTime = 0;
        loadSong(state.currentSongIndex + 1);
        if (state.isPlaying) audio.play();
        saveState();
    });

    // 3. Progress Bar Update & Seeking
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
        }
        // Sync state continuously
        state.currentTime = audio.currentTime;
        // Only save to storage if playing, to keep continuity
        if (!audio.paused) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    });

    progressArea.addEventListener('click', (e) => {
        const width = progressArea.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        if (duration) {
            audio.currentTime = (clickX / width) * duration;
            saveState();
        }
    });

    // 4. Volume Controls
    const updateVolume = (newVol) => {
        newVol = Math.max(0, Math.min(1, newVol)); // Clamp 0-1
        audio.volume = newVol;
        state.volume = newVol;
        volumeSlider.value = newVol;
        saveState();
    };

    volumeSlider.addEventListener('input', (e) => {
        updateVolume(parseFloat(e.target.value));
    });

    volDownBtn.addEventListener('click', () => {
        updateVolume(state.volume - 0.1);
    });

    volUpBtn.addEventListener('click', () => {
        updateVolume(state.volume + 0.1);
    });

    // 5. Audio Ended
    audio.addEventListener('ended', () => {
        state.currentTime = 0;
        loadSong(state.currentSongIndex + 1);
        if (state.isPlaying) audio.play();
        saveState();
    });
});