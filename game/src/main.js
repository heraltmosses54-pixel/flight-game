// Boot and the main loop: wire input, audio, the game and the renderer
// together, run requestAnimationFrame, and handle the menu keys and clicks.

import { VIEW_W, VIEW_H } from './config.js';
import { makeGame } from './game.js';
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

// Menu card hit areas, for clicks (computed in drawMenu's layout).
function menuCardAt(mx, my) {
  const cw = 250;
  const gap = 18;
  const x0 = VIEW_W / 2 - ((cw * 4 + gap * 3) / 2);
  for (let i = 0; i < 4; i++) {
    const x = x0 + i * (cw + gap);
    if (mx >= x && mx <= x + cw && my >= 240 && my <= 390) return i;
  }
  return -1;
}

canvas.addEventListener('click', () => {
  audio.ensure();
  if (game.state === 'menu') {
    const i = menuCardAt(input.mouseX, input.mouseY);
    if (i >= 0) {
      if (i === 3) game.startFreeFlight();
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
    if (game.mission) game.startMission(game.mission.id === 'first' ? 0 : game.mission.id === 'hop' ? 1 : 2);
    else if (game.freeFlight) game.startFreeFlight();
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
    if (input.wasPressed('Digit4')) game.startFreeFlight();
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
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScene(ctx, game, game.world, game.time);
  if (game.state === 'flying' || game.state === 'paused' || game.state === 'briefing') drawHud(ctx, game, game.time);
  if (game.state === 'menu') drawMenu(ctx, game, game.time);
  if (game.state === 'briefing') {
    drawCard(ctx, game.mission.name, [game.mission.brief, '', 'Press Enter or push the stick to take off.']);
  }
  if (game.state === 'paused') {
    drawCard(ctx, 'PAUSED', ['P or Esc to keep flying.', 'R restarts the mission.', 'M toggles the sound.']);
  }
  if (game.state === 'landed' || game.state === 'crashed') drawEnd(ctx, game);

  input.clearPressed();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
