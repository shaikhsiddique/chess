const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

io.on("connection", (uniqueSocket) => {
   
    
    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.emit("boardState", chess.fen());

    uniqueSocket.on("move", (move) => {
       
        try {
            if (chess.turn() === 'w' && uniqueSocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniqueSocket.id !== players.black) return;
    
            const result = chess.move(move);
            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
               
            } else {
                
                uniqueSocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log('Error handling move:', err);
            uniqueSocket.emit("invalidMove", move);
        }
    });
    
    uniqueSocket.on('newGameRequest', () => {
        
            chess.reset(); 
            io.emit('boardState', chess.fen()); 
          
    });

    uniqueSocket.on('undoRequest',()=>{
        chess.undo();
        io.emit("boardState", chess.fen());
    })

    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        } else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
        console.log("Player disconnected:", uniqueSocket.id);
    });
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});
