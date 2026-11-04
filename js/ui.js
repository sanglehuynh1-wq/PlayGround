import {
  SPECIES, SPECIES_LIST, FOODS, FOOD_ORDER, DECOR, DECOR_LIST
} from './data.js';
import {
  feedTank, cleanTank, collectDrop, buyFish, buyFood, buyDecor,
  placeTrayFish, placeDecorInTank, moveDecor, removeDecor, sellFish,
  breedPair, sellTrayItem, tankById, happinessOf, stageOf, beautyOf,
  formatMoney, formatClock, saveGame, resetGame
} from './game.js';
import { fishThumb, decorThumb, foodIcon } from './art.js';
import { TankView } from './render.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class UI {
  constructor(state, renderer) {
    this.state = state;
    this.renderer = renderer;
    this.sceneCanvas = $('scene');
    this.detailCanvas = $('detailCanvas');
    this.detailView = new TankView(this.detailCanvas, state);
    this.detailOpen = false;
    this.detailTankId = null;
    this.detailMode = null;
    this.selectedFish = [];
    this.selectedTray = null;
    this.ghost = null;
    this.pointer = { x: 0, y: 0 };
    this.cleaning = false;
    this.lastScrub = 0;
    this.scrubbing = false;
    this.drag = null;
    this.suppressClick = false;
    this.shopTab = 'fish';
    this.shopFilter = 'all';
    this.activeModal = null;
    this.lastTick = 0;
    this.audio = null;
    this.hintTimer = null;

    this.buildStaticUI();
    this.bindEvents();
    this.updateAll();
    this.setHint('Tap a tank to inspect, feed and clean.', 9000);
    setTimeout(() => this.hideHint(), 9000);
    this.updateSoundButton();
  }

  // --------------------------------------------------------------- static UI
  buildStaticUI() {
    $('foodItems').innerHTML = FOOD_ORDER.map(id => {
      const f = FOODS[id];
      return `<button class="food-btn" data-food="${id}" title="${f.name} — ${f.desc}">
        <span class="food-icon">${foodIcon(id)}</span>
        <span class="food-name">${f.short}</span>
        <span class="food-count">${this.state.foods[id] || 0}</span>
      </button>`;
    }).join('');
    this.renderTray();
  }

  updateAll() {
    this.updateWallet();
    this.updateFoods();
    this.renderTray();
    this.updateClock();
  }

  setHint(text, duration = 6500) {
    const el = $('hint');
    $('hintText').textContent = text;
    el.classList.remove('hide');
    clearTimeout(this.hintTimer);
    if (duration) this.hintTimer = setTimeout(() => this.hideHint(), duration);
  }

  hideHint() {
    $('hint').classList.add('hide');
  }

  updateWallet() {
    const txt = formatMoney(this.state.money);
    $('moneyValue').textContent = txt;
    $('shopMoney').textContent = txt;
  }

  flashWallet() {
    const w = $('wallet');
    w.classList.remove('flash');
    void w.offsetWidth;
    w.classList.add('flash');
    setTimeout(() => w.classList.remove('flash'), 620);
  }

  updateClock() {
    $('dayValue').textContent = this.state.day;
    $('clockValue').textContent = formatClock(this.state);
  }

  updateSoundButton() {
    const btn = $('soundBtn');
    btn.classList.toggle('muted', !this.state.sound);
    btn.title = this.state.sound ? 'Mute sound' : 'Enable sound';
  }

  // ---------------------------------------------------------------- food rail
  updateFoods() {
    document.querySelectorAll('.food-btn').forEach(btn => {
      const id = btn.dataset.food;
      const count = this.state.foods[id] || 0;
      btn.classList.toggle('active', id === this.state.selectedFood);
      btn.classList.toggle('empty', count <= 0);
      btn.querySelector('.food-count').textContent = count;
    });
    const f = FOODS[this.state.selectedFood];
    $('railHint').textContent = `${f.short} · ${this.state.foods[this.state.selectedFood] || 0}`;
    document.querySelectorAll('[data-food-count]').forEach(el => {
      el.textContent = this.state.foods[el.dataset.foodCount] || 0;
    });
    document.querySelectorAll('.food-quick [data-food]').forEach(el => {
      el.classList.toggle('active', el.dataset.food === this.state.selectedFood);
    });
  }

  selectFood(id) {
    this.state.selectedFood = id;
    this.updateFoods();
    this.ensureAudio();
    this.sfx('click');
    const f = FOODS[id];
    this.setHint(`${f.name} in hand · open a tank and press FEED.`);
    if (this.detailOpen) this.renderDetail();
  }

  // --------------------------------------------------------------------- tray
  traySlotHTML(item) {
    if (!item) return `<div class="tray-slot empty" aria-hidden="true"></div>`;
    if (item.kind === 'fish') {
      const sp = SPECIES[item.speciesId];
      return `<div class="tray-slot ${this.selectedTray === item.uid ? 'selected' : ''}" data-uid="${item.uid}" title="${sp.name}">
        <span class="tray-tag">${sp.group === 'predator' ? 'PRED' : 'NANO'}</span>
        <img src="${fishThumb(item.speciesId)}" alt="">
        <span class="tray-name">${sp.name}</span>
        <button class="tray-remove" data-remove="${item.uid}" aria-label="Return ${sp.name}">✕</button>
      </div>`;
    }
    const d = DECOR[item.decorType];
    return `<div class="tray-slot ${this.selectedTray === item.uid ? 'selected' : ''}" data-uid="${item.uid}" title="${d.name}">
      <span class="tray-tag">DECOR</span>
      <img class="decor-img" src="${decorThumb(item.decorType)}" alt="">
      <span class="tray-name">${d.name}</span>
      <button class="tray-remove" data-remove="${item.uid}" aria-label="Return ${d.name}">✕</button>
    </div>`;
  }

  renderTray() {
    const items = this.state.tray;
    if (this.selectedTray && !items.find(i => i.uid === this.selectedTray)) this.selectedTray = null;
    const slots = [];
    for (const item of items) slots.push(this.traySlotHTML(item));
    for (let i = items.length; i < 10; i++) slots.push(this.traySlotHTML(null));
    $('trayItems').innerHTML = slots.join('');
    $('trayCount').textContent = `${items.length} / 10`;
    this.syncRendererSelection();
  }

  syncRendererSelection() {
    const item = this.state.tray.find(i => i.uid === this.selectedTray);
    this.renderer.selection = item ? { kind: item.kind, speciesId: item.speciesId, decorType: item.decorType } : null;
  }

  selectTray(uid) {
    if (this.selectedTray === uid) {
      this.selectedTray = null;
      this.syncRendererSelection();
      this.renderTray();
      this.setHint('Selection cleared.');
      return;
    }
    const item = this.state.tray.find(i => i.uid === uid);
    if (!item) return;
    this.selectedTray = uid;
    this.syncRendererSelection();
    this.renderTray();
    this.ensureAudio();
    this.sfx('click');
    if (item.kind === 'fish') {
      const sp = SPECIES[item.speciesId];
      this.setHint(`${sp.name} selected · tap a ${sp.group === 'predator' ? '200 cm predator' : '50 cm nano'} tank, or drag it in.`);
    } else {
      this.setHint(`${DECOR[item.decorType].name} selected · tap a tank to choose its spot.`);
    }
  }

  toggleTray(uid) {
    this.selectTray(uid);
  }

  // -------------------------------------------------------------------- audio
  ensureAudio() {
    if (this.audio) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.audio = new Ctx();
    } catch (e) { /* audio unavailable */ }
  }

  tone(freq, dur, type = 'sine', vol = 0.035, delay = 0, slide = 0) {
    if (!this.state.sound) return;
    this.ensureAudio();
    if (!this.audio) return;
    if (this.audio.state === 'suspended') this.audio.resume();
    const t0 = this.audio.currentTime + delay;
    const osc = this.audio.createOscillator();
    const g = this.audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(kind) {
    if (!this.state.sound) return;
    switch (kind) {
      case 'coin': this.tone(920, 0.08, 'sine', 0.03); this.tone(1380, 0.12, 'sine', 0.025, 0.06); break;
      case 'feed': this.tone(380, 0.08, 'triangle', 0.028); this.tone(520, 0.1, 'triangle', 0.02, 0.06); break;
      case 'buy': this.tone(440, 0.07, 'triangle', 0.025); this.tone(660, 0.08, 'triangle', 0.02, 0.06); this.tone(880, 0.12, 'triangle', 0.016, 0.12); break;
      case 'place': this.tone(300, 0.08, 'sine', 0.03); this.tone(480, 0.12, 'sine', 0.02, 0.05); break;
      case 'clean': this.tone(240, 0.07, 'sawtooth', 0.012); this.tone(360, 0.1, 'sine', 0.02, 0.05); break;
      case 'error': this.tone(150, 0.14, 'square', 0.018, 0, -30); break;
      default: this.tone(360, 0.045, 'sine', 0.016);
    }
  }

  // ------------------------------------------------------------------ toasts
  toast(message, kind = 'info') {
    if (!message) return;
    const stack = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    const icon = kind === 'bad' ? '!' : kind === 'good' ? '✓' : '◆';
    el.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    stack.appendChild(el);
    while (stack.children.length > 4) stack.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 280);
    }, 3900);
  }

  floatMoney(text, clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'float-money';
    el.textContent = text;
    const shell = $('gameShell').getBoundingClientRect();
    el.style.left = `${clientX - shell.left}px`;
    el.style.top = `${clientY - shell.top}px`;
    $('floatLayer').appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  // ------------------------------------------------------------------ modals
  openShop() {
    this.ensureAudio();
    this.sfx('click');
    $('shopModal').hidden = false;
    this.activeModal = 'shop';
    this.renderShop();
  }

  openHelp() {
    $('helpModal').hidden = false;
    this.activeModal = 'help';
  }

  closeModal(name = this.activeModal) {
    if (name === 'shop') $('shopModal').hidden = true;
    if (name === 'help') $('helpModal').hidden = true;
    if (name === 'detail') this.closeDetail();
    if (this.activeModal === name) this.activeModal = null;
  }

  closeAllModals() {
    $('shopModal').hidden = true;
    $('helpModal').hidden = true;
    if (this.detailOpen) this.closeDetail();
    this.activeModal = null;
  }

  // ---------------------------------------------------------------- render shop
  renderShop() {
    const isFish = this.shopTab === 'fish';
    $('fishFilters').hidden = !isFish;
    document.querySelectorAll('#shopTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === this.shopTab));
    document.querySelectorAll('#fishFilters button').forEach(b => b.classList.toggle('active', b.dataset.filter === this.shopFilter));
    const trayFull = this.state.tray.length >= 10;
    let html = '';
    if (isFish) {
      $('shopNote').textContent = 'Predators need the 2 m rack. Nano fish belong in the 50 cm rack.';
      const list = SPECIES_LIST.filter(sp => this.shopFilter === 'all' || sp.group === this.shopFilter);
      html = list.map(sp => {
        const disabled = this.state.money < sp.price || trayFull;
        const tag = sp.group === 'predator' ? 'PREDATOR' : 'NANO';
        const foodTag = sp.group === 'predator' ? 'LIVE FOOD' : 'PELLETS OK';
        return `<article class="shop-card-item">
          <div class="card-art">
            <span class="art-badge">${tag}</span>
            <span class="art-price">${formatMoney(sp.price)}</span>
            <img src="${fishThumb(sp.id)}" alt="${sp.name}">
          </div>
          <div class="card-body">
            <div class="card-name">${sp.name}</div>
            <div class="card-vi">${sp.vi}</div>
            <p class="card-desc">${sp.desc}</p>
            <div class="card-tags">
              <span>${sp.sizeCm} CM</span>
              <span>${tag} RACK</span>
              <span>${foodTag}</span>
              <span>${sp.personality}</span>
            </div>
            <button class="card-buy" data-buy-fish="${sp.id}" ${disabled ? 'disabled' : ''}>
              <span>ADD TO TRAY</span><small>${formatMoney(sp.price)} VNĐ</small>
            </button>
          </div>
        </article>`;
      }).join('');
    } else if (this.shopTab === 'food') {
      $('shopNote').textContent = 'One use feeds one tank. Predators refuse pellets — restock live prey and shrimp.';
      html = FOOD_ORDER.map(id => {
        const f = FOODS[id];
        const disabled = this.state.money < f.price;
        return `<article class="shop-card-item pack-card">
          <div class="card-art">
            <span class="art-badge">${f.group === 'predator' ? 'PREDATOR ONLY' : f.group === 'small' ? 'NANO ONLY' : 'ALL FISH'}</span>
            <span class="art-price">${formatMoney(f.price)}</span>
            <div class="food-big" style="width:66px;height:66px">${foodIcon(id)}</div>
          </div>
          <div class="card-body">
            <div class="card-name">${f.name}</div>
            <div class="card-vi">${f.vi} · +${f.pack} uses</div>
            <p class="card-desc">${f.desc}</p>
            <div class="stock-line"><span>IN STOCK</span><b>${this.state.foods[id] || 0} uses</b></div>
            <div class="stock-line"><span>SATIETY</span><b>+${f.boost}</b></div>
            <button class="card-buy" data-buy-food="${id}" ${disabled ? 'disabled' : ''}>
              <span>RESTOCK</span><small>${formatMoney(f.price)} VNĐ</small>
            </button>
          </div>
        </article>`;
      }).join('');
    } else {
      $('shopNote').textContent = 'Decor is sold to the holding tray. Drag it onto a tank for a custom position.';
      html = DECOR_LIST.map(d => {
        const disabled = this.state.money < d.price || trayFull;
        return `<article class="shop-card-item pack-card">
          <div class="card-art">
            <span class="art-badge">AQUASCAPE</span>
            <span class="art-price">${formatMoney(d.price)}</span>
            <img src="${decorThumb(d.id)}" alt="${d.name}" style="max-width:58%;max-height:88%">
          </div>
          <div class="card-body">
            <div class="card-name">${d.name}</div>
            <div class="card-vi">${d.vi} · +${d.beauty} beauty</div>
            <p class="card-desc">${d.desc}</p>
            <div class="card-tags"><span>+${d.beauty} BEAUTY</span><span>ANY TANK</span></div>
            <button class="card-buy" data-buy-decor="${d.id}" ${disabled ? 'disabled' : ''}>
              <span>ADD TO TRAY</span><small>${formatMoney(d.price)} VNĐ</small>
            </button>
          </div>
        </article>`;
      }).join('');
    }
    $('shopGrid').innerHTML = html;
  }

  // ------------------------------------------------------------------- detail
  openTank(tankId, options = {}) {
    const tank = tankById(this.state, tankId);
    if (!tank) return;
    this.detailTankId = tankId;
    this.detailOpen = true;
    this.detailMode = null;
    this.selectedFish = [];
    this.ghost = null;
    this.scrubbing = false;
    $('detailModal').hidden = false;
    this.activeModal = 'detail';
    requestAnimationFrame(() => {
      this.detailView.resize();
      this.pointer = { x: this.detailView.w / 2, y: this.detailView.h / 2 };
      this.renderDetail();
      if (options.decorTrayUid) {
        this.startDecorFromTray(options.decorTrayUid, options.nx, options.ny);
      }
    });
  }

  closeDetail() {
    $('detailModal').hidden = true;
    this.detailOpen = false;
    this.detailTankId = null;
    this.detailMode = null;
    this.ghost = null;
    this.selectedFish = [];
    this.scrubbing = false;
    $('detailStage').classList.remove('mode-clean');
    if (this.activeModal === 'detail') this.activeModal = null;
  }

  renderDetail() {
    if (!this.detailOpen) return;
    const tank = tankById(this.state, this.detailTankId);
    if (!tank) { this.closeDetail(); return; }
    this.selectedFish = this.selectedFish.filter(id => tank.fish.some(f => f.id === id));
    $('stageCode').textContent = `${tank.code} · ${tank.sizeCm} CM · ${tank.kind === 'large' ? 'PREDATOR' : 'NANO'}`;
    $('detailTitle').textContent = tank.name;
    $('stageTemp').textContent = `${tank.temp.toFixed(1)}°C`;
    $('stageCap').textContent = `${tank.fish.length} / ${tank.capacity}`;
    const filterEl = $('stageFilter');
    filterEl.textContent = tank.filter ? 'FILTER ON' : 'NO FILTER';
    filterEl.classList.toggle('off', !tank.filter);
    $('cleanHud').hidden = this.detailMode !== 'clean';
    $('inspectHud').hidden = this.detailMode !== 'inspect';
    $('decorHud').hidden = this.detailMode !== 'decor';
    $('detailStage').classList.toggle('mode-clean', this.detailMode === 'clean');
    const scroll = $('detailSideBody')?.scrollTop || 0;
    $('detailSideBody').innerHTML = this.detailSideHTML(tank);
    $('detailSideBody').scrollTop = scroll;
    this.updateDecorHud();
    this.refreshDetailDynamic();
  }

  detailSideHTML(tank) {
    const food = FOODS[this.state.selectedFood];
    const foodCount = this.state.foods[this.state.selectedFood] || 0;
    const wrongFood = (food.group === 'predator' && tank.kind !== 'large') || (food.group === 'small' && tank.kind === 'large');
    const clarity = Math.round(tank.cleanliness);
    const ph = (tank.ph - (100 - tank.cleanliness) / 100 * 0.35).toFixed(2);
    const cleanWord = clarity > 65 ? 'CLEAR' : clarity > 35 ? 'CLOUDY' : 'DIRTY';
    const clarityClass = clarity > 65 ? '' : clarity > 35 ? 'warn' : 'bad';
    const pair = this.pairState(tank);
    const eggs = tank.eggs[0];
    const fishCards = tank.fish.map(f => {
      const sp = SPECIES[f.speciesId];
      const selected = this.selectedFish.includes(f.id);
      const happy = happinessOf(f, tank);
      let sexSym = f.sex === 'male' ? '♂' : '♀';
      return `<div class="fish-card ${selected ? 'selected' : ''}" data-fish="${f.id}" role="button" tabindex="0" aria-pressed="${selected}">
        <div class="fish-thumb"><img src="${fishThumb(f.speciesId)}" alt=""></div>
        <div class="fish-meta">
          <div class="fish-line"><b>${f.name}</b><span class="sex ${f.sex}">${sexSym}</span></div>
          <span class="fish-sub">${sp.name} · ${stageOf(f).toUpperCase()} · ${happy}% happy</span>
          <div class="fish-bars"><div class="bar"><i data-full="${f.id}" style="width:${Math.round(f.fullness)}%"></i></div><em>FULL ${Math.round(f.fullness)}%</em></div>
        </div>
        <button class="fish-sell" data-sell="${f.id}" title="Sell this fish">SELL</button>
        <span class="select-mark">✓</span>
      </div>`;
    }).join('') || `<div class="empty-note">This tank is empty.<br>Buy a fish and place it from the holding tray.</div>`;

    const trayDecor = this.state.tray.filter(i => i.kind === 'decor');
    const decorRows = trayDecor.map(item => {
      const d = DECOR[item.decorType];
      return `<div class="decor-row">
        <img src="${decorThumb(item.decorType)}" alt="">
        <div class="decor-meta"><b>${d.name}</b><span>In tray · +${d.beauty} beauty</span></div>
        <button class="place" data-decor-tray="${item.uid}">PLACE</button>
      </div>`;
    }).join('');
    const tankRows = tank.decor.map((d, i) => {
      const def = DECOR[d.type];
      return `<div class="decor-row">
        <img src="${decorThumb(d.type)}" alt="">
        <div class="decor-meta"><b>${def.name}</b><span>Placed · +${def.beauty} beauty</span></div>
        <button data-decor-existing="${i}">MOVE</button>
        <button class="remove" data-decor-remove="${i}">SELL</button>
      </div>`;
    }).join('');

    const quickFood = FOOD_ORDER.map(id => {
      const f = FOODS[id];
      const count = this.state.foods[id] || 0;
      return `<button data-food="${id}" class="${id === this.state.selectedFood ? 'active' : ''} ${count <= 0 ? 'empty' : ''}" title="${f.name}">
        <span>${foodIcon(id)}</span><b>${f.short.split(' ')[0]}</b><em data-food-count="${id}">${count}</em>
      </button>`;
    }).join('');

    return `
      <div class="tank-hero">
        <div>
          <h3>${tank.name}</h3>
          <p>${tank.code} · ${tank.sizeCm} CM · ${tank.kind === 'large' ? 'PREDATOR RACK' : 'NANO RACK'}</p>
        </div>
        <div class="hero-right"><b>${tank.fish.length}/${tank.capacity}</b><span>BIOLOAD</span></div>
      </div>

      <div class="stat-block">
        <div class="section-label">WATER QUALITY <b id="clarityLabel">${clarity}% ${cleanWord}</b></div>
        <div class="water-grid">
          <div class="water-item">
            <div class="w-label"><span>CLARITY</span><b id="wClarityVal">${clarity}%</b></div>
            <div class="bar ${clarityClass}"><i id="wClarityBar" style="width:${clarity}%"></i></div>
          </div>
          <div class="water-item">
            <div class="w-label"><span>TEMP</span><b id="wTempVal">${tank.temp.toFixed(1)}°C</b></div>
            <div class="bar"><i style="width:${clamp((tank.temp - 20) / 12 * 100, 10, 100)}%"></i></div>
          </div>
          <div class="water-item">
            <div class="w-label"><span>pH</span><b id="wPhVal">${ph}</b></div>
            <div class="bar"><i style="width:${clamp((parseFloat(ph) / 9) * 100, 20, 90)}%"></i></div>
          </div>
          <div class="water-item">
            <div class="w-label"><span>OXYGEN</span><b id="wO2Val">${Math.round(tank.oxygen)}%</b></div>
            <div class="bar"><i id="wO2Bar" style="width:${Math.round(tank.oxygen)}%"></i></div>
          </div>
        </div>
        <div class="section-label">BEAUTY <b>${beautyOf(tank)} / 100 · ${tank.decor.length}/9 DECOR</b></div>
      </div>

      <div class="section-label">CARE <b>${this.state.selectedFood.toUpperCase()}</b></div>
      <div class="action-grid">
        <button class="action-btn ${wrongFood || foodCount <= 0 ? 'dim' : ''}" data-action="feed">
          <b>FEED</b><span>${wrongFood ? '✕ WRONG FOOD' : foodCount <= 0 ? 'OUT OF STOCK' : `${food.name} · ${foodCount} left`}</span>
        </button>
        <button class="action-btn ${this.detailMode === 'clean' ? 'active' : ''}" data-action="clean">
          <b>CLEAN</b><span>Scrub glass · ${clarity}%</span>
        </button>
        <button class="action-btn ${this.detailMode === 'inspect' ? 'active' : ''}" data-action="inspect">
          <b>INSPECT</b><span>2.15× water lens</span>
        </button>
        <button class="action-btn ${this.detailMode === 'decor' ? 'active' : ''}" data-action="decor">
          <b>DECORATE</b><span>${tank.decor.length}/9 pieces</span>
        </button>
      </div>
      <div class="food-quick">${quickFood}</div>

      <div class="section-label">RESIDENTS <b>${tank.fish.length} FISH</b></div>
      <div class="roster">${fishCards}</div>

      ${eggs ? `<div class="egg-panel">
        <div class="egg-line"><span>EGG CLUTCH × ${eggs.count || 2}</span><span id="eggTimer">${this.formatEgg(eggs.timer)}</span></div>
        <div class="bar"><i id="eggBar" style="width:${(1 - eggs.timer / (eggs.total || 38)) * 100}%"></i></div>
        <small>${SPECIES[eggs.speciesId]?.name || 'Unknown'} · parents ${eggs.parents?.join(' × ') || '—'}</small>
      </div>` : ''}

      <div class="breed-box">
        <div class="breed-note"><span>BREEDING PAIR</span><b>${pair.ok ? 'READY' : 'NOT READY'}</b></div>
        <div class="breed-note">
          <span>${this.selectedFish.length ? this.selectedFish.map(id => tank.fish.find(f => f.id === id)?.name).filter(Boolean).join(' × ') : 'Select one male and one female.'}</span>
          <b>FEE 50.000</b>
        </div>
        <button class="primary-btn" id="breedBtn" data-breed ${pair.ok ? '' : 'disabled'}>BREED PAIR</button>
        <div class="breed-reason" id="breedReason">${pair.reason}</div>
      </div>

      ${this.detailMode === 'decor' ? `<div class="decor-drawer">
        <div class="section-label">DECOR FROM TRAY <b>${trayDecor.length}</b></div>
        ${decorRows || `<div class="decor-empty">No loose decor. Buy driftwood, stone or plants from the shop.</div>`}
        <div class="section-label">IN THIS TANK <b>${tank.decor.length}/9</b></div>
        ${tankRows || `<div class="decor-empty">Bare substrate. Place something to raise beauty and tips.</div>`}
      </div>` : ''}
    `;
  }

  formatEgg(timer) {
    const s = Math.max(0, Math.ceil(timer));
    return `0:${String(s).padStart(2, '0')}`;
  }

  pairState(tank) {
    const fishes = this.selectedFish.map(id => tank.fish.find(f => f.id === id)).filter(Boolean);
    if (fishes.length < 2) return { ok: false, reason: 'Select two adult fish — one male, one female.' };
    const [a, b] = fishes;
    if (a.id === b.id) return { ok: false, reason: 'Choose two different fish.' };
    if (a.speciesId !== b.speciesId) return { ok: false, reason: 'Both parents must be the same species.' };
    if (a.sex === b.sex) return { ok: false, reason: 'You need one male and one female.' };
    if (a.growth < 0.95 || b.growth < 0.95) return { ok: false, reason: 'Both fish must be fully grown.' };
    if (a.fullness < 55 || b.fullness < 55) return { ok: false, reason: 'Feed both fish to at least 55% fullness.' };
    if (tank.cleanliness < 55) return { ok: false, reason: 'Water is too dirty to spawn. Clean the tank.' };
    if (a.cooldown > 0 || b.cooldown > 0) return { ok: false, reason: 'This pair needs more rest before spawning again.' };
    if (tank.eggs.length) return { ok: false, reason: 'A clutch is already incubating here.' };
    if (this.state.money < 50000) return { ok: false, reason: 'Need 50.000 VNĐ for the breeding fee.' };
    return { ok: true, reason: 'Ready — a clutch will hatch in about 38 seconds.' };
  }

  refreshDetailDynamic() {
    if (!this.detailOpen) return;
    const tank = tankById(this.state, this.detailTankId);
    if (!tank) return;
    const clarity = Math.round(tank.cleanliness);
    const ph = (tank.ph - (100 - tank.cleanliness) / 100 * 0.35).toFixed(2);
    $('stageTemp').textContent = `${tank.temp.toFixed(1)}°C`;
    $('stageCap').textContent = `${tank.fish.length} / ${tank.capacity}`;
    const clarityLabel = $('clarityLabel');
    if (clarityLabel) clarityLabel.textContent = `${clarity}% ${clarity > 65 ? 'CLEAR' : clarity > 35 ? 'CLOUDY' : 'DIRTY'}`;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('wClarityVal', `${clarity}%`);
    set('wTempVal', `${tank.temp.toFixed(1)}°C`);
    set('wPhVal', ph);
    set('wO2Val', `${Math.round(tank.oxygen)}%`);
    const cb = $('wClarityBar');
    if (cb) {
      cb.style.width = `${clarity}%`;
      const bar = cb.parentElement;
      bar.classList.toggle('warn', clarity <= 65 && clarity > 35);
      bar.classList.toggle('bad', clarity <= 35);
    }
    const ob = $('wO2Bar');
    if (ob) ob.style.width = `${Math.round(tank.oxygen)}%`;
    // fullness bars
    document.querySelectorAll('[data-full]').forEach(el => {
      const fish = tank.fish.find(f => f.id === el.dataset.full);
      if (fish) el.style.width = `${Math.round(fish.fullness)}%`;
    });
    // cleaning hud
    const cleanBar = $('cleanBar');
    if (cleanBar) cleanBar.style.backgroundSize = `${clarity}% 100%`;
    const cleanPct = $('cleanPct');
    if (cleanPct) cleanPct.textContent = `${clarity}%`;
    // inspect hud
    set('inspectTemp', `${tank.temp.toFixed(1)}°C`);
    set('inspectPh', ph);
    set('inspectO2', `${Math.round(tank.oxygen)}%`);
    set('inspectClarity', `${clarity}%`);
    // eggs
    const egg = tank.eggs[0];
    if (egg) {
      set('eggTimer', this.formatEgg(egg.timer));
      const eb = $('eggBar');
      if (eb) eb.style.width = `${clamp((1 - egg.timer / (egg.total || 38)) * 100, 0, 100)}%`;
    }
    // breeding
    const pair = this.pairState(tank);
    const breedBtn = $('breedBtn');
    const reason = $('breedReason');
    if (breedBtn) breedBtn.disabled = !pair.ok;
    if (reason) reason.textContent = pair.reason;
  }

  updateDecorHud() {
    const hudTitle = $('decorHudTitle');
    const hudText = $('decorHudText');
    const confirm = $('decorConfirm');
    if (!hudTitle) return;
    if (!this.ghost) {
      hudTitle.textContent = 'DECORATE TANK';
      hudText.textContent = 'Pick a piece from the side panel, then drag it over the substrate.';
      confirm.disabled = true;
      return;
    }
    const d = DECOR[this.ghost.type];
    hudTitle.textContent = `${this.ghost.source === 'existing' ? 'MOVE' : 'PLACE'} ${d.name.toUpperCase()}`;
    hudText.textContent = this.ghost.valid === false
      ? 'Move the piece back over the water.'
      : 'Drag to position on the substrate, then confirm placement.';
    confirm.disabled = this.ghost.valid === false;
  }

  enterMode(mode) {
    if (this.detailMode === mode) {
      this.detailMode = null;
    } else {
      this.detailMode = mode;
    }
    this.ghost = null;
    this.scrubbing = false;
    if (this.detailMode === 'inspect') {
      this.pointer = { x: this.detailView.w / 2, y: this.detailView.h / 2 };
    }
    this.ensureAudio();
    this.sfx('click');
    this.renderDetail();
  }

  startDecorFromTray(uid, nx = 0.5, ny = 0.94) {
    const item = this.state.tray.find(i => i.uid === uid && i.kind === 'decor');
    if (!item) return;
    this.detailMode = 'decor';
    this.ghost = {
      source: 'tray', trayUid: uid, type: item.decorType,
      x: clamp(nx, 0.08, 0.92), y: clamp(ny, 0.8, 0.98),
      flip: Math.random() < 0.5, valid: true
    };
    this.renderDetail();
  }

  startDecorExisting(index) {
    const tank = tankById(this.state, this.detailTankId);
    const d = tank?.decor[index];
    if (!d) return;
    this.detailMode = 'decor';
    this.ghost = {
      source: 'existing', index, type: d.type,
      x: d.x, y: d.y, flip: d.flip, valid: true
    };
    this.renderDetail();
  }

  updateGhostFromPointer(px, py) {
    if (!this.ghost) return;
    const water = this.detailView.hit.water;
    if (!water) return;
    const inside = this.detailView.inWater(px, py);
    this.ghost.valid = inside;
    this.ghost.x = clamp((px - water.x) / water.w, 0.08, 0.92);
    this.ghost.y = clamp((py - water.y) / water.h, 0.8, 0.98);
    this.updateDecorHud();
  }

  confirmDecor() {
    if (!this.ghost || this.ghost.valid === false) return;
    const tank = tankById(this.state, this.detailTankId);
    if (!tank) return;
    let res;
    if (this.ghost.source === 'tray') {
      res = placeDecorInTank(this.state, this.ghost.trayUid, tank.id, this.ghost.x, this.ghost.y);
    } else {
      const moved = moveDecor(this.state, tank.id, this.ghost.index, this.ghost.x, this.ghost.y);
      res = moved ? { ok: true, message: 'Decoration repositioned.' } : { ok: false, message: 'Could not move that decoration.' };
    }
    if (res.ok) {
      this.ghost = null;
      this.sfx('place');
      this.toast(res.message, 'good');
      this.updateWallet();
      this.renderTray();
      this.renderDetail();
    } else {
      this.toast(res.message, 'bad');
      this.sfx('error');
    }
  }

  scrub() {
    const now = performance.now();
    if (now - this.lastScrub < 38) return;
    this.lastScrub = now;
    const tank = tankById(this.state, this.detailTankId);
    if (!tank) return;
    const res = cleanTank(this.state, tank.id, 2.6);
    if (res.complete) {
      this.sfx('clean');
      this.toast(`${tank.name} is spotless. The residents approve.`, 'good');
    }
    this.refreshDetailDynamic();
  }

  // ------------------------------------------------------------- result helper
  handleResult(res, sfx = 'click') {
    if (!res) return false;
    if (res.message) this.toast(res.message, res.ok ? 'good' : 'bad');
    if (!res.ok) { this.sfx('error'); return false; }
    this.sfx(sfx);
    this.updateWallet();
    this.updateFoods();
    this.renderTray();
    if (this.activeModal === 'shop') this.renderShop();
    if (this.detailOpen) this.renderDetail();
    return true;
  }

  collect(drop, clientX, clientY) {
    if (!drop) return;
    const res = collectDrop(this.state, drop.id);
    if (!res.ok) return;
    this.sfx('coin');
    this.flashWallet();
    this.updateWallet();
    this.floatMoney(`+${formatMoney(res.value)} VNĐ`, clientX, clientY);
    if (this.detailOpen) this.renderDetail();
  }

  // ----------------------------------------------------------------- events
  bindEvents() {
    $('foodItems').addEventListener('click', (e) => {
      const btn = e.target.closest('.food-btn');
      if (btn) this.selectFood(btn.dataset.food);
    });

    $('trayItems').addEventListener('click', (e) => {
      if (this.suppressClick) return;
      const remove = e.target.closest('[data-remove]');
      if (remove) {
        e.stopPropagation();
        const res = sellTrayItem(this.state, remove.dataset.remove);
        if (res.ok) {
          this.toast(res.message, 'good');
          this.sfx('buy');
          this.updateWallet();
          this.renderTray();
          if (this.detailOpen) this.renderDetail();
        }
        return;
      }
      const slot = e.target.closest('.tray-slot[data-uid]');
      if (slot) this.toggleTray(slot.dataset.uid);
    });

    $('trayItems').addEventListener('pointerdown', (e) => this.startTrayDrag(e));
    window.addEventListener('pointermove', (e) => this.moveTrayDrag(e));
    window.addEventListener('pointerup', (e) => this.endTrayDrag(e));
    window.addEventListener('pointercancel', () => this.cancelTrayDrag());

    $('shopBtn').addEventListener('click', () => this.openShop());
    $('helpBtn').addEventListener('click', () => this.openHelp());
    $('soundBtn').addEventListener('click', () => {
      this.state.sound = !this.state.sound;
      this.updateSoundButton();
      this.ensureAudio();
      if (this.state.sound) this.sfx('click');
      saveGame(this.state);
    });

    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.close;
        if (name === 'detail') this.closeDetail();
        else this.closeModal(name);
      });
    });

    $('shopTabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      this.shopTab = b.dataset.tab;
      this.renderShop();
    });
    $('fishFilters').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b) return;
      this.shopFilter = b.dataset.filter;
      this.renderShop();
    });
    $('shopGrid').addEventListener('click', (e) => {
      const fish = e.target.closest('[data-buy-fish]');
      if (fish) {
        const res = buyFish(this.state, fish.dataset.buyFish);
        this.handleResult(res, 'buy');
        return;
      }
      const food = e.target.closest('[data-buy-food]');
      if (food) {
        const res = buyFood(this.state, food.dataset.buyFood);
        this.handleResult(res, 'buy');
        return;
      }
      const decor = e.target.closest('[data-buy-decor]');
      if (decor) {
        const res = buyDecor(this.state, decor.dataset.buyDecor);
        this.handleResult(res, 'buy');
      }
    });

    // Scene
    this.sceneCanvas.addEventListener('pointermove', (e) => {
      const p = this.localPoint(this.sceneCanvas, e);
      this.renderer.mouse = p;
      const hit = this.renderer.tankAt(p.x, p.y);
      this.renderer.hoverTank = hit?.id || null;
      const drop = this.renderer.dropAt(p.x, p.y);
      this.sceneCanvas.style.cursor = drop ? 'pointer' : hit ? 'pointer' : 'default';
    });
    this.sceneCanvas.addEventListener('pointerleave', () => {
      this.renderer.hoverTank = null;
      this.sceneCanvas.style.cursor = 'default';
    });
    this.sceneCanvas.addEventListener('click', (e) => this.onSceneClick(e));

    // Detail
    this.detailCanvas.addEventListener('pointermove', (e) => this.onDetailMove(e));
    this.detailCanvas.addEventListener('pointerdown', (e) => this.onDetailDown(e));
    this.detailCanvas.addEventListener('pointerup', () => { this.scrubbing = false; });
    this.detailCanvas.addEventListener('pointercancel', () => { this.scrubbing = false; });
    this.detailCanvas.addEventListener('pointerleave', () => { this.scrubbing = false; });
    $('detailSideBody').addEventListener('click', (e) => this.onDetailSideClick(e));
    $('cleanDone').addEventListener('click', () => {
      this.detailMode = null;
      this.scrubbing = false;
      this.renderDetail();
    });
    $('decorCancel').addEventListener('click', () => {
      this.ghost = null;
      this.updateDecorHud();
      this.renderDetail();
    });
    $('decorConfirm').addEventListener('click', () => this.confirmDecor());

    $('newGameBtn').addEventListener('click', () => {
      if (window.confirm('Start a new aquarium? Current progress will be lost.')) {
        resetGame();
        saveGame(this.state);
        location.reload();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.detailOpen) {
          if (this.detailMode) {
            this.detailMode = null;
            this.ghost = null;
            this.renderDetail();
          } else this.closeDetail();
        } else if (this.activeModal) {
          this.closeModal();
        } else if (this.selectedTray) {
          this.selectedTray = null;
          this.renderTray();
        }
      }
      if (e.key.toLowerCase() === 'b' && !this.detailOpen) this.openShop();
      if (e.key.toLowerCase() === 'h' && !this.detailOpen) this.openHelp();
    });

    window.addEventListener('resize', () => {
      this.renderer.resize();
      if (this.detailOpen) {
        this.detailView.resize();
        this.renderDetail();
      }
    });
  }

  localPoint(canvas, e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onSceneClick(e) {
    if (this.suppressClick) return;
    const p = this.localPoint(this.sceneCanvas, e);
    const drop = this.renderer.dropAt(p.x, p.y);
    if (drop) {
      this.collect(drop, e.clientX, e.clientY);
      return;
    }
    const hit = this.renderer.tankAt(p.x, p.y);
    if (!hit) {
      if (this.selectedTray) {
        this.selectedTray = null;
        this.syncRendererSelection();
        this.renderTray();
      }
      return;
    }
    if (this.selectedTray) {
      const item = this.state.tray.find(i => i.uid === this.selectedTray);
      if (!item) { this.selectedTray = null; return; }
      if (item.kind === 'fish') {
        const res = placeTrayFish(this.state, item.uid, hit.id);
        if (res.ok) {
          this.selectedTray = null;
          this.handleResult(res, 'place');
        } else {
          this.handleResult(res);
        }
      } else {
        const water = hit.water;
        const nx = clamp((p.x - water.x) / water.w, 0.1, 0.9);
        const ny = clamp((p.y - water.y) / water.h, 0.82, 0.97);
        this.openTank(hit.id, { decorTrayUid: item.uid, nx, ny });
      }
      return;
    }
    this.openTank(hit.id);
  }

  onDetailMove(e) {
    const p = this.localPoint(this.detailCanvas, e);
    this.pointer = p;
    if (this.detailMode === 'decor' && this.ghost) this.updateGhostFromPointer(p.x, p.y);
    if (this.detailMode === 'clean' && this.scrubbing) this.scrub();
  }

  onDetailDown(e) {
    const p = this.localPoint(this.detailCanvas, e);
    this.pointer = p;
    this.detailCanvas.setPointerCapture?.(e.pointerId);
    if (this.detailMode === 'clean') {
      if (this.detailView.inWater(p.x, p.y)) {
        this.scrubbing = true;
        this.scrub();
      }
      return;
    }
    if (this.detailMode === 'decor') {
      if (this.ghost) {
        this.updateGhostFromPointer(p.x, p.y);
      } else {
        const d = this.detailView.decorAt(p.x, p.y);
        if (d) this.startDecorExisting(d.index);
      }
      return;
    }
    const drop = this.detailView.dropAt(p.x, p.y);
    if (drop) this.collect(drop, e.clientX, e.clientY);
  }

  onDetailSideClick(e) {
    const sell = e.target.closest('[data-sell]');
    if (sell) {
      const res = sellFish(this.state, this.detailTankId, sell.dataset.sell);
      if (res.ok) {
        this.selectedFish = this.selectedFish.filter(id => id !== sell.dataset.sell);
        this.toast(res.message, 'good');
        this.sfx('buy');
        this.updateWallet();
        this.renderDetail();
      } else {
        this.toast(res.message, 'bad');
        this.sfx('error');
      }
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) {
      const kind = action.dataset.action;
      if (kind === 'feed') {
        const res = feedTank(this.state, this.detailTankId, this.state.selectedFood);
        if (res.ok) {
          this.toast(res.message, 'good');
          this.sfx('feed');
          this.updateFoods();
          this.renderDetail();
        } else {
          this.toast(res.message, 'bad');
          this.sfx('error');
        }
      } else if (kind === 'clean') {
        this.enterMode('clean');
      } else if (kind === 'inspect') {
        this.enterMode('inspect');
      } else if (kind === 'decor') {
        this.enterMode('decor');
      }
      return;
    }
    const quickFood = e.target.closest('.food-quick [data-food]');
    if (quickFood) {
      this.selectFood(quickFood.dataset.food);
      return;
    }
    const trayDecor = e.target.closest('[data-decor-tray]');
    if (trayDecor) {
      this.startDecorFromTray(trayDecor.dataset.decorTray);
      return;
    }
    const existing = e.target.closest('[data-decor-existing]');
    if (existing) {
      this.startDecorExisting(Number(existing.dataset.decorExisting));
      return;
    }
    const remove = e.target.closest('[data-decor-remove]');
    if (remove) {
      const res = removeDecor(this.state, this.detailTankId, Number(remove.dataset.decorRemove));
      if (res.ok) {
        this.toast(res.message, 'good');
        this.sfx('buy');
        this.updateWallet();
        this.renderDetail();
      }
      return;
    }
    const breed = e.target.closest('[data-breed]');
    if (breed) {
      const res = breedPair(this.state, this.detailTankId, this.selectedFish[0], this.selectedFish[1]);
      if (res.ok) {
        this.selectedFish = [];
        this.toast(res.message, 'good');
        this.sfx('place');
        this.updateWallet();
        this.renderDetail();
      } else {
        this.toast(res.message, 'bad');
        this.sfx('error');
      }
      return;
    }
    const fish = e.target.closest('[data-fish]');
    if (fish) {
      const id = fish.dataset.fish;
      if (this.selectedFish.includes(id)) {
        this.selectedFish = this.selectedFish.filter(x => x !== id);
      } else {
        this.selectedFish.push(id);
        if (this.selectedFish.length > 2) this.selectedFish.shift();
      }
      this.sfx('click');
      this.renderDetail();
    }
  }

  // ------------------------------------------------------------- tray dragging
  startTrayDrag(e) {
    if (e.target.closest('[data-remove]')) return;
    const slot = e.target.closest('.tray-slot[data-uid]');
    if (!slot) return;
    const item = this.state.tray.find(i => i.uid === slot.dataset.uid);
    if (!item) return;
    this.drag = {
      uid: item.uid, item, startX: e.clientX, startY: e.clientY,
      active: false, slot
    };
    if (slot.setPointerCapture) {
      try { slot.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  }

  moveTrayDrag(e) {
    const drag = this.drag;
    if (!drag) return;
    const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (!drag.active && dist > 7) {
      drag.active = true;
      this.selectedTray = drag.uid;
      this.syncRendererSelection();
      this.renderTray();
      const ghost = $('dragGhost');
      const item = drag.item;
      const src = item.kind === 'fish' ? fishThumb(item.speciesId) : decorThumb(item.decorType);
      ghost.innerHTML = `<img src="${src}" alt="">`;
      ghost.hidden = false;
      drag.slot?.classList.add('dragging');
      this.sfx('click');
    }
    if (!drag.active) return;
    const ghost = $('dragGhost');
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    const r = this.sceneCanvas.getBoundingClientRect();
    const hit = this.renderer.tankAt(e.clientX - r.left, e.clientY - r.top);
    this.renderer.hoverTank = hit?.id || null;
  }

  endTrayDrag(e) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (!drag.active) return;
    $('dragGhost').hidden = true;
    drag.slot?.classList.remove('dragging');
    this.suppressClick = true;
    setTimeout(() => { this.suppressClick = false; }, 80);

    const r = this.sceneCanvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = this.renderer.tankAt(x, y);
    if (!hit) {
      this.toast('Drop the item onto a tank to place it.', 'bad');
      this.sfx('error');
      return;
    }
    const item = this.state.tray.find(i => i.uid === drag.uid);
    if (!item) return;
    if (item.kind === 'fish') {
      const res = placeTrayFish(this.state, item.uid, hit.id);
      if (res.ok) {
        this.selectedTray = null;
        this.handleResult(res, 'place');
      } else {
        this.handleResult(res);
      }
    } else {
      const water = hit.water;
      this.openTank(hit.id, {
        decorTrayUid: item.uid,
        nx: clamp((x - water.x) / water.w, 0.1, 0.9),
        ny: clamp((y - water.y) / water.h, 0.82, 0.97)
      });
    }
  }

  cancelTrayDrag() {
    if (!this.drag) return;
    this.drag = null;
    $('dragGhost').hidden = true;
    document.querySelectorAll('.tray-slot.dragging').forEach(el => el.classList.remove('dragging'));
  }

  // -------------------------------------------------------------------- frame
  draw(time) {
    if (!this.detailOpen) return;
    const tank = tankById(this.state, this.detailTankId);
    if (!tank) return;
    this.detailView.draw(tank, time, {
      mode: this.detailMode,
      pointer: this.pointer,
      ghost: this.ghost,
      selectedDecor: this.ghost?.source === 'existing' ? this.ghost.index : null
    });
  }

  tick(now) {
    if (now - this.lastTick > 260) {
      this.lastTick = now;
      this.updateClock();
      if (this.detailOpen) {
        this.refreshDetailDynamic();
        // keep HUD numbers live while the side panel sits still
        const tank = tankById(this.state, this.detailTankId);
        if (tank) {
          const pct = Math.round(tank.cleanliness);
          const bar = $('cleanBar');
          if (bar) bar.style.backgroundSize = `${pct}% 100%`;
          const cp = $('cleanPct');
          if (cp) cp.textContent = `${pct}%`;
        }
      }
      this.drainEvents();
    }
  }

  drainEvents() {
    const events = this.state.events.splice(0, this.state.events.length);
    for (const ev of events) {
      if (ev.type === 'hatch') {
        const tank = tankById(this.state, ev.tankId);
        const sp = SPECIES[ev.speciesId];
        this.toast(`${ev.names.join(' & ')} hatched in ${tank?.name || 'the tank'} — ${sp?.name || 'fry'} fry!`, 'good');
        this.sfx('place');
        if (this.detailOpen && this.detailTankId === ev.tankId) this.renderDetail();
      } else if (ev.type === 'day') {
        this.toast(`Ngày ${ev.day} begins. The shop lights are warm and the filters are humming.`);
      } else if (ev.type === 'clean') {
        // handled directly by the scrub interaction
      }
    }
  }
}
