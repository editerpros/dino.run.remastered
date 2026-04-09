/** client.js - Multiplayer Networking */
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
            if(countTag) countTag.innerText = `PLAYERS: ${data.count}`;
            list.innerHTML = Object.values(data.players)
                .map(p => `<div style="margin:5px;">• ${p.nickname.toUpperCase()}</div>`).join('');
        });

        socket.on('start-multiplayer', () => game.start('online'));
        socket.on('player-moved', (d) => this.remotePlayers[d.id] = d);
        socket.on('player-left', (id) => delete this.remotePlayers[id]);
        socket.on('error-msg', (m) => alert(m));
    },

    // FIX: Explicitly define submitScore so script.js can call it
    submitScore(name, score) {
        if (socket.connected) {
            socket.emit('submit-score', { name, score });
        }
    },

    sendSync(nickname, x, y, duck) {
        if (this.roomId) {
            socket.emit('sync', { roomId: this.roomId, nickname, x, y, duck });
        }
    },

    copyRoomID() {
        const id = document.getElementById('display-room-id').innerText;
        navigator.clipboard.writeText(id).then(() => alert("ID Copied: " + id));
    }
};

const onlineLobby = {
    create: () => {
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const max = document.getElementById('max-p').value;
        socket.emit('create-room', { max, nickname: nick });
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

// BRIDGE: Attach objects to window so they are globally accessible
window.client = client;
window.online = onlineLobby;
window.copyRoomID = () => client.copyRoomID();
client.init();
