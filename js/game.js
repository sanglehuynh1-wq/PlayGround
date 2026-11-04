import {
  SPECIES, FOODS, DECOR, TANK_BLUEPRINTS, STARTER_FISH, FISH_NAMES
} from './data.js';

export const SAVE_KEY = 'thuycung_aquarium_v1';
let uidCounter = 1;
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${(uidCounter++).toString(36)}`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createFish(speciesId, tankId, opts = {}) {
  const sp = SPECIES[speciesId];
  if (!sp) throw new Error(`Unknown species: ${speciesId}`);
  return {
    id: opts.id || uid('fish'),
    speciesId,
    tankId,
    name: opts.name || pick(FISH_NAMES),
    sex: opts.sex || (Math.random() < 0.5 ? 'male' : 'female'),
    growth: opts.growth ?? 1,
    fullness: opts.fullness ?? rand(70, 88),
    health: 100,
    x: opts.x ?? rand(0.2, 0.8),
    y: opts.y ?? rand(0.28, 0.66),
    tx: rand(0.2, 0.8),
    ty: rand(0.26, 0.68),
    dir: Math.random() < 0.5 ? -1 : 1,
    waypoint: rand(1, 4),
    moneyTimer: rand(14, 26),
    cooldown: 0,
    bornSec: 0,
    feedFlash: 0,
    speed: sp.speed || 0.5
  };
}

export function createState() {
  const tanks = TANK_BLUEPRINTS.map(bp => ({
    ...JSON.parse(JSON.stringify(bp)),
    fish: [],
    eggs: [],
    feedParticles: [],
    particles: [],
    grimeSeed: Math.floor(Math.random() * 999999)
  }));
  const state = {
    version: 1,
    money: 2400000,
    day: 1,
    clock: 9 * 60 + 10,
    elapsed: 0,
    foods: { pellets: 18, bloodworms: 10, live: 4, shrimp: 6 },
    selectedFood: 'bloodworms',
    tanks,
    tray: [],
    drops: [],
    stats: { earned: 0, spent: 0, collected: 0, fishBought: 0, eggsHatched: 0, fed: 0, cleaned: 0 },
    sound: true,
    events: [],
    gameMinutesPerSec: 1.4
  };
  for (const starter of STARTER_FISH) {
    const tank = tanks.find(t => t.id === starter.tankId);
    tank.fish.push(createFish(starter.speciesId, starter.tankId, {
      name: starter.name, sex: starter.sex, growth: starter.growth
    }));
  }
  // A couple of loose banknotes make the collection loop legible immediately.
  state.drops.push({
    id: uid('drop'), tankId: 'P1', x: 0.58, y: 0.35,
    value: 65000, life: 95, born: 0
  });
  state.drops.push({
    id: uid('drop'), tankId: 'S1', x: 0.44, y: 0.42,
    value: 18000, life: 95, born: 0
  });
  return state;
}

export function tankById(state, tankId) {
  return state.tanks.find(t => t.id === tankId);
}

export function happinessOf(fish, tank) {
  const sp = SPECIES[fish.speciesId];
  if (!sp) return 0;
  const full = clamp(fish.fullness, 0, 100);
  const clean = clamp(tank.cleanliness, 0, 100);
  const beauty = clamp(beautyOf(tank), 0, 100);
  const over = Math.max(0, tank.fish.length - tank.capacity);
  const oxygen = clamp(tank.oxygen, 0, 100);
  return clamp(Math.round(full * 0.5 + clean * 0.27 + beauty * 0.13 + oxygen * 0.1 - over * 9), 0, 100);
}

export function beautyOf(tank) {
  return Math.round(6 + (tank.decor || []).reduce((sum, d) => sum + (DECOR[d.type]?.beauty || 0), 0));
}

export function stageOf(fish) {
  if (fish.growth < 0.45) return 'Fry';
  if (fish.growth < 0.95) return 'Juvenile';
  return 'Adult';
}

export function emit(state, type, payload = {}) {
  state.events.push({ type, ...payload });
}

export function update(state, dtRaw) {
  const dt = clamp(dtRaw, 0, 0.25);
  state.elapsed += dt;
  state.clock += dt * state.gameMinutesPerSec;
  if (state.clock >= 1440) {
    state.clock -= 1440;
    state.day += 1;
    emit(state, 'day', { day: state.day });
  }

  for (const tank of state.tanks) {
    // Water slowly fouls; a filter helps, feeding accelerates it.
    tank.cleanliness = clamp(tank.cleanliness - dt * (tank.filter ? 0.028 : 0.045), 0, 100);
    tank.temp = clamp(tank.temp + Math.sin(state.elapsed * 0.07 + tank.id.charCodeAt(1)) * dt * 0.006, 24, 31);
    tank.oxygen = clamp(tank.oxygen + (tank.filter ? dt * 0.05 : -dt * 0.03), 55, 99);

    for (const fish of tank.fish) {
      fish.fullness = clamp(fish.fullness - dt * (fish.growth < 0.45 ? 0.1 : 0.135), 0, 100);
      if (fish.growth < 1) fish.growth = clamp(fish.growth + dt * 0.0085, 0, 1);
      fish.cooldown = Math.max(0, fish.cooldown - dt);
      fish.feedFlash = Math.max(0, fish.feedFlash - dt);
      // Swim toward a waypoint, then pick a new one.
      fish.waypoint -= dt;
      const dx = fish.tx - fish.x;
      const dy = fish.ty - fish.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.025 || fish.waypoint <= 0) {
        const tankWide = tank.kind === 'large';
        fish.tx = rand(0.14, 0.86);
        fish.ty = rand(tankWide ? 0.2 : 0.3, tankWide ? 0.72 : 0.7);
        fish.waypoint = rand(2.5, 6.5);
      } else {
        const sp = fish.speed * (fish.growth < 0.5 ? 0.55 : 1) * dt;
        const step = Math.min(dist, sp);
        fish.x += (dx / dist) * step;
        fish.y += (dy / dist) * step * 0.7;
        if (Math.abs(dx) > 0.001) fish.dir = dx > 0 ? 1 : -1;
      }
      fish.x = clamp(fish.x, 0.09, 0.91);
      fish.y = clamp(fish.y, 0.16, 0.78);

      // Fish tip out paper money when they're comfortable.
      if (fish.growth >= 0.72 && fish.fullness > 32 && tank.cleanliness > 28) {
        fish.moneyTimer -= dt;
        if (fish.moneyTimer <= 0) {
          const tankDrops = state.drops.filter(d => d.tankId === tank.id).length;
          if (tankDrops < 3) {
            const sp = SPECIES[fish.speciesId];
            const happy = happinessOf(fish, tank) / 100;
            const base = rand(sp.drop[0], sp.drop[1]);
            const value = Math.max(5000, Math.round(base * (0.55 + happy * 0.55) / 5000) * 5000);
            state.drops.push({
              id: uid('drop'), tankId: tank.id,
              x: clamp(fish.x + rand(-0.1, 0.1), 0.1, 0.9),
              y: clamp(fish.y + rand(-0.06, 0.06), 0.2, 0.65),
              value, life: 78, born: 0
            });
            emit(state, 'tip', { tankId: tank.id, value, name: fish.name });
          }
          fish.moneyTimer = rand(19, 33);
        }
      } else {
        fish.moneyTimer = Math.max(fish.moneyTimer, 8);
      }
    }

    // Feeding particles drift down through the water.
    for (const p of tank.feedParticles) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(state.elapsed * 2 + p.seed) * dt * 0.006;
      if (p.y > 0.92) p.life = Math.min(p.life, 0);
    }
    tank.feedParticles = tank.feedParticles.filter(p => p.life > 0);

    // Eggs incubate.
    for (const egg of tank.eggs) {
      egg.timer -= dt;
      if (egg.timer <= 0) {
        egg.hatched = true;
        const count = egg.count || 2;
        let names = [];
        for (let i = 0; i < count; i++) {
          if (tank.fish.length >= tank.capacity + 4) break;
          const fry = createFish(egg.speciesId, tank.id, {
            growth: 0.16,
            name: pick(FISH_NAMES),
            x: clamp(egg.x + rand(-0.06, 0.06), 0.12, 0.88),
            y: clamp(egg.y + rand(-0.06, 0.04), 0.25, 0.7),
            fullness: 80
          });
          tank.fish.push(fry);
          names.push(fry.name);
        }
        if (names.length) {
          state.stats.eggsHatched += names.length;
          emit(state, 'hatch', { tankId: tank.id, names, speciesId: egg.speciesId });
        }
      }
    }
    tank.eggs = tank.eggs.filter(e => !e.hatched);
  }

  for (const drop of state.drops) drop.life -= dt;
  state.drops = state.drops.filter(d => d.life > 0);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export function canFeed(state, tankId, foodId) {
  const tank = tankById(state, tankId);
  const food = FOODS[foodId];
  if (!tank || !food) return { ok: false, message: 'Nothing to feed.' };
  if (!tank.fish.length) return { ok: false, message: 'This tank is empty — add a fish first.' };
  if ((state.foods[foodId] || 0) <= 0) return { ok: false, message: `Out of ${food.name.toLowerCase()}. Restock in the shop.` };
  if (food.group === 'predator' && tank.kind !== 'large') {
    return { ok: false, message: 'Live prey is far too big for nano fish.' };
  }
  if (food.group === 'small' && tank.kind === 'large') {
    return { ok: false, message: 'Predators refuse pellets. They need live prey, bloodworms or fresh shrimp.' };
  }
  if (tank.fish.every(f => f.fullness > 96)) return { ok: false, message: 'Everyone in this tank is already full.' };
  return { ok: true, tank, food };
}

export function feedTank(state, tankId, foodId) {
  const check = canFeed(state, tankId, foodId);
  if (!check.ok) return check;
  const { tank, food } = check;
  state.foods[foodId] -= 1;
  state.selectedFood = foodId;
  for (const fish of tank.fish) {
    fish.fullness = clamp(fish.fullness + food.boost + rand(-4, 5), 0, 100);
    fish.feedFlash = 2.5;
    fish.moneyTimer = Math.max(4, fish.moneyTimer - 2);
  }
  tank.cleanliness = clamp(tank.cleanliness - 1.15, 0, 100);
  tank.feedParticles = [];
  const colors = [food.color, food.color2];
  for (let i = 0; i < 18; i++) {
    tank.feedParticles.push({
      x: rand(0.16, 0.84), y: rand(0.05, 0.2),
      vy: rand(0.03, 0.09), life: rand(3, 6), seed: rand(0, 10),
      foodId, color: pick(colors), size: rand(0.55, 1.15)
    });
  }
  state.stats.fed += 1;
  emit(state, 'feed', { tankId, foodId });
  return { ok: true, message: `${food.name} served. ${tank.fish.length} fish fed.` };
}

export function cleanTank(state, tankId, amount = 100) {
  const tank = tankById(state, tankId);
  if (!tank) return { ok: false, message: 'Tank not found.' };
  const before = tank.cleanliness;
  tank.cleanliness = clamp(tank.cleanliness + amount, 0, 100);
  if (tank.cleanliness >= 99.5 && before < 99.5) {
    state.stats.cleaned += 1;
    emit(state, 'clean', { tankId });
    return { ok: true, complete: true, message: `${tank.name} is spotless.` };
  }
  return { ok: true, message: '' };
}

export function collectDrop(state, dropId) {
  const index = state.drops.findIndex(d => d.id === dropId);
  if (index < 0) return { ok: false };
  const drop = state.drops[index];
  state.drops.splice(index, 1);
  state.money += drop.value;
  state.stats.earned += drop.value;
  state.stats.collected += 1;
  emit(state, 'coin', { value: drop.value, tankId: drop.tankId });
  return { ok: true, value: drop.value };
}

export function buyFish(state, speciesId) {
  const sp = SPECIES[speciesId];
  if (!sp) return { ok: false, message: 'Unknown fish.' };
  if (state.tray.length >= 10) return { ok: false, message: 'Holding tray is full. Place something in a tank first.' };
  if (state.money < sp.price) return { ok: false, message: 'Not enough VNĐ for this fish.' };
  state.money -= sp.price;
  state.stats.spent += sp.price;
  state.stats.fishBought += 1;
  state.tray.push({ uid: uid('tray'), kind: 'fish', speciesId, growth: 1 });
  emit(state, 'buy', { kind: 'fish', speciesId });
  return { ok: true, message: `${sp.name} is waiting in the holding tray.` };
}

export function buyFood(state, foodId) {
  const food = FOODS[foodId];
  if (!food) return { ok: false, message: 'Unknown food.' };
  if (state.money < food.price) return { ok: false, message: 'Not enough VNĐ.' };
  state.money -= food.price;
  state.stats.spent += food.price;
  state.foods[foodId] = (state.foods[foodId] || 0) + food.pack;
  emit(state, 'buy', { kind: 'food', foodId });
  return { ok: true, message: `${food.pack} uses of ${food.name.toLowerCase()} added.` };
}

export function buyDecor(state, decorType) {
  const d = DECOR[decorType];
  if (!d) return { ok: false, message: 'Unknown decoration.' };
  if (state.tray.length >= 10) return { ok: false, message: 'Holding tray is full.' };
  if (state.money < d.price) return { ok: false, message: 'Not enough VNĐ.' };
  state.money -= d.price;
  state.stats.spent += d.price;
  state.tray.push({ uid: uid('tray'), kind: 'decor', decorType });
  emit(state, 'buy', { kind: 'decor', decorType });
  return { ok: true, message: `${d.name} added to the holding tray.` };
}

export function trayItem(state, itemUid) {
  return state.tray.find(i => i.uid === itemUid);
}

export function placeTrayFish(state, itemUid, tankId) {
  const item = trayItem(state, itemUid);
  const tank = tankById(state, tankId);
  if (!item || !tank || item.kind !== 'fish') return { ok: false, message: 'Select a fish from the tray first.' };
  const sp = SPECIES[item.speciesId];
  if (sp.group === 'predator' && tank.kind !== 'large') {
    return { ok: false, message: `${sp.name} needs a 2-metre predator tank.` };
  }
  if (sp.group === 'small' && tank.kind !== 'small') {
    return { ok: false, message: `${sp.name} would be a snack in a predator tank. Choose a nano tank.` };
  }
  if (tank.fish.length >= tank.capacity + 1) {
    return { ok: false, message: `${tank.name} is at capacity. Sell or move a fish first.` };
  }
  const fish = createFish(item.speciesId, tank.id, { growth: item.growth || 1 });
  tank.fish.push(fish);
  state.tray = state.tray.filter(i => i.uid !== itemUid);
  state.selectedTray = null;
  emit(state, 'place', { tankId, name: fish.name, speciesId: item.speciesId });
  return { ok: true, message: `${fish.name} the ${sp.name} is exploring ${tank.name}.`, fish };
}

export function placeDecorInTank(state, itemUid, tankId, x, y) {
  const item = trayItem(state, itemUid);
  const tank = tankById(state, tankId);
  if (!item || !tank || item.kind !== 'decor') return { ok: false, message: 'Select a decoration from the tray first.' };
  if (tank.decor.length >= 9) return { ok: false, message: 'This tank is fully decorated.' };
  const d = DECOR[item.decorType];
  tank.decor.push({
    type: item.decorType,
    x: clamp(x, 0.08, 0.92),
    y: clamp(y, 0.78, 0.99),
    scale: d.scale,
    flip: Math.random() < 0.5
  });
  state.tray = state.tray.filter(i => i.uid !== itemUid);
  state.selectedTray = null;
  emit(state, 'decor', { tankId });
  return { ok: true, message: `${d.name} placed in ${tank.name}.` };
}

export function moveDecor(state, tankId, index, x, y) {
  const tank = tankById(state, tankId);
  const decor = tank?.decor[index];
  if (!decor) return null;
  decor.x = clamp(x, 0.08, 0.92);
  decor.y = clamp(y, 0.78, 0.99);
  return decor;
}

export function removeDecor(state, tankId, index) {
  const tank = tankById(state, tankId);
  if (!tank || !tank.decor[index]) return { ok: false };
  const [d] = tank.decor.splice(index, 1);
  const refund = Math.round((DECOR[d.type]?.price || 0) * 0.4);
  state.money += refund;
  state.stats.earned += refund;
  return { ok: true, message: `Decoration sold for ${refund.toLocaleString('vi-VN')} VNĐ.` };
}

export function sellFish(state, tankId, fishId) {
  const tank = tankById(state, tankId);
  const idx = tank?.fish.findIndex(f => f.id === fishId) ?? -1;
  if (!tank || idx < 0) return { ok: false, message: 'Fish not found.' };
  const fish = tank.fish[idx];
  const sp = SPECIES[fish.speciesId];
  const value = Math.round(sp.price * (0.45 + 0.35 * Math.min(1, fish.growth)));
  tank.fish.splice(idx, 1);
  state.money += value;
  state.stats.earned += value;
  emit(state, 'sell', { value, name: fish.name });
  return { ok: true, value, message: `${fish.name} sold for ${value.toLocaleString('vi-VN')} VNĐ.` };
}

export function breedPair(state, tankId, fishAId, fishBId) {
  const tank = tankById(state, tankId);
  if (!tank) return { ok: false, message: 'Tank not found.' };
  const a = tank.fish.find(f => f.id === fishAId);
  const b = tank.fish.find(f => f.id === fishBId);
  if (!a || !b || a.id === b.id) return { ok: false, message: 'Choose two different fish.' };
  if (a.speciesId !== b.speciesId) return { ok: false, message: 'Pairs must be the same species.' };
  if (a.sex === b.sex) return { ok: false, message: 'Choose one male and one female.' };
  if (a.growth < 0.95 || b.growth < 0.95) return { ok: false, message: 'Both fish must be fully grown.' };
  if (a.fullness < 55 || b.fullness < 55) return { ok: false, message: 'Both fish need to be well fed (55%+).' };
  if (tank.cleanliness < 55) return { ok: false, message: 'Water is too dirty for spawning. Clean the tank first.' };
  if (a.cooldown > 0 || b.cooldown > 0) return { ok: false, message: 'The pair needs more rest before breeding again.' };
  if (tank.eggs.length) return { ok: false, message: 'There is already a clutch incubating in this tank.' };
  const fee = 50000;
  if (state.money < fee) return { ok: false, message: 'Need 50.000 VNĐ for the breeding fee.' };
  state.money -= fee;
  state.stats.spent += fee;
  a.cooldown = 140;
  b.cooldown = 140;
  a.fullness = clamp(a.fullness - 18, 0, 100);
  b.fullness = clamp(b.fullness - 18, 0, 100);
  const sp = SPECIES[a.speciesId];
  tank.eggs.push({
    id: uid('egg'), speciesId: a.speciesId,
    x: rand(0.35, 0.65), y: rand(0.68, 0.8),
    timer: 38, total: 38, count: 2,
    parents: [a.name, b.name]
  });
  emit(state, 'breed', { tankId, speciesId: a.speciesId, name: sp.name });
  return { ok: true, message: `${a.name} × ${b.name} spawned a clutch of eggs. They will hatch shortly.` };
}

export function sellTrayItem(state, itemUid) {
  const item = trayItem(state, itemUid);
  if (!item) return { ok: false };
  let refund = 0;
  if (item.kind === 'fish') refund = Math.round(SPECIES[item.speciesId].price * 0.65);
  else refund = Math.round(DECOR[item.decorType].price * 0.65);
  state.tray = state.tray.filter(i => i.uid !== itemUid);
  state.money += refund;
  state.stats.earned += refund;
  return { ok: true, message: `Returned for ${refund.toLocaleString('vi-VN')} VNĐ.` };
}

export function saveGame(state) {
  try {
    const snapshot = {
      version: 1,
      money: state.money,
      day: state.day,
      clock: state.clock,
      elapsed: state.elapsed,
      foods: state.foods,
      selectedFood: state.selectedFood,
      tanks: state.tanks.map(t => ({
        id: t.id, cleanliness: t.cleanliness, temp: t.temp, ph: t.ph,
        oxygen: t.oxygen, filter: t.filter, decor: t.decor,
        fish: t.fish.map(f => ({
          id: f.id, speciesId: f.speciesId, name: f.name, sex: f.sex,
          growth: f.growth, fullness: f.fullness, cooldown: f.cooldown,
          x: f.x, y: f.y, moneyTimer: f.moneyTimer
        })),
        eggs: t.eggs.map(e => ({ ...e }))
      })),
      tray: state.tray,
      drops: state.drops.map(d => ({ ...d })),
      stats: state.stats,
      sound: state.sound
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1) return null;
    const fresh = createState();
    fresh.money = saved.money ?? fresh.money;
    fresh.day = saved.day ?? 1;
    fresh.clock = saved.clock ?? fresh.clock;
    fresh.elapsed = saved.elapsed ?? 0;
    fresh.foods = { ...fresh.foods, ...(saved.foods || {}) };
    fresh.selectedFood = saved.selectedFood || fresh.selectedFood;
    fresh.tray = Array.isArray(saved.tray) ? saved.tray : [];
    fresh.stats = { ...fresh.stats, ...(saved.stats || {}) };
    fresh.sound = saved.sound !== false;
    for (const tank of fresh.tanks) {
      const st = saved.tanks?.find(t => t.id === tank.id);
      if (!st) continue;
      tank.cleanliness = st.cleanliness ?? tank.cleanliness;
      tank.temp = st.temp ?? tank.temp;
      tank.oxygen = st.oxygen ?? tank.oxygen;
      tank.filter = st.filter ?? tank.filter;
      tank.decor = Array.isArray(st.decor) ? st.decor : tank.decor;
      tank.fish = (st.fish || []).map(f => {
        const fish = createFish(f.speciesId, tank.id, {
          id: f.id, name: f.name, sex: f.sex, growth: f.growth,
          fullness: f.fullness, x: f.x, y: f.y
        });
        fish.cooldown = f.cooldown || 0;
        fish.moneyTimer = f.moneyTimer ?? 20;
        return fish;
      });
      tank.eggs = (st.eggs || []).map(e => ({ ...e }));
      tank.feedParticles = [];
    }
    fresh.drops = Array.isArray(saved.drops) ? saved.drops.map(d => ({ ...d, life: Math.max(20, d.life || 60) })) : [];
    return fresh;
  } catch (e) {
    return null;
  }
}

export function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  return createState();
}

export function formatMoney(n) {
  return Math.round(n).toLocaleString('vi-VN');
}

export function formatClock(state) {
  const h = Math.floor(state.clock / 60) % 24;
  const m = Math.floor(state.clock % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export { uid, clamp, rand, pick };
