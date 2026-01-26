// "Traffic Extension" - Web-Native Racer

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Configuration
const CONFIG = {
    laneCount: 4,
    speedBase: 3, // Very slow start for easier handling
    speedMax: 9, // Lower max speed cap
    carSize: { width: 60, height: 100 },
    colors: {
        player: '#FFFFFF',
        enemy: ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.2)']
    }
};

// State
let GAME = {
    running: false,
    scoreTime: 0,
    speed: CONFIG.speedBase,
    width: 0,
    height: 0,
    laneWidth: 0,
    frames: 0,
    audioEnabled: true,
    bestTime: parseFloat(localStorage.getItem('traffic_best_time')) || 0,
    animationId: null
};

// Entities
let player = {
    lane: 1, // 0 to laneCount-1
    x: 0,
    y: 0,
    targetX: 0
};

let enemies = [];

// Audio System (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(type) {
    if (!GAME.audioEnabled || audioCtx.state === 'suspended') {
        if (GAME.audioEnabled) audioCtx.resume();
        else return;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'switch') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'crash') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'notification') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// Helpers
function resize() {
    // Canvas now fills the wrapper, not window
    const wrapper = document.getElementById('game-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;

    GAME.width = canvas.width;
    GAME.height = canvas.height;

    // Center lanes
    // Max width is already constrained by wrapper, so use full width
    const maxWidth = GAME.width;
    GAME.laneWidth = maxWidth / CONFIG.laneCount;
    GAME.laneOffsetX = 0; // No offset needed in boxed mode usually

    // Reset player Y
    player.y = GAME.height - 180;
    updatePlayerPos();
}

function updatePlayerPos() {
    player.targetX = GAME.laneOffsetX + (player.lane * GAME.laneWidth) + (GAME.laneWidth / 2);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

// Game Loop
class Enemy {
    constructor(lane) {
        this.lane = lane !== undefined ? lane : Math.floor(Math.random() * CONFIG.laneCount);
        this.x = GAME.laneOffsetX + (this.lane * GAME.laneWidth) + (GAME.laneWidth / 2);
        this.y = -150;
        this.speed = GAME.speed * (0.8 + Math.random() * 0.4); // Variation
        this.color = CONFIG.colors.enemy[Math.floor(Math.random() * CONFIG.colors.enemy.length)];
        this.width = CONFIG.carSize.width;
        this.height = CONFIG.carSize.height;
    }

    update() {
        this.y += this.speed;
        // Recalculate X in case of resize
        this.x = GAME.laneOffsetX + (this.lane * GAME.laneWidth) + (GAME.laneWidth / 2);
    }

    draw() {
        // Draw Car Body (Sleek generic shape)
        drawRoundedRect(ctx, this.x - this.width / 2, this.y, this.width, this.height, 12, this.color);

        // Rear Window (Darker)
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.roundRect(this.x - this.width / 2 + 5, this.y + 20, this.width - 10, 20, 5);
        ctx.fill();

        // Taillights (Red) - Indicates moving SAME direction
        ctx.fillStyle = '#ffdd44ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'orange';

        // Left Light
        ctx.beginPath();
        ctx.roundRect(this.x - this.width / 2 + 5, this.y + this.height - 10, 15, 6, 2);
        ctx.fill();

        // Right Light
        ctx.beginPath();
        ctx.roundRect(this.x + this.width / 2 - 20, this.y + this.height - 10, 15, 6, 2);
        ctx.fill();

        // Reset Shadow
        ctx.shadowBlur = 0;
    }
}

function loop() {
    if (!GAME.running) return;

    // Update
    GAME.frames++;
    GAME.scoreTime += 1 / 60; // Approx seconds

    // Player Movement (Lerp)
    player.x += (player.targetX - player.x) * 0.2;

    // Spawning (Density increases with time)
    // Relaxed spawn rate: Start at ~1.6s gap (100 frames), cap at ~0.6s gap (40 frames)
    const spawnRate = Math.max(40, 100 - Math.floor(GAME.scoreTime / 2)); // Moderate ramp up
    if (GAME.frames % spawnRate === 0) {
        // Find valid lanes
        let validLanes = [];
        for (let l = 0; l < CONFIG.laneCount; l++) {
            let isLaneFree = true;
            // Check all existing enemies
            for (let e of enemies) {
                if (e.lane === l && e.y < CONFIG.carSize.height * 2.5) { // Ensure gap of ~2.5 car lengths at top
                    isLaneFree = false;
                    break;
                }
            }
            if (isLaneFree) validLanes.push(l);
        }

        // Anti-Blocking: Ensure we don't block the last open lane
        // Count how many unique lanes are occupied within a critical distance
        const criticalDist = CONFIG.carSize.height * 3;
        const occupiedCount = new Set(enemies.filter(e => e.y < criticalDist).map(e => e.lane)).size;

        if (occupiedCount >= CONFIG.laneCount - 1) {
            // If 3 lanes are already busy (in a 4 lane game), don't spawn in the 4th.
            // This keeps at least one "corridor" open or weaving path available.
            validLanes = [];
        }

        if (validLanes.length > 0) {
            const pick = validLanes[Math.floor(Math.random() * validLanes.length)];
            enemies.push(new Enemy(pick));
        }
    }

    // Logic
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.update();

        // Remove
        if (e.y > GAME.height) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision (AABB approx)
        // Hitbox slightly smaller than visual
        const pRadius = CONFIG.carSize.width * 0.4;
        const eRadius = CONFIG.carSize.width * 0.4;

        // Vertical check first
        if (e.y + e.height > player.y && e.y < player.y + CONFIG.carSize.height) {
            // Horizontal check
            if (e.lane === player.lane) {
                // Check exact overlap just in case
                if (Math.abs(e.x - player.x) < (pRadius + eRadius)) {
                    endGame();
                }
            }
        }
    }

    // Progression
    if (GAME.frames % 600 === 0) { // Every ~10s (slower ramp up)
        GAME.speed = Math.min(CONFIG.speedMax, GAME.speed + 0.5); // Gradual increase
    }

    // Draw
    ctx.clearRect(0, 0, GAME.width, GAME.height);

    // Subtle Lanes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= CONFIG.laneCount; i++) {
        let x = GAME.laneOffsetX + (i * GAME.laneWidth);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME.height);
        ctx.stroke();
    }

    // Draw Player
    drawRoundedRect(ctx, player.x - CONFIG.carSize.width / 2, player.y, CONFIG.carSize.width, CONFIG.carSize.height, 12, CONFIG.colors.player);


    // ctx.fillStyle = 'rgba(0,0,0,0.1)';
    // ctx.beginPath();
    // ctx.roundRect(player.x - CONFIG.carSize.width / 2 + 5, player.y + 20, CONFIG.carSize.width - 10, 20, 5);
    // ctx.fill();

    // Player Rear Window
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.roundRect(player.x - CONFIG.carSize.width / 2 + 5, player.y + CONFIG.carSize.height - 45, CONFIG.carSize.width - 10, 20, 5);
    ctx.fill();

    // Player Taillights (Red)
    ctx.fillStyle = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'red';

    // Left Light
    ctx.beginPath();
    ctx.roundRect(player.x - CONFIG.carSize.width / 2 + 5, player.y + CONFIG.carSize.height - 10, 15, 6, 2);
    ctx.fill();

    // Right Light
    ctx.beginPath();
    ctx.roundRect(player.x + CONFIG.carSize.width / 2 - 20, player.y + CONFIG.carSize.height - 10, 15, 6, 2);
    ctx.fill();

    // Reset Shadow
    ctx.shadowBlur = 0;

    // Player "Headlights" effect (subtle gradient ahead)
    const grad = ctx.createLinearGradient(player.x, player.y, player.x, player.y - 200);
    grad.addColorStop(0, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(player.x - 20, player.y);
    ctx.lineTo(player.x + 20, player.y);
    ctx.lineTo(player.x + 80, player.y - 300); // Spread out
    ctx.lineTo(player.x - 80, player.y - 300);
    ctx.fill();

    // Draw Enemies
    enemies.forEach(e => e.draw());

    // Update UI
    document.getElementById('score-value').innerText = GAME.scoreTime.toFixed(0) + 's';

    GAME.animationId = requestAnimationFrame(loop);
}

// Control Logic
function move(dir) {
    if (!GAME.running) return;
    if (dir === -1 && player.lane > 0) {
        player.lane--;
        playTone('switch');
    } else if (dir === 1 && player.lane < CONFIG.laneCount - 1) {
        player.lane++;
        playTone('switch');
    }
    updatePlayerPos();
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
    if (e.key === 'ArrowRight' || e.key === 'd') move(1);
    if (e.key === ' ' && !GAME.running) {
        e.preventDefault();
        startGame();
    }
});

// Touch / Click zones
window.addEventListener('touchstart', (e) => {
    // Get click relative to wrapper/canvas, NOT window
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    if (touchX < rect.width / 2) move(-1);
    else move(1);
});

// UI Logic
function startGame() {
    // Prevent multiple loops
    if (GAME.animationId) cancelAnimationFrame(GAME.animationId);

    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    enemies = [];
    GAME.scoreTime = 0;
    GAME.speed = CONFIG.speedBase;
    GAME.running = true;
    GAME.frames = 0;

    // Update Best Score UI
    document.getElementById('best-score-value').innerText = GAME.bestTime.toFixed(0) + 's';

    player.lane = 1;
    resize(); // Reset pos
    loop();
}

function endGame() {
    GAME.running = false;
    if (GAME.animationId) cancelAnimationFrame(GAME.animationId);
    playTone('crash');

    // Check Best Score
    if (GAME.scoreTime > GAME.bestTime) {
        GAME.bestTime = GAME.scoreTime;
        localStorage.setItem('traffic_best_time', GAME.bestTime);
        document.getElementById('best-score-value').innerText = GAME.bestTime.toFixed(0) + 's';
    } else {
        document.getElementById('best-score-value').innerText = GAME.bestTime.toFixed(0) + 's';
    }

    const messages = [
        "CRASHED",
        "TRAFFIC JAM",
        "TOO SLOW",
        "WRECKED",
        "GAME OVER"
    ];

    document.getElementById('death-reason').innerText = messages[Math.floor(Math.random() * messages.length)];
    document.getElementById('final-score').innerText = GAME.scoreTime.toFixed(0) + 's';

    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('active');
}

function showNotification(text) {
    playTone('notification');
    const note = document.createElement('div');
    note.className = 'toast';
    note.innerText = text;
    document.getElementById('notification-area').appendChild(note);

    setTimeout(() => {
        note.remove();
    }, 3000); // 0.3s in + 2.4s wait + 0.3s out
}

// Bindings
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('external-restart-btn').addEventListener('click', startGame);

resize();
window.addEventListener('resize', resize);