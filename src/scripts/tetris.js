const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retry-btn');
const gameMessage = document.getElementById('game-message');
const gameMessageText = document.getElementById('game-message-text');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30; // 300px / 10 cols = 30px
const EMPTY = 'VACANT';

const Z = [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
];

const S = [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
];

const T = [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
];

const O = [
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]]
];

const L = [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]]
];

const I = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
];

const J = [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]]
];

// Tetromino definitions
const PIECES = [
    [Z, "#0277bd"], // Darker Blue
    [S, "#039be5"], // Darker Blue
    [T, "#03a9f4"], // Blue
    [O, "#29b6f6"], // Blue
    [L, "#4fc3f7"], // Light Blue
    [I, "#81d4fa"], // Sky Blue
    [J, "#99ddfcff"]  // Lightest Blue
];


let board = [];
let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let gameRunning = false;
let dropStart = Date.now();
let gameOver = false;
let p; // Current piece

highScoreElement.innerText = highScore;

// Initialize board
function createBoard() {
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = EMPTY;
        }
    }
}

// Draw a square
function drawSquare(x, y, color) {
    const gap = 2;
    const size = BLOCK_SIZE - (gap * 2);
    const radius = 4;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect((x * BLOCK_SIZE) + gap, (y * BLOCK_SIZE) + gap, size, size, radius);
    ctx.fill();
}

// Draw the board
function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // Draw empty cells with a specific color to match 2048 style
            let color = board[r][c];
            if (color === EMPTY) {
                color = "rgba(255, 255, 255, 0.4)";
            }
            drawSquare(c, r, color);
        }
    }
}

// Piece Object
class Piece {
    constructor(tetromino, color) {
        this.tetromino = tetromino;
        this.color = color;
        this.tetrominoN = 0; // Rotation index
        this.activeTetromino = this.tetromino[this.tetrominoN];
        this.x = 3;
        this.y = -2;
    }

    fill(color) {
        for (let r = 0; r < this.activeTetromino.length; r++) {
            for (let c = 0; c < this.activeTetromino.length; c++) {
                if (this.activeTetromino[r][c]) {
                    drawSquare(this.x + c, this.y + r, color);
                }
            }
        }
    }

    draw() {
        this.fill(this.color);
    }

    unDraw() {
        // Only undraw if we are within the visible board
        // But since we redraw the whole board every frame in the loop (or could), 
        // strictly speaking we might not need this if we redraw everything.
        // However, standard optimization is to just redraw the piece.
        // For simplicity, let's just redraw the board and then the piece in the loop.
        // But here we can just fill with EMPTY/transparent for the piece's position.
        // Actually, let's stick to the loop redrawing everything for simplicity and correctness.
    }

    moveDown() {
        if (!this.collision(0, 1, this.activeTetromino)) {
            this.y++;
        } else {
            this.lock();
            p = randomPiece();
        }
    }

    moveRight() {
        if (!this.collision(1, 0, this.activeTetromino)) {
            this.x++;
        }
    }

    moveLeft() {
        if (!this.collision(-1, 0, this.activeTetromino)) {
            this.x--;
        }
    }

    rotate() {
        let nextPattern = this.tetromino[(this.tetrominoN + 1) % this.tetromino.length];
        let kick = 0;

        if (this.collision(0, 0, nextPattern)) {
            if (this.x > COLS / 2) {
                // it's the right wall
                kick = -1; // move left
            } else {
                // it's the left wall
                kick = 1; // move right
            }
        }

        if (!this.collision(kick, 0, nextPattern)) {
            this.x += kick;
            this.tetrominoN = (this.tetrominoN + 1) % this.tetromino.length;
            this.activeTetromino = this.tetromino[this.tetrominoN];
        }
    }

    collision(x, y, piece) {
        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece.length; c++) {
                // if the square is empty, we skip it
                if (!piece[r][c]) {
                    continue;
                }
                // coordinates of the piece after movement
                let newX = this.x + c + x;
                let newY = this.y + r + y;

                // conditions
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                // skip newY < 0; board[-1] will crash
                if (newY < 0) {
                    continue;
                }
                // check if there is a locked piece already in place
                if (board[newY][newX] != EMPTY) {
                    return true;
                }
            }
        }
        return false;
    }

    lock() {
        for (let r = 0; r < this.activeTetromino.length; r++) {
            for (let c = 0; c < this.activeTetromino.length; c++) {
                // we skip the vacant squares
                if (!this.activeTetromino[r][c]) {
                    continue;
                }
                // pieces to lock on top = game over
                if (this.y + r < 0) {
                    gameMessageText.innerText = "GAME OVER";
                    gameMessage.classList.add('game-over');
                    gameOver = true;
                    gameRunning = false;
                    return;
                }
                // we lock the piece
                board[this.y + r][this.x + c] = this.color;
            }
        }
        // remove full rows
        for (let r = 0; r < ROWS; r++) {
            let isRowFull = true;
            for (let c = 0; c < COLS; c++) {
                isRowFull = isRowFull && (board[r][c] != EMPTY);
            }
            if (isRowFull) {
                // if the row is full
                // we move down all the rows above it
                for (let y = r; y > 1; y--) {
                    for (let c = 0; c < COLS; c++) {
                        board[y][c] = board[y - 1][c];
                    }
                }
                // the top row board[0][..] has no row above it
                for (let c = 0; c < COLS; c++) {
                    board[0][c] = EMPTY;
                }
                // increment the score
                score += 10;
                scoreElement.innerText = score;
                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('tetrisHighScore', highScore);
                }
            }
        }
    }
}

function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length);
    return new Piece(PIECES[r][0], PIECES[r][1]);
}

let requestId = null;

function drop() {
    if (!gameRunning) return;

    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) {
        p.moveDown();
        dropStart = Date.now();
    }

    // Clear and Redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    p.draw();

    if (!gameOver) {
        requestId = requestAnimationFrame(drop);
    }
}

// Controls
document.addEventListener("keydown", CONTROL);

function CONTROL(event) {
    if (!gameRunning || gameOver) return;

    const key = event.key;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        p.moveLeft();
        dropStart = Date.now();
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        p.rotate();
        dropStart = Date.now();
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        p.moveRight();
        dropStart = Date.now();
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        p.moveDown();
    }
}

function startGame() {
    if (requestId) {
        cancelAnimationFrame(requestId);
    }
    createBoard();
    score = 0;
    scoreElement.innerText = score;
    gameRunning = true;
    gameOver = false;
    gameMessage.classList.remove('game-over');
    p = randomPiece();
    dropStart = Date.now();
    drop();
    startBtn.innerText = "RESTART";
    startBtn.style.display = 'block';
}

function resetGame() {
    startGame();
}

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', resetGame);

document.addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault(); // Prevent scrolling for Space
        startGame();
    }
});

// Initial draw
createBoard();
drawBoard();
