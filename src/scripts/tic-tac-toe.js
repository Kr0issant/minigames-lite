var chance = "cross";
var move = 0;
var gameEnded = false;

const crossScore = document.querySelector(".score-cross");
const circleScore = document.querySelector(".score-circle");

const winMasks = [448, 56, 7, 292, 146, 73, 273, 84];
var boxes = ["0", "0", "0", "0", "0", "0", "0", "0", "0"];

const docBoxes = document.querySelectorAll(".tic-box");
docBoxes.forEach((box) => {
    box.addEventListener("click", ticClick);
});

const resetBtn = document.querySelector(".reset-btn");
resetBtn.addEventListener("click", reset);

function ticClick(e) {
    if (e.target.innerHTML !== "") { return; }
    if (gameEnded) { return; }

    boxes[e.target.id] = chance;

    if (chance === "cross") {
        e.target.innerHTML = '<img src="../assets/cross.png" draggable="false">';
        e.target.classList.add("pop-in");
        chance = "circle";
    } else {
        e.target.innerHTML = '<img src="../assets/circle.png" draggable="false">';
        e.target.classList.add("pop-in");
        chance = "cross";
    }

    move++;
    let victor = checkWin();

    if (victor != "") {
        gameEnded = true;

        if (victor === "cross") {
            crossScore.innerHTML = parseInt(crossScore.innerHTML) + 1;
        } else if (victor === "circle") {
            circleScore.innerHTML = parseInt(circleScore.innerHTML) + 1;
        }
    }
}

function checkWin() {
    if (move === 9) {
        gameEnded = true;
    }

    let victor = "";
    let lastChance = (chance == "cross" ? "circle" : "cross");

    let gameMask = parseInt(boxes.join("").replaceAll(lastChance, "1").replaceAll(chance, "0"), 2);

    winMasks.forEach(win => {
        if ((gameMask & win) == win) {
            victor = lastChance;

            let w = win.toString(2);
            w = "0".repeat(9 - w.length) + w;

            for (i = 0; i < w.length; i++) {
                if (w[i] === "1") {
                    document.getElementById(i).classList.add("win-tile");
                }
            };
        }
    });

    return gameEnded && victor === "" ? "tie" : victor;
}

function reset() {
    for (i = 0; i < 9; i++) {
        let t = document.getElementById(i);
        t.innerHTML = "";
        t.classList.remove("win-tile");
        t.classList.remove("pop-in");

        boxes[i] = "0";
    }
    move = 0;
    chance = "cross";
    gameEnded = false;
}
