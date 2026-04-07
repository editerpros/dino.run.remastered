const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const msgEl  = document.getElementById('message');
const scoreEl= document.getElementById('score-val');
const hiEl   = document.getElementById('hi-val');

const W = 800, H = 200;
canvas.width = W; canvas.height = H;

const GROUND_Y = 155;
const GRAVITY  = 0.55;
const JUMP_V   = -13;

/* ---------- Palette ---------- */
const DAY   = { bg:'#f7f3e9', ground:'#757575', dino:'#535353', obs:'#535353', bird:'#535353', cloud:'#cccccc' };
const NIGHT = { bg:'#1a1a2e', ground:'#aaaaaa', dino:'#e0e0e0', obs:'#e0e0e0', bird:'#9ac8e8', cloud:'#2a2a4a' };
let P = {};
Object.assign(P, DAY);

let nightCycle = 0, nightOn = false, nightTimer = 0;

/* ---------- Helpers ---------- */
function hexRgb(h) {
  if (h.startsWith('rgb')) { const m=h.match(/\d+/g); return {r:+m[0],g:+m[1],b:+m[2]}; }
  h = h.replace('#','');
  if (h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const v=parseInt(h,16);
  return {r:(v>>16)&255,g:(v>>8)&255,b:v&255};
}

function lerpColor(a,b,t){
  const A=hexRgb(a),B=hexRgb(b);
  return `rgb(${Math.round(A.r+(B.r-A.r)*t)},${Math.round(A.g+(B.g-A.g)*t)},${Math.round(A.b+(B.b-A.b)*t)})`;
}

/* ---------- State ---------- */
let state='idle', score=0, hiScore=0, frame=0, speed=5, speedInc=0;
let obstacles=[], nextObs=80, clouds=[], cloudTimer=70;

/* ---------- Dino ---------- */
const dino = {x:75,y:GROUND_Y,w:42,h:52,vy:0,onGround:true,ducking:false,leg:0,legT:0,dead:false};

/* ---------- Input ---------- */
const keys={};
document.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.code==='Space'||e.code==='ArrowUp') onAction();
});
document.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('pointerdown',()=>onAction());

function onAction(){
  if(state==='idle'||state==='dead'){startGame();return;}
  if(dino.onGround&&!dino.ducking){
    dino.vy=JUMP_V;
    dino.onGround=false;
  }
}

/* ---------- Game control ---------- */
function startGame(){
  state='running';
  score=0;
  frame=0;
  speed=5;
  obstacles=[];
  msgEl.style.display='none';
}

/* ---------- Update ---------- */
function update(){
  frame++;
  score += 0.1*(speed/5);

  dino.vy+=GRAVITY;
  dino.y+=dino.vy;

  if(dino.y>=GROUND_Y){
    dino.y=GROUND_Y;
    dino.vy=0;
    dino.onGround=true;
  }

  // Obstacles spawn
  nextObs--;
  if(nextObs<=0){
    obstacles.push({x:W,y:GROUND_Y,w:20,h:40});
    nextObs = 60 + Math.random()*60;
  }

  obstacles.forEach(o=>o.x-=speed);
  obstacles = obstacles.filter(o=>o.x>-50);

  // Collision
  for(const o of obstacles){
    if(dino.x < o.x+o.w &&
       dino.x+dino.w > o.x &&
       dino.y < o.y &&
       dino.y+dino.h > o.y-o.h){
         state='dead';
         msgEl.style.display='block';
       }
  }

  scoreEl.textContent = String(Math.floor(score)).padStart(5,'0');
}

/* ---------- Draw ---------- */
function draw(){
  ctx.fillStyle=P.bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle=P.dino;
  ctx.fillRect(dino.x,dino.y,dino.w,dino.h);

  ctx.fillStyle=P.obs;
  obstacles.forEach(o=>{
    ctx.fillRect(o.x,o.y-o.h,o.w,o.h);
  });
}

/* ---------- Loop ---------- */
function loop(){
  if(state==='running') update();
  draw();
  requestAnimationFrame(loop);
}

loop();
