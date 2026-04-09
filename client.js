/** * client.js - Multiplayer Networking
 * Handles socket connections, room logic, and player synchronization.
 */
const socket = io("https://dino-run-remastered-server.onrender.com");

const client = {
    roomId: null,
    remotePlayers: {},

    init() {
        socket.on('connect', () => console.log("Network: Online [" + socket.id + "]"));
        
        socket.on('joined', (data) => {
            this.roomId = data.roomId;
            game.start('online'); 
            console.log("Joined Room: " + data.roomId);
        });

        socket.on('player-moved', (data) => {
            this.remotePlayers[data.id] = data;
        });

        socket.on('player-left', (id) => {
            delete this.remotePlayers[id];
        });

        socket.on('update-leaderboard', (data) => {
            const list = document.getElementById('leaderboard-list');
            if (list) {
                list.innerHTML = data.map((s, i) => 
                    `<div>${i+1}. ${s.name.toUpperCase()} - ${s.score}</div>`
                ).join('');
            }
        });

        socket.on('error-msg', (msg) => alert(msg));
    },

    sendSync(nickname, x, y, duck) {
        if (this.roomId) {
            socket.emit('sync', { roomId: this.roomId, nickname, x, y, duck });
        }
    },

    submitScore(name, score) {
        socket.emit('submit-score', { name, score });
    },

    getLeaderboard() {
        socket.emit('get-leaderboard');
    }
};

// --- GLOBAL MULTIPLAYER BRIDGE ---
const onlineLobby = {
    create: () => {
        if(!socket.connected) return alert("Waking up server...");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const max = parseInt(document.getElementById('max-p').value);
        socket.emit('create-room', { max, nickname: nick });
    },
    join: () => {
        if(!socket.connected) return alert("Connecting...");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const id = document.getElementById('room-input').value.trim();
        if(id) socket.emit('join-room', { roomId: id, nickname: nick });
    }
};

window.online = onlineLobby;
client.init();
