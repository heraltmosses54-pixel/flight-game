// The world: an island chain in a warm sea, with airfields, a town, a
// lighthouse, trees and clouds. Everything is placed from a seed, so the
// same seed always builds the same islands.

import { makeFractal2D, makeRng } from './rng.js';
import { STRIPS } from './config.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Island bumps: centre (x, z), radius and height in metres.
const ISLANDS = [
  { x: 0, z: 600, r: 1300, h: 30 },
  { x: 0, z: 3000, r: 1500, h: 55 },
  { x: -700, z: 5200, r: 1100, h: 80 },
  { x: 600, z: 7000, r: 1300, h: 48 },
  { x: -300, z: 9200, r: 1600, h: 95 },
  { x: 900, z: 2500, r: 800, h: 38 },
  { x: -1100, z: 1500, r: 900, h: 60 },
];

// Where the ground is flat for a strip (x, z, half-width, half-length).
const FLATS = [
  { x: 0, z: 450, hw: 90, hl: 700 },
  { x: 0, z: 6450, hw: 90, hl: 700 },
  { x: 0, z: 8850, hw: 90, hl: 700 },
  { x: 0, z: 10450, hw: 90, hl: 700 },
];

export function buildWorld(seed = 7) {
  const rng = makeRng(seed);
  const fractal = makeFractal2D(seed + 5, 4);
  const fieldNoise = makeFractal2D(seed + 21, 3);
  const seaNoise = makeFractal2D(seed + 33, 3);

  // Ground height at (x, z): rolling land, island bumps, broad sea channels.
  function groundHeight(x, z) {
    for (const f of FLATS) {
      if (Math.abs(x - f.x) < f.hw && Math.abs(z - f.z) < f.hl) return 2;
    }
    let h = 14 + fractal(x, z) * 7;
    for (const isl of ISLANDS) {
      const dx = (x - isl.x) / isl.r;
      const dz = (z - isl.z) / isl.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < 1) h += isl.h * (1 - d2) * (1 - d2);
    }
    // Broad sea channels where the sea noise runs high.
    const s = seaNoise(x * 0.5, z * 0.5);
    const sea = clamp((s - 0.15) / 0.45, 0, 1);
    h -= sea * 30;
    // Land is guaranteed near every airfield.
    for (const f of FLATS) {
      if (Math.abs(x - f.x) < f.hw + 160 && Math.abs(z - f.z) < f.hl + 160) h = Math.max(h, 6);
    }
    // A gentle glidepath corridor on the approach to every strip: the
    // ground steps down toward the threshold, so a landing approach that
    // follows the runway in never meets a hill first.
    for (const strip of STRIPS) {
      if (Math.abs(x - strip.x) < 120 && z > strip.z - 1350 && z < strip.z + 450) {
        const cap = 2 + Math.max(0, strip.z - 450 - z) * 0.03;
        h = Math.min(h, cap);
      }
    }
    return h;
  }

  // What the ground looks like at (x, z): sea, sand, grass or a tilled field.
  function groundKind(x, z) {
    for (const f of FLATS) {
      if (Math.abs(x - f.x) < f.hw && Math.abs(z - f.z) < f.hl) return 'grass';
    }
    const h = groundHeight(x, z);
    if (h < 1.5) return 'sea';
    const shore = 2.6;
    if (h < shore) return 'sand';
    const n = fieldNoise(x, z);
    if (n > 0.55) return 'fieldA';
    if (n > 0.3) return 'fieldB';
    if (n < -0.5) return 'fieldC';
    return 'grass';
  }

  // Scatter trees, houses and a lighthouse on the islands, away from strips.
  const objects = [];
  const nearStrip = (x, z) => FLATS.some((f) => Math.abs(x - f.x) < f.hw + 40 && Math.abs(z - f.z) < f.hl + 40);
  for (let i = 0; i < 260; i++) {
    const x = (rng() * 2 - 1) * 1600;
    const z = 300 + rng() * 10600;
    if (nearStrip(x, z)) continue;
    const h = groundHeight(x, z);
    if (h < 4) continue;
    objects.push({ kind: 'tree', x, z, y: h, s: 8 + rng() * 10 });
  }
  for (let i = 0; i < 46; i++) {
    const x = -500 + rng() * 1000;
    const z = 2400 + rng() * 1600;
    if (nearStrip(x, z)) continue;
    const h = groundHeight(x, z);
    if (h < 4) continue;
    objects.push({ kind: 'house', x, z, y: h, s: 12 + rng() * 8, rot: rng() * Math.PI });
  }
  // The town around the home strip.
  for (let i = 0; i < 22; i++) {
    const x = 180 + rng() * 320;
    const z = 200 + rng() * 900;
    objects.push({ kind: 'house', x, z, y: groundHeight(x, z), s: 12 + rng() * 8, rot: rng() * Math.PI });
  }
  objects.push({ kind: 'lighthouse', x: -420, z: 5100, y: groundHeight(-420, 5100), s: 42 });
  objects.push({ kind: 'hangar', x: 70, z: 300, y: 2, s: 34 });
  objects.push({ kind: 'hangar', x: -70, z: 260, y: 2, s: 30 });
  objects.push({ kind: 'windsock', x: 42, z: 700, y: 2, s: 12 });
  objects.push({ kind: 'windsock', x: 42, z: 6150, y: 2, s: 12 });
  objects.sort((a, b) => b.z - a.z);

  // Clouds drift above the islands.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: (rng() * 2 - 1) * 2200,
      y: 330 + rng() * 260,
      z: rng() * 11200,
      s: 90 + rng() * 140,
    });
  }

  // Mountain ridges on the far horizon, drawn as silhouettes.
  const ridgeFar = [];
  const ridgeNear = [];
  for (let i = 0; i <= 24; i++) {
    ridgeFar.push(0.55 + Math.abs(fractal(i * 40, 9000)) * 0.9);
    ridgeNear.push(0.35 + Math.abs(fractal(i * 55, 9500)) * 0.8);
  }

  return { seed, groundHeight, groundKind, objects, clouds, ridgeFar, ridgeNear };
}

// A strip's runway rectangle, for landing checks and drawing.
export function stripRect(strip) {
  return { x0: strip.x - 16, x1: strip.x + 16, z0: strip.z - 450, z1: strip.z + 450 };
}
