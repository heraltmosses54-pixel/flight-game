// SKY POST — shared constants: units, limits and the look of the game.
// All speeds are metres per second, all distances metres, all angles radians.

export const GAME_NAME = 'SKY POST';
export const GAME_SUBTITLE = 'Island Air Mail';

// Canvas the game draws into (the page scales it to fit the window).
export const VIEW_W = 1280;
export const VIEW_H = 720;

// The flight model.
export const FLIGHT = {
  maxSpeed: 82, // m/s at full throttle
  minSpeed: 24, // m/s at idle
  stallSpeed: 33, // below this the wing stops flying and the nose drops
  maxPitch: 0.32, // about 18 degrees
  maxRoll: 0.96, // about 55 degrees
  rollRate: 1.9, // rad/s toward the commanded bank
  pitchRate: 1.4, // rad/s toward the commanded pitch
  throttleRate: 0.55, // per second
  gravity: 9.8,
  groundEffect: 6, // metres above the ground where the flare softens
};

// Fuel: percent, drains faster the harder the throttle is worked.
export const FUEL = {
  start: 100,
  drainIdle: 0.14,
  drainFull: 0.62,
  reserveWarn: 25,
};

// Damage: percent. A hard knock adds 25-40, a crash sets 100.
export const DAMAGE = {
  hardLanding: 28,
  scrape: 18,
  treeHit: 34,
};

// Landing: what counts as a good touchdown.
export const LANDING = {
  maxSink: 4.5, // m/s vertical speed
  maxSpeed: 48, // m/s over the ground
  maxRoll: 0.26, // about 15 degrees of bank
  runwayHalfWidth: 16,
};

// The palette: one warm late-afternoon style for sky, sea and land.
export const COLORS = {
  skyTop: '#2e6db4',
  skyMid: '#7fb2dd',
  skyLow: '#f6cf8f',
  sun: '#fff3c4',
  sunGlow: 'rgba(255, 236, 170, 0.55)',
  seaFar: '#3f7fa8',
  seaNear: '#2f6b8f',
  haze: 'rgba(246, 207, 143, 0.35)',
  mountainFar: '#7d94b5',
  mountainNear: '#5d7a8c',
  grass: ['#6da24f', '#7fb35a', '#5d9148', '#8fae54'],
  field: ['#c9a85a', '#b98d4f', '#a8b35c'],
  sand: '#e3d199',
  runway: '#565660',
  runwayEdge: '#e8e8e8',
  ringNext: '#ffb52e',
  ringDone: '#58d68d',
  ringLater: '#e8f4ff',
  planeRed: '#c0392b',
  planeCream: '#f5ead2',
  planeDark: '#2c2c34',
  hud: '#eaf6ff',
  hudDim: 'rgba(234, 246, 255, 0.62)',
  hudPanel: 'rgba(10, 26, 44, 0.55)',
  hudWarn: '#ffb52e',
  hudBad: '#ff5d4d',
  hudGood: '#58d68d',
};

// Missions. Each is a list of rings to fly through and a strip to land on.
export const MISSIONS = [
  {
    id: 'first',
    name: 'First Delivery',
    brief: 'Take off from Home Strip, fly the three rings, then land at Coral Strip.',
    start: { x: 0, y: 2, z: 120, heading: 0, speed: 0, throttle: 0, fuel: 100 },
    rings: [
      { x: 0, y: 70, z: 1500, r: 26 },
      { x: -140, y: 95, z: 3000, r: 26 },
      { x: 60, y: 80, z: 4500, r: 26 },
    ],
    strip: { z: 6000, x: 0 },
    wind: 0,
    timeLimit: 0,
  },
  {
    id: 'hop',
    name: 'Island Hop',
    brief: 'Three drops across the chain on a tight tank. Watch the fuel gauge.',
    start: { x: 0, y: 150, z: 200, heading: 0, speed: 58, throttle: 0.6, fuel: 68 },
    rings: [
      { x: -260, y: 110, z: 2200, r: 24 },
      { x: 320, y: 130, z: 5200, r: 24 },
      { x: -80, y: 100, z: 8200, r: 24 },
    ],
    strip: { z: 10000, x: 0 },
    wind: 1.5,
    timeLimit: 0,
  },
  {
    id: 'storm',
    name: 'Storm Run',
    brief: 'Six rings, gusting crosswind, low fuel. Fast and clean wins.',
    start: { x: 0, y: 120, z: 200, heading: 0, speed: 62, throttle: 0.75, fuel: 55 },
    rings: [
      { x: -220, y: 90, z: 1200, r: 22 },
      { x: 240, y: 120, z: 2400, r: 22 },
      { x: -280, y: 100, z: 3600, r: 22 },
      { x: 200, y: 140, z: 4800, r: 22 },
      { x: -160, y: 110, z: 6000, r: 22 },
      { x: 40, y: 90, z: 7200, r: 22 },
    ],
    strip: { z: 8400, x: 0 },
    wind: 6,
    timeLimit: 240,
  },
];

// Airfields: home strip at z 0, Coral Strip at 6000, Far Strip at 10000, Storm Strip at 8400.
export const STRIPS = [
  { name: 'Home Strip', x: 0, z: 0, length: 900 },
  { name: 'Coral Strip', x: 0, z: 6000, length: 900 },
  { name: 'Storm Strip', x: 0, z: 8400, length: 900 },
  { name: 'Far Strip', x: 0, z: 10000, length: 900 },
];
