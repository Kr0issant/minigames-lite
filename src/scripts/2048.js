document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});

class GameManager {
    constructor() {
        this.gridSize = 4;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;

        this.gridContainer = document.querySelector('.grid-container');
        this.tileContainer = document.querySelector('#tile-container');
        this.scoreContainer = document.querySelector('#score');
        this.bestContainer = document.querySelector('#best-score');
        this.messageContainer = document.querySelector('#game-message');
        this.messageText = document.querySelector('#game-message-text');
        this.retryBtn = document.querySelector('#retry-btn');
        this.restartBtn = document.querySelector('#restart-btn');

        this.updateScore(0);
        this.updateBestScore(this.bestScore);

        this.setupInput();
        this.setupTouch();
        this.restartBtn.addEventListener('click', () => this.restart());
        this.retryBtn.addEventListener('click', () => this.restart());

        this.start();
    }

    start() {
        this.grid = new Grid(this.gridSize);
        this.score = 0;
        this.over = false;
        this.won = false;
        this.updateScore(0);
        this.clearMessage();
        this.tileContainer.innerHTML = ''; // Clear DOM tiles

        // Dynamic Sizing
        this.calculateDimensions();
        // Debounced resize listener
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.calculateDimensions();
                this.grid.eachCell((x, y, tile) => {
                    if (tile) tile.updatePosition({ x, y }); // Re-render positions
                });
            }, 100);
        });

        this.addRandomTile();
        this.addRandomTile();
    }

    calculateDimensions() {
        const gridCell = document.querySelector('.grid-cell');
        const grid = document.querySelector('.grid-container');

        if (grid && gridCell) {
            const computed = window.getComputedStyle(gridCell);
            window.tileSize = parseFloat(computed.width);
            window.tileGap = 15; // Assume fixed gap for now per CSS

            // Robust Alignment: match grid container exactly
            // Since grid-container is in normal flow inside padding, offsetLeft/Top catches that padding.
            this.tileContainer.style.width = `${grid.offsetWidth}px`;
            this.tileContainer.style.height = `${grid.offsetHeight}px`;
            this.tileContainer.style.left = `${grid.offsetLeft}px`;
            this.tileContainer.style.top = `${grid.offsetTop}px`;
            this.tileContainer.style.margin = '0';
        } else {
            // Fallback
            window.tileSize = 106.25;
            window.tileGap = 15;
        }
    }

    restart() {
        this.start();
    }

    // Input Handling
    setupInput() {
        window.addEventListener('keydown', (event) => {
            if (this.over || this.won) return;

            switch (event.key) {
                case "ArrowUp":
                    this.move("up");
                    break;
                case "ArrowDown":
                    this.move("down");
                    break;
                case "ArrowLeft":
                    this.move("left");
                    break;
                case "ArrowRight":
                    this.move("right");
                    break;
                default:
                    return;
            }
        });
    }

    setupTouch() {
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.game-container')) {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
                e.preventDefault(); // Prevent scrolling
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.over && !this.won && e.target.closest('.game-container')) {
                let touchEndX = e.changedTouches[0].screenX;
                let touchEndY = e.changedTouches[0].screenY;

                let dx = touchEndX - touchStartX;
                let dy = touchEndY - touchStartY;

                let absDx = Math.abs(dx);
                let absDy = Math.abs(dy);

                if (Math.max(absDx, absDy) > 10) { // Threshold
                    if (absDx > absDy) {
                        this.move(dx > 0 ? "right" : "left");
                    } else {
                        this.move(dy > 0 ? "down" : "up");
                    }
                }
            }
        });
    }

    // Core Game Logic
    move(direction) {
        // Clear merge flags from previous turn to allow new merges
        this.prepareTiles();

        // 0: up, 1: right, 2: down, 3: left
        const vectors = {
            up: { x: 0, y: -1 },
            right: { x: 1, y: 0 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 }
        };

        const vector = vectors[direction];
        let moved = false;

        // Traverse grid in correct order to handle merges correctly
        const traversals = this.buildTraversals(vector);

        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const cell = { x, y };
                const tile = this.grid.cellContent(cell);

                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = this.grid.cellContent(positions.next);

                    if (next && next.value === tile.value && !next.mergedFrom) {
                        // Merge
                        const merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        this.grid.insertTile(merged);
                        this.grid.removeTile(tile);

                        // Converge the two tiles' positions
                        tile.updatePosition(positions.next);
                        // next is already at positions.next

                        // Remove old tiles from DOM after animation
                        setTimeout(() => {
                            if (tile.element.parentNode) tile.element.remove();
                            if (next.element.parentNode) next.element.remove();
                        }, 100);

                        // Update Score
                        this.score += merged.value;
                        this.updateScore(this.score);

                        if (merged.value === 2048) {
                            this.won = true;
                            this.message(true);
                        }
                    } else {
                        // Move
                        this.grid.moveTile(tile, positions.farthest);
                    }

                    if (cell.x !== tile.x || cell.y !== tile.y) {
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            this.addRandomTile();

            if (!this.movesAvailable()) {
                this.over = true;
                this.message(false);
            }
        }
    }

    prepareTiles() {
        this.grid.eachCell((x, y, tile) => {
            if (tile) {
                tile.mergedFrom = null;
                tile.element.classList.remove('merged-tile');
            }
        });
    }

    buildTraversals(vector) {
        const traversals = { x: [], y: [] };

        for (let pos = 0; pos < this.gridSize; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        // Always traverse from the farthest cell in the chosen direction
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    }

    findFarthestPosition(cell, vector) {
        let previous;

        // Progress towards the vector direction until an obstacle is found
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell // Used to check if a merge is possible
        };
    }

    movesAvailable() {
        return this.grid.cellsAvailable() || this.tileMatchesAvailable();
    }

    tileMatchesAvailable() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const tile = this.grid.cellContent({ x, y });

                if (tile) {
                    for (let direction = 0; direction < 4; direction++) {
                        const vector = this.getVector(direction);
                        const cell = { x: x + vector.x, y: y + vector.y };
                        const other = this.grid.cellContent(cell);

                        if (other && other.value === tile.value) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    getVector(direction) {
        const map = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
        return map[direction];
    }

    // Grid Manipulation
    addRandomTile() {
        if (this.grid.cellsAvailable()) {
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = new Tile(this.grid.randomAvailableCell(), value);

            this.grid.insertTile(tile);
        }
    }

    // UI Updates
    updateScore(score) {
        this.scoreContainer.textContent = score;
        if (score > this.bestScore) {
            this.bestScore = score;
            this.updateBestScore(score);
            localStorage.setItem('bestScore', score);
        }
    }

    updateBestScore(score) {
        this.bestContainer.textContent = score;
    }

    message(won) {
        this.messageContainer.classList.add(won ? 'game-won' : 'game-over');
        this.messageText.textContent = won ? "You Won!" : "Game Over!";
        this.messageContainer.style.display = 'flex';
    }

    clearMessage() {
        this.messageContainer.classList.remove('game-won', 'game-over');
        this.messageContainer.style.display = 'none';
    }
}

class Grid {
    constructor(size) {
        this.size = size;
        this.cells = this.empty();
    }

    empty() {
        const cells = [];
        for (let x = 0; x < this.size; x++) {
            const row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(null);
            }
        }
        return cells;
    }

    randomAvailableCell() {
        const cells = this.availableCells();
        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    }

    availableCells() {
        const cells = [];
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (!this.cells[x][y]) {
                    cells.push({ x, y });
                }
            }
        }
        return cells;
    }

    // Helper to iterate
    eachCell(callback) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                callback(x, y, this.cells[x][y]);
            }
        }
    }

    cellsAvailable() {
        return !!this.availableCells().length;
    }

    cellAvailable(cell) {
        return !this.cellOccupied(cell);
    }

    cellOccupied(cell) {
        return !!this.cellContent(cell);
    }

    cellContent(cell) {
        if (this.withinBounds(cell)) {
            return this.cells[cell.x][cell.y];
        } else {
            return null;
        }
    }

    insertTile(tile) {
        this.cells[tile.x][tile.y] = tile;
    }

    removeTile(tile) {
        this.cells[tile.x][tile.y] = null;
    }

    moveTile(tile, cell) {
        this.cells[tile.x][tile.y] = null;
        this.cells[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    }

    withinBounds(cell) {
        return cell.x >= 0 && cell.x < this.size &&
            cell.y >= 0 && cell.y < this.size;
    }
}

class Tile {
    constructor(position, value) {
        this.x = position.x;
        this.y = position.y;
        this.value = value || 2;
        this.mergedFrom = null; // Track merges for animation

        this.element = document.createElement('div');
        this.element.classList.add('tile', `tile-${this.value}`);

        // Inner container for visuals
        this.inner = document.createElement('div');
        this.inner.classList.add('tile-inner');
        this.inner.textContent = this.value;
        this.element.appendChild(this.inner);

        if (value > 2048) {
            this.element.classList.add('tile-super');
        }

        this.positionTile();

        // Add new-tile animation class
        this.element.classList.add('new-tile');

        document.getElementById('tile-container').appendChild(this.element);
    }

    updatePosition(position) {
        this.x = position.x;
        this.y = position.y;
        this.positionTile();
    }

    positionTile() {
        // Dynamic sizing logic
        // If window.tileSize is set, use it. Otherwise fallback.
        const tileSize = window.tileSize || 106.25;
        const gap = window.tileGap || 15;

        const xPos = this.x * (tileSize + gap);
        const yPos = this.y * (tileSize + gap);

        this.element.style.width = `${tileSize}px`;
        this.element.style.height = `${tileSize}px`;
        this.element.style.transform = `translate(${xPos}px, ${yPos}px)`;

        this.inner.style.lineHeight = `${tileSize}px`;

        // Optional: dynamic font size could be added here
    }
}
