// The world: an island chain in a warm sea, with airfields, a town, a
// lighthouse, trees and clouds. Everything is placed from a seed, so the
// same seed always builds the same islands.

import { makeFractal2D, makeRng, makeNoise1D } from './rng.js';
import { STRIPS, MISSIONS } from './config.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sstep = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

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

// The Papua river: a winding channel down the main north-south corridor
// (z 400..10600). Two-sine meander, component amplitudes 130 + 70 = 200m,
// realised range about -160..+157m. The river bends around the airfields:
// inside each strip's z-range it is pushed outboard until |x| >= 150, so
// the channel never crosses a runway (a flat is |x| < 90, the channel and
// its banks reach 38m from the centreline).
function riverMeander(z) {
  return 130 * Math.sin(z * 0.00045) + 70 * Math.sin(z * 0.0011 + 1.7);
}
const RIVER_MIN_X = 150;
function riverX(z) {
  let out = riverMeander(z);
  for (const f of FLATS) {
    const w = clamp(1 - (Math.abs(z - f.z) - f.hl) / 300, 0, 1);
    if (w <= 0) continue;
    const side = riverMeander(f.z) >= 0 ? 1 : -1;
    out += side * Math.max(0, RIVER_MIN_X - side * out) * w;
  }
  return out;
}

// Mission route polylines (start -> rings/zones in order -> landing
// strip): terrain near them is capped so the gorge walls can never block
// a route. Supply missions have zones instead of rings.
const ROUTE_SEGMENTS = [];
for (const m of MISSIONS) {
  const pts = [
    { x: m.start.x, z: m.start.z },
    ...(m.rings || []),
    ...(m.zones || []),
    { x: m.strip.x, z: m.strip.z },
  ];
  for (let i = 0; i < pts.length - 1; i++) ROUTE_SEGMENTS.push([pts[i], pts[i + 1]]);
}
const SUPPLY_ZONES = MISSIONS.flatMap((m) => m.zones || []);

function distToRoutes(x, z) {
  let best = Infinity;
  for (const [a, b] of ROUTE_SEGMENTS) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    let t = len2 === 0 ? 0 : ((x - a.x) * dx + (z - a.z) * dz) / len2;
    t = clamp(t, 0, 1);
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

export function buildWorld(seed = 7) {
  const rng = makeRng(seed);
  const fractal = makeFractal2D(seed + 5, 4);
  const fieldNoise = makeFractal2D(seed + 21, 3);
  const seaNoise = makeFractal2D(seed + 33, 3);
  const jungleNoise = makeFractal2D(seed + 55, 2);
  const crestNoise = makeNoise1D(seed + 47);

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
    // The Papua river and its gorge: a channel carved to 0.5m water with
    // sand banks rising to 3.5m (half-width 26m, banks to 38m), flanked by
    // jungle walls ramping up to 100-120m crests at ~280-380m out from the
    // centreline and falling back to the open terrain by ~650m. The channel
    // fades in/out over 50m at its ends; the walls over 250-300m.
    const xr = riverX(z);
    const ad = Math.abs(x - xr);
    const cFade = sstep((z - 400) / 50) * (1 - sstep((z - 10550) / 50));
    if (cFade > 0 && ad < 38) {
      const ch = ad < 26 ? 0.5 : 0.5 + 3.0 * sstep((ad - 26) / 12);
      h = h + (ch - h) * cFade;
    } else if (ad >= 38) {
      const zFade = sstep((z - 350) / 250) * (1 - sstep((z - 10400) / 300));
      if (zFade > 0) {
        const crest = 110 + 10 * crestNoise(z * 0.0012);
        const rise = sstep((ad - 38) / 240);
        const fall = 1 - sstep((ad - 380) / 270);
        h = Math.max(h, crest * rise * fall * zFade);
      }
    }
    // Clearance carve (hard safety rule): the gorge walls and the island
    // bumps must never block a mission route — cap terrain at 44m within
    // 130m of any route polyline, blending back to full height by 450m.
    const rd = distToRoutes(x, z);
    if (rd < 450) {
      h = Math.min(h, 44 + (200 - 44) * sstep((rd - 130) / 320));
    }
    // Flat pads under the supply drop zones, so crates land on level
    // ground: cap at 12m within 45m of a zone centre, blending out by 110m.
    for (const zn of SUPPLY_ZONES) {
      const dd = Math.hypot(x - zn.x, z - zn.z);
      if (dd < 110) h = Math.min(h, 12 + (200 - 12) * sstep((dd - 45) / 65));
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
    // The river channel and its sand banks read before the height checks.
    const xr = riverX(z);
    const ad = Math.abs(x - xr);
    if (z >= 450 && z <= 10550 && ad < 26) return 'river';
    if (z >= 450 && z <= 10550 && ad < 38) return 'sand';
    const h = groundHeight(x, z);
    if (h < 1.5) return 'sea';
    const shore = 2.6;
    if (h < shore) return 'sand';
    const n = fieldNoise(x, z);
    // Jungle: dense dark-green forest patches, thicker along the river.
    if (jungleNoise(x, z) + (ad < 150 ? 0.25 : 0) > 0.42) return 'jungle';
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

  // Jungle fringe along the river banks: trees clustered near the
  // centreline, clear of strips, routes and drop zones. Placed after the
  // clouds on purpose, so the pre-existing objects and clouds keep the
  // exact rng stream (and positions) they had before.
  let riverTrees = 0;
  for (let i = 0; i < 400 && riverTrees < 150; i++) {
    const z = 400 + rng() * 10200;
    const side = rng() < 0.5 ? -1 : 1;
    const x = riverX(z) + side * (32 + rng() * 58);
    if (nearStrip(x, z)) continue;
    if (distToRoutes(x, z) < 60) continue;
    if (SUPPLY_ZONES.some((zn) => Math.hypot(x - zn.x, z - zn.z) < 45)) continue;
    const h = groundHeight(x, z);
    if (h < 4) continue;
    objects.push({ kind: 'tree', x, z, y: h, s: 10 + rng() * 12 });
    riverTrees++;
  }
  objects.sort((a, b) => b.z - a.z);

  // Mountain ridges on the far horizon, drawn as silhouettes.
  const ridgeFar = [];
  const ridgeNear = [];
  for (let i = 0; i <= 24; i++) {
    ridgeFar.push(0.55 + Math.abs(fractal(i * 40, 9000)) * 0.9);
    ridgeNear.push(0.35 + Math.abs(fractal(i * 55, 9500)) * 0.8);
  }

  // The bridge over the river at z 2600. The river cuts through high
  // island terrain here, so the deck sits high above the water — a gorge
  // crossing, not a low footbridge. Each end rests a few metres above the
  // local ground; the deck slopes gently between the two bank heights.
  const bridgeX = riverX(2600);
  const bridge = {
    x0: bridgeX - 45,
    x1: bridgeX + 45,
    z: 2600,
    deckY0: groundHeight(bridgeX - 45, 2600) + 2.5,
    deckY1: groundHeight(bridgeX + 45, 2600) + 2.5,
  };

  return { seed, groundHeight, groundKind, objects, clouds, ridgeFar, ridgeNear, islands: ISLANDS, bridge };
}

// A strip's runway rectangle, for landing checks and drawing.
export function stripRect(strip) {
  return { x0: strip.x - 16, x1: strip.x + 16, z0: strip.z - 450, z1: strip.z + 450 };
}
