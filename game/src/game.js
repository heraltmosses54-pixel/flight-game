// The game itself: states (menu, briefing, flying, landed, crashed,
// paused), missions, rings, scoring and the message feed.

import { MISSIONS, STRIPS, DAMAGE } from './config.js';
import { buildWorld } from './world.js';
import { makePlane, stepPlane, crossedRing } from './physics.js';
import { makeNoise1D } from './rng.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('skypost-best') || '{}');
  } catch {
    return {};
  }
}

function saveBest(best) {
  try {
    localStorage.setItem('skypost-best', JSON.stringify(best));
  } catch {
    // Private mode or no storage: best scores just do not persist.
  }
}

export function makeGame(canvas) {
  const world = buildWorld(7);
  const game = {
    world,
    strips: STRIPS,
    state: 'menu', // menu | briefing | flying | landed | crashed | paused
    mission: null,
    rings: [],
    ringIndex: 0,
    stripName: '',
    plane: makePlane(MISSIONS[0].start),
    time: 0, // wall-clock time for animation
    elapsed: 0, // mission timer
    timeLimit: 0,
    wind: 0,
    gustNoise: makeNoise1D(99),
    score: 0,
    messages: [],
    best: loadBest(),
    menuHover: -1,
    missionComplete: false,
    landingRating: '',
    stalled: false,
    prevZ: 0,
    freeFlight: false,
  };

  game.say = (text, color) => {
    game.messages.push({ text, color, at: game.time });
    if (game.messages.length > 6) game.messages.shift();
  };

  game.startMission = (index) => {
    const mission = MISSIONS[index];
    game.mission = mission;
    game.rings = mission.rings.map((r) => ({ ...r }));
    game.ringIndex = 0;
    game.stripName = STRIPS.find((s) => s.z === mission.strip.z)?.name || 'the strip';
    game.timeLimit = mission.timeLimit;
    game.wind = mission.wind;
    game.elapsed = 0;
    game.score = 0;
    game.messages = [];
    game.missionComplete = false;
    game.landingRating = '';
    game.freeFlight = false;
    game.plane = makePlane(mission.start);
    game.prevZ = game.plane.z;
    game.state = 'briefing';
    game.briefAt = game.time;
    game.saidGlide = false;
  };

  game.startFreeFlight = () => {
    game.mission = null;
    game.rings = [];
    game.ringIndex = 0;
    game.stripName = 'Home Strip';
    game.timeLimit = 0;
    game.wind = 1;
    game.elapsed = 0;
    game.score = 0;
    game.messages = [];
    game.missionComplete = false;
    game.freeFlight = true;
    game.plane = makePlane({ x: 0, y: 150, z: 200, heading: 0, speed: 58, throttle: 0.6, fuel: 100 });
    game.prevZ = game.plane.z;
    game.state = 'flying';
    game.saidGlide = false;
    game.say('Free flight — fly where you like, land where you can.', '#eaf6ff');
  };

  game.toMenu = () => {
    game.state = 'menu';
    game.mission = null;
    game.plane = makePlane(MISSIONS[0].start);
    game.messages = [];
  };

  game.finishFlight = (landed) => {
    game.state = landed ? 'landed' : 'crashed';
    const p = game.plane;
    // Score: rings are worth 1000 each, a clean landing pays, damage costs.
    let score = game.ringIndex * 1000;
    if (landed) {
      const sink = -p.verticalSpeed;
      if (sink < 1.5 && p.damage === 0) {
        game.landingRating = 'Butter smooth';
        score += 600;
      } else if (sink < 3) {
        game.landingRating = 'Firm but fair';
        score += 300;
      } else {
        game.landingRating = 'A bit of a thump';
        score += 100;
      }
      if (game.ringIndex === game.rings.length && game.rings.length > 0) {
        game.missionComplete = true;
        score += 500;
      }
      score += Math.max(0, Math.round(p.fuel)) * 4;
      score += Math.max(0, 240 - Math.floor(game.elapsed)) * 2;
    }
    score -= Math.round(p.damage) * 3;
    game.score = Math.max(0, score);
    // Best score per mission, kept on this machine.
    if (game.mission && landed) {
      const key = game.mission.id;
      if (!game.best[key] || game.score > game.best[key]) {
        game.best[key] = game.score;
        saveBest(game.best);
      }
    }
  };

  // One frame of game logic. `ctl` is the polled input, `dt` seconds.
  game.update = (ctl, dt) => {
    game.time += dt;
    // A staged screenshot freezes the plane in place; the prop still spins.
    if (game.shotFreeze) return;
    if (game.state === 'briefing') {
      if (game.time - game.briefAt > 0.5 && (ctl.pitch !== 0 || ctl.roll !== 0 || ctl.throttle !== 0)) {
        game.state = 'flying';
        game.say(game.mission.brief, '#eaf6ff');
      }
      return;
    }
    if (game.state !== 'flying') return;
    game.elapsed += dt;

    const gust = game.wind > 0 ? game.gustNoise(game.time * 0.35) * game.wind : 0;
    const event = stepPlane(game.plane, ctl, game.world, game.strips, dt, game.wind * 0.4, gust);
    const p = game.plane;
    game.stalled = p.speed < 33 && p.airborne;

    if (event === 'airborne') game.say('Airborne — gear up, flaps up, enjoy the islands.', '#58d68d');
    if (event === 'hard') {
      game.say('Hard landing — the airframe took a knock.', '#ffb52e');
      p.damage = Math.min(100, p.damage);
    }

    // Rings: crossing the next ring's plane inside its radius scores it.
    if (game.ringIndex < game.rings.length) {
      const ring = game.rings[game.ringIndex];
      if (crossedRing(p, game.prevZ, ring)) {
        game.ringIndex++;
        game.score += 1000;
        game.audio?.chime(true);
        game.say(game.ringIndex === game.rings.length ? 'All rings flown — now land at the strip.' : `Ring ${game.ringIndex} of ${game.rings.length} — nice flying.`, '#58d68d');
      }
    }
    game.prevZ = p.z;

    // Time limit (Storm Run): out of time ends the flight as a crash of sorts.
    if (game.timeLimit > 0 && game.elapsed > game.timeLimit && !p.landed) {
      p.crashed = true;
      p.crashCause = 'Out of time — the storm closed in.';
      game.finishFlight(false);
      return;
    }
    if (p.landed) {
      game.finishFlight(true);
      game.audio?.chime(true);
      return;
    }
    if (p.crashed) {
      game.finishFlight(false);
      game.audio?.chime(false);
      return;
    }
    // Fuel warnings at the quarter mark.
    if (p.fuel < 25 && p.fuel > 24.5) game.say('Fuel low — plan your landing now.', '#ffb52e');
    if (p.fuel <= 0 && !game.saidGlide) {
      game.saidGlide = true;
      game.say('Engine out — glide her down, pick a strip.', '#ff5d4d');
    }
  };

  return game;
}
