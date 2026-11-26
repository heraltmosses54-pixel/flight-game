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
    // Freeze the plane where it is staged: the screenshot is the exact scene.
    game.shotFreeze = true;
  };
  if (shot === '1-cover') {
    // Climbing past the home strip with the first ring big ahead, the
    // town and the sea behind: the whole game in one frame.
    set(0, { x: 0, y: 85, z: 1250, heading: 0.03, pitch: 0.09, roll: 0.08, speed: 55, throttle: 0.85, fuel: 96 });
    game.say('First Delivery — ring 1 of 3 ahead', '#eaf6ff');
  } else if (shot === '2-rings') {
    // Right on the second ring: the gold ring fills the view, HUD lit.
    set(0, { x: -140, y: 95, z: 2800, heading: 0.02, pitch: 0.05, roll: -0.08, speed: 58, throttle: 0.7, fuel: 88 });
    game.ringIndex = 1;
    game.say('Ring 2 of 3 — through the gold ring', '#58d68d');
  } else if (shot === '3-landing') {
    // Final approach to Coral Strip: low, slow, runway dead ahead.
    set(0, { x: 4, y: 38, z: 5650, heading: 0, pitch: -0.06, roll: 0.02, speed: 44, throttle: 0.35, fuel: 71 });
    game.ringIndex = 3;
    game.say('All rings done — landing at Coral Strip', '#eaf6ff');
  } else if (shot === '4-storm') {
    // Storm Run mid-slalom: a ring ahead in the gloom, rain falling.
    set(2, { x: -220, y: 100, z: 3400, heading: -0.05, pitch: 0.04, roll: 0.2, speed: 66, throttle: 0.8, fuel: 38 });
    game.ringIndex = 2;
    game.elapsed = 96;
    game.say('Storm Run — ring 3 of 6, fuel getting low', '#ffb52e');
  } else {
    return false;
  }
  return true;
}
