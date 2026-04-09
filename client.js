const socket = io("https://dino-run-remastered-server.onrender.com");

const client = {
    roomId: null, isAdmin: false, remotePlayers: {},
    init() {
        socket.on('joined', (data) => {
            this.roomId = data.roomId;
            this.isAdmin = data.isAdmin;
            ui.show('lobby');
            document.getElementById('display-room-id').innerText = data.roomId;
            if(this.isAdmin) document.getElementById('admin-start-btn').classList.remove('hidden');
        });
        socket.on('lobby-update', (data) => {
            document.getElementById('player-count').innerText = `PLAYERS: ${data.count}`;
            document.getElementById('player-list').innerHTML = Object.values(data.players)
                .map(p => `<div>• ${p.nickname.toUpperCase()}</div>`).join('');
        });
        socket.on('start-multiplayer', () => game.start('online'));
        socket.on('player-moved', (d) => this.remotePlayers[d.id] = d);
        socket.on('player-left', (id) => delete this.remotePlayers[id]);
        socket.on('error-msg', (m) => alert(m));
        socket.on('update-leaderboard', (data) => {
            document.getElementById('leaderboard-list').innerHTML = data.map((s, i) => 
                `<div>${i+1}. ${s.name} - ${s.score}</div>`).join('');
        });
    },
    submitScore(name, score) { socket.emit('submit-score', { name, score }); },
    sendSync(nick, x, y, duck) { if(this.roomId) socket.emit('sync', { roomId: this.roomId, nickname: nick, x, y, duck }); },
    copyID() { navigator.clipboard.writeText(this.roomId).then(() => alert("ID Copied!")); }
};

const onlineLobby = {
    create: () => socket.emit('create-room', { max: document.getElementById('max-p').value, nickname: document.getElementById('nick-input').value || "Dino" }),
    join: () => socket.emit('join-room', { roomId: document.getElementById('room-input').value.toUpperCase(), nickname: document.getElementById('nick-input').value || "Dino" }),
    adminStart: () => socket.emit('admin-start', { roomId: client.roomId })
};

window.client = client; window.online = onlineLobby; client.init();
