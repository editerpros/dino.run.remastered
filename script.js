const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const W = 800, H = 200; canvas.width = W; canvas.height = H;

const assets = {};
['DinoRun1', 'DinoRun2', 'DinoJump', 'DinoDead', 'Track', 'SmallCactus1'].forEach(n => {
    assets[n] = new Image(); assets[n].src = `assets/${n}.png`;
});

let state = { mode: 'menu', score: 0, speed: 6, frame: 0, entities: [], hiScore: parseInt(localStorage.getItem('dinoHiScore')) || 0 };
const keys = {};

window.onkeydown = (e) => { keys[e.code] = true; if(state.mode !== 'menu' && state.mode !== 'over' && (e.code==='Space'||e.code==='ArrowUp')) jump(); };
window.onkeyup = (e) => keys[e.code] = false;
window.ontouchstart = (e) => { if(state.mode !== 'menu' && e.target.tagName !== 'BUTTON') jump(); };

function jump() { if(player1?.ground) { player1.vy = -12; player1.ground = false; } }

class Entity {
    constructor(x, y, w, h, type, sub) { Object.assign(this, {x, y, w, h, type, sub, vy: 0, ground: true, duck: false}); }
    draw() {
        let img, anim = Math.floor(state.frame / 10) % 2;
        if(this.type === 'dino') {
            img = state.mode==='over' ? assets['DinoDead'] : !this.ground ? assets['DinoJump'] : (anim===0 ? assets['DinoRun1'] : assets['DinoRun2']);
        } else img = assets[this.sub];
        if(img?.complete) ctx.drawImage(img, this.x, this.y, this.w, this.h);
    }
}

let player1 = null;
const ui = { show: (n) => { document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden')); document.getElementById(`menu-${n}`).classList.remove('hidden'); if(n==='leaderboard') socket.emit('get-leaderboard'); } };
const game = {
    start: (m) => {
        state.mode = m; state.score = 0; state.frame = 0; state.entities = [];
        player1 = new Entity(50, 150, 44, 47, 'dino');
        document.getElementById('game-stats').classList.remove('hidden');
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    }
};

function update() {
    if(state.mode === 'menu' || state.mode === 'over') return;
    state.frame++; state.score += 0.1; state.speed = Math.min(14, 6 + (state.score / 500));
    if(player1) {
        player1.duck = keys['ArrowDown']; player1.vy += 0.6; player1.y += player1.vy;
        if(player1.y > 150) { player1.y = 150; player1.ground = true; player1.vy = 0; }
        if(state.mode === 'online') client.sendSync(document.getElementById('nick-input').value, player1.x, player1.y, player1.duck);
    }
    if(state.frame % 100 === 0) state.entities.push(new Entity(W, 160, 20, 40, 'cactus', 'SmallCactus1'));
    state.entities.forEach(e => {
        e.x -= state.speed;
        if(player1 && player1.x < e.x+e.w && player1.x+player1.w > e.x && player1.y < e.y+e.h && player1.y+player1.h > e.y) gameOver();
    });
    document.getElementById('score-val').innerText = Math.floor(state.score).toString().padStart(5, '0');
}

function gameOver() {
    state.mode = 'over'; client.submitScore(document.getElementById('nick-input').value, Math.floor(state.score));
    if(state.score > state.hiScore) { state.hiScore = Math.floor(state.score); localStorage.setItem('dinoHiScore', state.hiScore); }
    ui.show('over');
}

function loop() {
    ctx.clearRect(0, 0, W, H); update();
    if(assets['Track'].complete) ctx.drawImage(assets['Track'], 0, 180, W, 20);
    if(player1) player1.draw();
    Object.values(client.remotePlayers).forEach(p => { ctx.globalAlpha = 0.5; ctx.drawImage(assets['DinoRun1'], p.x, p.y, 44, 47); ctx.globalAlpha = 1.0; });
    state.entities.forEach(e => e.draw());
    requestAnimationFrame(loop);
}
window.ui = ui; window.game = game; loop();
