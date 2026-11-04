import { createState, loadGame, saveGame, update } from './game.js';
import { SceneRenderer } from './render.js';
import { UI } from './ui.js';

const canvas = document.getElementById('scene');
const state = loadGame() || createState();
const renderer = new SceneRenderer(canvas, state);
const ui = new UI(state, renderer);

let last = performance.now();
let lastSave = last;

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  update(state, dt);
  ui.tick(now);

  const t = now / 1000;
  if (!ui.detailOpen) renderer.draw(t);
  ui.draw(t);

  if (now - lastSave > 7000) {
    saveGame(state);
    lastSave = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveGame(state);
  } else {
    last = performance.now();
  }
});
window.addEventListener('beforeunload', () => saveGame(state));

// A tiny public handle is useful for debugging and automated smoke checks.
window.__THUYCUNG__ = { state, renderer, ui };
