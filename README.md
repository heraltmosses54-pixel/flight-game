# SKY POST — Island Air Mail

[![make.fun entry](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/heraltmosses54-pixel/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/heraltmosses54-pixel/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete original flight game that runs offline in a desktop browser from
its own files — no library, no network request, just vanilla JavaScript and
a 2D canvas. You fly a little red mail plane, SP-07, across a warm island
chain: take off from a grass strip, thread the gold rings, mind the fuel
gauge, and put her down gently on the far strip. The camera chases the
plane over the sea, the fields, the town and the lighthouse, with a lit HUD
showing airspeed, altitude, heading, fuel, damage and throttle.

## Missions

1. **First Delivery** — take off from Home Strip, fly three rings, land at
   Coral Strip.
2. **Island Hop** — three drops across the chain on a tight tank. Fuel is
   the mission.
3. **Storm Run** — six rings in a gusting crosswind on low fuel, against
   the clock.
4. **Free Flight** — no rings, no timer. Just you and the islands.

## How to play

Serve `game/` with any static server and open it in desktop Chrome, or
open `game/index.html` through a local server.

- **W / S** — throttle up / down (mouse wheel works too)
- **Arrow Up / Down** — pitch up / down
- **Arrow Left / Right** (or A / D) — bank left / right; a banked wing
  turns the plane
- **Mouse drag** — steer with the mouse; hold and move to bank and pitch
- **1–4** — pick a mission from the menu · **Enter** — start
- **P** — pause · **R** — restart the mission · **M** — mute · **Q** — back
  to the mission list (from an end screen) · **Esc** — menu

## Flying it well

Speed is life: below about 33 m/s the wing stalls, the nose drops and the
controls go mushy — push the nose down and add power. A banked turn bleeds
speed, so throttle discipline matters in the Storm Run. Land slow, wings
level, sinking under 4 m/s, on a strip: the sea, the hills and the trees
are not runways. Running the tank dry kills the engine and leaves you
gliding, so plan the landing early.

## How it is built

- `game/src/config.js` — constants, palette and mission definitions
- `game/src/rng.js` — seeded random and value noise (deterministic islands)
- `game/src/world.js` — the island chain, strips, town, lighthouse, clouds
- `game/src/physics.js` — the flight model: lift, stall, wind, landings
- `game/src/render.js` — the pseudo-3D chase view: sky, sea, ground, rings
- `game/src/hud.js` — tapes, gauges, attitude ball, menus and end screens
- `game/src/game.js` — states, missions, rings, scoring, messages
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised engine, wind and chimes (Web Audio)
- `game/src/shots.js` — deterministic screenshot staging (`?shot=…`)
- `game/src/main.js` — boot and the main loop

Screenshots in `screenshots/` are real renders of the game's own code in a
headless browser against a local static server, staged with `?shot=` and a
fixed seed.
