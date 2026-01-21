const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let velocityX = 0;
let velocityY = 0;
let snake = [];
let food = { x: 10, y: 10 };
let gameInterval;
let isGameRunning = false;
let inputQueue = [];

// Initialize high score display
if (highScoreElement) {
    highScoreElement.textContent = highScore;
}

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    food = { x: 15, y: 10 };
    score = 0;
    velocityX = 1;
    velocityY = 0;
    inputQueue = [];
    scoreElement.textContent = score;

    // Draw initial state
    draw();
}

function startGame() {
    if (isGameRunning) {
        // Reset logic
        clearInterval(gameInterval);
        isGameRunning = false;
        startBtn.textContent = "START";
        initGame();
    } else {
        // Start logic
        initGame();
        isGameRunning = true;
        startBtn.textContent = "RESET";
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 100);
    }
}

function gameLoop() {
    if (!isGameRunning) return;

    update();
    draw();
}

function update() {
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
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Draw snake
    ctx.fillStyle = '#4CAF50'; // Playful Green
    for (let i = 0; i < snake.length; i++) {
        // Add a slight border to snake segments for better visibility
        ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 1, gridSize - 1);

        // Draw eyes on head
        if (i === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = 4;
            const eyeOffset = 4;

            // Determine eye position based on direction
            let eye1x, eye1y, eye2x, eye2y;

            if (velocityX === 1) { // Right
                eye1x = snake[i].x * gridSize + gridSize - eyeOffset - eyeSize;
                eye1y = snake[i].y * gridSize + eyeOffset;
                eye2x = snake[i].x * gridSize + gridSize - eyeOffset - eyeSize;
                eye2y = snake[i].y * gridSize + gridSize - eyeOffset - eyeSize;
            } else if (velocityX === -1) { // Left
                eye1x = snake[i].x * gridSize + eyeOffset;
                eye1y = snake[i].y * gridSize + eyeOffset;
                eye2x = snake[i].x * gridSize + eyeOffset;
                eye2y = snake[i].y * gridSize + gridSize - eyeOffset - eyeSize;
            } else if (velocityY === 1) { // Down
                eye1x = snake[i].x * gridSize + eyeOffset;
                eye1y = snake[i].y * gridSize + gridSize - eyeOffset - eyeSize;
                eye2x = snake[i].x * gridSize + gridSize - eyeOffset - eyeSize;
                eye2y = snake[i].y * gridSize + gridSize - eyeOffset - eyeSize;
            } else { // Up (or initial)
                eye1x = snake[i].x * gridSize + eyeOffset;
                eye1y = snake[i].y * gridSize + eyeOffset;
                eye2x = snake[i].x * gridSize + gridSize - eyeOffset - eyeSize;
                eye2y = snake[i].y * gridSize + eyeOffset;
            }

            ctx.fillRect(eye1x, eye1y, eyeSize, eyeSize);
            ctx.fillRect(eye2x, eye2y, eyeSize, eyeSize);

            // Reset color for body
            ctx.fillStyle = '#45a049';
        } else {
            ctx.fillStyle = '#4CAF50';
        }
    }

    // Draw food
    ctx.fillStyle = '#FF5252'; // Playful Red
    ctx.beginPath();
    const foodCenterX = food.x * gridSize + gridSize / 2;
    const foodCenterY = food.y * gridSize + gridSize / 2;
    const foodRadius = gridSize / 2 - 2;
    ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, 2 * Math.PI);
    ctx.fill();
}

function placeFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);

    // Ensure food doesn't spawn on snake
    for (let i = 0; i < snake.length; i++) {
        if (food.x === snake[i].x && food.y === snake[i].y) {
            placeFood();
            return;
        }
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameInterval);
    startBtn.textContent = "START";

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        if (highScoreElement) highScoreElement.textContent = highScore;
    }
}

function handleInput(e) {
    if (e.key === ' ' || e.key === 'Enter') {
        startGame();
        return;
    }

    if (!isGameRunning) return;

    // Determine the last processed or queued direction
    const lastMove = inputQueue.length > 0
        ? inputQueue[inputQueue.length - 1]
        : { x: velocityX, y: velocityY };

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (lastMove.y !== 1) {
                inputQueue.push({ x: 0, y: -1 });
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (lastMove.y !== -1) {
                inputQueue.push({ x: 0, y: 1 });
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (lastMove.x !== 1) {
                inputQueue.push({ x: -1, y: 0 });
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (lastMove.x !== -1) {
                inputQueue.push({ x: 1, y: 0 });
            }
            break;
    }
}

document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);

// Draw initial state without starting
initGame();
