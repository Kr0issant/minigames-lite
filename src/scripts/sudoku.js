document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let board = [];
    let solution = [];
    let timerInterval;
    let seconds = 0;
    let mistakes = 0;
    let selectedTile = null;
    let isGameOver = false;
    let totalWins = localStorage.getItem('sudoku_wins') ? parseInt(localStorage.getItem('sudoku_wins')) : 0;

    // Constants
    const DIFFICULTY_SETTINGS = {
        'easy': 30,    // Remove 30 numbers
        'medium': 40,  // Remove 40 numbers
        'hard': 50     // Remove 50 numbers
    };
    let currentDifficulty = 'easy';

    // --- DOM ELEMENTS ---
    const boardElement = document.getElementById('sudoku-board');
    const mistakesElement = document.getElementById('mistakes-count');
    const timerElement = document.getElementById('timer');
    const winsElement = document.getElementById('wins-count');
    const difficultyLabel = document.getElementById('difficulty-label');
    const newGameBtn = document.getElementById('new-game-btn');
    const difficultyMenu = document.getElementById('difficulty-menu');
    const numpad = document.getElementById('numpad');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- INITIALIZATION ---
    initGame();

    // --- EVENT LISTENERS ---
    newGameBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from closing menu immediately if logic added later
        difficultyMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentDifficulty = e.target.getAttribute('data-diff');
            difficultyLabel.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
            difficultyMenu.classList.add('hidden');
            startGame();
        });
    });

    // Global click listener to close menus if clicked outside
    document.addEventListener('click', (e) => {
        if (!newGameBtn.contains(e.target) && !difficultyMenu.contains(e.target)) {
            difficultyMenu.classList.add('hidden');
        }
    });

    // Number Pad Listener
    numpad.addEventListener('click', (e) => {
        if (isGameOver) return;
        if (e.target.classList.contains('number')) {
            let number = e.target.getAttribute('data-number');
            fillTile(number);
        }
    });

    // Keyboard Listener
    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;

        const key = e.key;
        // Arrow Keys Navigation
        if (selectedTile) {
            let currentId = parseInt(selectedTile.id);
            let row = Math.floor(currentId / 9);
            let col = currentId % 9;

            if (key === 'ArrowUp') row = Math.max(0, row - 1);
            else if (key === 'ArrowDown') row = Math.min(8, row + 1);
            else if (key === 'ArrowLeft') col = Math.max(0, col - 1);
            else if (key === 'ArrowRight') col = Math.min(8, col + 1);
            else if (key >= '1' && key <= '9') {
                fillTile(key);
                return;
            } else if (key === 'Backspace' || key === 'Delete') {
                // Optional: Allow clearing if needed, but usually Sudoku logic prevents clearing correct ones
                // For this version, we'll only allow clearing user input that is NOT correct yet? 
                // Actually, standard is you can clear your own notes, but here we validate instantly.
                return;
            } else {
                return;
            }

            let newId = row * 9 + col;
            selectTile(document.getElementById(newId.toString()));
        }
    });

    // Modal Close
    modalCloseBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        if (mistakes >= 3) {
            startGame(); // Restart if lost
        }
    });


    // --- GAME LOGIC ---

    function initGame() {
        startGame();
    }

    function startGame() {
        // Reset State
        isGameOver = false;
        mistakes = 0;
        document.getElementById('mistakes-count').textContent = "0/3";
        if (winsElement) winsElement.textContent = totalWins;
        seconds = 0;
        clearInterval(timerInterval);
        startTimer();

        // Generate Board
        board = Array(81).fill(0);
        solution = Array(81).fill(0);

        // 1. Generate full solved board
        generateSolution(0, 0);
        solution = [...board]; // Copy full solution

        // 2. Remove digits based on difficulty
        removeDigits();

        // 3. Render
        drawBoard();
    }

    // Backtracking Algorithm to generate a valid board
    function generateSolution(row, col) {
        if (col === 9) {
            row++;
            col = 0;
            if (row === 9) return true; // Reached end
        }

        if (board[row * 9 + col] !== 0) {
            return generateSolution(row, col + 1);
        }

        let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffleArray(numbers); // Randomize to get different puzzles

        for (let num of numbers) {
            if (isValidPlacement(row, col, num)) {
                board[row * 9 + col] = num;
                if (generateSolution(row, col + 1)) return true;
                board[row * 9 + col] = 0; // Backtrack
            }
        }
        return false;
    }

    function removeDigits() {
        let attempts = DIFFICULTY_SETTINGS[currentDifficulty];
        while (attempts > 0) {
            let row = Math.floor(Math.random() * 9);
            let col = Math.floor(Math.random() * 9);
            let index = row * 9 + col;

            if (board[index] !== 0) {
                board[index] = 0;
                attempts--;
            }
        }
    }

    function isValidPlacement(row, col, num) {
        // Check Row
        for (let c = 0; c < 9; c++) {
            if (board[row * 9 + c] === num) return false;
        }
        // Check Col
        for (let r = 0; r < 9; r++) {
            if (board[r * 9 + col] === num) return false;
        }
        // Check 3x3 Box
        let startRow = Math.floor(row / 3) * 3;
        let startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[(startRow + r) * 9 + (startCol + c)] === num) return false;
            }
        }
        return true;
    }

    function drawBoard() {
        boardElement.innerHTML = ''; // Clear existing
        selectedTile = null;

        for (let i = 0; i < 81; i++) {
            let tile = document.createElement('div');
            tile.id = i.toString();
            tile.classList.add('tile');

            // Add grid borders
            let col = i % 9;
            let row = Math.floor(i / 9);

            if (col === 2 || col === 5) tile.classList.add('border-right');
            if (row === 2 || row === 5) tile.classList.add('border-bottom');

            // Fill content
            if (board[i] !== 0) {
                tile.textContent = board[i];
                tile.classList.add('filled');
            } else {
                // Add event listener only to empty tiles (optional, or allow selecting all)
                // We typically allow selecting all to highlight numbers
            }

            tile.addEventListener('click', () => selectTile(tile));
            boardElement.appendChild(tile);
        }
    }

    function selectTile(tile) {
        if (isGameOver) return;

        // Remove previous selection
        if (selectedTile) selectedTile.classList.remove('selected');
        selectedTile = tile;
        selectedTile.classList.add('selected');

        // Highlight all tiles with same number (if filled)
        highlightSameNumbers(tile.textContent);
    }

    function highlightSameNumbers(val) {
        // Clear previous highlights
        document.querySelectorAll('.tile').forEach(t => t.classList.remove('highlighted'));

        if (!val) return;

        document.querySelectorAll('.tile').forEach(t => {
            if (t.textContent === val) {
                t.classList.add('highlighted');
            }
        });
    }

    function fillTile(number) {
        if (!selectedTile || isGameOver) return;

        // If already filled by system (initial board), cannot change
        if (selectedTile.classList.contains('filled')) return;

        // Check Logic
        let id = parseInt(selectedTile.id);

        if (solution[id] == number) {
            // Correct
            selectedTile.textContent = number;
            selectedTile.classList.add('user-input');
            selectedTile.classList.remove('error');
            board[id] = parseInt(number); // Update internal state

            // Highlight checking
            highlightSameNumbers(number);

            checkWin();
        } else {
            // Incorrect
            mistakes++;
            document.getElementById('mistakes-count').textContent = `${mistakes}/3`;
            selectedTile.classList.add('error');

            // Temporary simple error animation or just generic handling
            if (mistakes >= 3) {
                endGame(false);
            }
        }
    }

    function checkWin() {
        // Simple check: is board full?
        // Since we only allow correct moves in this version, full board = win.
        let isFull = board.every(cell => cell !== 0);
        if (isFull) {
            endGame(true);
        }
    }

    function endGame(win) {
        isGameOver = true;
        clearInterval(timerInterval);

        if (win) {
            modalTitle.textContent = "You Won!";
            modalMessage.textContent = `Great job! Time: ${formatTime(seconds)}`;

            // Update Wins
            totalWins++;
            localStorage.setItem('sudoku_wins', totalWins);
            if (winsElement) winsElement.textContent = totalWins;
        } else {
            modalTitle.textContent = "Game Over";
            modalMessage.textContent = "You made 3 mistakes. Try again!";
        }
        modalOverlay.classList.remove('hidden');
    }

    // --- UTILS ---

    function startTimer() {
        timerInterval = setInterval(() => {
            seconds++;
            timerElement.textContent = formatTime(seconds);
        }, 1000);
    }

    function formatTime(s) {
        let min = Math.floor(s / 60);
        let sec = s % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});
