// Keyboard and mouse input. The stick is pitch and roll, W/S (and the
// mouse wheel) work the throttle, and the number keys pick missions.

export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    pitch: 0, // -1 down, +1 up
    roll: 0, // -1 left, +1 right
    throttle: 0, // -1 idle, +1 full
    brake: 0, // 1 while Space is held: wheel brakes / airbrake
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    pressed: new Set(), // keys pressed once since the last poll
    wheel: 0, // accumulated wheel throttle steps
  };

  const code = (e) => e.code;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) input.pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.mouseX = e.offsetX;
    input.mouseY = e.offsetY;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheel += e.deltaY < 0 ? 1 : -1;
  }, { passive: false });

  // Read the stick for this frame: keys first, the mouse drag overrides.
  input.poll = () => {
    let pitch = 0;
    let roll = 0;
    let throttle = 0;
    if (keys.has('ArrowUp') || keys.has('KeyI')) pitch += 1;
    if (keys.has('ArrowDown') || keys.has('KeyK')) pitch -= 1;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) roll -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) roll += 1;
    if (keys.has('KeyW') || keys.has('ShiftLeft') || keys.has('ShiftRight')) throttle += 1;
    if (keys.has('KeyS') || keys.has('ControlLeft')) throttle -= 1;
    const brake = keys.has('Space') ? 1 : 0;
    if (input.mouseDown) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      roll = Math.max(-1, Math.min(1, (input.mouseX - cx) / 260));
      pitch = Math.max(-1, Math.min(1, (cy - input.mouseY) / 200));
    }
    if (input.wheel !== 0) {
      throttle += input.wheel * 0.35;
      input.wheel = 0;
    }
    input.pitch = pitch;
    input.roll = roll;
    input.throttle = Math.max(-1, Math.min(1, throttle));
    input.brake = brake;
  };

  // True once for a key pressed since the last poll; clears after reading.
  input.wasPressed = (c) => {
    const hit = input.pressed.has(c);
    input.pressed.delete(c);
    return hit;
  };

  input.clearPressed = () => input.pressed.clear();
  return input;
}
