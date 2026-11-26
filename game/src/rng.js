// A small seeded random source and 1D/2D value noise, so the islands, clouds
// and fields are the same on every run with the same seed. Nothing here reads
// the clock: determinism comes from the seed alone.

// Mulberry32: a tiny fast seeded PRNG.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothstep between 0 and 1.
function smooth(t) {
  return t * t * (3 - 2 * t);
}

// 1D value noise: a wobbly line from a seeded table of control values.
export function makeNoise1D(seed, size = 256) {
  const rng = makeRng(seed);
  const table = new Float32Array(size);
  for (let i = 0; i < size; i++) table[i] = rng() * 2 - 1;
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = table[((xi % size) + size) % size];
    const b = table[(((xi + 1) % size) + size) % size];
    return a + (b - a) * smooth(xf);
  };
}

// 2D value noise on a seeded grid, bilinear with a smoothstep blend.
export function makeNoise2D(seed, size = 128) {
  const rng = makeRng(seed);
  const table = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) table[i] = rng() * 2 - 1;
  const at = (x, y) => table[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  return function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    const u = smooth(xf);
    const v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Fractal noise: several octaves of value noise layered for rolling terrain.
export function makeFractal2D(seed, octaves = 4) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(makeNoise2D(seed + o * 101, 64));
  return function fractal(x, y) {
    let sum = 0;
    let amp = 1;
    let total = 0;
    for (let o = 0; o < octaves; o++) {
      const f = Math.pow(2, o);
      sum += layers[o](x * f * 0.004, y * f * 0.004) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
}
