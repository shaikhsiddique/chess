document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const chess = new Chess();
    const boardElements = document.querySelector('#chessboard');
    const GameInfo = document.querySelector('#playerRole');
    const newGameButton = document.querySelector('#newGameButton');
    const undoButton = document.querySelector('#undo');

    let moveHistory = [];

    let draggedPiece = null;
    let sourceSquare = null;
    let playerRole = null;

    const RenderBoard = () => {
        const board = chess.board();
        boardElements.innerHTML = "";

        board.forEach((row, rowindex) => {
            row.forEach((square, squareindex) => {
                const squareElement = document.createElement("div");
                squareElement.classList.add("square",
                    (rowindex + squareindex) % 2 == 0 ? "light" : "dark"
                );
                squareElement.dataset.row = rowindex;
                squareElement.dataset.col = squareindex;

                if (square) {
                    const pieceElement = document.createElement("div");
                    pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");

                    pieceElement.innerText = GetPieceUnicode(square.type, square.color);
                    pieceElement.draggable = playerRole === square.color;

                    pieceElement.addEventListener("dragstart", (e) => {
                        if (pieceElement.draggable) {
                            draggedPiece = pieceElement;
                            sourceSquare = { row: rowindex, col: squareindex };
                            e.dataTransfer.setData("text/plain", "");
                        }
                    });

                    pieceElement.addEventListener("dragend", () => {
                        draggedPiece = null;
                        sourceSquare = null;
                    });

                    squareElement.appendChild(pieceElement);
                }

                squareElement.addEventListener("dragover", (e) => {
                    e.preventDefault();
                });

                squareElement.addEventListener("drop", (e) => {
                    e.preventDefault();
                    if (draggedPiece) {
                        const targetSquare = {
                            row: parseInt(squareElement.dataset.row),
                            col: parseInt(squareElement.dataset.col)
                        };
                        HandleMove(sourceSquare, targetSquare);
                    }
                });

                boardElements.appendChild(squareElement);
            });
        });

        if (playerRole === 'b') {
            boardElements.classList.add("flipped");
        } else {
            boardElements.classList.remove("flipped");
        }
    };

    const HandleMove = (source, target) => {
        const move = {
            from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
            to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
            promotion: 'q' // Always promote to queen for simplicity
        };
        socket.emit("move", move);
    };

    const GetPieceUnicode = (type, color) => {
        const pieces = {
            'p': color === 'w' ? '\u2659' : '\u265F',
            'r': color === 'w' ? '\u2656' : '\u265C',
            'n': color === 'w' ? '\u2658' : '\u265E',
            'b': color === 'w' ? '\u2657' : '\u265D',
            'q': color === 'w' ? '\u2655' : '\u265B',
            'k': color === 'w' ? '\u2654' : '\u265A'
        };
        return pieces[type];
    };

    const GameOver = () => {
        if (chess.game_over()) {
            if (chess.in_checkmate()) {
                const winner = chess.turn() === 'w' ? 'Black' : 'White';
                GameInfo.textContent = `Checkmate! ${winner} wins.`;
            } else if (chess.in_draw()) {
                GameInfo.textContent = 'Draw: The game is drawn.';
            } else if (chess.in_stalemate()) {
                GameInfo.textContent = 'Stalemate: The game is drawn due to stalemate.';
            } else if (chess.insufficient_material()) {
                GameInfo.textContent = 'Draw: The game is drawn due to insufficient material.';
            } else if (chess.in_threefold_repetition()) {
                GameInfo.textContent = 'Draw: The game is drawn due to threefold repetition.';
            } else if (chess.in_fifty_moves()) {
                GameInfo.textContent = 'Draw: The game is drawn due to the fifty-move rule.';
            } else {
                GameInfo.textContent = 'Game over: Other reason.';
            }
            newGameButton.classList.remove("hidden");
            undoButton.classList.add("hidden");
        }
    };

    socket.on("playerRole", (role) => {
        playerRole = role;
        GameInfo.textContent = `You are playing as ${role === 'w' ? 'White' : 'Black'}`;
        RenderBoard();
    });

    socket.on("spectatorRole", () => {
        playerRole = null;
        GameInfo.textContent = 'You are a spectator';
        RenderBoard();
    });

    socket.on("boardState", (fen) => {
        chess.load(fen);
        RenderBoard();
        GameOver();
    });

    socket.on("move", (move) => {
        const result = chess.move(move);
        if (result) {
            moveHistory.push(result);
        }
        RenderBoard();
        GameOver();
    });

    newGameButton.addEventListener("click", () => {
        socket.emit("newGameRequest");
        newGameButton.classList.add("hidden");
    });

    undoButton.addEventListener("click", () => {
        if (moveHistory.length > 0) {
            const lastMove = moveHistory.pop();
            chess.undo();
            socket.emit("undoRequest");
            RenderBoard();
            GameOver();
        }
    });

    GameOver();
});
