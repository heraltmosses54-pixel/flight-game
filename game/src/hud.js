// The HUD and the screens: airspeed and altitude tapes, a heading tape,
// fuel and damage bars, an artificial horizon, mission banners, messages,
// and the menu, briefing and end screens. Everything is drawn on the same
// canvas, so the screenshots show exactly what the player sees.

import { VIEW_W, VIEW_H, COLORS } from './config.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(10, 26, 44, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// A vertical tape: the value in the middle, tick marks scrolling past it.
function verticalTape(ctx, x, y, w, h, value, step, unit, label) {
  panel(ctx, x, y, w, h);
  text(ctx, label, x + w / 2, y + 12, 10, COLORS.hudDim, 'center');
  const mid = y + h / 2 + 6;
  const pxPerUnit = (h - 34) / (step * 6);
  const base = Math.floor(value / step) * step;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + 22, w, h - 26);
  ctx.clip();
  for (let v = base - step * 3; v <= base + step * 3; v += step) {
    const yy = mid - (v - value) * pxPerUnit;
    const major = v % (step * 5) === 0;
    ctx.strokeStyle = COLORS.hudDim;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + w - (major ? 16 : 9), yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    if (major) text(ctx, String(v), x + w - 20, yy, 11, COLORS.hud, 'right');
  }
  ctx.restore();
  // The readout box.
  ctx.fillStyle = '#12324e';
  ctx.beginPath();
  ctx.roundRect(x + 4, mid - 13, w - 8, 26, 4);
  ctx.fill();
  text(ctx, `${Math.round(value)} ${unit}`, x + w / 2, mid, 14, COLORS.hud, 'center');
}

// The heading tape across the top: N, E, S, W sliding with the heading.
function headingTape(ctx, headingDeg) {
  const w = 420;
  const x = VIEW_W / 2 - w / 2;
  const y = 14;
  panel(ctx, x, y, w, 34);
  const mid = VIEW_W / 2;
  const pxPerDeg = 3.2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, 34);
  ctx.clip();
  const points = [
    [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'],
    [225, 'SW'], [270, 'W'], [315, 'NW'], [360, 'N'],
  ];
  for (const [deg, label] of points) {
    let diff = deg - headingDeg;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const xx = mid + diff * pxPerDeg;
    if (xx < x - 20 || xx > x + w + 20) continue;
    text(ctx, label, xx, y + 17, deg % 90 === 0 ? 13 : 10, deg % 90 === 0 ? COLORS.hud : COLORS.hudDim, 'center');
  }
  ctx.restore();
  // The lubber line and the digital heading.
  ctx.fillStyle = COLORS.ringNext;
  ctx.beginPath();
  ctx.moveTo(mid - 6, y + 2);
  ctx.lineTo(mid + 6, y + 2);
  ctx.lineTo(mid, y + 10);
  ctx.closePath();
  ctx.fill();
  text(ctx, `${String(Math.round(headingDeg)).padStart(3, '0')}°`, mid, y + 46, 12, COLORS.hud, 'center');
}

// A horizontal bar gauge with a label and a coloured fill.
function barGauge(ctx, x, y, w, label, frac, color, warnAt = 0.25) {
  text(ctx, label, x, y - 8, 10, COLORS.hudDim);
  panel(ctx, x, y, w, 12, 0.4);
  const f = clamp(frac, 0, 1);
  ctx.fillStyle = f <= warnAt ? COLORS.hudBad : color;
  if (w * f > 4) {
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w * f - 2, 10, 4);
    ctx.fill();
  }
  text(ctx, `${Math.round(f * 100)}%`, x + w + 8, y + 6, 11, COLORS.hud);
}

// The little artificial horizon: a ball that rolls and pitches with the plane.
function attitudeBall(ctx, x, y, r, roll, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  // Banking right tilts the ball's horizon up to the right.
  ctx.rotate(-roll);
  const py = clamp(pitch * 220, -r, r);
  ctx.fillStyle = '#7fb2dd';
  ctx.fillRect(-r, -r - py, r * 2, r + py);
  ctx.fillStyle = '#6da24f';
  ctx.fillRect(-r, -py, r * 2, r + py);
  ctx.strokeStyle = COLORS.hud;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, -py);
  ctx.lineTo(r, -py);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker.
  ctx.strokeStyle = COLORS.ringNext;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r - 2, y);
  ctx.lineTo(x - r * 0.35, y);
  ctx.moveTo(x + r * 0.35, y);
  ctx.lineTo(x + r + 2, y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(234, 246, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// The flight HUD: tapes, bars, the attitude ball and the mission banner.
export function drawHud(ctx, game, time) {
  const p = game.plane;
  const knots = p.speed * 1.944;
  const altM = Math.max(0, p.y);
  const headingDeg = ((p.heading * 180) / Math.PI % 360 + 360) % 360;

  verticalTape(ctx, 16, 60, 86, 190, knots, 10, 'kt', 'AIRSPEED');
  verticalTape(ctx, 16, 268, 86, 190, altM, 50, 'm', 'ALTITUDE');
  text(ctx, `VSI ${p.verticalSpeed >= 0 ? '+' : ''}${p.verticalSpeed.toFixed(1)} m/s`, 16, 478, 12, COLORS.hudDim);
  headingTape(ctx, headingDeg);

  // Right side: fuel, damage, throttle.
  const rx = VIEW_W - 196;
  barGauge(ctx, rx, 66, 150, 'FUEL', p.fuel / 100, COLORS.hudGood, 0.25);
  barGauge(ctx, rx, 100, 150, 'DAMAGE', p.damage / 100, COLORS.hudBad, 0.99);
  barGauge(ctx, rx, 134, 150, 'THROTTLE', p.throttle, '#7fb2dd', -1);
  if (p.fuel <= 25 && p.fuel > 0 && Math.floor(time * 2) % 2 === 0) {
    text(ctx, 'LOW FUEL', rx, 168, 13, COLORS.hudWarn, 'left');
  }
  if (p.fuel <= 0) text(ctx, 'ENGINE OUT — GLIDE', rx, 168, 13, COLORS.hudBad, 'left');
  if (game.stalled) text(ctx, 'STALL — NOSE DOWN, ADD POWER', VIEW_W / 2, 108, 14, COLORS.hudBad, 'center');

  // Attitude ball, bottom centre-left.
  attitudeBall(ctx, 150, VIEW_H - 92, 44, p.roll, p.pitch);
  text(ctx, 'ATTITUDE', 150, VIEW_H - 32, 10, COLORS.hudDim, 'center');

  // Mission banner: objective and ring progress.
  const mission = game.mission;
  if (mission) {
    panel(ctx, VIEW_W / 2 - 260, VIEW_H - 62, 520, 48, 0.5);
    const rings = game.ringIndex < game.rings.length
      ? `Ring ${game.ringIndex + 1} of ${game.rings.length} — then land at ${game.stripName}`
      : `All rings done — land at ${game.stripName}`;
    text(ctx, rings, VIEW_W / 2, VIEW_H - 42, 14, COLORS.hud, 'center');
    if (game.timeLimit > 0) {
      text(ctx, `TIME ${formatTime(game.elapsed)} / ${formatTime(game.timeLimit)}`, VIEW_W / 2, VIEW_H - 20, 11, game.elapsed > game.timeLimit - 30 ? COLORS.hudWarn : COLORS.hudDim, 'center');
    } else {
      text(ctx, `TIME ${formatTime(game.elapsed)}`, VIEW_W / 2, VIEW_H - 20, 11, COLORS.hudDim, 'center');
    }
  }

  // Message feed, centre top.
  let my = 150;
  for (const msg of game.messages.slice(-3)) {
    const age = time - msg.at;
    if (age > 5) continue;
    const alpha = age > 4 ? (5 - age) : 1;
    ctx.globalAlpha = alpha;
    text(ctx, msg.text, VIEW_W / 2, my, 16, msg.color || COLORS.hud, 'center');
    ctx.globalAlpha = 1;
    my += 26;
  }

  // Speed / altitude warning when low and slow over the ground.
  const ground = game.world.groundHeight(p.x, p.z);
  if (p.airborne && p.y - ground < 25 && p.speed < 40) {
    text(ctx, 'LOW AND SLOW — WATCH THE GROUND', VIEW_W / 2, 132, 13, COLORS.hudWarn, 'center');
  }
  text(ctx, 'M mute · P pause · R restart', VIEW_W - 16, VIEW_H - 14, 11, COLORS.hudDim, 'right');
}

export function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The title screen: name, mission cards, controls.
export function drawMenu(ctx, game, time) {
  ctx.fillStyle = 'rgba(8, 20, 36, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SKY POST', VIEW_W / 2, 108, 84, COLORS.hud, 'center');
  text(ctx, 'ISLAND AIR MAIL — fly the mail, mind the fuel', VIEW_W / 2, 158, 20, COLORS.ringNext, 'center');
  text(ctx, 'Pick a mission — keys 1, 2, 3, or 4 for a free flight. Click a card or press its key.', VIEW_W / 2, 200, 15, COLORS.hudDim, 'center');

  const cards = [
    { key: '1', name: 'First Delivery', desc: 'Take off, fly 3 rings, land at Coral Strip.', best: game.best.first },
    { key: '2', name: 'Island Hop', desc: 'Three drops across the chain on a tight tank.', best: game.best.hop },
    { key: '3', name: 'Storm Run', desc: 'Six rings in gusting wind. Fast and clean wins.', best: game.best.storm },
    { key: '4', name: 'Free Flight', desc: 'No rings, no timer. Just you and the islands.', best: null },
  ];
  const cw = 250;
  const gap = 18;
  const x0 = VIEW_W / 2 - ((cw * 4 + gap * 3) / 2);
  cards.forEach((card, i) => {
    const x = x0 + i * (cw + gap);
    const y = 240;
    const hover = game.menuHover === i;
    panel(ctx, x, y, cw, 150, hover ? 0.75 : 0.55);
    ctx.strokeStyle = hover ? COLORS.ringNext : 'rgba(234, 246, 255, 0.25)';
    ctx.lineWidth = hover ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, 150, 8);
    ctx.stroke();
    text(ctx, `[${card.key}]`, x + 16, y + 26, 13, COLORS.ringNext);
    text(ctx, card.name, x + 16, y + 56, 19, COLORS.hud);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    wrapText(ctx, card.desc, x + 16, y + 86, cw - 32, 18);
    if (card.best) text(ctx, `Best score ${card.best}`, x + 16, y + 130, 12, COLORS.hudGood);
  });

  text(ctx, 'W/S throttle · Arrow keys pitch and bank · Mouse drag steers · Wheel throttle', VIEW_W / 2, 440, 15, COLORS.hud, 'center');
  text(ctx, 'Land gently on a strip: slow, level wings, sink under 4 m/s. Water and hills are not runways.', VIEW_W / 2, 468, 14, COLORS.hudDim, 'center');
  text(ctx, 'Press Enter or click a mission to fly.', VIEW_W / 2, 520, 16, COLORS.hud, 'center');
}

function wrapText(ctx, s, x, y, maxW, lh) {
  const words = s.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

// A full-screen end panel: landed or crashed, with the score breakdown.
export function drawEnd(ctx, game) {
  ctx.fillStyle = 'rgba(8, 20, 36, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const ok = game.state === 'landed';
  const title = ok ? (game.missionComplete ? 'DELIVERY COMPLETE' : 'LANDED') : 'CRASHED';
  const color = ok ? COLORS.hudGood : COLORS.hudBad;
  text(ctx, title, VIEW_W / 2, 170, 56, color, 'center');
  if (!ok) text(ctx, game.plane.crashCause || 'The flight is over.', VIEW_W / 2, 216, 18, COLORS.hud, 'center');
  else if (game.missionComplete) text(ctx, `All rings flown and down safely at ${game.stripName}.`, VIEW_W / 2, 216, 18, COLORS.hud, 'center');
  else text(ctx, `Down safely at ${game.stripName} — but the rings are still waiting.`, VIEW_W / 2, 216, 18, COLORS.hud, 'center');

  const rows = [
    ['Rings flown', `${game.ringIndex} of ${game.rings.length}`],
    ['Time', formatTime(game.elapsed)],
    ['Fuel left', `${Math.round(game.plane.fuel)}%`],
    ['Damage', `${Math.round(game.plane.damage)}%`],
    ['Landing', game.landingRating || '—'],
    ['SCORE', String(game.score)],
  ];
  let y = 280;
  for (const [k, v] of rows) {
    text(ctx, k, VIEW_W / 2 - 130, y, 16, COLORS.hudDim, 'left');
    text(ctx, v, VIEW_W / 2 + 130, y, 16, k === 'SCORE' ? COLORS.ringNext : COLORS.hud, 'right');
    y += 34;
  }
  text(ctx, 'Press R to fly again · Q for the mission list', VIEW_W / 2, y + 30, 16, COLORS.hud, 'center');
}

// A small centred pause / briefing card.
export function drawCard(ctx, title, lines) {
  panel(ctx, VIEW_W / 2 - 300, VIEW_H / 2 - 110, 600, 220, 0.7);
  text(ctx, title, VIEW_W / 2, VIEW_H / 2 - 66, 26, COLORS.hud, 'center');
  let y = VIEW_H / 2 - 18;
  for (const line of lines) {
    text(ctx, line, VIEW_W / 2, y, 15, COLORS.hudDim, 'center');
    y += 28;
  }
}
