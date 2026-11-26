// The renderer: a pseudo-3D chase view drawn on a 2D canvas. The camera
// sits behind the plane; the world is projected with a pinhole camera, the
// ground is drawn as perspective slices, and objects, rings and clouds are
// projected billboards sorted far to near.

import { VIEW_W, VIEW_H, COLORS, GOLDEN } from './config.js';
import { drawCockpit } from './cockpit.js';

const FOCAL = 560;
const CX = VIEW_W / 2;
const CY = VIEW_H * 0.52;

// Slice depths for the ground: near to far on a geometric ladder.
const SLICES = [];
for (let d = 8; d < 5200; d *= 1.12) SLICES.push(d);
SLICES.push(5200);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Mix two hex colours by t (0 = a, 1 = b).
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

const TERRAIN_COLOR = {
  sea: COLORS.seaNear,
  sand: COLORS.sand,
  grass: COLORS.grass[0],
  fieldA: COLORS.field[0],
  fieldB: COLORS.field[1],
  fieldC: COLORS.field[2],
};

// The camera basis from the plane's heading and pitch. In chase view the
// camera rolls part-way with the plane (60%): the horizon tilts the right
// way when the plane banks, and the plane itself is drawn with the rest of
// the bank. In cockpit view the camera sits at the pilot's seat and rolls
// fully with the plane, so the world banks around a fixed dashboard.
function cameraBasis(plane, cockpit) {
  const h = plane.heading;
  const p = plane.pitch;
  const f = [Math.sin(h) * Math.cos(p), Math.sin(p), Math.cos(h) * Math.cos(p)];
  const r = [Math.cos(h), 0, -Math.sin(h)];
  const u = [-Math.sin(h) * Math.sin(p), Math.cos(p), -Math.cos(h) * Math.sin(p)];
  // Roll the camera's right/up vectors around the forward axis.
  const a = plane.roll * (cockpit ? 1.0 : 0.6);
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const r2 = [r[0] * cosA - u[0] * sinA, r[1] * cosA - u[1] * sinA, r[2] * cosA - u[2] * sinA];
  const u2 = [u[0] * cosA + r[0] * sinA, u[1] * cosA + r[1] * sinA, u[2] * cosA + r[2] * sinA];
  // On the ground the chase camera pulls back and up a little, so the strip
  // and the plane both read; it settles to the chase position as speed
  // builds. The cockpit camera stays at the seat.
  const slow = Math.max(0, 20 - plane.speed);
  const dist = cockpit ? -2.5 : 13 + slow * 0.22;
  const height = cockpit ? 1.1 : 4.2 + slow * 0.18;
  const cam = [
    plane.x - f[0] * dist,
    plane.y - f[1] * dist + height,
    plane.z - f[2] * dist,
  ];
  return { f, r: r2, u: u2, cam, cockpit };
}

// Project a world point to the screen. Returns null when behind the camera.
function project(basis, q) {
  const dx = q[0] - basis.cam[0];
  const dy = q[1] - basis.cam[1];
  const dz = q[2] - basis.cam[2];
  const cz = dx * basis.f[0] + dy * basis.f[1] + dz * basis.f[2];
  if (cz < 1.5) return null;
  const cx = dx * basis.r[0] + dy * basis.r[1] + dz * basis.r[2];
  const cy = dx * basis.u[0] + dy * basis.u[1] + dz * basis.u[2];
  return { x: CX + (cx / cz) * FOCAL, y: CY - (cy / cz) * FOCAL, d: cz };
}

function quad(ctx, a, b, c, d, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, basis, plane, time, storm, golden) {
  const horizonY = CY - Math.tan(plane.pitch) * FOCAL;
  // The sky and the haze are drawn in a frame tilted with the camera's
  // roll, so the horizon band follows the tilted ground horizon. The sun
  // is a projected point and is drawn unrotated below.
  const a = plane.roll * (basis.cockpit ? 1.0 : 0.6);
  ctx.save();
  ctx.translate(CX, horizonY);
  ctx.rotate(-a);
  ctx.translate(-CX, -horizonY);
  const g = ctx.createLinearGradient(0, -320, 0, VIEW_H + 320);
  if (storm) {
    g.addColorStop(0, '#3d4a63');
    g.addColorStop(0.45, '#6d7d99');
    g.addColorStop(0.62, '#c9b48a');
  } else if (golden) {
    g.addColorStop(0, GOLDEN.skyTop);
    g.addColorStop(0.45, GOLDEN.skyMid);
    g.addColorStop(0.62, GOLDEN.skyLow);
  } else {
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(0.45, COLORS.skyMid);
    g.addColorStop(0.62, COLORS.skyLow);
  }
  g.addColorStop(1, golden ? GOLDEN.seaFar : COLORS.seaFar);
  ctx.fillStyle = g;
  // Drawn oversize: the world frame rolls with the plane, and the sky
  // must still cover the corners.
  ctx.fillRect(-320, -320, VIEW_W + 640, VIEW_H + 640);

  // Haze band hugging the horizon.
  const haze = ctx.createLinearGradient(0, horizonY - 70, 0, horizonY + 30);
  haze.addColorStop(0, 'rgba(246, 207, 143, 0)');
  haze.addColorStop(0.6, golden ? GOLDEN.haze : COLORS.haze);
  haze.addColorStop(1, 'rgba(246, 207, 143, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(-320, horizonY - 70, VIEW_W + 640, 100);
  ctx.restore();

  // The sun: a fixed direction in the world, projected like anything else.
  // Golden hour drops it low and makes it bigger.
  const sunDir = golden
    ? [Math.sin(-0.7), 0.13, Math.cos(-0.7)]
    : [Math.sin(-0.7), 0.34, Math.cos(-0.7)];
  const sunPoint = [
    basis.cam[0] + sunDir[0] * 8000,
    basis.cam[1] + sunDir[1] * 8000,
    basis.cam[2] + sunDir[2] * 8000,
  ];
  const s = project(basis, sunPoint);
  // No sun in a storm: the squall hides it, and a bright sun is what
  // makes the storm shot read as a fair-weather day.
  if (s && !storm) {
    const glow = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, golden ? 190 : 130);
    glow.addColorStop(0, golden ? GOLDEN.sunGlow : COLORS.sunGlow);
    glow.addColorStop(1, 'rgba(255, 236, 170, 0)');
    ctx.fillStyle = glow;
    const gr = golden ? 190 : 130;
    ctx.fillRect(s.x - gr, s.y - gr, gr * 2, gr * 2);
    ctx.fillStyle = golden ? GOLDEN.sun : COLORS.sun;
    ctx.beginPath();
    ctx.arc(s.x, s.y, golden ? 34 : 26, 0, Math.PI * 2);
    ctx.fill();
  }
  return horizonY;
}

function drawRidges(ctx, horizonY, world, roll, cockpit) {
  const a = roll * (cockpit ? 1.0 : 0.6);
  ctx.save();
  ctx.translate(CX, horizonY);
  ctx.rotate(-a);
  ctx.translate(-CX, -horizonY);
  const drawRidge = (ridge, base, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-320, VIEW_H + 320);
    const n = ridge.length - 1;
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * (VIEW_W + 640) - 320;
      ctx.lineTo(x, horizonY - Math.pow(ridge[i], 1.6) * base);
    }
    ctx.lineTo(VIEW_W + 320, VIEW_H + 320);
    ctx.closePath();
    ctx.fill();
  };
  drawRidge(world.ridgeFar, 110, COLORS.mountainFar);
  drawRidge(world.ridgeNear, 70, COLORS.mountainNear);
  ctx.restore();
}

// The ground as perspective slices: each slice is a band across the view,
// split into lateral patches coloured by what the terrain is there.
function drawGround(ctx, basis, world, golden) {
  const halfTan = (VIEW_W / 2 / FOCAL) * 1.06;
  for (let i = 0; i < SLICES.length - 1; i++) {
    const d0 = SLICES[i];
    const d1 = SLICES[i + 1];
    const hw0 = d0 * halfTan;
    const hw1 = d1 * halfTan;
    const segs = 10;
    for (let s = 0; s < segs; s++) {
      const t0 = -1 + (2 * s) / segs;
      const t1 = -1 + (2 * (s + 1)) / segs;
      // World points of the four corners of this ground patch.
      const corner = (d, t) => {
        const x = basis.cam[0] + basis.f[0] * d + basis.r[0] * (t * d * halfTan);
        const z = basis.cam[2] + basis.f[2] * d + basis.r[2] * (t * d * halfTan);
        const y = world.groundHeight(x, z);
        return [x, y, z];
      };
      const a = project(basis, corner(d0, t0));
      const b = project(basis, corner(d0, t1));
      const c = project(basis, corner(d1, t1));
      const d = project(basis, corner(d1, t0));
      if (!a || !b || !c || !d) continue;
      const mx = basis.cam[0] + basis.f[0] * ((d0 + d1) / 2);
      const mz = basis.cam[2] + basis.f[2] * ((d0 + d1) / 2);
      const kind = world.groundKind(mx, mz);
      let color = TERRAIN_COLOR[kind] || COLORS.grass[1];
      if (kind === 'grass') {
        // Patchwork fields: pick a green by the patch's position.
        const gi = Math.abs(Math.floor(mx / 260) + Math.floor(mz / 260) * 3) % 4;
        color = COLORS.grass[gi];
      }
      const hazeAmt = clamp(((d0 + d1) / 2 / 3400), 0, 0.72);
      quad(ctx, a, b, c, d, mixHex(color, golden ? GOLDEN.hazeMix : '#cfe3ee', hazeAmt));
    }
  }
}

// A runway: a flat grey band with a dashed centreline and threshold bars.
// On approach, PAPI lights beside the threshold show the glidepath:
// 4 white = too high, 2 white 2 red = on slope, 4 red = too low.
function drawRunway(ctx, basis, strip, plane) {
  const z0 = strip.z - 450;
  const z1 = strip.z + 450;
  const top = [];
  const bottom = [];
  for (let z = z0; z <= z1; z += 30) {
    const l = project(basis, [strip.x - 16, 2.2, z]);
    const r = project(basis, [strip.x + 16, 2.2, z]);
    if (l && r) {
      top.push(l);
      bottom.push(r);
    }
  }
  if (top.length < 2) return;
  ctx.fillStyle = COLORS.runway;
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (const p of top) ctx.lineTo(p.x, p.y);
  for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i].x, bottom[i].y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.fillStyle = COLORS.runwayEdge;
  for (let z = z0 + 40; z < z1 - 20; z += 80) {
    const a = project(basis, [strip.x - 1.2, 2.4, z]);
    const b = project(basis, [strip.x + 1.2, 2.4, z + 26]);
    const c = project(basis, [strip.x + 1.2, 2.4, z]);
    const d2 = project(basis, [strip.x - 1.2, 2.4, z + 26]);
    if (a && b && c && d2) quad(ctx, a, b, c, d2, COLORS.runwayEdge);
  }
  // Threshold bars at each end.
  for (const zt of [z0 + 12, z1 - 12]) {
    for (let k = -2; k <= 2; k++) {
      const a = project(basis, [strip.x + k * 6 - 2, 2.4, zt]);
      const b = project(basis, [strip.x + k * 6 + 2, 2.4, zt + 18]);
      const c = project(basis, [strip.x + k * 6 + 2, 2.4, zt]);
      const d2 = project(basis, [strip.x + k * 6 - 2, 2.4, zt + 18]);
      if (a && b && c && d2) quad(ctx, a, b, c, d2, COLORS.runwayEdge);
    }
  }
  // PAPI lights beside the threshold, lit for the approaching plane.
  if (plane) {
    const threshold = strip.z - 450;
    const d = threshold - plane.z;
    if (d > 0 && d < 2000 && Math.abs(plane.x - strip.x) < 250) {
      const ideal = 2 + d * 0.0524; // 3-degree glidepath
      const dev = plane.y - ideal;
      const whites = dev > 15 ? 4 : dev > 6 ? 3 : dev > -6 ? 2 : dev > -15 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        const lp = project(basis, [strip.x + 26 + i * 9, 3.5, threshold + 8]);
        if (!lp) continue;
        const lr = clamp(420 / Math.max(d, 60), 4, 11);
        const white = i < whites;
        const glow = ctx.createRadialGradient(lp.x, lp.y, 1, lp.x, lp.y, lr * 2.2);
        glow.addColorStop(0, white ? 'rgba(255,255,255,0.9)' : 'rgba(255,59,48,0.9)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, lr * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = white ? '#ffffff' : '#ff3b30';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, lr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// One billboard object: a tree, a house, the lighthouse, a hangar, a windsock.
function drawObject(ctx, basis, o, time, wind) {
  const p = project(basis, [o.x, o.y, o.z]);
  if (!p) return;
  const s = (o.s * FOCAL) / p.d;
  if (s < 1.5) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (o.kind === 'tree') {
    ctx.fillStyle = '#5d4a2f';
    ctx.fillRect(-s * 0.06, -s * 0.35, s * 0.12, s * 0.35);
    ctx.fillStyle = '#3f7a34';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.5, -s * 0.25);
    ctx.lineTo(s * 0.5, -s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4c8a3e';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(-s * 0.38, -s * 0.15);
    ctx.lineTo(s * 0.38, -s * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (o.kind === 'house') {
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(-s * 0.5, -s * 0.55, s, s * 0.55);
    ctx.fillStyle = '#b0503c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.58, -s * 0.5);
    ctx.lineTo(0, -s * 0.95);
    ctx.lineTo(s * 0.58, -s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2c2c34';
    ctx.fillRect(-s * 0.12, -s * 0.25, s * 0.24, s * 0.25);
  } else if (o.kind === 'lighthouse') {
    ctx.fillStyle = '#f2ead8';
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, 0);
    ctx.lineTo(-s * 0.1, -s);
    ctx.lineTo(s * 0.1, -s);
    ctx.lineTo(s * 0.16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-s * 0.13, -s * 0.62, s * 0.26, s * 0.16);
    ctx.fillRect(-s * 0.11, -s * 0.3, s * 0.22, s * 0.14);
    ctx.fillStyle = '#2c2c34';
    ctx.beginPath();
    ctx.arc(0, -s * 1.04, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(0, -s * 1.04, 1, 0, -s * 1.04, s * 0.5);
    glow.addColorStop(0, 'rgba(255, 240, 170, 0.8)');
    glow.addColorStop(1, 'rgba(255, 240, 170, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -s * 1.04, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'hangar') {
    ctx.fillStyle = '#8a94a6';
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(-s * 0.6, -s * 0.3);
    ctx.arc(0, -s * 0.3, s * 0.6, Math.PI, 0);
    ctx.lineTo(s * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d6a7d';
    ctx.fillRect(-s * 0.45, -s * 0.3, s * 0.9, s * 0.3);
  } else if (o.kind === 'windsock') {
    ctx.strokeStyle = '#3a3a44';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s);
    ctx.stroke();
    const sway = Math.sin(time * 1.4 + o.x) * 0.2 + (wind > 0 ? 0.5 : 0.2);
    ctx.fillStyle = '#e8722a';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7 * Math.cos(sway), -s + s * 0.28 * Math.sin(sway) + s * 0.1);
    ctx.lineTo(0, -s + s * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// A target ring: a glowing torus the plane flies through.
function drawRing(ctx, basis, ring, state, time) {
  const p = project(basis, [ring.x, ring.y, ring.z]);
  if (!p) return;
  const rx = (ring.r * FOCAL) / p.d;
  if (rx < 2) return;
  const color = state === 'next' ? COLORS.ringNext : state === 'done' ? COLORS.ringDone : COLORS.ringLater;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (state === 'next') {
    const pulse = 0.55 + 0.3 * Math.sin(time * 4);
    ctx.strokeStyle = `rgba(255, 181, 46, ${pulse})`;
    ctx.lineWidth = Math.max(3, rx * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.25, rx * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, rx * 0.14);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, rx * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.86, rx * 0.79, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A drop zone: concentric rings painted on the ground — outer ring,
// inner band and bullseye — so the scoring bands read from the air.
function drawZone(ctx, basis, world, zone, state, time) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const x = zone.x + Math.cos(a) * zone.r;
    const z = zone.z + Math.sin(a) * zone.r;
    const p = project(basis, [x, world.groundHeight(x, z) + 0.4, z]);
    if (!p) return;
    pts.push(p);
  }
  const color = state === 'next' ? COLORS.zoneNext : state === 'done' ? COLORS.zoneDone : COLORS.zoneLater;
  const pulse = state === 'next' ? 0.65 + 0.3 * Math.sin(time * 4) : 1;
  const ring = (radius, alpha, width) => {
    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x = zone.x + Math.cos(a) * radius;
      const z = zone.z + Math.sin(a) * radius;
      const p = project(basis, [x, world.groundHeight(x, z) + 0.4, z]);
      if (!p) {
        ctx.restore();
        return;
      }
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };
  // Translucent disc under the rings, so the zone reads on any terrain.
  ctx.save();
  ctx.globalAlpha = 0.22 * pulse;
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ring(zone.r, 0.95, 3);
  ring(zone.r * 0.66, 0.6, 2);
  ring(zone.r * 0.33, 0.6, 2);
  // Centre peg.
  const c = project(basis, [zone.x, zone.y + 0.6, zone.z]);
  if (c) {
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// A supply crate: an orange parachute canopy with shroud lines over a
// wooden box while it falls; on the ground, the box with the canopy
// crumpled beside it.
function drawCrate(ctx, basis, crate, time) {
  const p = project(basis, [crate.x, crate.y, crate.z]);
  if (!p) return;
  const k = FOCAL / p.d;
  const sway = crate.state === 'falling' ? Math.sin(time * 2.2 + crate.x) * 0.06 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(sway);
  if (crate.state === 'falling') {
    const cr = Math.max(3, 3.4 * k);
    // Canopy: orange dome with a cream panel down the middle.
    ctx.fillStyle = COLORS.crateCanopy;
    ctx.beginPath();
    ctx.arc(0, -cr * 1.9, cr, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(245, 234, 210, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-cr * 0.28, -cr * 1.9 - cr * 0.95);
    ctx.lineTo(cr * 0.28, -cr * 1.9 - cr * 0.95);
    ctx.lineTo(cr * 0.28, -cr * 1.9);
    ctx.lineTo(-cr * 0.28, -cr * 1.9);
    ctx.closePath();
    ctx.fill();
    // Shroud lines from the canopy rim to the box.
    ctx.strokeStyle = 'rgba(40, 40, 44, 0.8)';
    ctx.lineWidth = Math.max(1, 0.12 * k);
    ctx.beginPath();
    ctx.moveTo(-cr, -cr * 1.9);
    ctx.lineTo(-cr * 0.28, -cr * 0.5);
    ctx.moveTo(cr, -cr * 1.9);
    ctx.lineTo(cr * 0.28, -cr * 0.5);
    ctx.moveTo(0, -cr * 1.9 - cr);
    ctx.lineTo(0, -cr * 0.5);
    ctx.stroke();
    // The box, hanging below.
    const bw = Math.max(3, 2.4 * k);
    ctx.fillStyle = COLORS.crateBox;
    ctx.fillRect(-bw / 2, -bw * 0.5, bw, bw);
    ctx.strokeStyle = 'rgba(40, 30, 16, 0.7)';
    ctx.lineWidth = Math.max(1, 0.1 * k);
    ctx.strokeRect(-bw / 2, -bw * 0.5, bw, bw);
    ctx.beginPath();
    ctx.moveTo(-bw / 2, 0);
    ctx.lineTo(bw / 2, 0);
    ctx.stroke();
  } else {
    // Landed: the box on the ground, canopy flattened beside it.
    const bw = Math.max(3, 2.4 * k);
    ctx.fillStyle = COLORS.crateBox;
    ctx.fillRect(-bw / 2, -bw, bw, bw);
    ctx.strokeStyle = 'rgba(40, 30, 16, 0.7)';
    ctx.lineWidth = Math.max(1, 0.1 * k);
    ctx.strokeRect(-bw / 2, -bw, bw, bw);
    ctx.fillStyle = COLORS.crateCanopy;
    ctx.beginPath();
    ctx.ellipse(bw * 1.3, -bw * 0.2, bw * 0.9, bw * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawCloud(ctx, basis, c, storm) {
  const p = project(basis, [c.x, c.y, c.z]);
  if (!p) return;
  const s = (c.s * FOCAL) / p.d;
  if (s < 3) return;
  // Storm clouds are dark slate, not white — the white puffs are what
  // made the storm shot read as a sunny day.
  ctx.fillStyle = storm ? 'rgba(74, 84, 104, 0.92)' : 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.ellipse(p.x - s * 0.4, p.y + s * 0.06, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(p.x, p.y - s * 0.08, s * 0.62, s * 0.26, 0, 0, Math.PI * 2);
  ctx.ellipse(p.x + s * 0.45, p.y + s * 0.08, s * 0.45, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The plane itself, drawn in the rotated world frame at a fixed screen spot.
function drawPlane(ctx, plane, time, groundY) {
  const px = CX;
  const py = VIEW_H * 0.60;
  const bank = plane.roll;
  ctx.save();
  ctx.translate(px, py);
  // The camera already rolls 60% with the plane; the plane takes the
  // remaining 40% here, so it banks against a correctly tilted horizon.
  ctx.rotate(bank * 0.4);
  // Bigger read: the chase plane is scaled up so the high-wing bush
  // silhouette, struts and gear all read at a glance.
  ctx.scale(1.15, 1.15);
  // Tail.
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.moveTo(-14, 26);
  ctx.lineTo(-34, 52);
  ctx.lineTo(-8, 46);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 26);
  ctx.lineTo(34, 52);
  ctx.lineTo(8, 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeDark;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(-6, 62);
  ctx.lineTo(6, 62);
  ctx.closePath();
  ctx.fill();
  // Main wings.
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-132, 26);
  ctx.lineTo(-126, 40);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.lineTo(132, 26);
  ctx.lineTo(126, 40);
  ctx.lineTo(10, 16);
  ctx.closePath();
  ctx.fill();
  // High-wing struts: thin lines from the lower fuselage out to the
  // wings — the Cessna cue that says "high-wing" from behind.
  ctx.strokeStyle = 'rgba(70, 35, 28, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, 30);
  ctx.lineTo(-58, 2);
  ctx.moveTo(13, 30);
  ctx.lineTo(58, 2);
  ctx.stroke();
  // Fuselage: cream metal shaded across its width (bright sun side,
  // darker edges) with a specular stripe, so the body reads as painted
  // metal instead of a flat cutout.
  const fusGrad = ctx.createLinearGradient(-15, 0, 15, 0);
  fusGrad.addColorStop(0, '#d9c39a');
  fusGrad.addColorStop(0.32, '#fff8e6');
  fusGrad.addColorStop(0.68, '#f5ead2');
  fusGrad.addColorStop(1, '#cbb27f');
  ctx.fillStyle = fusGrad;
  ctx.beginPath();
  ctx.ellipse(0, 8, 15, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 8, 15, 52, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-8, 4, 3.5, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cheatline: the red stripe runs the length of the fuselage on both
  // sides, Cessna-style, not just a band at the nose.
  ctx.fillStyle = 'rgba(192, 57, 43, 0.9)';
  ctx.fillRect(-14, -34, 3, 88);
  ctx.fillRect(11, -34, 3, 88);
  // Red cowling band across the nose tip, with a panel seam at its lower
  // edge and two dark cooling intakes flanking the spinner.
  const cowlGrad = ctx.createLinearGradient(0, -44, 0, -34);
  cowlGrad.addColorStop(0, '#c0392b');
  cowlGrad.addColorStop(1, '#8e2a1f');
  ctx.fillStyle = cowlGrad;
  ctx.fillRect(-15, -46, 30, 11);
  ctx.strokeStyle = 'rgba(60, 15, 10, 0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -35);
  ctx.quadraticCurveTo(0, -33, 6, -35);
  ctx.stroke();
  ctx.fillStyle = 'rgba(20, 20, 24, 0.85)';
  ctx.beginPath();
  ctx.arc(-4, -41, 1.4, 0, Math.PI * 2);
  ctx.arc(4, -41, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90, 50, 30, 0.7)';
  ctx.beginPath();
  ctx.arc(-3, -37.5, 1, 0, Math.PI * 2);
  ctx.arc(3, -37.5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.planeRed;
  ctx.fillRect(-15, 2, 30, 7);
  // Cockpit window.
  ctx.fillStyle = '#1d3a52';
  ctx.beginPath();
  ctx.ellipse(0, -22, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spinning propeller.
  const spin = time * 28;
  ctx.save();
  ctx.translate(0, -58);
  // The spinning prop reads as a full faint disc (ref front view),
  // not just a bar: a thin circle behind the blades.
  ctx.fillStyle = 'rgba(40, 40, 48, 0.10)';
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 40, 48, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(40, 40, 48, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40, 40, 48, 0.75)';
  ctx.fillRect(-2, -30, 4, 60);
  ctx.restore();
  // Spinner: a polished metal cone over the hub (bright tip, shaded rim,
  // a ring of tiny fasteners), like a real Cessna spinner.
  const spinGrad = ctx.createRadialGradient(-2, -60, 1, 0, -58, 9);
  spinGrad.addColorStop(0, '#f7f7f7');
  spinGrad.addColorStop(0.5, '#c9ced4');
  spinGrad.addColorStop(1, '#4a4d52');
  ctx.fillStyle = spinGrad;
  ctx.beginPath();
  ctx.arc(0, -58, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(-2, -60, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(40, 40, 46, 0.85)';
  for (const a of [0.5, 1.8, 3.1, 4.4, 5.7]) {
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 6.5, -58 + Math.sin(a) * 6.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fixed tricycle gear: short legs down from the belly, two main wheels
  // outboard and a nose wheel on the centreline (Cessna refs).
  ctx.strokeStyle = '#2c2c34';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, 54);
  ctx.lineTo(-18, 64);
  ctx.moveTo(12, 54);
  ctx.lineTo(18, 64);
  ctx.moveTo(0, 58);
  ctx.lineTo(0, 67);
  ctx.stroke();
  ctx.fillStyle = '#1a1a20';
  ctx.beginPath();
  ctx.arc(-18, 66, 4.5, 0, Math.PI * 2);
  ctx.arc(18, 66, 4.5, 0, Math.PI * 2);
  ctx.arc(0, 69, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a94a6';
  ctx.beginPath();
  ctx.arc(-18, 66, 1.8, 0, Math.PI * 2);
  ctx.arc(18, 66, 1.8, 0, Math.PI * 2);
  ctx.arc(0, 69, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Registration on the tail.
  ctx.fillStyle = COLORS.planeCream;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SP-07', 0, 56);
  ctx.restore();
  return { px, py };
}

// Rain streaks for the storm mission.
function drawRain(ctx, time) {
  ctx.strokeStyle = 'rgba(200, 215, 235, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = ((i * 137 + time * 620) % (VIEW_W + 40)) - 20;
    const y = ((i * 211 + time * 900) % (VIEW_H + 40)) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 20);
  }
  ctx.stroke();
}

// The whole scene for one frame. The camera basis already carries the
// roll, so the world is drawn straight: no extra screen rotation.
export function drawScene(ctx, game, world, time) {
  const plane = game.plane;
  const storm = game.mission && game.mission.id === 'storm';
  const golden = game.lighting === 'golden';
  const cockpit = game.view === 'cockpit';
  const basis = cameraBasis(plane, cockpit);
  ctx.save();

  const horizonY = drawSky(ctx, basis, plane, time, storm, golden);
  drawRidges(ctx, horizonY, world, plane.roll, cockpit);
  drawGround(ctx, basis, world, golden);
  for (const strip of game.strips) drawRunway(ctx, basis, strip, plane);

  // Billboards far to near: clouds, objects, rings.
  const drawables = [];
  for (const c of world.clouds) drawables.push({ d: c.z - plane.z, fn: () => drawCloud(ctx, basis, c, storm) });
  for (const o of world.objects) drawables.push({ d: o.z - plane.z, fn: () => drawObject(ctx, basis, o, time, game.wind) });
  game.rings.forEach((ring, i) => {
    const state = i < game.ringIndex ? 'done' : i === game.ringIndex ? 'next' : 'later';
    drawables.push({ d: ring.z - plane.z, fn: () => drawRing(ctx, basis, ring, state, time) });
  });
  game.zones.forEach((zone) => {
    const state = zone.done ? 'done' : zone === game.zones.find((z) => !z.done) ? 'next' : 'later';
    drawables.push({ d: zone.z - plane.z, fn: () => drawZone(ctx, basis, world, zone, state, time) });
  });
  for (const crate of game.crates) {
    drawables.push({ d: crate.z - plane.z, fn: () => drawCrate(ctx, basis, crate, time) });
  }
  drawables.sort((a, b) => b.d - a.d);
  for (const item of drawables) item.fn();

  // The plane's shadow on the ground below it.
  const gy = world.groundHeight(plane.x, plane.z);
  const shadow = project(basis, [plane.x, gy + 0.5, plane.z]);
  if (shadow && plane.y - gy < 220) {
    const s = clamp(46 - (plane.y - gy) * 0.14, 8, 46);
    ctx.fillStyle = `rgba(20, 30, 20, ${clamp(0.4 - (plane.y - gy) * 0.0012, 0.08, 0.4)})`;
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles: ring bursts, landing dust, engine trail.
  for (const pt of game.particles.list) {
    const pp = project(basis, [pt.x, pt.y, pt.z]);
    if (!pp) continue;
    const ps = clamp((pt.size * FOCAL) / pp.d, 1, 26);
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1) * 0.85;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, ps, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Chase view shows the plane; cockpit view shows the dashboard instead.
  if (!cockpit) drawPlane(ctx, plane, time, gy);
  if (storm) drawRain(ctx, time);
  if (cockpit) drawCockpit(ctx, game, time);
  ctx.restore();
}
