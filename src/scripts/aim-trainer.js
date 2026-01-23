const gameArea = document.getElementById('game-area');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const timeElement = document.getElementById('time');
const accuracyElement = document.getElementById('accuracy');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreElement = document.getElementById('final-score');
const finalAccuracyElement = document.getElementById('final-accuracy');

let score = 0;
let bestScore = localStorage.getItem('aimTrainerBestScore') || 0;
let timeLeft = 60;
let totalClicks = 0;
let successfulClicks = 0;
let gameInterval;
let spawnInterval;
let isGameRunning = false;

// Initialize best score display
if (bestScoreElement) {
    bestScoreElement.textContent = bestScore;
}

function startGame() {
    score = 0;
    timeLeft = 60;
    totalClicks = 0;
    successfulClicks = 0;
    isGameRunning = true;

    updateStats();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Clear existing targets
    const targets = document.querySelectorAll('.target');
    targets.forEach(t => t.remove());

    gameInterval = setInterval(updateTime, 1000);
    spawnTarget();
}

function updateTime() {
    timeLeft--;
    timeElement.textContent = timeLeft;

    if (timeLeft <= 0) {
        endGame();
    }
}

function endGame() {
    isGameRunning = false;
    clearInterval(gameInterval);
    clearInterval(spawnInterval);

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('aimTrainerBestScore', bestScore);
        if (bestScoreElement) {
            bestScoreElement.textContent = bestScore;
        }
    }

    gameOverScreen.classList.remove('hidden');
    finalScoreElement.textContent = score;
    finalAccuracyElement.textContent = calculateAccuracy();
}

function calculateAccuracy() {
    if (totalClicks === 0) return '100%';
    const accuracy = (successfulClicks / totalClicks) * 100;
    return Math.round(accuracy) + '%';
}

function updateStats() {
    scoreElement.textContent = score;
    accuracyElement.textContent = calculateAccuracy();
}

function spawnTarget() {
    if (!isGameRunning) return;

    const target = document.createElement('div');
    target.classList.add('target');

    // Random position
    const maxX = gameArea.clientWidth - 50;
    const maxY = gameArea.clientHeight - 50;

    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);

    target.style.left = randomX + 'px';
    target.style.top = randomY + 'px';

    const size = Math.floor(Math.random() * (60 - 40 + 1)) + 40;
    target.style.width = size + 'px';
    target.style.height = size + 'px';

    // Store spawn time for scoring
    target.dataset.spawnTime = Date.now();

    target.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Prevent game area click
        handleTargetClick(target);
    });

    gameArea.appendChild(target);
}

function handleTargetClick(target) {
    if (!isGameRunning) return;

    const spawnTime = parseInt(target.dataset.spawnTime);
    const clickTime = Date.now();
    const reactionTime = clickTime - spawnTime;

    // Calculate score based on reaction time
    // Base score: 10
    // Bonus: up to 100 points for fast clicks (< 1000ms)
    const bonus = Math.max(0, Math.floor((1000 - reactionTime) / 10));
    const points = 10 + bonus;

    score += points;
    successfulClicks++;
    totalClicks++;

    // Show points popup (optional juice)
    showPointsPopup(points, target.style.left, target.style.top);

    target.remove();
    updateStats();
    spawnTarget(); // Spawn next immediately
}

function showPointsPopup(points, x, y) {
    const popup = document.createElement('div');
    popup.textContent = `+${points}`;
    popup.style.position = 'absolute';
    popup.style.left = x;
    popup.style.top = y;
    popup.style.color = '#51473b';
    popup.style.fontWeight = 'bold';
    popup.style.fontSize = '1.2rem';
    popup.style.pointerEvents = 'none';
    popup.style.animation = 'floatUp 0.5s ease-out forwards';

    gameArea.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 500);
}

gameArea.addEventListener('mousedown', (e) => {
    if (!isGameRunning) return;
    // If we clicked game area but NOT a target
    if (e.target === gameArea) {
        totalClicks++;
        score = Math.max(0, score - 5); // Penalty for missing
        updateStats();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

const scoreboardResetBtn = document.getElementById('scoreboard-reset-btn');
if (scoreboardResetBtn) {
    scoreboardResetBtn.addEventListener('click', () => {
        // Stop game if running
        isGameRunning = false;
        clearInterval(gameInterval);
        clearInterval(spawnInterval);

        // Reset state
        score = 0;
        timeLeft = 60;
        totalClicks = 0;
        successfulClicks = 0;

        // Update UI
        updateStats();
        timeElement.textContent = timeLeft;

        // Clear targets
        const targets = document.querySelectorAll('.target');
        targets.forEach(t => t.remove());

        // Show start screen
        startScreen.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
    });
}
