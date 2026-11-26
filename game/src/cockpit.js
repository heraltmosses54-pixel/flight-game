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
  // Textured like a real Cessna-style mail-plane nose (reference: Cessna
  // 172 close-ups — polished spinner, panel seams with rivet rows,
  // cooling intakes, bright crown shading to a dark underside): the metal
  // reads as metal, not a flat red shape.
  const cx = VIEW_W / 2;
  const cowlPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 150, panelY);
    ctx.quadraticCurveTo(cx, panelY - 46, cx + 150, panelY);
    ctx.closePath();
  };
  // Base metal: bright crown (sky light) shading to a dark underside.
  const cowlGrad = ctx.createLinearGradient(0, panelY - 46, 0, panelY);
  cowlGrad.addColorStop(0, '#e06548');
  cowlGrad.addColorStop(0.45, '#b23a27');
  cowlGrad.addColorStop(1, '#5e1a12');
  cowlPath();
  ctx.fillStyle = cowlGrad;
  ctx.fill();
  ctx.save();
  cowlPath();
  ctx.clip();
  // Specular highlight: a warm band along the crown, sun from upper left.
  const hl = ctx.createLinearGradient(cx - 150, panelY - 46, cx + 150, panelY - 46);
  hl.addColorStop(0, 'rgba(255, 226, 170, 0)');
  hl.addColorStop(0.32, 'rgba(255, 226, 170, 0.55)');
  hl.addColorStop(0.5, 'rgba(255, 240, 200, 0.65)');
  hl.addColorStop(0.68, 'rgba(255, 226, 170, 0.25)');
  hl.addColorStop(1, 'rgba(255, 226, 170, 0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(cx, panelY - 40, 132, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Long horizontal panel seam, following the crown curve.
  ctx.strokeStyle = 'rgba(58, 12, 8, 0.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 138, panelY - 12);
  ctx.quadraticCurveTo(cx, panelY - 34, cx + 138, panelY - 12);
  ctx.stroke();
  // Two short vertical seams dropping from the horizontal one.
  ctx.beginPath();
  ctx.moveTo(cx - 62, panelY - 25);
  ctx.quadraticCurveTo(cx - 58, panelY - 12, cx - 56, panelY);
  ctx.moveTo(cx + 62, panelY - 25);
  ctx.quadraticCurveTo(cx + 58, panelY - 12, cx + 56, panelY);
  ctx.stroke();
  // Rivet rows along the horizontal seam: dark dot + light offset dot,
  // so each rivet reads as a raised fastener.
  for (let x = cx - 126; x <= cx + 126; x += 18) {
    // Follow the seam's quadratic: ends (cx±138, panelY-12),
    // control (cx, panelY-34).
    const t = (x - (cx - 138)) / 276;
    const y = panelY + ((1 - t) * (1 - t) * -12 + 2 * (1 - t) * t * -34 + t * t * -12);
    ctx.fillStyle = 'rgba(58, 12, 8, 0.75)';
    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 190, 0.55)';
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.7, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Exhaust stain: a soft dark smudge trailing down the right side.
  const stain = ctx.createRadialGradient(cx + 96, panelY - 14, 2, cx + 96, panelY - 14, 34);
  stain.addColorStop(0, 'rgba(38, 24, 16, 0.34)');
  stain.addColorStop(1, 'rgba(38, 24, 16, 0)');
  ctx.fillStyle = stain;
  ctx.beginPath();
  ctx.ellipse(cx + 96, panelY - 12, 30, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Cream pinstripe along the cowling's base edge (the livery cheatline).
  ctx.strokeStyle = 'rgba(245, 234, 210, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 146, panelY - 2);
  ctx.lineTo(cx + 146, panelY - 2);
  ctx.stroke();
  // Lower panel seam with its rivet row: this is the seam that stays
  // visible below the mission banner, so it carries the texture where
  // the pilot actually looks.
  ctx.strokeStyle = 'rgba(58, 12, 8, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 140, panelY - 7);
  ctx.quadraticCurveTo(cx, panelY - 16, cx + 140, panelY - 7);
  ctx.stroke();
  for (let x = cx - 130; x <= cx + 130; x += 20) {
    const t = (x - (cx - 140)) / 280;
    const y = panelY + ((1 - t) * (1 - t) * -7 + 2 * (1 - t) * t * -16 + t * t * -7);
    ctx.fillStyle = 'rgba(58, 12, 8, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 190, 0.55)';
    ctx.beginPath();
    ctx.arc(x - 0.6, y - 0.7, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Spinner dome peeking over the crown at centre: polished metal, a
  // bright tip, and a ring of tiny fasteners at its base. It shows
  // through the mission banner (drawn over it at half alpha) as a
  // bright dome, and fully in the clear air above the panel.
  const sp = ctx.createRadialGradient(cx - 5, panelY - 54, 1, cx, panelY - 46, 14);
  sp.addColorStop(0, '#f7f7f7');
  sp.addColorStop(0.45, '#c9ced4');
  sp.addColorStop(1, '#4a4d52');
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.arc(cx, panelY - 46, 12, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(cx - 4, panelY - 54, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40, 40, 46, 0.8)';
  for (const dx of [-8, 0, 8]) {
    ctx.beginPath();
    ctx.arc(cx + dx, panelY - 43, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Spinning prop, seen from the pilot's seat: a faint disc over the
  // nose with two blurred blades turning around the spinner (the disc
  // reads through the mission banner at half alpha, like the dome).
  ctx.save();
  ctx.translate(cx, panelY - 46);
  ctx.fillStyle = 'rgba(40, 40, 48, 0.10)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 62, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(time * 28);
  ctx.fillStyle = 'rgba(40, 40, 48, 0.30)';
  ctx.beginPath();
  ctx.roundRect(-3, -58, 6, 44, 3);
  ctx.roundRect(-3, 14, 6, 44, 3);
  ctx.fill();
  ctx.restore();

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
  roundGauge(ctx, gx[5], gy, r, 'FUEL', p.fuel / (game.fuelMax || 100) * 100, 0, 100, '%', { steps: 4, redFrom: 25 });
  if (fuelLow && Math.floor(time * 2) % 2 === 0) {
    text(ctx, 'LOW FUEL', gx[5], gy - r - 16, 13, COLORS.hudWarn);
  }
  if (game.stalled) {
    text(ctx, 'STALL — NOSE DOWN, ADD POWER', VIEW_W / 2, panelY - 30, 15, COLORS.hudBad);
  }
}
