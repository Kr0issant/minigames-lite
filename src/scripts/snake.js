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
let food = { x: 10, y: 10 };
let gameInterval;
let animationFrameId;
let isGameRunning = false;
let inputQueue = [];

let isFirstStart = true;

// Initialize high score display
if (highScoreElement) {
    highScoreElement.textContent = highScore;
}

function initGame(shouldPlaceFood = true) {
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];

    if (shouldPlaceFood) {
        placeFood(); // Place food randomly within bounds
    }

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
        stopGame();
        startBtn.textContent = "START";
        initGame();
    } else {
        // Start logic
        // Only place new food if it's NOT the first start
        initGame(!isFirstStart);
        isFirstStart = false;

        isGameRunning = true;
        startBtn.textContent = "RESET";
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(update, 100); // Game logic at 10fps
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

function draw(time = performance.now()) {
    // Clear canvas to let CSS background show through
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
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

    // Draw food with pulsing animation
    const pulseScale = 1 + Math.sin(time / 200) * 0.1; // Oscillate between 0.9 and 1.1
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    const foodRadius = (gridSize / 2 - 2) * pulseScale;

    ctx.fillStyle = '#ff6b6b'; // Playful Red
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add shine to food
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(foodX - foodRadius * 0.3, foodY - foodRadius * 0.3, foodRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Draw snake
    ctx.fillStyle = '#4ec050'; // Playful Green
    for (let i = 0; i < snake.length; i++) {
        const x = snake[i].x * gridSize;
        const y = snake[i].y * gridSize;
        const size = gridSize - 0.5; // Minimal gap
        const radius = 5; // Rounded corners

        // Draw rounded rectangle for segment
        ctx.beginPath();
        ctx.roundRect(x + 0.25, y + 0.25, size, size, radius);
        ctx.fill();

        // Draw eyes on head
        if (i === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = 10;
            const eyeOffset = 6;
            let eye1x, eye1y, eye2x, eye2y;

            // Default to right if not moving
            let vx = velocityX;
            let vy = velocityY;
            if (vx === 0 && vy === 0) vx = 1;

            if (vx === 1) { // Right
                eye1x = x + gridSize - eyeOffset - eyeSize;
                eye1y = y + eyeOffset;
                eye2x = x + gridSize - eyeOffset - eyeSize;
                eye2y = y + gridSize - eyeOffset - eyeSize;
            } else if (vx === -1) { // Left
                eye1x = x + eyeOffset;
                eye1y = y + eyeOffset;
                eye2x = x + eyeOffset;
                eye2y = y + gridSize - eyeOffset - eyeSize;
            } else if (vy === 1) { // Down
                eye1x = x + eyeOffset;
                eye1y = y + gridSize - eyeOffset - eyeSize;
                eye2x = x + gridSize - eyeOffset - eyeSize;
                eye2y = y + gridSize - eyeOffset - eyeSize;
            } else if (vy === -1) { // Up
                eye1x = x + eyeOffset;
                eye1y = y + eyeOffset;
                eye2x = x + gridSize - eyeOffset - eyeSize;
                eye2y = y + eyeOffset;
            }

            ctx.beginPath();
            ctx.arc(eye1x + eyeSize / 2, eye1y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
            ctx.arc(eye2x + eyeSize / 2, eye2y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = 'black';
            const pupilSize = 4;
            ctx.beginPath();
            ctx.arc(eye1x + eyeSize / 2 + vx, eye1y + eyeSize / 2 + vy, pupilSize / 2, 0, Math.PI * 2);
            ctx.arc(eye2x + eyeSize / 2 + vx, eye2y + eyeSize / 2 + vy, pupilSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Reset fill style for next segment
            ctx.fillStyle = '#4ec050';
        }
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

    // Draw Game Over overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px "Fredoka One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '20px "Inter", sans-serif';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

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
initGame();
