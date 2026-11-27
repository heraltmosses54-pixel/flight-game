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
4. **Supply Run** — three island drop zones. Fly low over each ring and
   press **B** to drop a parachute crate: bullseye (within 6 m) pays 500,
   the inner band 300, the outer ring 150. Supply all three, then land at
   Far Strip.
5. **Volcano Survey** — circle the crater of Gunung Api, the smoking
   volcano west of Far Strip: four rings around the rim, high over the
   lava rock, then land at Far Strip.
6. **Free Flight** — no rings, no timer. Just you and the islands.

## How to play

Serve `game/` with any static server and open it in desktop Chrome, or
open `game/index.html` through a local server.

- **W / S** — throttle up / down (mouse wheel works too)
- **Arrow Up / Down** — pitch up / down
- **Arrow Left / Right** (or A / D) — bank left / right; a banked wing
  turns the plane
- **Mouse drag** — steer with the mouse; hold and move to bank and pitch
- **B** — drop a supply crate (Supply Run; only in the air, over a zone)
- **F** — flaps down / up: slower stall and a shorter landing, at the
  cost of top speed
- **Space** — brakes: wheel brakes on the ground, airbrake in the air
- **1–5** — pick a mission from the menu · **6** — free flight ·
  **Enter** — start
- **7–9** — buy upgrades with gold (menu only)
- **P** — pause · **R** — restart the mission · **M** — mute · **Q** — back
  to the mission list (from an end screen) · **Esc** — menu

## Flying it well

Speed is life: below about 33 m/s the wing stalls, the nose drops and the
controls go mushy — push the nose down and add power. Flaps (**F**) buy
you a slower stall (28 m/s) for a short-field landing, at the cost of top
speed; **Space** brakes on the runway and works as an airbrake in the
air. A banked turn bleeds speed, so throttle discipline matters in the
Storm Run. Land slow, wings
level, sinking under 4 m/s, on a strip: the sea, the hills and the trees
are not runways. Running the tank dry kills the engine and leaves you
gliding, so plan the landing early. On a Supply Run, drop low and slow:
a crate keeps some of your forward speed under its chute and drifts with
the wind, so release a little before the ring — about a second's flying
time ahead at approach speed — and watch the dust where it lands.

## Career, gold and upgrades

Every finished flight banks gold and a rank letter, saved on this machine
(localStorage key `skypost-career`):

- **Gold** — `score / 25`, plus 50 for landing and 100 more for completing
  the mission. Spend it on the menu with keys **7**, **8** and **9**.
- **Rank** — scored against each mission's par: **S** at par, **A** at 80%
  of par, **B** at 60%, otherwise **C**. The best rank per mission is kept.
- **Fuel Tank (7)** — +25 fuel capacity per level (100 → 125 → 150 → 175).
  Costs 150 / 350 / 600 gold.
- **Climb Kit (8)** — +10% pitch response per level, so the nose answers
  the stick harder. Costs 150 / 350 / 600 gold.
- **Tough Hull (9)** — 25% less damage from each hard landing, per level.
  Costs 150 / 350 / 600 gold.

The menu shows your gold, flights, landings and best ranks; the end screen
shows the flight's rank, the gold it earned and your career totals.

## How it is built

- `game/src/config.js` — constants, palette and mission definitions
- `game/src/rng.js` — seeded random and value noise (deterministic islands)
- `game/src/world.js` — the island chain, strips, town, lighthouse, clouds,
  the Papua river gorge and the volcano Gunung Api with its smoke plume
- `game/src/physics.js` — the flight model: lift, stall, wind, landings,
  flaps and brakes
- `game/src/render.js` — the pseudo-3D chase view: sky, sea, ground, rings
- `game/src/hud.js` — tapes, gauges, attitude ball, menus and end screens
- `game/src/game.js` — states, missions, rings, supply drops, scoring, messages
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised engine, wind and chimes (Web Audio)
- `game/src/shots.js` — deterministic screenshot staging (`?shot=…`)
- `game/src/main.js` — boot and the main loop

Screenshots in `screenshots/` are real renders of the game's own code in a
headless browser against a local static server, staged with `?shot=` and a
fixed seed.
