/** client.js - Multi-Player & Lobby Sync */
const socket = io("https://dino-run-remastered-server.onrender.com");

const client = {
    roomId: null,
    isAdmin: false,
    remotePlayers: {},

    init() {
        socket.on('joined', (data) => {
            this.roomId = data.roomId;
            this.isAdmin = data.isAdmin;
            ui.show('lobby');
            document.getElementById('display-room-id').innerText = data.roomId;
            if(this.isAdmin) document.getElementById('admin-start-btn').classList.remove('hidden');
        });

        socket.on('lobby-update', (data) => {
            const list = document.getElementById('player-list');
            const countTag = document.getElementById('player-count');
            
            // Update UI with player count
            if(countTag) countTag.innerText = `PLAYERS: ${data.count}`;
            list.innerHTML = Object.values(data.players)
                .map(p => `<div style="margin:5px;">• ${p.nickname.toUpperCase()}</div>`).join('');
        });

        socket.on('start-multiplayer', () => game.start('online'));

        socket.on('player-moved', (data) => {
            this.remotePlayers[data.id] = data;
        });

        socket.on('player-left', (id) => delete this.remotePlayers[id]);
        socket.on('error-msg', (msg) => alert(msg));
    },

    // Function to copy Room ID to clipboard
    copyRoomID() {
        const id = document.getElementById('display-room-id').innerText;
        navigator.clipboard.writeText(id).then(() => {
            alert("Room ID Copied: " + id);
        });
    },

    sendSync(nickname, x, y, duck) {
        if (this.roomId) socket.emit('sync', { roomId: this.roomId, nickname, x, y, duck });
    }
};

const onlineLobby = {
    create: () => {
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const max = document.getElementById('max-p').value;
        socket.emit('create-room', { max: max, nickname: nick });
    },
    join: () => {
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const id = document.getElementById('room-input').value.trim().toUpperCase();
        if(id) socket.emit('join-room', { roomId: id, nickname: nick });
    },
    adminStart: () => {
        if(client.roomId) socket.emit('admin-start', { roomId: client.roomId });
    }
};

window.online = onlineLobby;
window.copyRoomID = () => client.copyRoomID(); // Global bridge for HTML
client.init();
