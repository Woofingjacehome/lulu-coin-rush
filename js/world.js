'use strict';
/* World: deterministic terrain, clouds, and coin/item generation. */

const TILE_W = 300;
const tiles = new Map();          // tileIndex -> element|null
function hash(i, salt) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ---- terrain decorations ---- */
function buildTile(i) {
  const el = document.createElement('div');
  el.className = 'tile';
  const r = hash(i, 1);
  const x = hash(i, 2) * TILE_W * 0.7 + TILE_W * 0.15;
  const scale = 0.8 + hash(i, 3) * 0.5;
  let obj;
  if (r < 0.30) {
    obj = document.createElement('div');
    obj.className = 'tree';
    obj.innerHTML = '<div class="l1"></div><div class="l2"></div><div class="l3"></div><div class="trunk"></div>';
  } else if (r < 0.52) { obj = document.createElement('div'); obj.className = 'bush'; }
  else if (r < 0.70) { obj = document.createElement('div'); obj.className = 'rock'; }
  else if (r < 0.88) {
    obj = document.createElement('div');
    obj.className = 'flower';
    obj.innerHTML = '<div class="head"></div><div class="stem"></div>';
  } else return null;
  obj.style.left = x + 'px';
  obj.style.transform = `scale(${scale.toFixed(2)})`;
  obj.style.transformOrigin = 'bottom center';
  el.appendChild(obj);
  return el;
}
function updateTiles(objectsLayer, camX, viewW) {
  const from = Math.floor((camX - viewW) / TILE_W);
  const to = Math.ceil((camX + viewW) / TILE_W);
  for (let i = from; i <= to; i++) {
    const existing = tiles.get(i);
    if (existing !== undefined) { if (existing) existing.__seen = true; continue; }
    const el = buildTile(i);
    tiles.set(i, el);
    if (el) { objectsLayer.appendChild(el); el.__seen = true; }
  }
  for (const [i, el] of tiles) {
    if (el && el.__seen) { el.__seen = false; el.style.left = (i * TILE_W - camX) + 'px'; }
    else if (Math.abs(i * TILE_W - camX) > viewW * 2.5) { if (el) el.remove(); tiles.delete(i); }
  }
}

/* ---- clouds ---- */
const cloudData = [];
function initClouds(cloudLayer) {
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div');
    el.className = 'cloud';
    const s = 50 + hash(i, 9) * 130;
    el.style.width = el.style.height = s + 'px';
    el.style.top = (2 + hash(i, 8) * 38) + '%';
    cloudLayer.appendChild(el);
    cloudData.push({ el, wx: i * 480 + hash(i, 7) * 300, drift: 12 + hash(i, 6) * 10 });
  }
}
const CLOUD_SPAN = 4800;

/* ---- coin & item generation (deterministic per tile) ----
   Heights are world-px above the ground line and refer to the item's CENTER,
   matching the visual center produced by the CSS translate(-50%,50%). */
function genTileItems(i) {
  const out = [];
  const r = hash(i, 11);
  const base = i * TILE_W + 60;
  if (hash(i, 12) < 0.065) {                     // rare power-up
    const kind = hash(i, 13) < .5 ? 'magnet' : 'star';
    out.push({ kind, wx: base + hash(i, 14) * 160, wy: 80 + hash(i, 15) * 60 });
    return out;
  }
  if (r < 0.34) {                                // ground line at running height
    const n = 4 + Math.floor(hash(i, 16) * 3);
    const wy = 70 + hash(i, 17) * 30;
    for (let k = 0; k < n; k++) out.push({ kind: 'coin', wx: base + k * 52, wy });
  } else if (r < 0.58) {                         // jump arc
    const n = 5;
    for (let k = 0; k < n; k++) {
      const q = k / (n - 1);
      out.push({ kind: 'coin', wx: base + k * 56, wy: 80 + Math.sin(q * Math.PI) * 190 });
    }
  } else if (r < 0.74) {                         // sky line (fly + swoop range)
    const n = 5 + Math.floor(hash(i, 18) * 3);
    const wy = 200 + hash(i, 19) * 190;
    for (let k = 0; k < n; k++) out.push({ kind: 'coin', wx: base + k * 56, wy });
  } else if (r < 0.84) {                         // big jackpot coin
    out.push({ kind: 'coin', big: true, wx: base + 120, wy: 100 + hash(i, 20) * 80 });
  }
  return out;
}
function makeItemEl(kind, big) {
  const el = document.createElement('div');
  const face = document.createElement('div');
  face.className = 'face';
  if (kind === 'magnet' || kind === 'star') {
    el.className = 'powerup';
    face.textContent = kind === 'magnet' ? '🧲' : '⭐';
  } else {
    el.className = 'coin' + (big ? ' big' : '');
    face.textContent = 'L';
  }
  el.appendChild(face);
  return el;
}
