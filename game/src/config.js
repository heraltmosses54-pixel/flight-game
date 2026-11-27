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
  stallFlaps: 28, // stall speed with the flaps down (F key)
  flapsDrag: 5, // m/s the flaps cost off the top speed
  brakeDrag: 12, // m/s an airbrake (Space) costs off the top speed
  brakeGround: 30, // m/s^2 the wheel brakes (Space) shed on the ground
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

// Golden-hour light: a warm sunset palette used for the cover staging
// (and any shot that sets game.lighting = 'golden').
export const GOLDEN = {
  skyTop: '#4a2a63',
  skyMid: '#c65a3c',
  skyLow: '#ffb85e',
  sun: '#ffe9a8',
  sunGlow: 'rgba(255, 180, 90, 0.65)',
  seaFar: '#8a4a52',
  haze: 'rgba(255, 170, 90, 0.42)',
  hazeMix: '#f2b06a',
};

// Combo window: rings flown within this many seconds of each other chain.
export const COMBO_WINDOW = 12;

// Supply drops: distance from the zone centre decides the band and the
// points. A drop chains into the same combo as rings when it lands close
// after the last score.
export const DROP = {
  bullseye: 6, // metres from the centre
  inner: 12,
  outer: 18, // the zone ring itself; past this the crate is a miss
  points: { bullseye: 500, inner: 300, outer: 150 },
  descent: 6, // m/s under the parachute
  drag: 1.2, // per second the crate sheds its forward speed
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
  river: '#2fa896', // clear blue-green river water, distinct from the sea
  jungle: '#2f6b2a', // dense dark-green forest
  rock: '#6b5d4f', // dark grey-brown lava rock and cliff faces
  stormSlate: '#3d4757', // dark slate the storm mixes the ground toward
  stormHaze: '#4a5568', // dark haze mix for storm ground slices
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
  zoneNext: '#ffb52e',
  zoneDone: '#58d68d',
  zoneLater: '#e8f4ff',
  crateCanopy: '#e8722a',
  crateBox: '#8a6b3f',
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
    par: 4500,
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
    par: 5000,
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
    par: 6000,
  },
  {
    id: 'supply',
    name: 'Supply Run',
    brief: 'Three island drop zones. Fly low over each ring and press B to drop a crate — bullseye pays 500. Then land at Far Strip.',
    start: { x: 0, y: 2, z: 120, heading: 0, speed: 0, throttle: 0, fuel: 100 },
    rings: [],
    zones: [
      { x: -260, z: 1800, r: 18 },
      { x: 300, z: 4200, r: 18 },
      { x: -200, z: 6800, r: 18 },
    ],
    strip: { z: 10000, x: 0 },
    wind: 1,
    timeLimit: 0,
    par: 5500,
  },
  {
    id: 'volcano',
    name: 'Volcano Survey',
    brief: 'Circle the crater of Gunung Api — four rings around the rim, high over the lava rock — then land at Far Strip.',
    start: { x: 0, y: 220, z: 8800, heading: -0.8, speed: 60, throttle: 0.7, fuel: 70 },
    rings: [
      { x: -1331, y: 300, z: 10069, r: 26 },
      { x: -1331, y: 295, z: 9531, r: 26 },
      { x: -1869, y: 300, z: 9531, r: 26 },
      { x: -1869, y: 295, z: 10069, r: 26 },
    ],
    strip: { z: 10000, x: 0 },
    wind: 2,
    timeLimit: 0,
    par: 6000,
  },
];

// Career upgrades, bought with gold on the menu (keys 6, 7, 8).
// Each has 3 levels; costs[level] is the price of the next level.
export const UPGRADES = {
  tank: {
    name: 'Fuel Tank',
    desc: 'Bigger tank — +25 fuel per level.',
    costs: [150, 350, 600],
  },
  climb: {
    name: 'Climb Kit',
    desc: 'Stronger pitch — +10% per level.',
    costs: [150, 350, 600],
  },
  hull: {
    name: 'Tough Hull',
    desc: '25% less damage per hard knock.',
    costs: [150, 350, 600],
  },
};

// Airfields: home strip at z 0, Coral Strip at 6000, Far Strip at 10000, Storm Strip at 8400.
export const STRIPS = [
  { name: 'Home Strip', x: 0, z: 0, length: 900 },
  { name: 'Coral Strip', x: 0, z: 6000, length: 900 },
  { name: 'Storm Strip', x: 0, z: 8400, length: 900 },
  { name: 'Far Strip', x: 0, z: 10000, length: 900 },
];
