const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');

const tileCount = 18;
const gridSize = canvas.width / tileCount;

let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let velocityX = 0;
let velocityY = 0;
let snake = [];
let prevSnake = [];
let food = { x: 10, y: 10 };
let gameInterval;
let animationFrameId;
let isGameRunning = false;
let inputQueue = [];

let isFirstStart = true;
let hasPendingReset = false;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 100;

// Initialize high score display
if (highScoreElement) {
    highScoreElement.textContent = highScore;
}

const messageContainer = document.getElementById('game-message');
const messageText = document.getElementById('game-message-text');
const retryBtn = document.getElementById('retry-btn');

retryBtn.addEventListener('click', startGame);

function initGame(shouldPlaceFood = true) {
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    prevSnake = snake.map(s => ({ ...s }));

    if (shouldPlaceFood) {
        placeFood(); // Place food randomly within bounds
    }

    score = 0;
    velocityX = 1;
    velocityY = 0;
    lastUpdateTime = performance.now();
    inputQueue = [];
    scoreElement.textContent = score;

    // Hide message
    messageContainer.classList.remove('game-over');
    messageContainer.style.display = 'none';

    // Draw initial state
    draw();
}

function startGame() {
    if (isGameRunning) {
        // Reset logic
        stopGame();
        startBtn.textContent = "START";
        initGame();
        hasPendingReset = true;
    } else {
        // Start logic
        // Only re-init if we didn't just reset
        if (!hasPendingReset) {
            initGame(!isFirstStart);
        }
        hasPendingReset = false;
        isFirstStart = false;

        isGameRunning = true;
        startBtn.textContent = "RESTART";
        if (gameInterval) clearInterval(gameInterval);
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(update, UPDATE_INTERVAL); // Game logic at 10fps
        drawLoop(); // Animation at 60fps
    }
}

function stopGame() {
    isGameRunning = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId);
}

function drawLoop(time) {
    if (!isGameRunning) return;
    draw(time);
    animationFrameId = requestAnimationFrame(drawLoop);
}

function update() {
    prevSnake = snake.map(s => ({ ...s }));

    // Process input queue
    if (inputQueue.length > 0) {
        const nextMove = inputQueue.shift();
        velocityX = nextMove.x;
        velocityY = nextMove.y;
    }

    // Move snake
    const head = { x: snake[0].x + velocityX, y: snake[0].y + velocityY };

    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }

    // Check self collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        placeFood();
    } else {
        snake.pop();
    }
    lastUpdateTime = performance.now();
}

function draw(time = performance.now()) {
    // Clear canvas to let CSS background show through
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gap = 2;
    const size = gridSize - (gap * 2);
    const radius = 4;

    // Draw grid cells
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let x = 0; x < tileCount; x++) {
        for (let y = 0; y < tileCount; y++) {
            ctx.beginPath();
            ctx.roundRect((x * gridSize) + gap, (y * gridSize) + gap, size, size, radius);
            ctx.fill();
        }
    }

    // Draw food (Apple)
    const pulseScale = 1 + Math.sin(time / 200) * 0.1;
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    const foodRadius = (gridSize / 2) * 0.8 * pulseScale;

    // Apple Body
    ctx.fillStyle = '#e7471d'; // Apple Red
    ctx.beginPath();
    ctx.arc(foodX, foodY + 2, foodRadius, 0, Math.PI * 2); // Slightly lower
    ctx.fill();

    // Apple Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(foodX - foodRadius * 0.3, foodY - foodRadius * 0.2, foodRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Apple Leaf
    ctx.fillStyle = '#578a34'; // Leaf Green
    ctx.beginPath();
    ctx.ellipse(foodX, foodY - foodRadius, foodRadius * 0.4, foodRadius * 0.2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw snake
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = '#4ec050'; // Playful Green

    // Calculate interpolation factor
    const timeSinceLastUpdate = time - lastUpdateTime;
    let alpha = timeSinceLastUpdate / UPDATE_INTERVAL;
    if (alpha < 0) alpha = 0;
    if (alpha > 1) alpha = 1;

    // Helper for linear interpolation
    const lerp = (start, end, t) => start + (end - start) * t;

    if (snake.length > 0 && prevSnake.length > 0) {
        ctx.beginPath();

        // 1. Interpolated Head Position
        const headStart = prevSnake[0];
        const headEnd = snake[0];
        const headX = lerp(headStart.x, headEnd.x, alpha);
        const headY = lerp(headStart.y, headEnd.y, alpha);

        ctx.moveTo(headX * gridSize + gridSize / 2, headY * gridSize + gridSize / 2);

        // 2. Body Segments (Static corners)
        // Iterate through prevSnake to define the path shape
        // We stop before the last segment because the tail is moving
        for (let i = 0; i < prevSnake.length - 1; i++) {
            const p = prevSnake[i];
            ctx.lineTo(p.x * gridSize + gridSize / 2, p.y * gridSize + gridSize / 2);
        }

        // 3. Interpolated Tail Position
        const tailStart = prevSnake[prevSnake.length - 1];
        let tailEnd;

        // Check if growing (snake is longer than prevSnake)
        if (snake.length > prevSnake.length) {
            tailEnd = tailStart; // Tail stays put
        } else {
            // Tail moves towards the segment before it
            tailEnd = prevSnake[prevSnake.length - 2] || tailStart;
        }

        const tailX = lerp(tailStart.x, tailEnd.x, alpha);
        const tailY = lerp(tailStart.y, tailEnd.y, alpha);

        ctx.lineTo(tailX * gridSize + gridSize / 2, tailY * gridSize + gridSize / 2);

        ctx.stroke();

        // 4. Draw Eyes at Interpolated Head
        ctx.fillStyle = 'white';
        const eyeSize = 10;
        const eyeOffset = 6;

        // Determine current direction for eyes
        let vx = headEnd.x - headStart.x;
        let vy = headEnd.y - headStart.y;
        if (vx === 0 && vy === 0) {
            vx = velocityX;
            vy = velocityY;
        }

        // Base eye positions relative to head center (0,0)
        // We'll rotate/position them based on direction
        const cx = headX * gridSize + gridSize / 2;
        const cy = headY * gridSize + gridSize / 2;

        let eye1x, eye1y, eye2x, eye2y;

        // Offset from center to eyes
        const perpX = -vy; // Perpendicular vector
        const perpY = vx;

        // Push eyes forward and apart
        const forwardOffset = size / 4;
        const sideOffset = size / 4;

        eye1x = cx + vx * forwardOffset + perpX * sideOffset - eyeSize / 2;
        eye1y = cy + vy * forwardOffset + perpY * sideOffset - eyeSize / 2;
        eye2x = cx + vx * forwardOffset - perpX * sideOffset - eyeSize / 2;
        eye2y = cy + vy * forwardOffset - perpY * sideOffset - eyeSize / 2;

        ctx.beginPath();
        ctx.arc(eye1x + eyeSize / 2, eye1y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        ctx.arc(eye2x + eyeSize / 2, eye2y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = 'black';
        const pupilSize = 4;
        const pupilOffset = 2;

        ctx.beginPath();
        ctx.arc(eye1x + eyeSize / 2 + vx * pupilOffset, eye1y + eyeSize / 2 + vy * pupilOffset, pupilSize / 2, 0, Math.PI * 2);
        ctx.arc(eye2x + eyeSize / 2 + vx * pupilOffset, eye2y + eyeSize / 2 + vy * pupilOffset, pupilSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function placeFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };

    // Don't place food on snake
    for (let i = 0; i < snake.length; i++) {
        if (food.x === snake[i].x && food.y === snake[i].y) {
            placeFood();
            return;
        }
    }
}

function gameOver() {
    stopGame();

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        if (highScoreElement) {
            highScoreElement.textContent = highScore;
        }
    }

    // Show Game Over overlay
    messageText.textContent = "Game Over!";
    messageContainer.classList.add('game-over');
    messageContainer.style.display = 'flex';

    startBtn.textContent = "START";
}

function handleInput(event) {
    const key = event.key;

    // Prevent default scrolling for arrow keys and space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(key) > -1) {
        event.preventDefault();
    }

    if (key === ' ' || key === 'Enter') {
        startGame();
        return;
    }

    if (!isGameRunning) return;

    // Get the last scheduled direction or current velocity
    const lastMove = inputQueue.length > 0
        ? inputQueue[inputQueue.length - 1]
        : { x: velocityX, y: velocityY };

    let newDirection = null;

    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && lastMove.y !== 1) {
        newDirection = { x: 0, y: -1 };
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && lastMove.y !== -1) {
        newDirection = { x: 0, y: 1 };
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && lastMove.x !== 1) {
        newDirection = { x: -1, y: 0 };
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && lastMove.x !== -1) {
        newDirection = { x: 1, y: 0 };
    }

    if (newDirection) {
        inputQueue.push(newDirection);
    }
}

document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);

// Initial draw
// Initial draw
initGame();

// === TOUCH CONTROLS ===
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isGameRunning) return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, { passive: false });

function handleSwipe(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Minimum swipe distance to trigger move
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) return;

    const lastMove = inputQueue.length > 0
        ? inputQueue[inputQueue.length - 1]
        : { x: velocityX, y: velocityY };

    let newDirection = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal Swipe
        if (deltaX > 0 && lastMove.x !== -1) {
            newDirection = { x: 1, y: 0 }; // Right
        } else if (deltaX < 0 && lastMove.x !== 1) {
            newDirection = { x: -1, y: 0 }; // Left
        }
    } else {
        // Vertical Swipe
        if (deltaY > 0 && lastMove.y !== -1) {
            newDirection = { x: 0, y: 1 }; // Down
        } else if (deltaY < 0 && lastMove.y !== 1) {
            newDirection = { x: 0, y: -1 }; // Up
        }
    }

    if (newDirection) {
        inputQueue.push(newDirection);
    }
}
