// Boot and the main loop: wire input, audio, the game and the renderer
// together, run requestAnimationFrame, and handle the menu keys and clicks.

import { VIEW_W, VIEW_H, MISSIONS, UPGRADES } from './config.js';
import { makeGame, saveCareer } from './game.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { drawScene } from './render.js';
import { drawHud, drawMenu, drawEnd, drawCard } from './hud.js';
import { shotFromUrl, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = makeInput(canvas);
const audio = makeAudio();
const game = makeGame(canvas);
game.audio = audio;
// Headless test handle: the verification driver reads state and steers
// through this (players never need it).
window.__game = game;

// Menu card hit areas, for clicks (computed in drawMenu's layout).
function menuCardAt(mx, my) {
  const cw = 196;
  const gap = 10;
  const x0 = VIEW_W / 2 - ((cw * 6 + gap * 5) / 2);
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * (cw + gap);
    if (mx >= x && mx <= x + cw && my >= 240 && my <= 400) return i;
  }
  return -1;
}

canvas.addEventListener('click', () => {
  audio.ensure();
  if (game.state === 'menu') {
    const i = menuCardAt(input.mouseX, input.mouseY);
    if (i >= 0) {
      if (i === 5) game.startFreeFlight();
      else game.startMission(i);
    }
  }
});

let last = performance.now();
let shotStaged = false;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.poll();

  // Screenshot staging: a ?shot= URL puts the game in a fixed scene once.
  if (!shotStaged) {
    shotStaged = true;
    const shot = shotFromUrl(window.location.href);
    if (shot) stageShot(game, shot.shot, shot.seed);
  }

  // Global keys, whatever the state.
  if (input.wasPressed('KeyM')) {
    audio.toggleMute();
    game.say(audio.muted ? 'Sound off.' : 'Sound on.', '#eaf6ff');
  }
  if (input.wasPressed('KeyR') && game.state !== 'menu') {
    // Index-based restart: a renamed or added mission cannot break it.
    if (game.mission) game.startMission(MISSIONS.findIndex((m) => m.id === game.mission.id));
    else if (game.freeFlight) game.startFreeFlight();
  }
  if (input.wasPressed('KeyC') && (game.state === 'flying' || game.state === 'briefing' || game.state === 'paused')) {
    game.view = game.view === 'cockpit' ? 'chase' : 'cockpit';
    game.say(game.view === 'cockpit' ? 'Cockpit view — gauges live.' : 'Chase view.', '#eaf6ff');
  }
  if (input.wasPressed('KeyB') && game.state === 'flying') game.dropCrate();
  if (input.wasPressed('KeyF') && (game.state === 'flying' || game.state === 'briefing' || game.state === 'paused')) {
    game.plane.flaps = !game.plane.flaps;
    game.say(game.plane.flaps ? 'Flaps down — slower stall, more drag.' : 'Flaps up.', '#eaf6ff');
  }
  if (input.wasPressed('KeyP')) {
    if (game.state === 'flying') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'flying';
  }
  if (input.wasPressed('Escape')) game.toMenu();

  if (game.state === 'menu') {
    if (input.wasPressed('Digit1')) game.startMission(0);
    if (input.wasPressed('Digit2')) game.startMission(1);
    if (input.wasPressed('Digit3')) game.startMission(2);
    if (input.wasPressed('Digit4')) game.startMission(3);
    if (input.wasPressed('Digit5')) game.startMission(4);
    if (input.wasPressed('Digit6')) game.startFreeFlight();
    // Buy the next level of an upgrade with gold (keys 6, 7, 8).
    const buyUpgrade = (id) => {
      const up = UPGRADES[id];
      const c = game.career;
      const level = c.upgrades[id];
      if (level >= 3) {
        game.say(`${up.name} is already maxed.`, '#eaf6ff');
        return;
      }
      const cost = up.costs[level];
      if (c.gold < cost) {
        game.say('Not enough gold — fly more missions.', '#ffb52e');
        return;
      }
      c.gold -= cost;
      c.upgrades[id] += 1;
      saveCareer(c);
      const detail = id === 'tank' ? `${100 + 25 * c.upgrades[id]} fuel`
        : id === 'climb' ? `+${10 * c.upgrades[id]}% pitch`
        : `${25 * c.upgrades[id]}% less damage`;
      game.say(`${up.name} upgraded — ${detail}.`, '#58d68d');
    };
    if (input.wasPressed('Digit7')) buyUpgrade('tank');
    if (input.wasPressed('Digit8')) buyUpgrade('climb');
    if (input.wasPressed('Digit9')) buyUpgrade('hull');
    if (input.wasPressed('Enter')) game.startMission(0);
    game.menuHover = menuCardAt(input.mouseX, input.mouseY);
  }

  if (game.state === 'briefing') {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      game.state = 'flying';
      game.say(game.mission.brief, '#eaf6ff');
    }
  }

  if ((game.state === 'landed' || game.state === 'crashed') && input.wasPressed('KeyQ')) game.toMenu();

  game.update(input, dt);
  audio.update(game.plane.throttle, game.plane.speed, game.plane.airborne);

  // Draw: the world, then the HUD, then the screen for the state.
  // A hard landing or a crash rattles the whole view for a moment.
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (game.shake > 0) {
    const s = game.shake * 9;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }
  drawScene(ctx, game, game.world, game.time);
  if (game.state === 'flying' || game.state === 'paused' || game.state === 'briefing') drawHud(ctx, game, game.time);
  if (game.state === 'menu') drawMenu(ctx, game, game.time);
  if (game.state === 'briefing') {
    drawCard(ctx, game.mission.name, [game.mission.brief, '', 'Press Enter or push the stick to take off.']);
  }
  if (game.state === 'paused') {
    drawCard(ctx, 'PAUSED', ['P or Esc to keep flying.', 'R restarts the mission.', 'C switches cockpit / chase view.', 'M toggles the sound.', 'F flaps · Space brakes.', 'B drops a supply crate (Supply Run).']);
  }
  if (game.state === 'landed' || game.state === 'crashed') drawEnd(ctx, game);
  ctx.restore();

  input.clearPressed();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
