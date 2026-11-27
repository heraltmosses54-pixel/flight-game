// Screenshot staging: ?shot=<name>&seed=<n> puts the game in a fixed,
// photogenic state so the screenshots are real renders of the game code,
// taken the same way every time. Used only for the hand-in screenshots;
// players never see it.

// The four shots the entry hands in.
export const SHOT_NAMES = ['1-cover', '2-rings', '3-landing', '4-storm'];

export function shotFromUrl(url) {
  const q = new URL(url).searchParams;
  const shot = q.get('shot');
  if (!shot) return null;
  const seed = Number(q.get('seed') || 7);
  return { shot, seed };
}

// Put the game in the staged state for one named shot.
export function stageShot(game, shot, seed) {
  const set = (missionIndex, plane) => {
    game.startMission(missionIndex);
    Object.assign(game.plane, plane);
    game.state = 'flying';
    game.messages = [];
    game.time = 0;
    game.elapsed = 12;
    game.prevZ = game.plane.z - 1;
    game.view = 'chase';
    game.lighting = 'day';
    // Freeze the plane where it is staged: the screenshot is the exact scene.
    game.shotFreeze = true;
  };
  if (shot === '1-cover') {
    // Golden-hour cockpit view over the river valley: the plane sits just
    // west of the river (x~60 at z~1250), the river and jungle gorge walls
    // reading ahead, the first ring big ahead and six lit gauges on the panel.
    set(0, { x: 45, y: 78, z: 1150, heading: 0.1, pitch: 0.09, roll: 0.18, speed: 55, throttle: 0.85, fuel: 96, verticalSpeed: 4.5 });
    game.view = 'cockpit';
    game.lighting = 'golden';
    game.score = 2400;
    game.combo = 2;
    game.comboTimer = 9;
    game.elapsed = 42;
    game.say('First Delivery — ring 1 of 3 ahead', '#eaf6ff');
  } else if (shot === '2-rings') {
    // Volcano Survey: chasing the first ring around the crater of
    // Gunung Api — staged low and east of the cone, looking up at it:
    // the dark lava cone and its smoke plume fill the frame behind
    // the gold ring, HUD lit, the plane banking into the turn.
    set(4, { x: -700, y: 180, z: 10200, heading: -1.85, pitch: 0.06, roll: -0.2, speed: 58, throttle: 0.7, fuel: 62, verticalSpeed: 2 });
    game.ringIndex = 0;
    game.score = 1600;
    game.combo = 1;
    game.elapsed = 54;
    game.say('Volcano Survey — ring 1 of 4 around the crater', '#ffb52e');
  } else if (shot === '3-landing') {
    // The LANDED end screen at Coral Strip: all 3 rings done, the plane
    // on the runway, and the "GREASED IT" verdict card on the panel.
    // The runway scene stays behind the dimmed end panel (chase view).
    set(0, { x: 3, y: game.world.groundHeight(3, 6000), z: 6000, heading: 0, pitch: 0, roll: 0, speed: 33, throttle: 0, fuel: 71, verticalSpeed: -1.4 });
    game.ringIndex = 3;
    game.score = 4100;
    game.ringScore = 3400;
    game.combo = 3;
    game.comboTimer = 8;
    game.elapsed = 128;
    game.landingMetrics = { speedKt: 64, sink: 1.4, offset: 3 };
    game.landingVerdict = 'GREASED IT';
    game.finishFlight(true);
    // finishFlight does not touch these; re-apply so the staged values win.
    game.landingMetrics = { speedKt: 64, sink: 1.4, offset: 3 };
    game.landingVerdict = 'GREASED IT';
    game.view = 'chase';
    game.say('All rings done — down safely at Coral Strip', '#eaf6ff');
  } else if (shot === '4-storm') {
    // Storm Run in the squall: dark storm sky, rain streaks, a gold ring
    // ahead in the murk, the plane pushing through gusting wind. This is
    // the shot that shows the weather — all other shots are fair weather.
    set(2, { x: -220, y: 90, z: 1000, heading: 0.02, pitch: 0.04, roll: 0.1, speed: 62, throttle: 0.8, fuel: 52, verticalSpeed: 3 });
    game.ringIndex = 0;
    game.score = 1200;
    game.combo = 1;
    game.elapsed = 36;
    // A lightning strike mid-flash, frozen in the shot: the bolt and
    // the lit sky are what make the storm read as a storm.
    game.flash = 0.5;
    game.boltSeed = 2;
    game.say('Storm Run — ring 1 of 6 through the squall', '#ffb52e');
  } else {
    return false;
  }
  return true;
}
