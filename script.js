const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 800, H = 200;
canvas.width = W; canvas.height = H;

// Secure HTTPS connection to your Render backend
const socket = io("https://dino-run-remastered-server.onrender.com");

// --- ASSET LOADER ---
const assets = {};
const assetNames = [
    'DinoStart', 'DinoRun1', 'DinoRun2', 'DinoJump', 'DinoDead', 
    'DinoDuck1', 'DinoDuck2', 'Bird1', 'Bird2', 'Cloud',
    'Track', 'GameOver', 'SmallCactus1', 'SmallCactus2', 
    'SmallCactus3', 'LargeCactus1', 'LargeCactus2', 'LargeCactus3'
];

assetNames.forEach(name => {
    assets[name] = new Image();
    assets[name].src = `assets/${name}.png`; // Ensure assets folder exists
});

let state = {
    mode: 'menu',
    score: 0,
    hiScore: parseInt(localStorage.getItem('dinoHiScore')) || 0, //
    speed: 6,
    frame: 0,
    entities: [],
    clouds: [],
    trackX: 0,
    nickname: 'Dino',
    biome: 'desert'
};

const online = { roomId: null, remotePlayers: {} };

class Entity {
    constructor(x, y, w, h, type, subType = null) {
        Object.assign(this, {x, y, w, h, type, subType, vy: 0, ground: true, duck: false});
    }
    draw() {
        let img;
        const animFrame = Math.floor(state.frame / 10) % 2;
        if (this.type === 'dino') {
            if (state.mode === 'over') img = assets['DinoDead'];
            else if (!this.ground) img = assets['DinoJump'];
            else if (this.duck) img = (animFrame === 0) ? assets['DinoDuck1'] : assets['DinoDuck2'];
            else img = (animFrame === 0) ? assets['DinoRun1'] : assets['DinoRun2'];
        } else if (this.type === 'bird') {
            img = (animFrame === 0) ? assets['Bird1'] : assets['Bird2'];
        } else if (this.type === 'cactus') {
            img = assets[this.subType];
        }
        if (img && img.complete) ctx.drawImage(img, this.x, this.y, this.w, this.h);
    }
}

let player1 = null;

// UI and Game controls
const ui = {
    show: (name) => {
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`menu-${name}`);
        if (target) target.classList.remove('hidden');
        if (name === 'leaderboard') socket.emit('get-leaderboard');
    }
};

const game = {
    start: (mode) => {
        state.nickname = document.getElementById('nick-input').value.trim() || "Dino";
        state.mode = mode; state.score = 0; state.speed = 6; state.frame = 0; 
        state.entities = []; state.clouds = []; state.trackX = 0;
        player1 = new Entity(50, 150, 44, 47, 'dino');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('game-stats').classList.remove('hidden');
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    },
    restart: () => game.start(state.mode)
};

// Input and Physics logic
window.onkeydown = (e) => { 
    if ((e.code === 'Space' || e.code === 'ArrowUp') && player1?.ground) {
        player1.vy = -12; player1.ground = false;
    }
    if (e.code === 'ArrowDown') player1.duck = true;
};
window.onkeyup = (e) => { if (e.code === 'ArrowDown') player1.duck = false; };

function update() {
    if (state.mode === 'menu' || state.mode === 'over') return;
    state.frame++; state.score += 0.1;
    state.speed = Math.min(14, 6 + (state.score / 500));

    if(player1) {
        player1.vy += 0.6; player1.y += player1.vy;
        if (player1.y > 150) { player1.y = 150; player1.ground = true; }
        if(state.mode === 'online' && online.roomId) {
            socket.emit('sync', { roomId: online.roomId, nickname: state.nickname, x: player1.x, y: player1.y, duck: player1.duck });
        }
    }

    if (state.frame % 80 === 0) {
        state.entities.push(new Entity(W, 160, 20, 40, 'cactus', 'SmallCactus1'));
    }

    state.entities.forEach(ent => {
        ent.x -= state.speed;
        if (player1 && player1.x < ent.x + ent.w && player1.x + player1.w > ent.x && player1.y < ent.y + ent.h && player1.y + player1.h > ent.y) {
            state.mode = 'over';
            document.getElementById('game-over').classList.remove('hidden');
        }
    });
}

function loop() {
    ctx.clearRect(0, 0, W, H);
    update();
    if (player1) player1.draw();
    Object.values(online.remotePlayers).forEach(p => {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(assets['DinoRun1'], p.x, p.y, 44, 47);
        ctx.globalAlpha = 1.0;
    });
    state.entities.forEach(e => e.draw());
    requestAnimationFrame(loop);
}

// --- MULTIPLAYER BRIDGE (THE FIX) ---
const onlineLobby = {
    create: () => {
        if(!socket.connected) return alert("Connecting to server...");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        socket.emit('create-room', { max: 5, nickname: nick });
    },
    join: () => {
        if(!socket.connected) return alert("Connecting to server...");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const id = document.getElementById('room-input').value.trim();
        if(id) socket.emit('join-room', { roomId: id, nickname: nick });
    }
};

socket.on('joined', (data) => { online.roomId = data.roomId; game.start('online'); });
socket.on('player-moved', (data) => { online.remotePlayers[data.id] = data; });

window.online = onlineLobby; // Essential for onclick="online.join()"
window.ui = ui;
window.game = game;
loop();
