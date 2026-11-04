import { SPECIES, DECOR, FOODS } from './data.js';
import {
  drawFishSprite, drawDecor, drawBanknote, drawFoodParticle, drawBubble, hashString, alpha, mix
} from './art.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const VIS = {
  gar: 0.4, redtail: 0.35, flowerhorn: 0.27,
  channa_yellow: 0.31, channa_red: 0.31, channa_blue: 0.31,
  arowana_silver: 0.4, arowana_gold: 0.4, arowana_red: 0.4,
  betta_halfmoon: 0.54, betta_crown: 0.53, panda_cory: 0.29, paradise: 0.46
};

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grimeCache = new Map();
function grimeTexture(tank) {
  if (grimeCache.has(tank.id)) return grimeCache.get(tank.id);
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 144;
  const g = cv.getContext('2d');
  const rnd = prng(tank.grimeSeed || 7);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 256, y = 20 + rnd() * 118, r = 8 + rnd() * 32;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const col = rnd() < 0.5 ? '77,104,58' : '118,102,62';
    grd.addColorStop(0, `rgba(${col},${0.28 + rnd() * 0.22})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // limescale flecks
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(196,208,174,${0.12 + rnd() * 0.2})`;
    g.fillRect(rnd() * 256, rnd() * 144, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  grimeCache.set(tank.id, cv);
  return cv;
}

function drawSubstrate(ctx, water, tank, time, detail) {
  const sh = water.h * (tank.kind === 'large' ? 0.14 : 0.18);
  const y = water.y + water.h - sh;
  const grd = ctx.createLinearGradient(0, y, 0, water.y + water.h);
  grd.addColorStop(0, '#b39b70');
  grd.addColorStop(0.55, '#8c7350');
  grd.addColorStop(1, '#5e4a33');
  ctx.fillStyle = grd;
  ctx.fillRect(water.x, y, water.w, sh);
  // sand ripple
  ctx.fillStyle = 'rgba(231,214,174,.2)';
  ctx.beginPath();
  ctx.moveTo(water.x, y + sh * 0.22);
  for (let i = 0; i <= 20; i++) {
    const px = water.x + (water.w / 20) * i;
    ctx.lineTo(px, y + sh * 0.22 + Math.sin(i * 0.9 + tank.grimeSeed) * sh * 0.07);
  }
  ctx.lineTo(water.x + water.w, y);
  ctx.lineTo(water.x, y);
  ctx.fill();
  // grains
  const rnd = prng(tank.grimeSeed + 5);
  for (let i = 0; i < (detail ? 150 : 55); i++) {
    const px = water.x + rnd() * water.w;
    const py = y + rnd() * sh;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(53,41,27,.5)' : 'rgba(238,224,190,.42)';
    ctx.fillRect(px, py, 1 + rnd() * 2, 1);
  }
  // pebbles
  ctx.fillStyle = '#6e6c61';
  ctx.beginPath();
  ctx.ellipse(water.x + water.w * 0.42, y + sh * 0.55, sh * 0.24, sh * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#858377';
  ctx.beginPath();
  ctx.ellipse(water.x + water.w * 0.43, y + sh * 0.48, sh * 0.16, sh * 0.1, 0, 0, TAU);
  ctx.fill();
}

function drawEquipment(ctx, water, tank, time, detail) {
  // back filter pipe
  if (tank.filter) {
    const px = water.x + water.w * 0.9;
    ctx.fillStyle = '#b9c3c4';
    ctx.fillRect(px, water.y + water.h * 0.12, Math.max(3, water.w * 0.007), water.h * 0.72);
    ctx.fillStyle = '#7f8c8e';
    ctx.fillRect(px, water.y + water.h * 0.12, Math.max(2, water.w * 0.004), water.h * 0.72);
    // intake slats
    ctx.fillStyle = '#404d50';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(px - 2, water.y + water.h * 0.7 + i * 5, 7, 2);
    }
    // outflow
    ctx.fillStyle = '#95a4a6';
    ctx.fillRect(px - water.w * 0.03, water.y + water.h * 0.11, water.w * 0.06, 4);
    ctx.fillStyle = 'rgba(215,245,245,.5)';
    ctx.fillRect(px - water.w * 0.03, water.y + water.h * 0.11 + 4, water.w * 0.06, 1);
    // bubbles
    for (let i = 0; i < (detail ? 16 : 8); i++) {
      const seed = i * 1.37 + hashString(tank.id) % 100;
      const prog = ((time * (0.025 + (i % 3) * 0.008) + i * 0.13) % 1);
      const by = water.y + water.h * 0.17 + prog * water.h * 0.72;
      const bx = px - 4 + Math.sin(prog * 9 + seed) * (3 + i * 0.4);
      const r = Math.max(1, water.w * 0.002 + (i % 3) * 0.7);
      drawBubble(ctx, bx, by, r, 0.28 + (1 - prog) * 0.25);
    }
  }
  // thermometer
  const tx = water.x + water.w * 0.04;
  ctx.fillStyle = 'rgba(223,238,238,.75)';
  ctx.fillRect(tx, water.y + water.h * 0.18, Math.max(2, water.w * 0.005), water.h * 0.34);
  const tFill = clamp((tank.temp - 22) / 10, 0, 1);
  ctx.fillStyle = '#e2694f';
  ctx.fillRect(tx + 1, water.y + water.h * (0.18 + 0.34 * (1 - tFill)), Math.max(1, water.w * 0.002), water.h * 0.34 * tFill);
  ctx.fillStyle = '#d84938';
  ctx.beginPath();
  ctx.arc(tx + Math.max(2, water.w * 0.0035), water.y + water.h * 0.52, Math.max(2, water.w * 0.004), 0, TAU);
  ctx.fill();
  // dim LED bar on top of tank
  ctx.fillStyle = 'rgba(255,239,196,.85)';
  ctx.fillRect(water.x + water.w * 0.18, water.y - 2, water.w * 0.42, 2);
  ctx.fillStyle = 'rgba(255,239,196,.18)';
  ctx.fillRect(water.x + water.w * 0.18, water.y + 1, water.w * 0.42, water.h * 0.2);
}

function mapFishPos(water, fish) {
  return {
    x: water.x + fish.x * water.w,
    y: water.y + water.h * (0.1 + fish.y * 0.78)
  };
}

function mapDecorPos(water, decor) {
  return {
    x: water.x + decor.x * water.w,
    y: water.y + water.h * (0.9 + (decor.y - 0.95) * 0.28),
    w: water.w * decor.scale
  };
}

function drawInnerTank(ctx, tank, water, state, time, opts = {}) {
  const detail = !!opts.detail;
  const drops = [];
  const decorHit = [];
  // water body
  const grd = ctx.createLinearGradient(0, water.y, 0, water.y + water.h);
  grd.addColorStop(0, tank.kind === 'large' ? '#2e8086' : '#3b8e91');
  grd.addColorStop(0.45, '#195c65');
  grd.addColorStop(1, '#0a2c34');
  ctx.fillStyle = grd;
  ctx.fillRect(water.x, water.y, water.w, water.h);

  // deep background panels / distant haze
  const rnd = prng(tank.grimeSeed);
  ctx.fillStyle = 'rgba(7,29,34,.38)';
  ctx.fillRect(water.x, water.y + water.h * 0.55, water.w, water.h * 0.45);
  // light shafts
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const bx = water.x + water.w * (0.18 + i * 0.2) + Math.sin(time * 0.16 + i) * water.w * 0.035;
    const grad = ctx.createLinearGradient(bx, water.y, bx + water.w * 0.1, water.y + water.h);
    grad.addColorStop(0, 'rgba(166,235,225,.14)');
    grad.addColorStop(0.6, 'rgba(118,200,195,.045)');
    grad.addColorStop(1, 'rgba(80,160,160,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx, water.y);
    ctx.lineTo(bx + water.w * (0.1 + i * 0.01), water.y);
    ctx.lineTo(bx + water.w * 0.29, water.y + water.h);
    ctx.lineTo(bx + water.w * 0.15, water.y + water.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // background plants silhouettes
  ctx.fillStyle = 'rgba(26,78,64,.28)';
  for (let i = 0; i < 9; i++) {
    const px = water.x + rnd() * water.w;
    const h = water.h * (0.16 + rnd() * 0.2);
    const sway = Math.sin(time * 0.7 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(px, water.y + water.h * 0.88);
    ctx.quadraticCurveTo(px + sway, water.y + water.h * 0.88 - h * 0.5, px + sway * 1.7, water.y + water.h * 0.88 - h);
    ctx.lineTo(px + 2, water.y + water.h * 0.88 - h + 2);
    ctx.quadraticCurveTo(px + sway + 2, water.y + water.h * 0.88 - h * 0.5, px + 3, water.y + water.h * 0.88);
    ctx.fill();
  }

  drawSubstrate(ctx, water, tank, time, detail);
  drawEquipment(ctx, water, tank, time, detail);

  // eggs behind decor
  for (const egg of tank.eggs) {
    const ex = water.x + egg.x * water.w;
    const ey = water.y + water.h * (0.5 + egg.y * 0.4);
    const pulse = 0.65 + Math.sin(time * 3 + egg.x * 10) * 0.2;
    ctx.save();
    ctx.shadowColor = 'rgba(255,206,120,.7)';
    ctx.shadowBlur = 8;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + egg.x;
      const ex2 = ex + Math.cos(a) * water.w * 0.035 * (0.4 + (i % 3) * 0.25);
      const ey2 = ey + Math.sin(a) * water.h * 0.05 * (0.4 + (i % 2) * 0.4);
      ctx.fillStyle = i % 3 === 0 ? '#ffe5a1' : '#e8b45a';
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(ex2, ey2, Math.max(1.1, water.w * 0.0035), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // decor sorted by depth
  const sortedDecor = tank.decor.map((d, i) => ({ d, i })).sort((a, b) => a.d.y - b.d.y);
  for (const { d, i } of sortedDecor) {
    const pos = mapDecorPos(water, d);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const s = pos.w / 100;
    ctx.scale(s * (d.flip ? -1 : 1), s);
    ctx.globalAlpha = 0.98;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 40, 5, 0, 0, TAU);
    ctx.fill();
    drawDecor(ctx, d.type, time + i * 0.7, false);
    ctx.restore();
    decorHit.push({
      index: i, type: d.type, x: pos.x, y: pos.y,
      w: pos.w * 0.8, h: pos.w * 0.9
    });
  }

  // fish
  const fishSorted = [...tank.fish].sort((a, b) => a.y - b.y);
  for (const fish of fishSorted) {
    const sp = SPECIES[fish.speciesId];
    if (!sp) continue;
    const p = mapFishPos(water, fish);
    const depth = 0.84 + fish.y * 0.22;
    const width = water.w * (VIS[fish.speciesId] || 0.3) * depth * (detail ? (tank.kind === 'large' ? 1 : 1.08) : 1);
    drawFishSprite(ctx, fish.speciesId, time + fish.id.length * 0.13, p.x, p.y, width, fish.dir, fish.growth);
    if (fish.feedFlash > 0) {
      ctx.fillStyle = `rgba(255,235,170,${fish.feedFlash * 0.05})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, width * 0.16, 0, TAU);
      ctx.fill();
    }
  }

  // feed particles
  for (const p of tank.feedParticles) {
    const px = water.x + p.x * water.w;
    const py = water.y + p.y * water.h;
    drawFoodParticle(ctx, p.foodId, px, py, Math.max(0.7, water.w / 500) * p.size, p.color);
    ctx.fillStyle = `rgba(255,243,196,${clamp(p.life / 6, 0, 1) * 0.1})`;
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }

  // grime overlay
  const dirt = clamp(1 - tank.cleanliness / 100, 0, 1);
  if (dirt > 0.01) {
    const tex = grimeTexture(tank);
    ctx.save();
    ctx.globalAlpha = dirt * (opts.cleanMode ? 0.62 : detail ? 0.5 : 0.3);
    ctx.drawImage(tex, water.x, water.y, water.w, water.h);
    // green water haze
    ctx.fillStyle = 'rgba(84,107,50,.1)';
    ctx.fillRect(water.x, water.y, water.w, water.h);
    ctx.restore();
  }

  // glass reflections
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const shine = ctx.createLinearGradient(water.x, water.y, water.x + water.w, water.y + water.h);
  shine.addColorStop(0, 'rgba(255,255,255,.08)');
  shine.addColorStop(0.2, 'rgba(255,255,255,.015)');
  shine.addColorStop(0.55, 'rgba(255,255,255,.06)');
  shine.addColorStop(0.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(water.x, water.y, water.w, water.h);
  // diagonal reflection bar
  ctx.fillStyle = 'rgba(222,252,250,.055)';
  ctx.beginPath();
  ctx.moveTo(water.x + water.w * 0.42, water.y);
  ctx.lineTo(water.x + water.w * 0.52, water.y);
  ctx.lineTo(water.x + water.w * 0.34, water.y + water.h);
  ctx.lineTo(water.x + water.w * 0.25, water.y + water.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // surface
  ctx.strokeStyle = 'rgba(210,255,248,.46)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const px = water.x + (water.w / 18) * i;
    const py = water.y + 3 + Math.sin(i * 0.7 + time * 2.2) * 1.4;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // money drops
  const dropScale = detail ? clamp(water.w / 420, 1.1, 1.7) : clamp(water.w / 520, 0.6, 0.95);
  const tankDrops = state.drops.filter(d => d.tankId === tank.id);
  for (let i = 0; i < tankDrops.length; i++) {
    const d = tankDrops[i];
    const dx = water.x + d.x * water.w;
    const dy = water.y + (0.12 + d.y * 0.7) * water.h;
    drawBanknote(ctx, dx, dy, dropScale, time + i, d.value);
    drops.push({ id: d.id, x: dx, y: dy, r: 26 * dropScale, value: d.value });
  }
  return { drops, decor: decorHit };
}

function drawTankFrame(ctx, tank, rect, opts = {}) {
  const detail = !!opts.detail;
  const small = rect.w < 260;
  const frame = detail ? Math.max(6, rect.w * 0.009) : Math.max(4, Math.min(8, rect.w * 0.012));
  const plaqueH = opts.plaque ? (small ? 14 : 20) : 0;
  const water = {
    x: rect.x + frame,
    y: rect.y + frame,
    w: rect.w - frame * 2,
    h: rect.h - frame * 2 - plaqueH
  };

  // ambient glow behind the glass
  ctx.save();
  ctx.shadowColor = 'rgba(68,210,210,.28)';
  ctx.shadowBlur = detail ? 40 : 22;
  ctx.fillStyle = '#0d1a1d';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
  ctx.fill();
  ctx.restore();

  // cabinet lip / outer frame
  const frameGrad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  frameGrad.addColorStop(0, '#29343a');
  frameGrad.addColorStop(0.2, '#151e23');
  frameGrad.addColorStop(0.8, '#10171b');
  frameGrad.addColorStop(1, '#070c0e');
  ctx.fillStyle = frameGrad;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148,174,178,.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // rubber gasket
  ctx.strokeStyle = '#05090b';
  ctx.lineWidth = 2;
  roundRect(ctx, water.x - 2, water.y - 2, water.w + 4, water.h + 4, 3);
  ctx.stroke();

  ctx.save();
  roundRect(ctx, water.x, water.y, water.w, water.h, 2);
  ctx.clip();
  const hits = drawInnerTank(ctx, tank, water, opts.state, opts.time, { detail, cleanMode: opts.cleanMode });
  ctx.restore();

  // inner rim highlight
  ctx.strokeStyle = 'rgba(218,247,244,.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, water.x, water.y, water.w, water.h, 2);
  ctx.stroke();

  // corner bolts
  ctx.fillStyle = '#4f5e63';
  const bolt = detail ? 3 : 2;
  const corners = [
    [rect.x + 4, rect.y + 4], [rect.x + rect.w - 4, rect.y + 4],
    [rect.x + 4, rect.y + rect.h - (plaqueH ? plaqueH + 5 : 4)],
    [rect.x + rect.w - 4, rect.y + rect.h - (plaqueH ? plaqueH + 5 : 4)]
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, bolt, 0, TAU);
    ctx.fill();
  }

  if (plaqueH) {
    const py = rect.y + rect.h - plaqueH;
    ctx.fillStyle = '#0b1114';
    ctx.fillRect(rect.x + frame, py, rect.w - frame * 2, plaqueH - 2);
    ctx.fillStyle = 'rgba(231,197,119,.2)';
    ctx.fillRect(rect.x + frame, py, rect.w - frame * 2, 1);
    const fs = small ? Math.max(6, Math.min(8, rect.w * 0.038)) : Math.max(8, Math.min(11, rect.w * 0.019));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fs}px "Courier New", monospace`;
    ctx.fillStyle = '#e7c577';
    ctx.fillText(`${tank.code} · ${tank.name}`, rect.x + frame + 6, py + plaqueH * 0.5);
    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.max(5, fs - 1)}px "Courier New", monospace`;
    ctx.fillStyle = '#8fa4a7';
    ctx.fillText(`${tank.sizeCm}CM · ${tank.fish.length}/${tank.capacity}`, rect.x + rect.w - frame - 6, py + plaqueH * 0.5);
    // cleanliness indicator
    const dotColor = tank.cleanliness > 65 ? '#69c087' : tank.cleanliness > 35 ? '#e0b44e' : '#d75e4f';
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(rect.x + frame + 2, py + plaqueH * 0.5, 1.8, 0, TAU);
    ctx.fill();
  }
  return { water, hits };
}

// ---------------------------------------------------------------------------
// Full-room renderer
// ---------------------------------------------------------------------------
export class SceneRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.hit = { tanks: [], drops: [] };
    this.hoverTank = null;
    this.selection = null;
    this.mouse = { x: -1, y: -1 };
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  layout() {
    const w = this.w, h = this.h;
    const portrait = w < 760 && h > w * 1.02;
    let left, right, top, bottom, availW, availH, bigH, smallH, bigGap, smallGap;
    if (portrait) {
      left = 66; right = 12; top = 76; bottom = Math.max(104, h * 0.12);
      availW = w - left - right;
      availH = h - top - bottom;
      bigGap = 14;
      bigH = (availH * 0.44 - bigGap) / 2;
      smallH = Math.min(104, (availH - bigH * 2 - bigGap - 50) / 3);
      const tanks = [];
      tanks.push({ id: 'P1', x: left, y: top, w: availW, h: bigH });
      tanks.push({ id: 'P2', x: left, y: top + bigH + bigGap, w: availW, h: bigH });
      const sw = (availW - 8) / 2;
      const sy = top + bigH * 2 + bigGap + 38;
      ['S1', 'S2', 'S3', 'S4', 'S5'].forEach((id, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        tanks.push({ id, x: left + col * (sw + 8), y: sy + row * (smallH + 7), w: sw, h: smallH });
      });
      return { w, h, portrait, left, right, top, bottom, availW, availH, bigH, smallH, bigGap, sw, sy, tanks, supply: { x: left + (sw + 8), y: sy + 2 * (smallH + 7), w: sw, h: smallH } };
    }
    left = Math.max(104, Math.min(158, w * 0.09));
    right = Math.max(18, w * 0.018);
    top = Math.max(78, h * 0.095);
    bottom = Math.max(100, h * 0.13);
    availW = w - left - right;
    availH = h - top - bottom;
    bigGap = Math.max(10, w * 0.012);
    const bigW = (availW - bigGap) / 2;
    bigH = availH * 0.47;
    const sg = Math.max(6, w * 0.008);
    const sw = (availW - sg * 4) / 5;
    smallH = Math.min(availH * 0.37, sw * 1.18);
    const sy = top + bigH + Math.max(42, h * 0.055);
    const tanks = [
      { id: 'P1', x: left, y: top, w: bigW, h: bigH },
      { id: 'P2', x: left + bigW + bigGap, y: top, w: bigW, h: bigH }
    ];
    ['S1', 'S2', 'S3', 'S4', 'S5'].forEach((id, i) => {
      tanks.push({ id, x: left + i * (sw + sg), y: sy, w: sw, h: smallH });
    });
    return { w, h, portrait, left, right, top, bottom, availW, availH, bigH, smallH, sy, bigGap, tanks, supply: { x: left + (availW - sw) / 2, y: sy + smallH + 18, w: sw, h: 1 } };
  }

  draw(time) {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const layout = this.layout();
    this.layoutData = layout;
    this.hit = { tanks: [], drops: [] };
    this.drawRoom(ctx, layout, time);

    for (const region of layout.tanks) {
      const tank = this.state.tanks.find(t => t.id === region.id);
      if (!tank) continue;
      this.drawStand(ctx, region, tank, layout, time);
    }

    // background rack framing
    this.drawRacks(ctx, layout, time);

    for (const region of layout.tanks) {
      const tank = this.state.tanks.find(t => t.id === region.id);
      if (!tank) continue;
      const selected = this.selection;
      let compatible = null;
      if (selected?.kind === 'fish') {
        const sp = SPECIES[selected.speciesId];
        compatible = sp.group === (tank.kind === 'large' ? 'predator' : 'small') && tank.fish.length < tank.capacity + 1;
      } else if (selected?.kind === 'decor') {
        compatible = tank.decor.length < 9;
      }
      const hovered = this.hoverTank === tank.id;
      if (hovered || compatible) this.drawTankAura(ctx, region, compatible, time);
      const { water, hits } = drawTankFrame(ctx, tank, region, {
        state: this.state, time, plaque: true, detail: false
      });
      this.hit.tanks.push({ id: tank.id, region, water });
      for (const d of hits.drops) this.hit.drops.push({ ...d, tankId: tank.id });
      if (hovered) {
        ctx.strokeStyle = 'rgba(231,197,119,.85)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, region.x - 2, region.y - 2, region.w + 4, region.h + 4, 7);
        ctx.stroke();
      }
      if (compatible) {
        const pulse = 0.45 + Math.sin(time * 3) * 0.2;
        ctx.strokeStyle = `rgba(112,220,170,${pulse + 0.2})`;
        ctx.lineWidth = 2;
        roundRect(ctx, region.x - 3, region.y - 3, region.w + 6, region.h + 6, 8);
        ctx.stroke();
        if (layout.portrait || region.w > 260) {
          const label = selected.kind === 'fish' ? 'PLACE FISH' : 'PLACE DECOR';
          ctx.font = `700 ${layout.portrait ? 7 : 9}px "Courier New", monospace`;
          const tw = ctx.measureText(label).width + 12;
          const lx = region.x + region.w / 2, ly = region.y + 10;
          ctx.fillStyle = 'rgba(10,30,25,.82)';
          roundRect(ctx, lx - tw / 2, ly - 8, tw, 15, 3);
          ctx.fill();
          ctx.fillStyle = '#8fe6bd';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, lx, ly);
        }
      }
    }

    // supply crate fills the sixth nano slot on portrait screens
    if (layout.portrait && layout.supply) this.drawSupplyCrate(ctx, layout.supply, time);

    this.drawFloorProps(ctx, layout, time);
    this.drawHoverTag(ctx, layout, time);
  }

  drawRoom(ctx, layout, time) {
    const { w, h, left, top, availW } = layout;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#081116');
    bg.addColorStop(0.55, '#0b1a20');
    bg.addColorStop(1, '#071013');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // wall tiles
    ctx.strokeStyle = 'rgba(142,182,182,.045)';
    ctx.lineWidth = 1;
    const tile = Math.max(34, w * 0.035);
    for (let x = 0; x < w; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += tile) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // warm spotlights
    for (const [cx, cy, r] of [[w * 0.36, 0, w * 0.42], [w * 0.72, 0, w * 0.34], [w * 0.1, 0, w * 0.25]]) {
      const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, r);
      g.addColorStop(0, 'rgba(255,207,130,.13)');
      g.addColorStop(0.45, 'rgba(255,183,96,.04)');
      g.addColorStop(1, 'rgba(255,183,96,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, 0, r * 2, r * 1.3);
    }
    // wall panelling
    ctx.fillStyle = 'rgba(8,17,20,.45)';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.06 + i * 0.25);
      ctx.fillRect(x, h * 0.11, 1, h * 0.75);
    }
    // rack labels
    const labelY = top - 13;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(7, Math.min(10, w * 0.007))}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(231,197,119,.66)';
    ctx.fillText('P R E D A T O R   R A C K', left, labelY);
    ctx.fillStyle = 'rgba(143,164,167,.55)';
    ctx.textAlign = 'right';
    ctx.fillText('2 × 200 CM', left + availW, labelY);
    if (!layout.portrait) {
      const sy = layout.sy;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(231,197,119,.55)';
      ctx.fillText('N A N O   R A C K', left, sy - 12);
      ctx.fillStyle = 'rgba(143,164,167,.45)';
      ctx.textAlign = 'right';
      ctx.fillText('5 × 50 CM', left + availW, sy - 12);
    }
    // floor
    const floorY = h * 0.79;
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, 'rgba(12,24,26,0)');
    fg.addColorStop(0.35, 'rgba(10,18,19,.55)');
    fg.addColorStop(1, 'rgba(5,10,11,.95)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, floorY, w, h - floorY);
    // floor plank lines
    ctx.strokeStyle = 'rgba(155,132,92,.07)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, floorY + 30 + i * 34);
      ctx.lineTo(w, floorY + 20 + i * 34);
      ctx.stroke();
    }
    // hanging light glow dots
    ctx.fillStyle = 'rgba(255,224,166,.8)';
    for (const x of [w * 0.3, w * 0.63]) {
      ctx.fillRect(x - 3, 18, 6, 2);
      ctx.fillStyle = 'rgba(255,188,108,.05)';
      ctx.fillRect(x - 20, 20, 40, 4);
      ctx.fillStyle = 'rgba(255,224,166,.8)';
    }
  }

  drawRacks(ctx, layout, time) {
    const { left, top, availW, bigH, bigGap, portrait } = layout;
    if (portrait) return;
    const x0 = left - 14;
    const x1 = left + availW + 10;
    const y0 = top - 8;
    const y1 = top + bigH + 15;
    // metal posts
    ctx.fillStyle = '#1b252a';
    ctx.fillRect(x0, y0, 6, y1 - y0);
    ctx.fillRect(x1 - 2, y0, 6, y1 - y0);
    ctx.fillRect(x0, y0, x1 - x0, 4);
    ctx.fillRect(x0, y1 - 4, x1 - x0, 4);
    ctx.fillStyle = 'rgba(154,181,183,.16)';
    ctx.fillRect(x0 + 1, y0, 1, y1 - y0);
    ctx.fillRect(x0, y0 + 1, x1 - x0, 1);
    // bolts
    ctx.fillStyle = '#657277';
    for (const bx of [x0 + 3, x1 + 1]) {
      for (const by of [y0 + 8, y0 + bigH * 0.55, y1 - 8]) {
        ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, TAU); ctx.fill();
      }
    }
  }

  drawStand(ctx, region, tank, layout, time) {
    const { portrait } = layout;
    if (portrait) return;
    const y = region.y + region.h + 3;
    const shelf = ctx.createLinearGradient(0, y, 0, y + 13);
    shelf.addColorStop(0, '#5b4229');
    shelf.addColorStop(0.2, '#3c2b1c');
    shelf.addColorStop(1, '#1d140d');
    ctx.fillStyle = shelf;
    ctx.fillRect(region.x - 2, y, region.w + 4, 10);
    ctx.fillStyle = 'rgba(255,220,160,.1)';
    ctx.fillRect(region.x - 2, y, region.w + 4, 1);
    // drawer face
    if (!portrait) {
      const dy = y + 10;
      const dh = Math.max(14, layout.h * 0.026);
      ctx.fillStyle = '#2c2016';
      ctx.fillRect(region.x + 3, dy, region.w - 6, dh);
      ctx.strokeStyle = 'rgba(224,191,132,.12)';
      ctx.strokeRect(region.x + 3.5, dy + 0.5, region.w - 7, dh - 1);
      ctx.fillStyle = '#b4935b';
      ctx.fillRect(region.x + region.w / 2 - 14, dy + dh / 2, 28, 3);
    }
  }

  drawTankAura(ctx, region, compatible, time) {
    const pulse = 0.5 + Math.sin(time * 2.4) * 0.18;
    ctx.save();
    ctx.shadowColor = compatible === false ? 'rgba(216,88,76,.5)' : `rgba(98,215,168,${pulse})`;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = compatible === false ? 'rgba(216,88,76,.35)' : `rgba(112,230,178,${pulse + 0.15})`;
    ctx.lineWidth = 2;
    roundRect(ctx, region.x - 1, region.y - 1, region.w + 2, region.h + 2, 6);
    ctx.stroke();
    ctx.restore();
  }

  drawSupplyCrate(ctx, supply, time) {
    const { x, y, w, h } = supply;
    const grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#4d3924');
    grd.addColorStop(1, '#261b12');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(231,197,119,.25)';
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.fillStyle = '#5f482d';
    ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
    ctx.fillStyle = '#2e2115';
    ctx.fillRect(x + 10, y + 12, w - 20, 5);
    ctx.fillRect(x + 10, y + 21, w - 20, 5);
    ctx.fillStyle = 'rgba(231,197,119,.6)';
    ctx.font = `700 ${Math.max(6, w * 0.06)}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SUPPLY', x + w / 2, y + h * 0.62);
    // bucket
    ctx.fillStyle = '#7f8e8e';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.84, w * 0.08, h * 0.05, 0, 0, TAU);
    ctx.fill();
  }

  drawFloorProps(ctx, layout, time) {
    const { w, h, portrait } = layout;
    // a lone bucket on the floor
    if (!portrait) {
      const bx = w * 0.955, by = h * 0.84;
      ctx.fillStyle = '#6d7b78';
      ctx.beginPath();
      ctx.ellipse(bx, by, 14, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(bx - 13, by, 26, 22);
      ctx.fillStyle = '#4d5a58';
      ctx.beginPath();
      ctx.ellipse(bx, by + 22, 13, 4, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#9aabaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by + 12, 9, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  }

  drawHoverTag(ctx, layout, time) {
    if (!this.hoverTank) return;
    const tank = this.state.tanks.find(t => t.id === this.hoverTank);
    const region = layout.tanks.find(t => t.id === this.hoverTank);
    if (!tank || !region) return;
    const text = tank.fish.length ? `${tank.fish.length} fish · clarity ${Math.round(tank.cleanliness)}%` : 'EMPTY TANK · TAP TO STOCK';
    ctx.font = `600 ${layout.portrait ? 7 : 9}px "Courier New", monospace`;
    const tw = ctx.measureText(text).width + 16;
    const x = clamp(region.x + region.w / 2 - tw / 2, 4, this.w - tw - 4);
    const y = region.y + region.h + (layout.portrait ? 4 : 16);
    ctx.fillStyle = 'rgba(7,15,18,.88)';
    roundRect(ctx, x, y, tw, 16, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(231,197,119,.3)';
    ctx.stroke();
    ctx.fillStyle = '#cdd8d1';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tw / 2, y + 8);
  }

  tankAt(x, y) {
    for (const t of this.hit.tanks) {
      const r = t.region;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return t;
    }
    return null;
  }

  dropAt(x, y) {
    for (const d of this.hit.drops) {
      if (Math.hypot(x - d.x, y - d.y) < d.r) return d;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Close-up renderer used by the management modal
// ---------------------------------------------------------------------------
export class TankView {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.hit = { water: null, drops: [], decor: [] };
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  drawDetailRoom(ctx, rect, w, h) {
    // Warm wall wash behind the tank.
    const wash = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h * 0.32, rect.w * 0.06,
      rect.x + rect.w / 2, rect.y + rect.h * 0.42, rect.w * 0.62
    );
    wash.addColorStop(0, 'rgba(255, 205, 130, .11)');
    wash.addColorStop(0.42, 'rgba(255, 180, 96, .035)');
    wash.addColorStop(1, 'rgba(255, 180, 96, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x - rect.w * 0.2, 0, rect.w * 1.4, rect.y + rect.h);

    // Hanging LED pendant.
    const lx = rect.x + rect.w / 2;
    const ly = Math.max(20, rect.y - Math.max(24, h * 0.045));
    const barW = Math.min(rect.w * 0.46, 380);
    ctx.strokeStyle = 'rgba(143, 164, 167, .34)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, ly - 5);
    ctx.stroke();
    ctx.fillStyle = '#1a262b';
    roundRect(ctx, lx - barW / 2, ly - 6, barW, 6, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 201, 199, .18)';
    roundRect(ctx, lx - barW / 2, ly - 6, barW, 6, 3);
    ctx.stroke();
    const lampGlow = ctx.createLinearGradient(0, ly, 0, rect.y + rect.h * 0.5);
    lampGlow.addColorStop(0, 'rgba(255, 226, 168, .28)');
    lampGlow.addColorStop(0.3, 'rgba(255, 208, 137, .07)');
    lampGlow.addColorStop(1, 'rgba(255, 208, 137, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.moveTo(lx - barW / 2 + 8, ly);
    ctx.lineTo(lx + barW / 2 - 8, ly);
    ctx.lineTo(lx + rect.w * 0.37, rect.y + rect.h * 0.5);
    ctx.lineTo(lx - rect.w * 0.37, rect.y + rect.h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 234, 186, .9)';
    ctx.fillRect(lx - barW / 2 + 9, ly - 2, barW - 18, 2);

    // Cabinet / stand under the glass.
    const cy = rect.y + rect.h - 2;
    const cw = rect.w * 0.88;
    const ch = clamp(h * 0.046, 22, 46);
    const cx = rect.x + rect.w / 2;
    // floor shadow
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + ch + 12, cw * 0.52, Math.max(8, ch * 0.28), 0, 0, TAU);
    ctx.fill();
    // top lip
    ctx.fillStyle = '#070c0e';
    ctx.fillRect(cx - cw / 2 - 7, cy - 3, cw + 14, 5);
    ctx.fillStyle = 'rgba(231, 197, 119, .16)';
    ctx.fillRect(cx - cw / 2 - 7, cy - 3, cw + 14, 1);
    // body
    const wood = ctx.createLinearGradient(0, cy, 0, cy + ch);
    wood.addColorStop(0, '#3b2c1d');
    wood.addColorStop(0.35, '#2a1e14');
    wood.addColorStop(1, '#140e09');
    ctx.fillStyle = wood;
    roundRect(ctx, cx - cw / 2, cy, cw, ch, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 201, 199, .12)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx - cw / 2 + 0.5, cy + 0.5, cw - 1, ch - 1, 3);
    ctx.stroke();
    // centre drawer
    const dw = Math.min(cw * 0.42, 300);
    const dh = Math.max(10, ch * 0.46);
    const dx = cx - dw / 2;
    const dy = cy + ch * 0.27;
    ctx.fillStyle = 'rgba(88, 66, 41, .32)';
    roundRect(ctx, dx, dy, dw, dh, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(231, 197, 119, .16)';
    roundRect(ctx, dx + 0.5, dy + 0.5, dw - 1, dh - 1, 2);
    ctx.stroke();
    ctx.fillStyle = '#b4935b';
    ctx.fillRect(cx - 15, dy + dh / 2 - 1, 30, Math.max(2, ch * 0.05));
    // side seams
    ctx.strokeStyle = 'rgba(0, 0, 0, .35)';
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.29, cy + 3);
    ctx.lineTo(cx - cw * 0.29, cy + ch - 3);
    ctx.moveTo(cx + cw * 0.29, cy + 3);
    ctx.lineTo(cx + cw * 0.29, cy + ch - 3);
    ctx.stroke();
    // small kickboard shadow
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(cx - cw / 2 + 8, cy + ch - 3, cw - 16, 3);
  }

  draw(tank, time, opts = {}) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // background
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    bg.addColorStop(0, '#122b32');
    bg.addColorStop(0.6, '#081419');
    bg.addColorStop(1, '#04090c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(128,180,175,.05)';
    for (let x = 0; x < w; x += 44) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 44) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // specks in the room air
    const rnd = prng(hashString(tank.id) + 3);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h;
      const a = 0.05 + 0.08 * Math.abs(Math.sin(time * 0.6 + i));
      ctx.fillStyle = `rgba(196,238,230,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const pad = Math.min(30, w * 0.045);
    const aspect = tank.kind === 'large' ? 2.05 : 1.34;
    let tw = w - pad * 2;
    let th = tw / aspect;
    if (th > h - pad * 2) {
      th = h - pad * 2;
      tw = th * aspect;
    }
    if (tw > w - pad * 2) { tw = w - pad * 2; th = tw / aspect; }
    const rect = { x: (w - tw) / 2, y: (h - th) / 2 - 2, w: tw, h: th };
    this.drawDetailRoom(ctx, rect, w, h);
    const { water, hits } = drawTankFrame(ctx, tank, rect, {
      state: this.state, time, plaque: false, detail: true, cleanMode: opts.mode === 'clean'
    });
    this.hit = { water, drops: hits.drops, decor: hits.decor };
    this.rect = rect;

    // ghost decoration
    if (opts.ghost && water) {
      const d = DECOR[opts.ghost.type];
      const pos = mapDecorPos(water, { ...opts.ghost, scale: d.scale, y: opts.ghost.y });
      const s = (pos.w / 100);
      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.translate(pos.x, pos.y);
      ctx.scale(s * (opts.ghost.flip ? -1 : 1), s);
      drawDecor(ctx, opts.ghost.type, time, false);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = opts.ghost.valid === false ? 'rgba(235,98,86,.9)' : 'rgba(126,235,185,.85)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, Math.max(20, pos.w * 0.45), 6, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // selected existing decoration outline
    if (opts.selectedDecor != null && hits.decor[opts.selectedDecor]) {
      const d = hits.decor[opts.selectedDecor];
      ctx.save();
      ctx.strokeStyle = 'rgba(231,197,119,.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.w * 0.55, 8, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // lens (inspection zoom)
    if (opts.mode === 'inspect') {
      const p = opts.pointer || { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
      const radius = Math.min(122, w * 0.24);
      const cx = clamp(p.x, rect.x + radius * 0.6, rect.x + rect.w - radius * 0.6);
      const cy = clamp(p.y, rect.y + radius * 0.6, rect.y + rect.h - radius * 0.6);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(cx, cy, radius, 0, TAU, true);
      ctx.fillStyle = 'rgba(3,9,11,.38)';
      ctx.fill('evenodd');
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.scale(2.15, 2.15);
      ctx.translate(-p.x, -p.y);
      drawTankFrame(ctx, tank, rect, { state: this.state, time, plaque: false, detail: true, cleanMode: false });
      ctx.restore();
      // lens bezel
      ctx.save();
      ctx.strokeStyle = 'rgba(231,197,119,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(231,197,119,.28)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220,245,240,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 3, cy);
      ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 9, cy);
      ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy - 3);
      ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 9);
      ctx.stroke();
      // labels on the bezel
      ctx.font = `700 ${Math.max(7, radius * 0.085)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(7,18,20,.85)';
      roundRect(ctx, cx - 58, cy + radius + 10, 116, 20, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(231,197,119,.4)';
      ctx.stroke();
      ctx.fillStyle = '#e7c577';
      ctx.fillText(`ZOOM 2.15× · ${Math.round(tank.cleanliness)}% CLEAR`, cx, cy + radius + 20);
      ctx.restore();
      this.lens = { x: cx, y: cy, r: radius };
    } else {
      this.lens = null;
    }

    // clean-mode cursor
    if (opts.mode === 'clean' && opts.pointer) {
      const p = opts.pointer;
      const inside = this.inWater(p.x, p.y);
      const r = Math.min(26, w * 0.045);
      ctx.save();
      ctx.globalAlpha = inside ? 1 : 0.4;
      ctx.strokeStyle = 'rgba(126,235,185,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(126,235,185,.12)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r - 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(126,235,185,.55)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * (r + 3), p.y + Math.sin(a) * (r + 3));
        ctx.lineTo(p.x + Math.cos(a) * (r + 7), p.y + Math.sin(a) * (r + 7));
        ctx.stroke();
      }
      ctx.restore();
    }
    return { water, rect };
  }

  inWater(x, y) {
    const w = this.hit.water;
    return !!w && x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h;
  }

  dropAt(x, y) {
    for (const d of this.hit.drops) {
      if (Math.hypot(x - d.x, y - d.y) < d.r + 8) return d;
    }
    return null;
  }

  decorAt(x, y) {
    for (let i = this.hit.decor.length - 1; i >= 0; i--) {
      const d = this.hit.decor[i];
      if (Math.abs(x - d.x) < d.w * 0.52 && y > d.y - d.h * 0.92 && y < d.y + 16) return d;
    }
    return null;
  }
}

export { FOODS, mix, alpha };
