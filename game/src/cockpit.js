// The cockpit: the dashboard and canopy frame drawn over the scene in
// cockpit view. Every gauge is driven by the live plane state, lit amber
// like a flown panel — never a static drawing.

import { VIEW_W, VIEW_H, COLORS } from './config.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function text(ctx, s, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// One round dial: lit face, tick ring, needle, digital readout below.
function roundGauge(ctx, x, y, r, label, value, min, max, unit, opts = {}) {
  // Lit face: warm amber glow behind dark glass.
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.25);
  glow.addColorStop(0, 'rgba(255, 181, 46, 0.20)');
  glow.addColorStop(1, 'rgba(255, 181, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101c28';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8d6e2';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 181, 46, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Ticks and numbers around the dial.
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  const steps = opts.steps || 5;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const major = i % Math.max(1, Math.floor(steps / 2)) === 0 || steps <= 5;
    const r1 = r - 7;
    const r2 = r - (major ? 16 : 11);
    ctx.strokeStyle = major ? '#eaf6ff' : 'rgba(234, 246, 255, 0.55)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    ctx.stroke();
    if (opts.tickLabels) {
      const v = min + ((max - min) * i) / steps;
      text(ctx, String(Math.round(v)), x + Math.cos(a) * (r - 26), y + Math.sin(a) * (r - 26), 11, COLORS.hudDim);
    }
  }
  // Red zone arc at the top end.
  if (opts.redFrom !== undefined) {
    const ra0 = a0 + (a1 - a0) * ((opts.redFrom - min) / (max - min));
    ctx.strokeStyle = '#ff5d4d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r - 9, ra0, a1);
    ctx.stroke();
  }
  // Needle.
  const frac = clamp((value - min) / (max - min), 0, 1);
  const na = a0 + (a1 - a0) * frac;
  ctx.strokeStyle = '#ffb52e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(na) * (r - 18), y + Math.sin(na) * (r - 18));
  ctx.stroke();
  ctx.fillStyle = '#ffb52e';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  // Label and digital readout.
  text(ctx, label, x, y + r + 13, 11, COLORS.hudDim);
  text(ctx, `${Math.round(value)} ${unit}`, x, y + r + 28, 13, '#ffd98a');
}

// The attitude gauge: a rolling, pitching ball with a fixed wings marker.
function attitudeGauge(ctx, x, y, r, roll, pitch) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.25);
  glow.addColorStop(0, 'rgba(255, 181, 46, 0.20)');
  glow.addColorStop(1, 'rgba(255, 181, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-roll);
  const py = clamp(pitch * 180, -r, r);
  ctx.fillStyle = '#5b8fc4';
  ctx.fillRect(-r, -r - py, r * 2, r + py);
  ctx.fillStyle = '#7a9a4e';
  ctx.fillRect(-r, -py, r * 2, r + py);
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, -py);
  ctx.lineTo(r, -py);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#c8d6e2';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffb52e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r - 2, y);
  ctx.lineTo(x - r * 0.35, y);
  ctx.moveTo(x + r * 0.35, y);
  ctx.lineTo(x + r + 2, y);
  ctx.stroke();
  text(ctx, 'ATTITUDE', x, y + r + 13, 11, COLORS.hudDim);
  text(ctx, `${Math.round((roll * 180) / Math.PI)}° bank`, x, y + r + 28, 13, '#ffd98a');
}

// The heading gauge: a compass rose that turns with the plane.
function headingGauge(ctx, x, y, r, headingDeg) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.25);
  glow.addColorStop(0, 'rgba(255, 181, 46, 0.20)');
  glow.addColorStop(1, 'rgba(255, 181, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101c28';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8d6e2';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-headingDeg * Math.PI) / 180);
  const pts = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
  for (const [deg, label] of pts) {
    const a = ((deg - 90) * Math.PI) / 180;
    ctx.fillStyle = deg % 90 === 0 ? '#eaf6ff' : COLORS.hudDim;
    ctx.font = `bold ${deg % 90 === 0 ? 13 : 10}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, Math.cos(a) * (r - 16), Math.sin(a) * (r - 16));
  }
  ctx.restore();
  // Fixed lubber line at the top.
  ctx.fillStyle = '#ffb52e';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - r + 2);
  ctx.lineTo(x + 6, y - r + 2);
  ctx.lineTo(x, y - r + 12);
  ctx.closePath();
  ctx.fill();
  // Miniature plane at the centre.
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x - 12, y + 8);
  ctx.lineTo(x, y + 3);
  ctx.lineTo(x + 12, y + 8);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'HEADING', x, y + r + 13, 11, COLORS.hudDim);
  text(ctx, `${String(Math.round(headingDeg)).padStart(3, '0')}°`, x, y + r + 28, 13, '#ffd98a');
}

// The whole cockpit: glare shield, six lit gauges, canopy pillars.
export function drawCockpit(ctx, game, time) {
  const p = game.plane;
  const knots = p.speed * 1.944;
  const altM = Math.max(0, p.y);
  const headingDeg = (((p.heading * 180) / Math.PI) % 360 + 360) % 360;
  const panelY = VIEW_H - 168;

  // Canopy pillars: dark frame at the screen edges and a slim centre post.
  ctx.fillStyle = '#1a2027';
  ctx.fillRect(0, 0, 26, VIEW_H);
  ctx.fillRect(VIEW_W - 26, 0, 26, VIEW_H);
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 7, 0);
  ctx.lineTo(VIEW_W / 2 + 7, 0);
  ctx.lineTo(VIEW_W / 2 + 4, panelY - 8);
  ctx.lineTo(VIEW_W / 2 - 4, panelY - 8);
  ctx.closePath();
  ctx.fill();
  // Top glare strip.
  ctx.fillStyle = 'rgba(26, 32, 39, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, 10);

  // Engine cowling hump over the panel, nose-down into the view.
  ctx.fillStyle = '#8c2f26';
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 150, panelY);
  ctx.quadraticCurveTo(VIEW_W / 2, panelY - 46, VIEW_W / 2 + 150, panelY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 150, panelY);
  ctx.quadraticCurveTo(VIEW_W / 2, panelY - 46, VIEW_W / 2 + 150, panelY);
  ctx.lineTo(VIEW_W / 2 + 120, panelY);
  ctx.lineTo(VIEW_W / 2 - 120, panelY);
  ctx.closePath();
  ctx.fill();

  // Dashboard panel.
  const grad = ctx.createLinearGradient(0, panelY, 0, VIEW_H);
  grad.addColorStop(0, '#232c36');
  grad.addColorStop(1, '#141b22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelY, VIEW_W, VIEW_H - panelY);
  ctx.strokeStyle = 'rgba(255, 181, 46, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, panelY + 1);
  ctx.lineTo(VIEW_W, panelY + 1);
  ctx.stroke();
  text(ctx, 'SKY POST · SP-07', VIEW_W / 2, panelY + 18, 11, 'rgba(234, 246, 255, 0.5)');

  // Six lit gauges across the panel.
  const gy = panelY + 82;
  const r = 48;
  const gx = [130, 300, 470, 640, 810, 970];
  roundGauge(ctx, gx[0], gy, r, 'AIRSPEED', knots, 0, 160, 'kt', { steps: 8, tickLabels: true, redFrom: 140 });
  attitudeGauge(ctx, gx[1], gy, r, p.roll, p.pitch);
  roundGauge(ctx, gx[2], gy, r, 'ALTITUDE', altM, 0, 500, 'm', { steps: 5, tickLabels: true });
  headingGauge(ctx, gx[3], gy, r, headingDeg);
  roundGauge(ctx, gx[4], gy, r, 'CLIMB', p.verticalSpeed, -10, 10, 'm/s', { steps: 4, tickLabels: true });
  const fuelLow = p.fuel <= 25;
  roundGauge(ctx, gx[5], gy, r, 'FUEL', p.fuel, 0, 100, '%', { steps: 4, redFrom: 25 });
  if (fuelLow && Math.floor(time * 2) % 2 === 0) {
    text(ctx, 'LOW FUEL', gx[5], gy - r - 16, 13, COLORS.hudWarn);
  }
  if (game.stalled) {
    text(ctx, 'STALL — NOSE DOWN, ADD POWER', VIEW_W / 2, panelY - 30, 15, COLORS.hudBad);
  }
}
