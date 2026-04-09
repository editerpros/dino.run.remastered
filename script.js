/**
 * DINO RUN REMASTERED v26.5
 * Features: Multi-Biome, Global Leaderboards, Asset Loading, 
 * Parallax Clouds, Local Storage, and Multi-Frame Animations.
 */

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 800, H = 200;
canvas.width = W; canvas.height = H;

// Secure HTTPS connection to your Render backend
const socket = io("https://dino-run-remastered-server.onrender.com");

// --- 1. ASSET MANAGEMENT ---
const assets = {};
const assetNames = [
    'DinoStart', 'DinoRun1', 'DinoRun2', 'DinoJump', 'DinoDead', 
    'DinoDuck1', 'DinoDuck2', 'Bird1', 'Bird2', 'Cloud',
    'Track', 'GameOver', 'SmallCactus1', 'SmallCactus2', 
    'SmallCactus3', 'LargeCactus1', 'LargeCactus2', 'LargeCactus3'
];

assetNames.forEach(name => {
    assets[name] = new Image();
    assets[name].src = `assets/${name}.png`; //
});

// --- 2. GLOBAL STATE ---
let state = {
    mode: 'menu',
    score: 0,
    hiScore: parseInt(localStorage.getItem('dinoHiScore')) || 0, //
    speed: 6,
    frame: 0,
    entities: [],
    clouds: [],
    particles: [],
    trackX: 0,
    nickname: 'Dino',
    biome: 'desert',
    paused: false
};

const online = { roomId: null, remotePlayers: {} };

// --- 3. SOUND ENGINE ---
const Sound = {
    ctx: null,
    enabled: true,
    init() { if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(f, t, d, v = 0.05) {
        this.init();
        if(!this.enabled) return;
        try {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = t; o.frequency.setValueAtTime(f, this.ctx.currentTime);
            g.gain.setValueAtTime(v, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(); o.stop(this.ctx.currentTime + d);
        } catch(e) {}
    },
    jump() { this.play(400, 'square', 0.1); },
    die() { this.play(150, 'sawtooth', 0.3); },
    point() { this.play(800, 'square', 0.1); },
    toggle() { this.enabled = !this.enabled; }
};

// --- 4. PARTICLE SYSTEM (Visual Polish) ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

// --- 5. ENTITY CLASSES ---
class Entity {
    constructor(x, y, w, h, type, subType = null) {
        Object.assign(this, {x, y, w, h, type, subType, vy: 0, ground: true, duck: false});
    }

    draw() {
        let img;
        const animFrame = Math.floor(state.frame / 10) % 2; //

        if (this.type === 'dino') {
            if (state.mode === 'over') img = assets['DinoDead'];
            else if (!this.ground) img = assets['DinoJump'];
            else if (this.duck) img = (animFrame === 0) ? assets['DinoDuck1'] : assets['DinoDuck2'];
            else img = (animFrame === 0) ? assets['DinoRun1'] : assets['DinoRun2'];
        } 
        else if (this.type === 'bird') {
            img = (animFrame === 0) ? assets['Bird1'] : assets['Bird2'];
        }
        else if (this.type === 'cactus') {
            img = assets[this.subType];
        }

        if (img && img.complete) {
            ctx.drawImage(img, this.x, this.y, this.w, this.h);
        }
    }
}

// --- 6. CORE GAME LOGIC ---
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
        Sound.init();
        state.nickname = document.getElementById('nick-input').value.trim() || "Dino";
        state.mode = mode; state.score = 0; state.speed = 6; state.frame = 0; 
        state.entities = []; state.clouds = []; state.particles = [];
        state.trackX = 0; state.biome = 'desert';
        
        document.getElementById('game-container').className = ''; 
        document.getElementById('biome-tag').innerText = 'DESERT';
        document.getElementById('hi-val').innerText = state.hiScore.toString().padStart(5, '0');
        
        player1 = new Entity(50, 150, 44, 47, 'dino');
        
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('game-stats').classList.remove('hidden');
        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    },
    restart: () => game.start(state.mode)
};

// --- 7. INPUT HANDLING ---
const keys = {};
window.onkeydown = (e) => { 
    keys[e.code] = true; 
    if (state.mode === 'play' || state.mode === 'online') { 
        if (e.code === 'Space' || e.code === 'ArrowUp') jump(player1); 
    } 
};
window.onkeyup = (e) => keys[e.code] = false;

window.addEventListener('touchstart', (e) => { 
    if(state.mode !== 'menu' && state.mode !== 'over' && e.target.tagName !== 'BUTTON') jump(player1); 
});

function jump(p) { 
    if (p && p.ground) { 
        p.vy = -12; p.ground = false; Sound.jump(); 
        // Add dust particles on jump
        for(let i=0; i<5; i++) state.particles.push(new Particle(p.x, p.y + p.h, '#535353'));
    } 
}

// --- 8. PHYSICS & COLLISION ---
function update() {
    if (state.mode === 'menu' || state.mode === 'over' || state.paused) return;
    
    state.frame++; state.score += 0.1;
    const s = Math.floor(state.score);
    
    // Biome Progression
    if (s === 500 && state.biome === 'desert') applyBiome('jungle');
    if (s === 1000 && state.biome === 'jungle') applyBiome('city');
    if (s === 1500 && state.biome === 'city') applyBiome('night');

    state.speed = Math.min(14, 6 + (state.score / 500));

    if(player1) {
        player1.duck = keys['ArrowDown'] || keys['KeyS'];
        player1.vy += 0.6; player1.y += player1.vy;
        if (player1.y > 150) { player1.y = 150; player1.ground = true; }
        
        if(state.mode === 'online' && online.roomId) {
            socket.emit('sync', { 
                roomId: online.roomId, nickname: state.nickname,
                x: player1.x, y: player1.y, duck: player1.duck 
            });
        }
    }

    // Spawn Elements
    if (state.frame % 120 === 0) {
        state.clouds.push({ x: W, y: Math.random() * 60 + 20, speed: state.speed * 0.3 });
    }

    if (state.frame % 80 === 0) {
        const type = Math.random() > 0.8 && state.score > 200 ? 'bird' : 'cactus';
        if (type === 'bird') {
            state.entities.push(new Entity(W, 100, 42, 30, 'bird'));
        } else {
            const types = ['SmallCactus1', 'SmallCactus2', 'SmallCactus3', 'LargeCactus1', 'LargeCactus2', 'LargeCactus3'];
            const sub = types[Math.floor(Math.random() * types.length)];
            const h = sub.includes('Large') ? 50 : 35;
            const w = sub.includes('3') ? 45 : (sub.includes('2') ? 32 : 17);
            state.entities.push(new Entity(W, 195 - h, w, h, 'cactus', sub));
        }
    }

    // Process Entities
    state.entities.forEach(ent => {
        ent.x -= state.speed;
        if (player1 && checkHit(player1, ent)) gameOver();
    });

    state.clouds.forEach(c => c.x -= c.speed);
    state.particles.forEach((p, i) => {
        p.update();
        if(p.life <= 0) state.particles.splice(i, 1);
    });

    state.entities = state.entities.filter(ent => ent.x + ent.w > 0);
    state.clouds = state.clouds.filter(c => c.x + 50 > 0);
    
    document.getElementById('score-val').innerText = s.toString().padStart(5, '0');
}

function applyBiome(b) {
    state.biome = b;
    document.getElementById('game-container').className = b;
    document.getElementById('biome-tag').innerText = b.toUpperCase();
    Sound.point();
}

function checkHit(p, e) {
    const pX = p.x + 10, pW = p.w - 20;
    const pY = p.duck ? p.y + 25 : p.y + 5;
    const pH = p.duck ? 20 : p.h - 10;
    return pX < e.x + e.w && pX + pW > e.x && pY < e.y + e.h && pY + pH > e.y;
}

function gameOver() {
    Sound.die();
    const finalScore = Math.floor(state.score);
    socket.emit('submit-score', { name: state.nickname, score: finalScore });
    
    if (finalScore > state.hiScore) {
        state.hiScore = finalScore;
        localStorage.setItem('dinoHiScore', state.hiScore); //
        document.getElementById('hi-val').innerText = state.hiScore.toString().padStart(5, '0');
    }

    state.mode = 'over';
    document.getElementById('game-over').classList.remove('hidden');
    // Death burst particles
    for(let i=0; i<15; i++) state.particles.push(new Particle(player1.x + 20, player1.y + 20, '#ff0000'));
}

// --- 9. RENDERING LOOP ---
function loop() {
    ctx.clearRect(0, 0, W, H);
    
    // Background Layer
    if (state.mode !== 'menu') {
        state.trackX -= state.speed;
        if (state.trackX <= -W) state.trackX = 0;
        if (assets['Track']?.complete) {
            ctx.drawImage(assets['Track'], state.trackX, 185, W, 12);
            ctx.drawImage(assets['Track'], state.trackX + W, 185, W, 12);
        }
    }

    state.clouds.forEach(c => {
        if (assets['Cloud']?.complete) ctx.drawImage(assets['Cloud'], c.x, c.y, 46, 14);
    });

    state.particles.forEach(p => p.draw());

    if (state.mode !== 'menu') {
        update();
        if(player1) player1.draw();
        
        // Multiplayer Shadow Rendering
        Object.values(online.remotePlayers).forEach(p => { 
            const anim = Math.floor(state.frame / 10) % 2;
            const img = (anim === 0) ? assets['DinoRun1'] : assets['DinoRun2'];
            if (img?.complete) {
                ctx.globalAlpha = 0.4;
                ctx.drawImage(img, p.x, p.y, 44, 47);
                // Draw name above shadow
                ctx.font = '8px "Press Start 2P"';
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(p.nickname || 'Dino', p.x, p.y - 10);
                ctx.globalAlpha = 1.0;
            }
        });
        
        state.entities.forEach(e => e.draw());

        if (state.mode === 'over' && assets['GameOver']?.complete) {
            ctx.drawImage(assets['GameOver'], W/2 - 95, H/2 - 20, 190, 11);
        }
    }
    requestAnimationFrame(loop);
}

// --- 10. NETWORK LISTENERS ---
socket.on('connect', () => console.log("System Ready: " + socket.id));

socket.on('update-leaderboard', (data) => {
    const list = document.getElementById('leaderboard-list');
    if (list) list.innerHTML = data.map((s, i) => 
        `<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>${i+1}. ${s.name.toUpperCase()}</span> 
            <span>${s.score}</span>
         </div>`).join('');
});

socket.on('joined', (data) => { 
    online.roomId = data.roomId; 
    game.start('online'); 
    console.log("Connected to room: " + data.roomId);
});

socket.on('player-moved', (data) => {
    online.remotePlayers[data.id] = { 
        x: data.x, y: data.y, 
        duck: data.duck, nickname: data.nickname 
    };
});

socket.on('player-left', (id) => delete online.remotePlayers[id]);

// --- 11. GLOBAL INTERFACE ---
const onlineLobby = {
    create: () => {
        if(!socket.connected) return alert("Waking up server... Try in 10s.");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const max = parseInt(document.getElementById('max-p').value);
        socket.emit('create-room', { max: max, nickname: nick });
    },
    join: () => {
        if(!socket.connected) return alert("Waking up server...");
        const nick = document.getElementById('nick-input').value.trim() || "Dino";
        const id = document.getElementById('room-input').value.trim();
        if(id) socket.emit('join-room', { roomId: id, nickname: nick });
    }
};

window.online = onlineLobby; 
loop();
