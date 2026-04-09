/** script.js - Core Game Engine */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 800, H = 200;
canvas.width = W; canvas.height = H;

// --- ASSETS ---
const assets = {};
const assetNames = ['DinoRun1', 'DinoRun2', 'DinoJump', 'DinoDead', 'Track', 'SmallCactus1'];
assetNames.forEach(name => {
    assets[name] = new Image();
    assets[name].src = `assets/${name}.png`;
});

let state = {
    mode: 'menu', 
    score: 0, 
    speed: 6, 
    frame: 0, 
    entities: [], 
    nickname: 'Dino',
    hiScore: parseInt(localStorage.getItem('dinoHiScore')) || 0
};

// --- INPUT HANDLING ---
const keys = {};

window.onkeydown = (e) => { 
    keys[e.code] = true; 
    // Trigger jump on Space or Arrow Up if the game is active
    if (state.mode !== 'menu' && state.mode !== 'over') { 
        if (e.code === 'Space' || e.code === 'ArrowUp') jump(player1); 
    } 
};

window.onkeyup = (e) => {
    keys[e.code] = false;
};

// Handle touch for mobile devices
window.addEventListener('touchstart', (e) => { 
    // Ignore touches on buttons to allow UI interaction
    if(state.mode !== 'menu' && state.mode !== 'over' && e.target.tagName !== 'BUTTON') {
        jump(player1); 
    }
});

function jump(p) { 
    if (p && p.ground) { 
        p.vy = -12; // Upward velocity
        p.ground = false; 
    } 
}

class Entity {
    constructor(x, y, w, h, type, subType) { 
        Object.assign(this, {x, y, w, h, type, subType, vy: 0, ground: true, duck: false}); 
    }
    draw() {
        let img = assets[this.subType] || assets['DinoRun1'];
        if (img.complete) ctx.drawImage(img, this.x, this.y, this.w, this.h);
    }
}

let player1 = null;

const ui = {
    show: (name) => {
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`menu-${name}`);
        if (target) target.classList.remove('hidden');
    }
};

const game = {
    start: (mode) => {
        state.mode = mode; state.score = 0; state.frame = 0; state.entities = [];
        state.nickname = document.getElementById('nick-input').value.trim() || "Dino";
        player1 = new Entity(50, 150, 44, 47, 'dino', 'DinoRun1');
        document.getElementById('game-stats').classList.remove('hidden');
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
        
        // Update high score display
        document.getElementById('hi-val').innerText = state.hiScore.toString().padStart(5, '0');
    },
    restart: () => game.start(state.mode)
};

function update() {
    if (state.mode === 'menu' || state.mode === 'over') return;
    
    state.frame++; 
    state.score += 0.1;
    state.speed = Math.min(14, 6 + (state.score / 500));

    if(player1) {
        // Handle ducking state based on keys
        player1.duck = keys['ArrowDown'] || keys['KeyS'];
        
        player1.vy += 0.6; // Gravity
        player1.y += player1.vy;
        
        if (player1.y > 150) { 
            player1.y = 150; 
            player1.ground = true; 
        }
        
        // Sync with multiplayer server
        if(state.mode === 'online') {
            client.sendSync(state.nickname, player1.x, player1.y, player1.duck);
        }
    }

    if (state.frame % 100 === 0) {
        state.entities.push(new Entity(W, 160, 20, 40, 'cactus', 'SmallCactus1'));
    }

    state.entities.forEach(ent => {
        ent.x -= state.speed;
        // Basic collision detection
        if (player1 && player1.x < ent.x + ent.w && player1.x + player1.w > ent.x && 
            player1.y < ent.y + ent.h && player1.y + player1.h > ent.y) {
            gameOver();
        }
    });
    
    document.getElementById('score-val').innerText = Math.floor(state.score).toString().padStart(5, '0');
}

function gameOver() {
    state.mode = 'over';
    // Call networking logic if available
    if (window.client && window.client.submitScore) {
        window.client.submitScore(state.nickname, Math.floor(state.score));
    }
    
    // Local High Score
    if (Math.floor(state.score) > state.hiScore) {
        state.hiScore = Math.floor(state.score);
        localStorage.setItem('dinoHiScore', state.hiScore);
    }
    document.getElementById('game-over').classList.remove('hidden');
}

function loop() {
    ctx.clearRect(0, 0, W, H);
    update();
    
    if (player1) player1.draw();
    
    // Draw remote players
    Object.values(client.remotePlayers).forEach(p => {
        ctx.globalAlpha = 0.5;
        if (assets['DinoRun1'].complete) ctx.drawImage(assets['DinoRun1'], p.x, p.y, 44, 47);
        ctx.globalAlpha = 1.0;
    });

    state.entities.forEach(e => e.draw());
    requestAnimationFrame(loop);
}

// Global Bridge
window.ui = ui; 
window.game = game;
loop();
