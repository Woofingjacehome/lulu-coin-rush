'use strict';
/* Game: state, input, physics, coins, fx, main loop. */

/* ================= DOM ================= */
const world = document.getElementById('world');
const charEl = document.getElementById('char');
const aura = document.getElementById('aura');
const shadow = document.getElementById('shadow');
const coinCountEl = document.getElementById('coin-count');
const coinChipEl = document.getElementById('coin-chip');
const startBestEl = document.getElementById('start-best');
const metersEl = document.getElementById('meters');
const bestChipEl = document.getElementById('best-chip');
const comboChipEl = document.getElementById('combo-chip');
const msFillEl = document.getElementById('ms-fill');
const hintEl = document.getElementById('hint');
const layers = {
  far:  document.getElementById('hills-far'),
  near: document.getElementById('hills-near'),
  clouds: document.getElementById('clouds'),
  ground: document.getElementById('ground-wrap'),
  objects: document.getElementById('objects'),
};
const groundEl = document.getElementById('ground');

/* ================= sprite frames ================= */
const FRAME_FILES = ["stand","run1","run2","flyup","turn","crouch","jump","hover","blink",
  "surprise","laugh","lie","walk1","walk2","walk3","walk4","land","fall"];
const ANIM = {
  walk: ['walk1', 'walk2', 'walk3', 'walk4'],
  run:  ['run1', 'run2'],
  fly:  ['flyup', 'hover', 'turn', 'hover'],
};
const imgs = {};
for (const name of FRAME_FILES) {
  const im = document.createElement('img');
  im.src = 'assets/frames/' + name + '.webp';
  im.alt = name; im.decoding = 'async';
  charEl.appendChild(im); imgs[name] = im;
}
let currentFrame = null;
function setFrame(name) {
  if (currentFrame === name || !imgs[name]) return;
  for (const k in imgs) imgs[k].classList.toggle('show', k === name);
  currentFrame = name;
}

/* ================= physics (snappy) ================= */
const GRAV = 4200, JUMP_V = 1420, MAX_RUN = 460, ACC = 2800, FRICTION = 2400;
const WALK_SPEED = 260, FLY_HOVER = 150, FLY_TOP = 430, FLY_LOW = 40;

/* ================= state ================= */
const S = {
  mode: 'idle', pose: null, x: 0, y: 0, vx: 0, vy: 0, dir: 1,
  camX: 0, camY: 0,
  animT: 0, animIdx: 0,
  flyPhase: Math.random() * 10,
  blinkTimer: 2 + Math.random() * 3,
  idleT: 0, landTimer: 0, jumpCut: false, turnT: 0, swooped: false,
};
let started = false, paused = false;
const keys = { l:false, r:false, up:false, down:false, shift:false, burst:null };

/* coins & progression */
const coins = new Map();       // key -> {el, wx, wy, big, kind, i, k}
const collected = new Map();   // tileIndex -> Set(k): eaten here, don't respawn while nearby
let coinTotal = 0, combo = 0, comboTimer = 0;
let magnetT = 0, starT = 0, nextMilestone = 50;

function markCollected(i, k) {
  if (!collected.has(i)) collected.set(i, new Set());
  collected.get(i).add(k);
}
function pruneCollected(camX, viewW) {
  if (collected.size < 120) return;
  for (const ti of collected.keys()) {
    if (Math.abs(ti * TILE_W - camX) > viewW * 8) collected.delete(ti);
  }
}

/* ================= fx ================= */
let shakeT = 0, shakeAmp = 0;
function shake(a) { shakeAmp = a; shakeT = .22; }
function charScreenPos() {
  const r = world.getBoundingClientRect();
  const size = charEl.getBoundingClientRect().width;
  return {
    W: r.width, H: r.height, size,
    x: r.width / 2 + (S.x - S.camX),
    footY: r.height * 0.86 - S.y + S.camY,
  };
}
function pop(txt, color) {
  const p = charScreenPos();
  const el = document.createElement('div');
  el.className = 'pop'; el.textContent = txt;
  if (color) el.style.color = color;
  el.style.left = (p.x + (Math.random() - .5) * 90) + 'px';
  el.style.top = (p.footY - p.size * 1.05) + 'px';
  el.style.setProperty('--rot', ((Math.random() - .5) * 16).toFixed(1) + 'deg');
  world.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
function dust(n = 6) {
  const p = charScreenPos();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'dust';
    const s = 8 + Math.random() * 20;
    el.style.width = el.style.height = s + 'px';
    el.style.left = (p.x - s / 2 + (Math.random() - .5) * 70) + 'px';
    el.style.top = (p.footY - s / 2) + 'px';
    world.appendChild(el);
    const vx = (Math.random() - .5) * 240, vy = 50 + Math.random() * 110;
    const t0 = performance.now(), life = 480 + Math.random() * 300;
    (function step(tt) {
      const q = (tt - t0) / life;
      if (q >= 1) { el.remove(); return; }
      el.style.transform = `translate(${(vx * q).toFixed(1)}px, ${(-vy * q + 380 * q * q).toFixed(1)}px)`;
      el.style.opacity = (1 - q).toFixed(2);
      requestAnimationFrame(step);
    })(t0);
  }
}
function popThrottled(txt, color) {
  if (fxState.pops >= 5) return;                // no text spam covering the scene
  fxState.pops++;
  pop(txt, color);
  setTimeout(() => fxState.pops--, 500);
}
function burstSparks(x, y, n, color) {
  if (fxState.sparks > 24) n = Math.min(n, 2);
  fxState.sparks += n;
  setTimeout(() => fxState.sparks -= n, 600);
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'sparkle';
    if (color) el.style.background = Math.random() < .6 ? color : '#fff';
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 48;
    el.style.left = (x + Math.cos(a) * d) + 'px';
    el.style.top = (y + Math.sin(a) * d * .7) + 'px';
    el.style.animationDelay = (Math.random() * .12) + 's';
    world.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}
function confetti(x, y, n) {
  const colors = ['#ff7e2e','#ffd23e','#8fc07a','#6ab7ff','#ff8e9e'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.background = colors[i % colors.length];
    el.style.left = (x + (Math.random() - .5) * 150) + 'px';
    el.style.top = (y + (Math.random() - .5) * 40) + 'px';
    world.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
}
function trailFx() {
  const p = charScreenPos();
  const el = document.createElement('div');
  el.className = 'trail';
  const s = 10 + Math.random() * 16;
  el.style.width = el.style.height = s + 'px';
  const colors = ['#ffd23e','#ff7e2e','#ff8e9e','#6ab7ff'];
  el.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random()*4)]}, transparent 70%)`;
  el.style.left = (p.x - s/2 - S.dir * 30) + 'px';
  el.style.top = (p.footY - 30 - Math.random() * 90) + 'px';
  world.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 320); }, 110);
}
/* coin flies to the HUD counter (juicy, strictly budgeted feedback) */
const fxState = { clones:0, pops:0, sparks:0, lastBump:0, lastCoinSfx:0, saveDirty:false };
function flyToHud(el) {
  const r = el.getBoundingClientRect();
  el.remove();                                  // coin ALWAYS disappears first
  if (fxState.clones >= 6) return;              // fx budget: bursts stay smooth
  const target = coinChipEl.getBoundingClientRect();
  const fx = document.createElement('div');     // clean clone — no leftover styles
  fx.className = 'fly-hud';
  const size = Math.min(40, r.width);
  fx.style.width = fx.style.height = size + 'px';
  fx.style.left = r.left + 'px'; fx.style.top = r.top + 'px';
  document.body.appendChild(fx);
  fxState.clones++;
  const t0 = performance.now(), life = 320;
  const dx = target.left + target.width/2 - (r.left + size/2);
  const dy = target.top + target.height/2 - (r.top + size/2);
  (function step(tt) {
    const q = Math.min(1, (tt - t0) / life);
    const e = 1 - Math.pow(1 - q, 3);          // ease-out cubic
    fx.style.transform = `translate(${(dx * e).toFixed(1)}px, ${(dy * e).toFixed(1)}px) scale(${(1 - .6 * e).toFixed(2)})`;
    fx.style.opacity = q > .8 ? ((1 - q) / .2).toFixed(2) : 1;
    if (q < 1) requestAnimationFrame(step);
    else { fx.remove(); fxState.clones--; }
  })(t0);
  const now = performance.now();
  if (now - fxState.lastBump > 120) {
    fxState.lastBump = now;
    coinChipEl.classList.remove('bump');
    void coinChipEl.offsetWidth;
    coinChipEl.classList.add('bump');
  }
}

/* ================= coins: spawn, attract, collide ================= */
function updateCoins(camX, viewW, dt) {
  const from = Math.floor((camX - viewW) / TILE_W) - 1;
  const to = Math.ceil((camX + viewW) / TILE_W) + 1;
  for (let i = from; i <= to; i++) {
    const items = genTileItems(i);
    for (let k = 0; k < items.length; k++) {
      const key = i + ':' + k;
      if (coins.has(key)) continue;
      if (collected.has(i) && collected.get(i).has(k)) continue;
      const it = items[k];
      const el = makeItemEl(it.kind, it.big);
      el.style.left = (it.wx - camX) + 'px';
      el.style.bottom = it.wy + 'px';
      layers.objects.appendChild(el);
      coins.set(key, { el, wx: it.wx, wy: it.wy, big: !!it.big, kind: it.kind, i, k });
    }
  }
  pruneCollected(camX, viewW);

  /* generous, frame-rate independent collision against the sprite body */
  const size = charEl.getBoundingClientRect().width;
  const cx = S.x;
  const bodyLo = S.y - 46;                  // slightly below feet
  const bodyHi = S.y + size + 46;           // slightly above head
  const reachX = size * 0.58 + 46 + (starT > 0 ? 34 : 0);
  const magnetR = 430, pull = 1500;
  for (const [key, c] of coins) {
    if (Math.abs(c.wx - camX) > viewW * 1.3) { c.el.remove(); coins.delete(key); continue; }
    if (magnetT > 0 && c.kind === 'coin') {
      const dx = cx - c.wx, dy = (S.y + size * .5) - c.wy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < magnetR) {
        const sp = Math.min(pull, 240 + 160000 / d) * dt;
        c.wx += dx / d * sp; c.wy += dy / d * sp;
      }
    }
    c.el.style.left = (c.wx - camX).toFixed(1) + 'px';
    c.el.style.bottom = c.wy.toFixed(1) + 'px';
    if (Math.abs(c.wx - cx) < reachX && c.wy > bodyLo && c.wy < bodyHi) collect(key, c);
  }
}
function collect(key, c) {
  coins.delete(key);
  markCollected(c.i, c.k);
  const p = charScreenPos();

  if (c.kind === 'magnet' || c.kind === 'star') {
    c.el.remove();
    if (c.kind === 'magnet') {
      magnetT = 8; aura.className = 'magnet';
      AudioSys.powerup(); pop(tr('pop_magnet'), '#6a8aff');
      burstSparks(p.x, p.footY - 60, 12, '#6a8aff');
    } else {
      starT = 6; aura.className = 'star';
      AudioSys.powerup(); pop(tr('pop_star'), '#ffd23e');
      burstSparks(p.x, p.footY - 60, 12, '#ffd23e');
    }
    return;
  }

  combo++; comboTimer = 2.5;
  /* exact counting: 1 coin = +1, big = +10. Combo is a streak, not a multiplier. */
  const val = c.big ? 10 : 1;
  coinTotal += val; wallet += val;
  fxState.saveDirty = true;

  flyToHud(c.el);
  const now = performance.now();
  if (now - fxState.lastCoinSfx > 45) { fxState.lastCoinSfx = now; AudioSys.coin(combo); }
  if (c.big) { AudioSys.bigCoin(); pop('+' + val + ' ' + tr('pop_bigcoin'), '#e29a00'); shake(4); }
  else popThrottled('+' + val, '#f5a300');
  burstSparks(p.x, p.footY - 70, c.big ? 10 : 3, '#ffd23e');

  coinCountEl.textContent = coinTotal;
  if (combo >= 5) {
    comboChipEl.style.display = 'flex';
    comboChipEl.textContent = combo + ' 🔥';
  }
  if (coinTotal > best) {
    best = coinTotal; fxState.saveDirty = true;
    startBestEl.textContent = tr('best') + ' ' + best;
  }
  if (coinTotal >= nextMilestone) {
    nextMilestone += 50;
    AudioSys.milestone();
    pop(coinTotal + tr('pop_mile'), '#d84437');
    confetti(p.x, p.footY - 100, 28);
  }
  if (combo === 10 || combo === 25) { doPose('laugh', true); AudioSys.laugh(); }
}

/* ================= actions ================= */
function setMode(mode, pose = null) {
  S.mode = mode; S.pose = pose;
  S.animIdx = 0; S.animT = 0;
  if (mode !== 'fly') document.body.classList.remove('flying');
  else document.body.classList.add('flying');
  hintEl.style.opacity = 0;
}
function doJump() {
  if (S.mode === 'pose') setMode(S.y > 0 ? 'jump' : 'idle');
  if (S.mode === 'fly') { setMode('jump'); S.vy = 500; AudioSys.whoosh(); return; }
  if (S.y > 0 || S.vy > 0) return;
  setMode('jump'); S.vy = JUMP_V; S.jumpCut = false;
  dust(4); AudioSys.jump(); pop(tr('pop_jump'));
  document.getElementById('fly-btn').classList.remove('on');
}
function doFly() {
  const btn = document.getElementById('fly-btn');
  if (S.mode === 'fly') {
    btn.classList.remove('on'); setMode('jump'); S.vy = Math.min(S.vy, 0);
    AudioSys.whoosh(); return;
  }
  btn.classList.add('on');
  setMode('fly'); S.vy = 0;
  if (S.y < 60) S.vy = 650;
  AudioSys.whoosh(); pop(tr('pop_fly'));
}
function doPose(name, silent) {
  if (S.mode === 'pose' && S.pose === name) { setMode(S.y > 0 ? 'jump' : 'idle'); return; }
  if (S.y > 0) return;
  setMode('pose', name);
  if (!silent) {
    const say = { surprise: tr('pop_shock'), laugh: tr('pop_lol'), lie: tr('pop_nap'), blink: '…' };
    if (say[name]) pop(say[name]);
    if (name === 'laugh') AudioSys.laugh();
    if (name === 'surprise') AudioSys.tone(600, .15, {type:'square', vol:.2, slide:300});
  }
}

/* ================= input ================= */
addEventListener('keydown', e => {
  if (!started) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); startGame(); }
    return;
  }
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'w' || k === 'arrowup') {
    e.preventDefault();
    if (e.repeat) return;
    if (S.mode === 'fly') keys.up = true; else doJump();
  }
  if (k === 's' || k === 'arrowdown') { if (S.mode === 'fly') keys.down = true; }
  if (k === 'f' && !e.repeat) doFly();
  if (k === 'a' || k === 'arrowleft')  { keys.l = true; if (S.y === 0 && S.vx > WALK_SPEED) S.turnT = .22; S.dir = -1; }
  if (k === 'd' || k === 'arrowright') { keys.r = true; if (S.y === 0 && S.vx < -WALK_SPEED) S.turnT = .22; S.dir =  1; }
  if (k === 'shift') keys.shift = true;
  if (k === 'p' || k === 'escape') togglePause();
  if (k === '1') doPose('surprise');
  if (k === '2') doPose('laugh');
  if (k === '3') doPose('lie');
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft')  keys.l = false;
  if (k === 'd' || k === 'arrowright') keys.r = false;
  if (k === 'w' || k === 'arrowup')    keys.up = false;
  if (k === 's' || k === 'arrowdown')  keys.down = false;
  if (k === 'shift') keys.shift = false;
  if (k === ' ') keys.up = false;
  if ((k === ' ' || k === 'w' || k === 'arrowup') && S.vy > 320 && S.mode === 'jump') S.vy *= .5;
});
world.addEventListener('pointerdown', () => { if (started && !paused) doJump(); });

/* control buttons act on pointerdown = instant response */
function bindHold(btn, on, off) {
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); btn.classList.add('hold'); on(); });
  const end = () => { btn.classList.remove('hold'); if (off) off(); };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointerleave', end);
  btn.addEventListener('pointercancel', end);
}
bindHold(document.getElementById('run-l-btn'),
  () => { keys.burst = { dir:-1, t:Infinity, cap:360 }; S.dir = -1; },
  () => { if (keys.burst) keys.burst.t = 1.2; });
bindHold(document.getElementById('run-r-btn'),
  () => { keys.burst = { dir: 1, t:Infinity, cap:360 }; S.dir =  1; },
  () => { if (keys.burst) keys.burst.t = 1.2; });
bindHold(document.getElementById('jump-btn'), doJump);
bindHold(document.getElementById('fly-btn'), doFly);
bindHold(document.getElementById('fly-up-btn'), () => keys.up = true, () => keys.up = false);
bindHold(document.getElementById('fly-down-btn'), () => keys.down = true, () => keys.down = false);
for (const btn of document.querySelectorAll('#controls .btn[data-pose]')) {
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); doPose(btn.dataset.pose); });
}
document.getElementById('sound-btn').addEventListener('click', e => {
  e.stopPropagation();
  AudioSys.init(); AudioSys.resume();
  AudioSys.setMuted(!AudioSys.muted);
  e.currentTarget.textContent = AudioSys.muted ? '🔇' : '🔊';
});
document.getElementById('lang-btn').addEventListener('click', e => {
  e.stopPropagation();
  lang = lang === 'en' ? 'zh' : 'en';
  localStorage.setItem('lulu_lang', lang);
  AudioSys.ui(); applyLang();
});
document.getElementById('pause-btn').addEventListener('click', e => { e.stopPropagation(); togglePause(); });
document.getElementById('resume-btn').addEventListener('click', e => { e.stopPropagation(); togglePause(); });
document.getElementById('start-overlay').addEventListener('pointerdown', e => {
  if (e.target.closest('#start-btn')) return;
  startGame();
});
document.getElementById('start-btn').addEventListener('click', e => { e.stopPropagation(); startGame(); });

function startGame() {
  AudioSys.init(); AudioSys.resume(); AudioSys.ui();
  document.getElementById('start-overlay').classList.add('hidden');
  started = true;
  hintEl.style.opacity = 1;
  setTimeout(() => hintEl.style.opacity = 0, 5500);
}
function togglePause() {
  if (!started) return;
  paused = !paused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
  if (AudioSys.ctx) {
    const v = paused ? .03 : .12;
    AudioSys.musicGain.gain.setTargetAtTime(v, AudioSys.ctx.currentTime, .05);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && !paused) togglePause();
});

/* ================= main loop ================= */
let lastT = performance.now(), lastDT = 1 / 60, blinkShow = 0;
function cycle(list) {
  S.animT += lastDT * (0.3 + Math.abs(S.vx) / 650);
  if (S.animT >= 1 / 12) { S.animT = 0; S.animIdx = (S.animIdx + 1) % list.length; }
  setFrame(list[S.animIdx]);
}
function mod(a, n) { return ((a % n) + n) % n; }

function tick(t) {
  const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t; lastDT = dt;
  const rect = world.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  const groundTop = H * 0.86;

  if (!paused && started) {
    /* ---- horizontal: instant response + snappy accel ---- */
    let mv = (keys.l ? -1 : 0) + (keys.r ? 1 : 0);
    if (keys.burst) { mv = keys.burst.dir; keys.burst.t -= dt; if (keys.burst.t <= 0) keys.burst = null; }
    if (mv !== 0) {
      if ((S.mode === 'pose' || S.mode === 'idle') && S.y === 0) setMode('move');
      if (S.vx * mv < 120) S.vx = mv * 240 + S.vx * .35;      // instant kick
      S.vx += mv * ACC * dt;
      S.dir = mv; S.idleT = 0;
    } else {
      const f = FRICTION * dt;
      S.vx = Math.abs(S.vx) <= f ? 0 : S.vx - Math.sign(S.vx) * f;
    }
    const maxRun = starT > 0 ? 680 : MAX_RUN;
    S.vx = Math.max(-maxRun, Math.min(maxRun, S.vx));
    if (keys.shift) S.vx = Math.max(-WALK_SPEED, Math.min(WALK_SPEED, S.vx));
    if (keys.burst && keys.burst.cap) S.vx = Math.max(-keys.burst.cap, Math.min(keys.burst.cap, S.vx));
    S.x += S.vx * dt;
    const speed = Math.abs(S.vx);
    if (S.mode === 'move' && speed === 0 && S.y === 0) setMode('idle');

    /* ---- vertical: fly w/ climb & swoop, or gravity ---- */
    if (S.mode === 'fly') {
      S.flyPhase += dt;
      let target = FLY_HOVER;
      if (keys.up) target = FLY_TOP;
      else if (keys.down) target = FLY_LOW;
      if (keys.down && !S.swooped) { S.swooped = true; pop(tr('pop_swoop'), '#6ab7ff'); AudioSys.whoosh(); }
      if (!keys.down) S.swooped = false;
      const bob = Math.sin(S.flyPhase * 2.2) * 10;
      const rate = (keys.up || keys.down) ? 3.6 : 2.4;
      S.y += (target + bob - S.y) * Math.min(1, dt * rate);
      if (S.y < 8) S.y = 8;                                    // skim the ground
    } else if (S.y > 0 || S.vy > 0) {
      S.vy -= GRAV * dt; S.y += S.vy * dt;
      if (S.y <= 0) {
        S.y = 0; S.vy = 0;
        S.landTimer = .15; dust(6); AudioSys.land();
        setMode(speed > 60 ? 'move' : 'idle');
      }
    }
    if (S.landTimer > 0) S.landTimer -= dt;
    if (S.turnT > 0) S.turnT -= dt;

    /* ---- timers ---- */
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; comboChipEl.style.display = 'none'; }
    }
    if (magnetT > 0) { magnetT -= dt; if (magnetT <= 0) aura.className = ''; }
    if (starT > 0) { starT -= dt; if (starT <= 0) aura.className = ''; if (Math.random() < .6) trailFx(); }

    /* ---- camera: fast follow + look-ahead ---- */
    S.camX += (S.x + S.vx * 0.3 - S.camX) * Math.min(1, dt * 9);
    const camY = Math.max(0, S.y - H * 0.28) * 0.8;
    S.camY += (camY - S.camY) * Math.min(1, dt * 5);

    /* ---- frame selection ---- */
    if (S.mode === 'pose' && S.y === 0 && speed < 40) setFrame(S.pose);
    else if (S.turnT > 0 && S.y === 0) setFrame('turn');
    else if (S.mode === 'fly') cycle(ANIM.fly);
    else if (S.landTimer > 0) setFrame('land');
    else if (S.y > 0) {
      if (S.vy > 520) setFrame('crouch');
      else if (S.vy > -280) setFrame('jump');
      else setFrame('fall');
    }
    else if (speed > WALK_SPEED + 30) cycle(ANIM.run);
    else if (speed > 50) cycle(ANIM.walk);
    else {
      S.idleT += dt;
      if (speed > 40 || S.y > 0 || S.mode !== 'idle') S.idleT = 0;
      if (S.idleT > 6) { doPose('lie', true); pop(tr('pop_nap')); S.idleT = -999; }
      else {
        S.blinkTimer -= dt;
        if (S.blinkTimer <= 0) { blinkShow = .15; S.blinkTimer = 2.5 + Math.random() * 4; }
        if (blinkShow > 0) { blinkShow -= dt; setFrame('blink'); }
        else setFrame('stand');
      }
    }

    updateCoins(S.camX, W, dt);
    metersEl.textContent = (S.x / 50).toFixed(0) + ' m';
    bestChipEl.textContent = tr('best') + ' ' + Math.max(best, coinTotal);
    msFillEl.style.width = ((coinTotal % 50) / 50 * 100).toFixed(1) + '%';
  }

  render(W, H, groundTop);
  requestAnimationFrame(tick);
}

function render(W, H, groundTop) {
  const camX = S.camX, camY = S.camY;
  layers.far.style.backgroundPositionX = (-mod(camX * 0.22, 420)).toFixed(1) + 'px';
  layers.far.style.transform = `translateY(${(camY * 0.25).toFixed(1)}px)`;
  layers.near.style.backgroundPositionX = (-mod(camX * 0.5, 360)).toFixed(1) + 'px';
  layers.near.style.transform = `translateY(${(camY * 0.55).toFixed(1)}px)`;
  layers.ground.style.transform = `translateY(${camY.toFixed(1)}px)`;
  groundEl.style.backgroundPosition = `${(-mod(camX, 50)).toFixed(1)}px 0, 0 0`;
  layers.objects.style.transform = `translateY(${camY.toFixed(1)}px)`;
  updateTiles(layers.objects, camX, W);
  const tw = performance.now() / 1000;
  for (const c of cloudData) {
    let x = (c.wx - camX * 0.12 + tw * c.drift) % CLOUD_SPAN;
    if (x < 0) x += CLOUD_SPAN;
    c.el.style.left = (x - 300) + 'px';
  }
  /* shake */
  if (shakeT > 0) shakeT -= lastDT;
  const shx = shakeT > 0 ? (Math.random() - .5) * shakeAmp : 0;
  const shy = shakeT > 0 ? (Math.random() - .5) * shakeAmp : 0;
  world.style.transform = `translate(${shx.toFixed(1)}px,${shy.toFixed(1)}px)`;

  /* character: squash & stretch for juice */
  const px = W / 2 + (S.x - camX);
  const size = charEl.getBoundingClientRect().width;
  let sx = 1, sy = 1;
  if (S.landTimer > 0) { sx = 1.16; sy = .82; }
  else if (S.y > 0 && S.vy > 900) { sx = .92; sy = 1.1; }
  const lean = (S.y === 0 && Math.abs(S.vx) > WALK_SPEED + 30) ? 6 : (S.y === 0 && Math.abs(S.vx) > 50 ? 2 : 0);
  const flyTilt = S.mode === 'fly'
    ? Math.sin(S.flyPhase * 2.2) * 3 + (keys.down ? 8 : keys.up ? -6 : 0) : 0;
  const cy = groundTop - S.y + camY - size;
  charEl.style.transform =
    `translate(${(px - size / 2).toFixed(1)}px, ${cy.toFixed(1)}px) ` +
    `scaleX(${(S.dir * sx).toFixed(2)}) scaleY(${sy.toFixed(2)}) rotate(${(lean + flyTilt).toFixed(1)}deg)`;
  /* magnet/star aura follows the char (left/top: CSS anim owns transform) */
  const aw = aura.getBoundingClientRect().width;
  aura.style.left = (px - aw / 2).toFixed(1) + 'px';
  aura.style.top = (cy + (size - aw) / 2).toFixed(1) + 'px';
  /* shadow */
  const sw = shadow.getBoundingClientRect().width, sh = shadow.getBoundingClientRect().height;
  const sc = Math.max(.45, 1 - S.y / 700);
  shadow.style.transform =
    `translate(${(px - sw / 2).toFixed(1)}px, ${(groundTop + camY - sh + 4).toFixed(1)}px) scale(${sc.toFixed(3)})`;
  shadow.style.opacity = (.85 * sc + .15).toFixed(3);
}

/* ================= persistence (batched) ================= */
function saveNow() {
  if (!fxState.saveDirty) return;
  fxState.saveDirty = false;
  localStorage.setItem('lulu_wallet', wallet);
  localStorage.setItem('lulu_best', best);
}
setInterval(saveNow, 2000);
addEventListener('pagehide', saveNow);

/* ================= init ================= */
initClouds(layers.clouds);
applyLang();
document.getElementById('sound-btn').textContent = AudioSys.muted ? '🔇' : '🔊';
requestAnimationFrame(tick);
