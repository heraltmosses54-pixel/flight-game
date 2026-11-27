// The flight model: an arcade plane with throttle, pitch and bank, lift,
// stall, wind and ground contact. Everything is in metres, seconds and
// radians; the plane is a point with a heading, a pitch and a roll.

import { FLIGHT, LANDING, FUEL, DAMAGE } from './config.js';

// A fresh plane on a strip, engines off.
export function makePlane(start) {
  return {
    x: start.x,
    y: start.y,
    z: start.z,
    heading: start.heading,
    pitch: 0,
    roll: 0,
    speed: start.speed,
    throttle: start.throttle,
    fuel: start.fuel,
    damage: 0,
    verticalSpeed: 0,
    flaps: false, // flaps down (F key): slower stall, more drag
    onGround: start.speed === 0,
    airborne: false,
    landed: false,
    crashed: false,
    crashCause: '',
  };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

// One physics step. `ctl` is { pitch: -1..1, roll: -1..1, throttle: -1..1,
// brake: 0..1 } (pitch +1 climbs, roll +1 banks right). `wind` is the
// crosswind in m/s and `gust` its momentary extra push. Returns an event
// string or ''.
export function stepPlane(plane, ctl, world, strips, dt, wind, gust) {
  if (plane.crashed || plane.landed) return '';

  // Throttle: fuel out means the engine is dead and the plane glides.
  if (plane.fuel <= 0) plane.throttle = 0;
  else plane.throttle = clamp(plane.throttle + ctl.throttle * FLIGHT.throttleRate * dt, 0, 1);

  // Fuel drains with the throttle.
  plane.fuel = Math.max(0, plane.fuel - (FUEL.drainIdle + plane.throttle * FUEL.drainFull) * dt);

  // Speed chases the throttle setting; drag keeps the top end honest.
  // Flaps cost top speed; the brake (Space) costs more in the air.
  let target = FLIGHT.minSpeed + plane.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
  if (plane.flaps) target -= FLIGHT.flapsDrag;
  if (ctl.brake && !plane.onGround) target -= FLIGHT.brakeDrag;
  target = Math.max(18, target);
  plane.speed = lerp(plane.speed, target, 1 - Math.exp(-0.55 * dt));
  if (plane.fuel <= 0) plane.speed = lerp(plane.speed, 26, 1 - Math.exp(-0.3 * dt));

  // Bank and pitch ease toward the stick.
  const rollTarget = ctl.roll * FLIGHT.maxRoll;
  const pitchTarget = ctl.pitch * FLIGHT.maxPitch;
  plane.roll = lerp(plane.roll, rollTarget, 1 - Math.exp(-FLIGHT.rollRate * dt));
  plane.pitch = lerp(plane.pitch, pitchTarget, 1 - Math.exp(-FLIGHT.pitchRate * dt));

  // A banked wing turns the plane; a stalled wing barely answers.
  // Banking right (positive roll) turns the nose right: heading grows.
  // Flaps down lower the stall speed, so the wing keeps flying slower.
  const stallSpeed = plane.flaps ? FLIGHT.stallFlaps : FLIGHT.stallSpeed;
  const stalled = plane.speed < stallSpeed && plane.y > world.groundHeight(plane.x, plane.z) + 2;
  const authority = stalled ? 0.35 : 1;
  plane.heading += Math.tan(plane.roll) * (FLIGHT.gravity / Math.max(plane.speed, 18)) * authority * dt;

  // Climb and sink: pitch sets the vertical speed, stall adds a drop.
  let vs = plane.speed * Math.sin(plane.pitch) * authority;
  if (stalled) vs -= (stallSpeed - plane.speed) * 0.55;
  // Ground effect softens the last metres of a landing.
  const ground = world.groundHeight(plane.x, plane.z);
  if (plane.y - ground < FLIGHT.groundEffect && vs < 0) vs *= 0.55;
  plane.verticalSpeed = vs;
  plane.y += vs * dt;

  // Move over the ground, pushed sideways by wind and gusts.
  const forward = plane.speed * Math.cos(plane.pitch);
  plane.x += Math.sin(plane.heading) * forward * dt + (wind + gust) * dt;
  plane.z += Math.cos(plane.heading) * forward * dt;

  // Rolling on the ground: drag slows the plane, steering is gentle.
  // The wheel brakes (Space) shed speed much faster, for a short-field stop.
  if (plane.y <= ground + 0.4 && plane.speed < 12 && !plane.airborne) {
    plane.y = ground;
    plane.speed = Math.max(0, plane.speed - (ctl.brake ? FLIGHT.brakeGround : 6) * dt);
    plane.onGround = true;
  } else {
    plane.onGround = false;
  }

  // Leaving the ground: once fast enough with the nose up, we fly.
  // Flaps down let her rotate slower, like a real bush plane.
  const rotateSpeed = plane.flaps ? 30 : 34;
  if (!plane.airborne && plane.speed > rotateSpeed && plane.pitch > 0.04 && plane.y > ground + 1) {
    plane.airborne = true;
    return 'airborne';
  }

  // Touching the ground: a gentle touchdown near a strip's centreline is a
  // landing (the flat grass beside the pavement counts, just less pretty);
  // a survivable knock on the flat ground is a hard landing with damage;
  // anything else — sea, hills, trees, too fast or too steep — is a crash.
  if (plane.y <= ground + 0.2 && plane.airborne) {
    const zone = strips.find((s) => Math.abs(plane.x - s.x) < 30 && plane.z > s.z - 450 && plane.z < s.z + 450);
    const flat = strips.find((s) => Math.abs(plane.x - s.x) < 90 && plane.z > s.z - 450 && plane.z < s.z + 450);
    const sink = -plane.verticalSpeed;
    const gentle = sink <= LANDING.maxSink && plane.speed <= LANDING.maxSpeed && Math.abs(plane.roll) <= LANDING.maxRoll;
    if (zone && gentle) {
      plane.landed = true;
      plane.y = ground;
      plane.pitch = 0;
      plane.roll = 0;
      return 'landed';
    }
    if (flat && sink <= 9 && plane.speed <= 70) {
      // A hard knock: bounce, take damage, keep flying if the wing holds.
      plane.damage += DAMAGE.hardLanding;
      plane.y = ground + 3;
      plane.verticalSpeed = 2.5;
      plane.pitch = 0.08;
      if (plane.damage >= 100) {
        plane.crashed = true;
        plane.damage = 100;
        plane.crashCause = 'airframe broke up';
        return 'crashed';
      }
      return 'hard';
    }
    plane.crashed = true;
    plane.damage = 100;
    plane.crashCause = ground < 1.5 ? 'ditched in the sea' : 'hit the ground';
    return 'crashed';
  }

  // The sea is always a crash, and so is flying past the edge of the world.
  if (plane.y <= 0.5 && ground < 1.5 && plane.airborne) {
    plane.crashed = true;
    plane.damage = 100;
    plane.crashCause = 'ditched in the sea';
    return 'crashed';
  }
  if (plane.z > 11800 || plane.z < -600 || Math.abs(plane.x) > 2400) {
    plane.crashed = true;
    plane.damage = 100;
    plane.crashCause = 'flew out of the charted area';
    return 'crashed';
  }
  if (plane.damage >= 100) {
    plane.crashed = true;
    plane.crashCause = 'airframe broke up';
    return 'crashed';
  }
  return '';
}

// Distance in metres from the plane to a point.
export function distanceTo(plane, p) {
  const dx = plane.x - p.x;
  const dy = plane.y - p.y;
  const dz = plane.z - p.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// True when the plane has just flown through a ring (crossed its plane
// inside its radius, moving forward).
export function crossedRing(plane, prevZ, ring) {
  if (prevZ < ring.z && plane.z >= ring.z) {
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    return Math.sqrt(dx * dx + dy * dy) <= ring.r;
  }
  return false;
}
