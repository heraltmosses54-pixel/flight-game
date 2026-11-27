// Particles: cheap world-space puffs — ring bursts, landing dust, crash
// smoke and a faint engine trail. State only; render.js projects and
// draws them, game.js spawns them on events.

export function makeParticles() {
  const parts = {
    list: [],
    // A burst of sparks at a world point (ring crossing).
    burst(x, y, z) {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const up = (i % 5) - 2;
        parts.list.push({
          x, y, z,
          vx: Math.cos(a) * (6 + (i % 4) * 3),
          vy: up * 3,
          vz: Math.sin(a) * (6 + (i % 4) * 3),
          life: 0.9, maxLife: 0.9,
          size: 3.5 + (i % 3) * 1.5,
          color: i % 3 === 0 ? '#ffffff' : '#ffb52e',
        });
      }
      parts.trim();
    },
    // A spreading dust cloud at a world point (touchdown, crash).
    dust(x, y, z, dark = false) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        parts.list.push({
          x: x + Math.cos(a) * 2,
          y: y + 0.5 + (i % 3),
          z: z + Math.sin(a) * 2,
          vx: Math.cos(a) * (3 + (i % 4)),
          vy: 1.0 + (i % 4) * 0.6,
          vz: Math.sin(a) * (3 + (i % 4)) - 2,
          life: 1.4, maxLife: 1.4,
          size: 3 + (i % 4) * 1.5,
          color: dark ? '#4a4a52' : '#cbbd97',
        });
      }
      parts.trim();
    },
    // One faint wisp behind the plane (called a few times a second).
    trail(x, y, z) {
      parts.list.push({
        x, y, z, vx: 0, vy: 0.4, vz: -4,
        life: 0.55, maxLife: 0.55, size: 2.5, color: '#ffffff',
      });
      parts.trim();
    },
    // A wingtip vortex wisp: white, curling off the wing in a hard bank.
    vortex(x, y, z) {
      parts.list.push({
        x, y, z, vx: 0, vy: 0.2, vz: -6,
        life: 0.7, maxLife: 0.7, size: 2, color: '#eaf6ff',
      });
      parts.trim();
    },
    trim() {
      if (parts.list.length > 160) parts.list.splice(0, parts.list.length - 160);
    },
    update(dt) {
      for (const p of parts.list) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy += 0.4 * dt;
        p.life -= dt;
      }
      parts.list = parts.list.filter((p) => p.life > 0);
    },
  };
  return parts;
}
