import { SPECIES } from './data.js';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function alpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function shade(hex, amt) {
  return amt > 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
}

function prng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const W = 128, H = 80, CY = 40;
const FRAMES = 8;

const BODY = {
  gar: { x0: 40, x1: 108, maxH: 10, tailX: 12, tailSpread: 12, fork: 0, tailLen: 'round' },
  elongated: { x0: 38, x1: 112, maxH: 11, tailX: 10, tailSpread: 12, fork: 0, tailLen: 'round' },
  catfish: { x0: 36, x1: 112, maxH: 15, tailX: 4, tailSpread: 17, fork: 0.55, tailLen: 'fork' },
  round: { x0: 34, x1: 112, maxH: 21, tailX: 12, tailSpread: 13, fork: 0, tailLen: 'round' },
  betta: { x0: 46, x1: 108, maxH: 14, tailX: 2, tailSpread: 31, fork: 0, tailLen: 'betta' },
  cory: { x0: 38, x1: 108, maxH: 12, tailX: 10, tailSpread: 12, fork: 0.5, tailLen: 'fork' },
  paradise: { x0: 38, x1: 110, maxH: 13, tailX: 10, tailSpread: 14, fork: 0.45, tailLen: 'fork' }
};

function profileH(species, body, t) {
  const p = BODY[body] || BODY.elongated;
  let h = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.58) * (1 - 0.1 * t) * p.maxH;
  if (species.id === 'gar') h *= 0.82 + 0.18 * Math.pow(1 - t, 2);
  if (species.id.startsWith('arowana')) h *= 0.9;
  if (species.body === 'cory') h *= 0.95;
  return Math.max(1, h);
}

function bodyPath(species) {
  const p = BODY[species.body] || BODY.elongated;
  const top = [], bottom = [];
  for (let x = p.x0; x <= p.x1; x++) {
    const t = (x - p.x0) / (p.x1 - p.x0);
    const h = profileH(species, species.body, t);
    top.push([x, CY - h]);
    bottom.push([x, CY + h]);
  }
  return { top, bottom, p };
}

function drawBody(ctx, species, frame) {
  const p = BODY[species.body] || BODY.elongated;
  const c = species.colors;
  for (let x = p.x0; x <= p.x1; x++) {
    const t = (x - p.x0) / (p.x1 - p.x0);
    const h = profileH(species, species.body, t);
    const bellyScale = species.body === 'cory' ? 0.68 : 1;
    for (let y = Math.round(CY - h); y <= Math.round(CY + h * bellyScale); y++) {
      const v = (y - CY) / h;
      let col;
      if (v < 0) col = mix(c.back, c.base, Math.min(1, (v + 1) * 1.15));
      else col = mix(c.base, c.belly, Math.min(1, v * 1.2));
      // subtle lateral sheen
      if (v > -0.15 && v < 0.1) col = mix(col, c.fin2 || c.belly, 0.1 + 0.08 * Math.sin(t * 9 + frame));
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
    // dark dorsal edge
    ctx.fillStyle = alpha(c.accent, 0.55);
    ctx.fillRect(x, Math.round(CY - h), 1, 1);
    if (species.body !== 'cory') ctx.fillRect(x, Math.round(CY + h), 1, 1);
  }
  // gar's long armoured snout
  if (species.id === 'gar') {
    for (let x = 105; x <= 124; x++) {
      const t = (x - 105) / 19;
      const h = 4.2 - t * 2.2;
      for (let y = Math.round(CY - h); y <= Math.round(CY + h); y++) {
        const v = (y - CY) / h;
        ctx.fillStyle = v < -0.2 ? mix(c.back, c.base, 0.6) : mix(c.base, c.belly, 0.4 + v * 0.4);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = alpha(c.accent, 0.85);
    ctx.fillRect(105, CY - 4, 19, 1);
    ctx.fillRect(105, CY + 3, 19, 1);
    // teeth glints
    for (let x = 108; x < 122; x += 3) {
      ctx.fillStyle = '#f3ead2';
      ctx.fillRect(x, CY + 1, 1, 1);
    }
  }
}

function drawTail(ctx, species, frame) {
  const p = BODY[species.body] || BODY.elongated;
  const c = species.colors;
  const phase = (frame / FRAMES) * Math.PI * 2;
  const sway = Math.sin(phase) * (species.body === 'betta' ? 5 : 3.5);
  const baseX = p.x0 + 2;
  const tipX = p.tailX;
  const finColor = c.fin;
  const finLight = c.fin2 || mix(c.fin, '#ffffff', 0.28);

  if (p.tailLen === 'betta' && species.finStyle === 'halfmoon') {
    // Giant 180° halfmoon skirt, scanned by y so the outer edge is a true arc.
    const rx = 45, ry = 32;
    for (let y = -ry; y <= ry; y++) {
      const v = y / ry;
      const arc = Math.sqrt(Math.max(0, 1 - v * v));
      const xTip = Math.round(baseX - rx * arc + sway * 0.4 * v);
      const cy = CY;
      for (let x = xTip; x <= baseX; x++) {
        const t = (x - xTip) / Math.max(1, baseX - xTip);
        let col = mix(c.fin, c.back, Math.pow(Math.abs(v), 2.4) * 0.5);
        col = mix(col, finLight, Math.pow(t, 2.6) * 0.5 + (1 - arc) * 0.18);
        if (t > 0.9) col = mix(col, shade(c.fin, -0.22), 0.32);
        ctx.fillStyle = col;
        ctx.fillRect(x, cy + y, 1, 1);
      }
    }
    // radial fin rays
    ctx.strokeStyle = alpha(finLight, 0.55);
    ctx.lineWidth = 0.7;
    for (let i = -10; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 0.5;
      ctx.beginPath();
      ctx.moveTo(baseX, CY + sway * 0.2);
      ctx.lineTo(baseX - rx * Math.cos(a), CY + ry * Math.sin(a));
      ctx.stroke();
    }
    ctx.strokeStyle = alpha(finLight, 0.85);
    ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 0.5;
      const edge = 0.92 + Math.sin(i * 2.1) * 0.012;
      ctx.beginPath();
      ctx.moveTo(baseX - rx * Math.cos(a) * edge, CY + ry * Math.sin(a) * edge);
      ctx.lineTo(baseX - rx * Math.cos(a) * edge + 1, CY + ry * Math.sin(a) * edge);
      ctx.stroke();
    }
    return;
  }

  if (p.tailLen === 'betta') {
    // Crown tail — membrane plus long needle rays.
    const rx = 35, ry = 28;
    for (let y = -ry; y <= ry; y++) {
      const v = y / ry;
      const arc = Math.sqrt(Math.max(0, 1 - v * v));
      const xTip = Math.round(baseX - rx * arc * 0.72 + sway * 0.4 * v);
      for (let x = xTip; x <= baseX; x++) {
        const t = (x - xTip) / Math.max(1, baseX - xTip);
        let col = mix(c.fin, c.back, Math.pow(Math.abs(v), 3) * 0.55);
        col = mix(col, finLight, Math.pow(t, 3) * 0.45);
        ctx.fillStyle = col;
        ctx.fillRect(x, CY + y, 1, 1);
      }
    }
    ctx.strokeStyle = c.fin2 || finLight;
    ctx.lineWidth = 1;
    for (let i = -9; i <= 9; i++) {
      const a = (i / 9) * Math.PI * 0.5;
      ctx.beginPath();
      ctx.moveTo(baseX, CY + sway * 0.2);
      ctx.lineTo(baseX - rx * 1.18 * Math.cos(a), CY + ry * 1.18 * Math.sin(a));
      ctx.stroke();
    }
    return;
  }

  const fork = p.fork || 0;
  for (let x = tipX; x <= baseX; x++) {
    const t = (x - tipX) / (baseX - tipX);
    const half = 2 + (p.tailSpread - 2) * Math.pow(1 - t, 0.72);
    const cy = CY + sway * 0.75 * (1 - t);
    const notch = fork * (0.42 - Math.min(t, 0.42)) * half * 1.15;
    const topY = Math.round(cy - half), botY = Math.round(cy + half);
    for (let y = topY; y <= botY; y++) {
      if (notch > 0 && Math.abs(y - cy) < notch) continue;
      const v = Math.abs((y - cy) / half);
      let col = mix(finColor, c.back, Math.pow(v, 2.2) * 0.5);
      if (v < 0.28) col = mix(col, finLight, 0.3);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // crisp outer edge
  ctx.fillStyle = alpha(finLight, 0.5);
  for (let x = tipX; x <= baseX; x++) {
    const t = (x - tipX) / (baseX - tipX);
    const half = 2 + (p.tailSpread - 2) * Math.pow(1 - t, 0.72);
    const cy = CY + sway * 0.75 * (1 - t);
    if (fork > 0 && (0.42 - t) > 0 && Math.abs(half - 0.0) > 0) {
      // fork edges only
      if (t < 0.4) continue;
    }
    ctx.fillRect(x, Math.round(cy - half), 1, 1);
    ctx.fillRect(x, Math.round(cy + half), 1, 1);
  }
  // translucent fin rays
  ctx.strokeStyle = alpha(finLight, 0.42);
  ctx.lineWidth = 0.65;
  for (let i = -4; i <= 4; i++) {
    const v = i / 4;
    ctx.beginPath();
    ctx.moveTo(baseX - 1, CY + sway * 0.2);
    ctx.quadraticCurveTo(
      tipX + (baseX - tipX) * 0.45,
      CY + sway * 0.5 + v * p.tailSpread * 0.45,
      tipX + 1,
      CY + sway + v * p.tailSpread * 0.92
    );
    ctx.stroke();
  }
}

function drawDorsal(ctx, species, frame) {
  const c = species.colors;
  const phase = (frame / FRAMES) * Math.PI * 2;
  const sway = Math.sin(phase) * 1.2;
  const finLight = c.fin2 || mix(c.fin, '#ffffff', 0.25);
  const fill = (pts, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  };

  if (species.body === 'betta') {
    // billowing dorsal sail
    fill([[52, CY - 8], [58, CY - 27 + sway], [75, CY - 33 + sway], [92, CY - 26], [100, CY - 9]], c.fin);
    fill([[60, CY - 10], [66, CY - 25 + sway], [80, CY - 29 + sway], [90, CY - 20], [94, CY - 10]], alpha(finLight, 0.22));
    ctx.strokeStyle = alpha(finLight, 0.55);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 5, CY - 8);
      ctx.lineTo(63 + i * 4.4, CY - 24 - Math.sin(i) * 4 + sway);
      ctx.stroke();
    }
    // trailing anal fin
    fill([[48, CY + 8], [52, CY + 26 + sway], [72, CY + 32], [94, CY + 23], [102, CY + 8]], c.fin);
    ctx.strokeStyle = alpha(finLight, 0.4);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(58 + i * 7, CY + 8);
      ctx.lineTo(56 + i * 7, CY + 24 + Math.sin(i * 1.7) * 3 + sway);
      ctx.stroke();
    }
    return;
  }

  if (species.id === 'gar') {
    fill([[86, CY - 8], [92, CY - 16], [98, CY - 15], [102, CY - 7]], c.fin);
    fill([[84, CY + 7], [90, CY + 15], [100, CY + 14], [104, CY + 6]], c.fin);
    return;
  }

  if (species.body === 'round') {
    // Flowerhorn: swept dorsal and anal fins, kept behind the nuchal hump.
    fill([[44, CY - 8], [51, CY - 17], [63, CY - 21], [76, CY - 16], [82, CY - 7]], c.fin);
    fill([[50, CY - 9], [56, CY - 14], [66, CY - 17], [75, CY - 13], [79, CY - 8]], alpha(finLight, 0.22));
    fill([[56, CY + 9], [66, CY + 20], [88, CY + 19], [102, CY + 8]], c.fin);
    ctx.strokeStyle = alpha(finLight, 0.42);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(48 + i * 5.5, CY - 9);
      ctx.lineTo(51 + i * 5, CY - 16 - Math.sin(i * 0.9) * 3);
      ctx.stroke();
    }
    return;
  }

  if (species.body === 'cory') {
    fill([[70, CY - 8], [76, CY - 20], [85, CY - 18], [88, CY - 7]], c.fin);
    fill([[92, CY - 6], [98, CY - 10], [102, CY - 6]], mix(c.fin, c.back, 0.3));
    return;
  }

  if (species.body === 'catfish') {
    fill([[72, CY - 11], [78, CY - 22], [86, CY - 20], [90, CY - 9]], c.fin);
    fill([[54, CY + 10], [72, CY + 21], [98, CY + 22], [104, CY + 10]], alpha(c.fin, 0.9));
    return;
  }

  if (species.body === 'paradise') {
    for (let i = 0; i < 6; i++) {
      const x = 58 + i * 6;
      fill([[x, CY - 10], [x + 2.5, CY - 19 - (i === 2 ? 3 : 0)], [x + 5, CY - 10]], i % 2 ? c.fin : mix(c.fin, c.accent, 0.2));
    }
    fill([[56, CY + 9], [66, CY + 19], [86, CY + 18], [96, CY + 9]], c.fin);
    return;
  }

  // elongated arowana/channa: long flowing fin ribbons
  if (species.id.startsWith('arowana')) {
    // Low dorsal near the caudal peduncle.
    fill([[86, CY - 7], [91, CY - 12], [99, CY - 11], [104, CY - 6]], c.fin);
    fill([[90, CY - 8], [93, CY - 10.5], [98, CY - 10], [101, CY - 7]], alpha(finLight, 0.22));
    // Long anal fin running to the tail.
    fill([[52, CY + 8], [60, CY + 15], [80, CY + 16], [98, CY + 12], [105, CY + 7]], c.fin);
    fill([[60, CY + 9], [67, CY + 13], [82, CY + 14], [95, CY + 11], [100, CY + 8]], alpha(finLight, 0.16));
    ctx.strokeStyle = alpha(finLight, 0.5);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      const x = 88 + i * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, CY - 7);
      ctx.lineTo(x + 0.6, CY - 12 - Math.sin(i * 0.8) * 1.4);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = 61 + i * 5.6;
      ctx.beginPath();
      ctx.moveTo(x, CY + 8);
      ctx.lineTo(x + 1.6, CY + 14 - Math.sin(i * 0.6) * 1.4);
      ctx.stroke();
    }
    // barbels
    ctx.strokeStyle = alpha(c.belly, 0.72);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(108, CY + 2); ctx.quadraticCurveTo(116, CY + 5, 118, CY + 10);
    ctx.stroke();
  } else {
    fill([[64, CY - 9], [72, CY - 17], [84, CY - 16], [96, CY - 8]], c.fin);
    fill([[66, CY + 9], [76, CY + 16], [94, CY + 15], [102, CY + 8]], c.fin);
  }
}

function drawPectoral(ctx, species, frame) {
  const c = species.colors;
  const sway = Math.sin((frame / FRAMES) * Math.PI * 2 + 0.7) * 2;
  const finLight = c.fin2 || mix(c.fin, '#ffffff', 0.3);
  ctx.save();
  ctx.translate(species.body === 'betta' ? 94 : 96, CY + 4);
  ctx.rotate(0.3 + sway * 0.035);
  ctx.fillStyle = alpha(c.fin, 0.92);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-13, 4 + sway);
  ctx.lineTo(-8, 9 + sway);
  ctx.lineTo(1, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(finLight, 0.55);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(-10, 6 + sway);
  ctx.stroke();
  ctx.restore();
}

function drawPattern(ctx, species, frame) {
  const c = species.colors;
  const p = BODY[species.body] || BODY.elongated;
  const rnd = prng(hashString(species.id) + 17);
  const inBody = (x, y) => {
    if (x < p.x0 || x > p.x1) return false;
    const t = (x - p.x0) / (p.x1 - p.x0);
    const h = profileH(species, species.body, t);
    return y > CY - h + 1 && y < CY + h * 0.96 - 1;
  };
  const dot = (x, y, r, col) => {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx * dx + dy * dy <= r * r + 0.5 && inBody(Math.round(x + dx), Math.round(y + dy))) {
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
        }
      }
    }
  };

  switch (species.pattern) {
    case 'leopard': {
      for (let i = 0; i < 22; i++) {
        const x = p.x0 + 8 + rnd() * (p.x1 - p.x0 - 12);
        const y = CY - 6 + rnd() * 11;
        dot(x, y, rnd() < 0.4 ? 2 : 1, alpha(c.accent, 0.78));
      }
      for (let i = 0; i < 12; i++) {
        const x = p.x0 + 8 + rnd() * (p.x1 - p.x0 - 12);
        const y = CY - 5 + rnd() * 9;
        dot(x, y, 0, alpha(mix(c.belly, '#ffffff', 0.4), 0.5));
      }
      break;
    }
    case 'blotch': {
      for (let i = 0; i < 13; i++) {
        const x = p.x0 + 6 + rnd() * (p.x1 - p.x0 - 8);
        const y = CY - 7 + rnd() * 12;
        const r = rnd() < 0.5 ? 2 : 3;
        dot(x, y, r, alpha(c.accent, 0.6 + rnd() * 0.2));
      }
      // electric edge along the back
      for (let x = p.x0 + 10; x < p.x1 - 8; x += 2) {
        const t = (x - p.x0) / (p.x1 - p.x0);
        const h = profileH(species, species.body, t);
        ctx.fillStyle = alpha(c.fin2 || c.belly, 0.3);
        if (rnd() < 0.7) ctx.fillRect(x, Math.round(CY - h + 1), 1, 1);
      }
      break;
    }
    case 'scales': {
      for (let x = p.x0 + 6; x < p.x1 - 2; x += 4) {
        const t = (x - p.x0) / (p.x1 - p.x0);
        const h = profileH(species, species.body, t);
        for (let y = Math.round(CY - h + 3); y < Math.round(CY + h - 1); y += 4) {
          ctx.fillStyle = alpha(mix(c.belly, '#ffffff', 0.3), 0.36);
          ctx.fillRect(x, y, 2, 1);
          ctx.fillStyle = alpha(c.accent, 0.22);
          ctx.fillRect(x + 3, y + 1, 1, 1);
        }
      }
      for (let x = p.x0 + 8; x < p.x1 - 10; x += 2) {
        ctx.fillStyle = alpha(c.fin2 || '#ffffff', 0.1);
        ctx.fillRect(x, CY - 2, 1, 3);
      }
      break;
    }
    case 'speckle': {
      for (let i = 0; i < 28; i++) {
        const x = p.x0 + 5 + rnd() * (p.x1 - p.x0 - 8);
        const y = CY - 9 + rnd() * 17;
        dot(x, y, 0, alpha(mix(c.belly, '#ffffff', 0.5), 0.4 + rnd() * 0.3));
      }
      break;
    }
    case 'flowerhorn': {
      for (let i = 0; i < 11; i++) {
        const x = p.x0 + 8 + rnd() * (p.x1 - p.x0 - 14);
        const y = CY - 9 + rnd() * 16;
        dot(x, y, rnd() < 0.5 ? 2 : 3, alpha(c.accent, 0.55));
      }
      for (let x = 70; x < 98; x++) {
        for (let y = CY - 11; y < CY + 6; y++) {
          if (inBody(x, y) && rnd() < 0.5) {
            ctx.fillStyle = alpha(c.red, 0.35 + 0.2 * Math.sin(x * 0.3 + y));
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      for (let i = 0; i < 18; i++) {
        const x = p.x0 + 8 + rnd() * (p.x1 - p.x0 - 12);
        const y = CY - 8 + rnd() * 15;
        dot(x, y, 0, alpha(c.fin2, 0.45));
      }
      break;
    }
    case 'panda': {
      // black eye mask
      for (let x = 92; x < 106; x++) {
        for (let y = CY - 8; y < CY + 2; y++) {
          if (inBody(x, y) && (y < CY - 2 || rnd() < 0.5)) {
            ctx.fillStyle = c.accent;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // back patch
      for (let x = 62; x < 80; x++) {
        for (let y = CY - 9; y < CY - 1; y++) {
          if (inBody(x, y) && rnd() < 0.85) {
            ctx.fillStyle = c.accent;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // tail band
      for (let x = 44; x < 54; x++) {
        for (let y = CY - 5; y < CY + 5; y++) {
          if (inBody(x, y) && rnd() < 0.7) {
            ctx.fillStyle = c.accent;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }
    case 'paradise': {
      for (let x = 52; x < 106; x += 9) {
        for (let y = CY - 8; y < CY + 8; y++) {
          if (inBody(x, y) || inBody(x + 1, y)) {
            ctx.fillStyle = alpha(c.fin, 0.55);
            ctx.fillRect(x, y, 2, 1);
          }
        }
      }
      for (let x = 58; x < 100; x += 9) {
        for (let y = CY - 6; y < CY + 5; y++) {
          if (inBody(x + 3, y)) {
            ctx.fillStyle = alpha('#4aa6d8', 0.35);
            ctx.fillRect(x + 3, y, 1, 1);
          }
        }
      }
      break;
    }
    case 'iridescent': {
      for (let x = p.x0 + 6; x < p.x1 - 8; x++) {
        const t = (x - p.x0) / (p.x1 - p.x0);
        const h = profileH(species, species.body, t);
        const sheen = Math.max(0, Math.sin((x / 8) + 0.6)) * 0.3;
        ctx.fillStyle = alpha(c.fin2, sheen);
        ctx.fillRect(x, Math.round(CY - h * 0.55), 1, Math.max(1, Math.round(h * 0.35)));
      }
      break;
    }
  }
}

function drawHeadDetails(ctx, species, frame) {
  const c = species.colors;
  const p = BODY[species.body] || BODY.elongated;
  const ex = species.id === 'gar' ? 100 : p.x1 - 17;
  const ey = CY - 4;
  // gill line
  ctx.fillStyle = alpha(c.accent, 0.5);
  for (let y = -5; y <= 5; y++) ctx.fillRect(ex - 7 + Math.round(Math.abs(y) * 0.15), ey + y + 2, 1, 1);
  // lip
  ctx.fillStyle = alpha(c.accent, 0.8);
  if (species.id === 'gar') {
    ctx.fillRect(118, CY + 1, 6, 1);
  } else {
    ctx.fillRect(p.x1 - 6, CY + 3, 6, 1);
    ctx.fillStyle = alpha(c.belly, 0.7);
    ctx.fillRect(p.x1 - 5, CY + 4, 4, 1);
  }
  // eye socket
  ctx.fillStyle = alpha(c.accent, 0.65);
  ctx.beginPath();
  ctx.arc(ex, ey, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.eye;
  ctx.beginPath();
  ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.pupil;
  ctx.beginPath();
  ctx.arc(ex + 0.6, ey, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ex + 1, ey - 2, 1, 1);
  // nostril
  ctx.fillStyle = alpha(c.accent, 0.6);
  ctx.fillRect(p.x1 - 10, CY - 1, 1, 1);

  if (species.body === 'catfish') {
    ctx.strokeStyle = mix(c.belly, '#ffffff', 0.2);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x1 - 4, CY + 3 + i);
      ctx.quadraticCurveTo(p.x1 + 8, CY + 6 + i * 4, p.x1 + 16, CY + 13 + i * 3);
      ctx.stroke();
    }
  }
  if (species.id.startsWith('arowana')) {
    ctx.strokeStyle = alpha(c.belly, 0.8);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x1 - 2, CY + 4);
    ctx.quadraticCurveTo(p.x1 + 5, CY + 10, p.x1 + 3, CY + 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x1 - 5, CY + 4);
    ctx.quadraticCurveTo(p.x1 + 1, CY + 9, p.x1 - 1, CY + 13);
    ctx.stroke();
  }
}

function drawHump(ctx, species) {
  if (species.body !== 'round') return;
  const c = species.colors;
  const p = BODY.round;
  const x0 = p.x1 - 36;
  const x1 = p.x1 - 1;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const h = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.015)), 1.05) * 14;
    for (let y = Math.round(CY - 12 - h); y < Math.round(CY - 9); y++) {
      const v = (y - (CY - 12 - h)) / Math.max(1, h + 3);
      let col = mix(c.back, c.base, 0.14 + v * 0.72);
      if (v < 0.14) col = mix(col, c.fin2, 0.1);
      if (v > 0.86) col = mix(col, c.belly, 0.22);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // glossy crown highlight
  ctx.fillStyle = alpha(shade(c.base, 0.22), 0.4);
  ctx.fillRect(p.x1 - 24, CY - 23, 8, 2);
  ctx.fillRect(p.x1 - 20, CY - 21, 3, 1);
  ctx.fillStyle = alpha('#ffffff', 0.12);
  ctx.fillRect(p.x1 - 27, CY - 20, 2, 1);
  // soft crease where the hump meets the back
  ctx.fillStyle = alpha(c.accent, 0.28);
  ctx.fillRect(x0, CY - 13, 2, 1);
  ctx.fillRect(x0 + 1, CY - 14, 1, 1);
}

export function buildFishSprite(species, frame) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawTail(ctx, species, frame);
  drawDorsal(ctx, species, frame);
  drawHump(ctx, species);
  drawBody(ctx, species, frame);
  drawPattern(ctx, species, frame);
  drawPectoral(ctx, species, frame);
  drawHeadDetails(ctx, species, frame);
  // belly fin / pelvic
  const c = species.colors;
  ctx.fillStyle = alpha(c.fin, 0.7);
  ctx.beginPath();
  ctx.moveTo(74, CY + 10);
  ctx.lineTo(68, CY + 18 + Math.sin(frame * 0.8) * 1.5);
  ctx.lineTo(76, CY + 17);
  ctx.closePath();
  ctx.fill();
  return cv;
}

const frameCache = new Map();
export function getFishFrames(speciesId) {
  if (!frameCache.has(speciesId)) {
    const sp = SPECIES[speciesId];
    const frames = [];
    for (let i = 0; i < FRAMES; i++) frames.push(buildFishSprite(sp, i));
    frameCache.set(speciesId, frames);
  }
  return frameCache.get(speciesId);
}

export function drawFishSprite(ctx, speciesId, timeSec, x, y, width, dir = 1, growth = 1) {
  const frames = getFishFrames(speciesId);
  const frame = Math.floor((timeSec * (speciesId.startsWith('arowana') || speciesId === 'gar' ? 6 : 9) + x * 0.01) % FRAMES);
  const sprite = frames[frame];
  const scale = 0.55 + 0.45 * Math.min(1, growth);
  const w = width * scale;
  const h = w * (H / W);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -w / 2 / scale, -h / 2 / scale, w / scale, h / scale);
  ctx.restore();
}

const thumbCache = new Map();
export function fishThumb(speciesId) {
  if (thumbCache.has(speciesId)) return thumbCache.get(speciesId);
  const cv = document.createElement('canvas');
  cv.width = 220; cv.height = 120;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const frames = getFishFrames(speciesId);
  const sp = frames[0];
  const w = 166, h = w * (H / W);
  ctx.drawImage(sp, 220 / 2 - w / 2, 60 - h / 2, w, h);
  const url = cv.toDataURL();
  thumbCache.set(speciesId, url);
  return url;
}

// ---------------------------------------------------------------------------
// Decor art — local 100×100 box anchored at bottom-centre
// ---------------------------------------------------------------------------
export function drawDecor(ctx, type, time, flip = false) {
  ctx.save();
  // Decor art is authored in a 100×100 box with its base at y=100. Move the
  // origin to the base so callers can translate straight to a substrate point.
  ctx.translate(-50, -100);
  if (flip) ctx.scale(-1, 1);
  const sway = Math.sin(time * 0.9) * 2;
  switch (type) {
    case 'driftwood': {
      ctx.strokeStyle = '#4a2f1c';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50, 100);
      ctx.quadraticCurveTo(46, 68, 36, 44);
      ctx.quadraticCurveTo(30, 27, 38, 17);
      ctx.stroke();
      ctx.strokeStyle = '#6f4a2d';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(48, 100);
      ctx.quadraticCurveTo(44, 68, 36, 45);
      ctx.stroke();
      ctx.strokeStyle = '#4a2f1c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(44, 66);
      ctx.quadraticCurveTo(66, 56, 78, 39);
      ctx.stroke();
      ctx.strokeStyle = '#7f5432';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(44, 65);
      ctx.quadraticCurveTo(66, 55, 77, 40);
      ctx.stroke();
      ctx.strokeStyle = '#4a2f1c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(42, 78);
      ctx.quadraticCurveTo(24, 72, 16, 55);
      ctx.stroke();
      ctx.strokeStyle = '#8b6039';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, 44);
      ctx.quadraticCurveTo(27, 28, 38, 18);
      ctx.stroke();
      // moss
      ctx.fillStyle = '#4d7a46';
      for (let i = 0; i < 10; i++) {
        const x = 28 + (i * 17) % 46;
        const y = 48 + (i * 29) % 40;
        ctx.fillRect(x, y, 3, 2);
      }
      break;
    }
    case 'seiryu': {
      const pts = [[8, 100], [12, 76], [28, 57], [37, 42], [56, 36], [72, 53], [88, 65], [95, 100]];
      ctx.fillStyle = '#3d4c58';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#596b76';
      ctx.beginPath();
      ctx.moveTo(28, 57); ctx.lineTo(37, 42); ctx.lineTo(56, 36); ctx.lineTo(60, 53); ctx.lineTo(39, 63);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7e8f97';
      ctx.fillRect(38, 44, 16, 3);
      ctx.fillRect(31, 57, 13, 2);
      ctx.strokeStyle = '#aebcc0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 45); ctx.lineTo(66, 63);
      ctx.moveTo(30, 66); ctx.lineTo(46, 81);
      ctx.stroke();
      ctx.fillStyle = '#26323c';
      ctx.fillRect(54, 75, 30, 25);
      break;
    }
    case 'anubias': {
      const leaves = [
        [50, 82, -52, 20], [39, 73, -105, 17], [61, 72, 32, 16],
        [44, 91, -30, 19], [59, 92, 38, 18], [66, 84, 75, 14]
      ];
      for (let i = 0; i < leaves.length; i++) {
        const [x, y, rot, len] = leaves[i];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rot + sway * 0.6) * Math.PI / 180);
        ctx.fillStyle = i % 2 ? '#2f623d' : '#3f7b48';
        ctx.beginPath();
        ctx.ellipse(len * 0.38, 0, len * 0.55, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#73a865';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'vallisneria': {
      for (let i = 0; i < 9; i++) {
        const x = 32 + i * 4.2;
        const h = 38 + (i % 4) * 12;
        const bend = Math.sin(time * 1.2 + i) * (5 + i * 0.5);
        ctx.strokeStyle = i % 2 ? '#4d8a4b' : '#6aa85a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.quadraticCurveTo(x + bend, 100 - h * 0.55, x + bend * 1.7, 100 - h);
        ctx.stroke();
      }
      break;
    }
    case 'lotus': {
      ctx.strokeStyle = '#7a3b35';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const x = 38 + i * 8;
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.quadraticCurveTo(x + sway, 78, x + 4 + sway, 58 + i * 4);
        ctx.stroke();
      }
      const pads = [[40, 54, 15], [62, 44, 17], [51, 69, 12]];
      for (const [x, y, r] of pads) {
        ctx.fillStyle = '#7a2d3d';
        ctx.beginPath();
        ctx.ellipse(x + sway * 0.4, y, r, r * 0.58, -0.15, 0.25, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a34454';
        ctx.beginPath();
        ctx.ellipse(x - 2 + sway * 0.4, y - 1, r * 0.55, r * 0.3, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cave': {
      ctx.fillStyle = '#7b6a55';
      ctx.beginPath();
      ctx.moveTo(14, 100);
      ctx.quadraticCurveTo(12, 58, 50, 52);
      ctx.quadraticCurveTo(88, 58, 86, 100);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9a876d';
      ctx.beginPath();
      ctx.moveTo(22, 100);
      ctx.quadraticCurveTo(22, 65, 50, 59);
      ctx.quadraticCurveTo(58, 65, 58, 76);
      ctx.quadraticCurveTo(40, 80, 38, 100);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a2723';
      ctx.beginPath();
      ctx.ellipse(52, 90, 18, 17, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(34, 90, 36, 10);
      ctx.fillStyle = '#4d7a46';
      ctx.fillRect(24, 80, 4, 3);
      ctx.fillRect(72, 70, 3, 3);
      break;
    }
  }
  ctx.restore();
}

export function decorThumb(type) {
  const cv = document.createElement('canvas');
  cv.width = 120; cv.height = 120;
  const ctx = cv.getContext('2d');
  ctx.translate(60, 112);
  ctx.scale(0.92, 0.92);
  drawDecor(ctx, type, 1);
  return cv.toDataURL();
}

// ---------------------------------------------------------------------------
// Money + food particles
// ---------------------------------------------------------------------------
export function drawBanknote(ctx, x, y, scale, time, value = 50000) {
  const bob = Math.sin(time * 2.2 + x * 0.1) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(Math.sin(time * 1.6 + x * 0.03) * 0.08);
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(255, 214, 112, .75)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255, 220, 120, .5)';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#dbe8c4';
  ctx.fillRect(-15, -9, 30, 18);
  ctx.fillStyle = '#9fbf8f';
  ctx.fillRect(-15, -9, 30, 2);
  ctx.fillRect(-15, 7, 30, 2);
  ctx.fillStyle = '#7f9a70';
  ctx.fillRect(-13, -6, 7, 12);
  ctx.fillStyle = '#e8c96e';
  ctx.beginPath();
  ctx.arc(5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6a24';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(value >= 100000 ? '100' : '50', 5, 2);
  ctx.fillStyle = '#4e6750';
  ctx.fillRect(-12, -5, 2, 1);
  ctx.fillRect(-12, -3, 2, 1);
  ctx.restore();
}

export function drawFoodParticle(ctx, foodId, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (foodId === 'live') {
    ctx.fillStyle = '#78999b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8d2ce';
    ctx.fillRect(1, -1, 1, 1);
  } else if (foodId === 'shrimp') {
    ctx.fillStyle = color || '#e77b58';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0.3, Math.PI * 1.8);
    ctx.strokeStyle = color || '#e77b58';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (foodId === 'bloodworms') {
    ctx.strokeStyle = color || '#c74b48';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, -2, 3, 0);
    ctx.stroke();
  } else {
    ctx.fillStyle = color || '#d7a443';
    ctx.fillRect(-1, -1, 2, 2);
  }
  ctx.restore();
}

export function drawBubble(ctx, x, y, r, alphaValue = 0.5) {
  ctx.strokeStyle = `rgba(190, 238, 236, ${alphaValue})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(230, 255, 250, ${alphaValue * 0.35})`;
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

export function foodIcon(type) {
  const icons = {
    pellets: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="7" y="10" width="5" height="5" fill="#e0aa4e"/><rect x="16" y="7" width="4" height="4" fill="#c48728"/><rect x="20" y="15" width="5" height="5" fill="#e0aa4e"/><rect x="11" y="18" width="4" height="4" fill="#b57924"/><rect x="15" y="23" width="4" height="4" fill="#e0aa4e"/><rect x="25" y="9" width="3" height="3" fill="#f0c878"/></svg>',
    worms: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><path d="M6 13 Q11 8 15 13 T24 14" stroke="#d94b4b" stroke-width="3" fill="none"/><path d="M8 21 Q13 17 17 21 T26 21" stroke="#a62c35" stroke-width="3" fill="none"/><rect x="23" y="11" width="2" height="2" fill="#f38c82"/></svg>',
    live: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="10" y="14" width="14" height="5" fill="#8fb1b1"/><rect x="23" y="12" width="5" height="9" fill="#8fb1b1"/><rect x="6" y="11" width="6" height="11" fill="#6d9092"/><rect x="25" y="14" width="2" height="2" fill="#172026"/><rect x="13" y="15" width="7" height="1" fill="#c9dedb"/></svg>',
    shrimp: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><path d="M23 9 C12 10 8 18 12 24 C15 28 22 27 24 22" stroke="#e77b58" stroke-width="5" fill="none"/><path d="M21 10 L27 6 L25 13 Z" fill="#f09a76"/><rect x="14" y="16" width="2" height="2" fill="#8c3124"/></svg>'
  };
  return icons[type] || icons.pellets;
}
