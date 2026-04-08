const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 800, H = 200;
canvas.width = W; canvas.height = H;

const state = {
    mode: 'menu',
    score: 0,
    hiScore: 0,
    speed: 6,
    frame: 0,
    sound: true,
    entities: []
};

const SPRITES = {
    dino: [[0,0,0,1,1,1,1,0],[0,0,0,1,1,0,1,1],[0,0,0,1,1,1,1,1],[1,1,1,1,1,1,0,0],[1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,0],[0,0,1,0,0,1,0,0]],
    cactus: [[0,1,1,0],[1,1,1,1],[0,1,1,0],[0,1,1,0]],
    bird: [[0,1,1,0,0],[1,1,1,1,1],[0,0,1,0,0]]
};

class Entity {
    constructor(x, y, w, h, type, color) {
        Object.assign(this, {x, y, w, h, type, color, vy: 0, ground: true, duck: false});
    }

    draw() {
        ctx.fillStyle = this.color;
        const map = SPRITES[this.type] || [[1]];
        const pSize = this.w / map[0].length;
        
        map.forEach((row, rIdx) => {
            row.forEach((pixel, cIdx) => {
                if (pixel) ctx.fillRect(this.x + (cIdx * pSize), this.y + (rIdx * pSize), pSize, pSize);
            });
        });
    }
}

let player1, player2;

const ui = {
    show: (name) => {
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById(`menu-${name}`).classList.remove('hidden');
    }
};

const game = {
    start: (mode) => {
        state.mode = mode;
        state.score = 0;
        state.speed = 6;
        state.entities = [];
        player1 = new Entity(50, 150, 40, 44, 'dino', '#535353');
        if (mode === 'local') player2 = new Entity(100, 150, 40, 44, 'dino', '#e05c2a');
        
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById('game-stats').classList.remove('hidden');
    },

    restart: () => game.start(state.mode),

    toggleSound: () => {
        state.sound = !state.sound;
        document.getElementById('toggle-sound').innerText = `SOUND: ${state.sound ? 'ON' : 'OFF'}`;
    },
    toggleFX: () => {
        // FX Logic placeholder
    }
};

const keys = {};
window.onkeydown = (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') jump(player1);
    if (e.code === 'KeyW') jump(player2);
};
window.onkeyup = (e) => keys[e.code] = false;
window.ontouchstart = () => { if(state.mode !== 'menu') jump(player1); };

function jump(p) {
    if (p && p.ground) { p.vy = -12; p.ground = false; }
}

function update() {
    if (state.mode === 'menu' || state.mode === 'over') return;

    state.frame++;
    state.score += 0.1;
    state.speed = Math.min(14, 6 + (state.score / 500));

    [player1, player2].forEach(p => {
        if (!p) return;
        p.duck = (p === player1 && keys['ArrowDown']) || (p === player2 && keys['KeyS']);
        p.vy += 0.6;
        p.y += p.vy;
        if (p.y > 150) { p.y = 150; p.ground = true; }
    });

    if (state.frame % 80 === 0) {
        state.entities.push(new Entity(W, 160, 25, 35, 'cactus', '#535353'));
    }

    state.entities.forEach((ent, i) => {
        ent.x -= state.speed;
        if (player1 && checkHit(player1, ent)) gameOver(state.mode === 'local' ? "PLAYER 2 WINS!" : "GAME OVER");
        if (player2 && checkHit(player2, ent)) gameOver("PLAYER 1 WINS!");
    });

    document.getElementById('score-val').innerText = Math.floor(state.score).toString().padStart(5, '0');
}

function checkHit(p, e) {
    const pad = 5;
    return p.x + pad < e.x + e.w - pad && 
           p.x + p.w - pad > e.x + pad && 
           p.y + pad < e.y + e.h - pad && 
           p.y + p.h - pad > e.y + pad;
}

function gameOver(msg) {
    state.mode = 'over';
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('winner-text').innerText = msg;
}

function loop() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, 190, W, 2);

    if (state.mode !== 'menu') {
        update();
        if(player1) player1.draw();
        if(player2) player2.draw();
        state.entities.forEach(e => e.draw());
    }
    requestAnimationFrame(loop);
}

loop();
