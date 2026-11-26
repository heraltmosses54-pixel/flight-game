// Synthesised sound: an engine hum, wind noise and small chimes. Everything
// is made with the Web Audio API, so the game ships no audio files.

export function makeAudio() {
  const audio = {
    ctx: null,
    engine: null,
    engineGain: null,
    wind: null,
    windGain: null,
    muted: false,
    started: false,
  };

  // Browsers need a user gesture before audio starts; call from a click or key.
  audio.ensure = () => {
    if (audio.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      // Engine: two detuned sawtooth oscillators through a low-pass filter.
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const o1 = audio.ctx.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = 62;
      const o2 = audio.ctx.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.value = 93;
      o1.connect(filter);
      o2.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.ctx.destination);
      o1.start();
      o2.start();
      audio.engine = [o1, o2];
      // Wind: looped filtered noise from a small generated buffer.
      const len = audio.ctx.sampleRate * 2;
      const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = audio.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const windFilter = audio.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      audio.windGain = audio.ctx.createGain();
      audio.windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(audio.windGain);
      audio.windGain.connect(audio.ctx.destination);
      noise.start();
      audio.wind = noise;
      audio.started = true;
    } catch (err) {
      audio.started = false;
    }
  };

  // Engine pitch follows throttle, wind follows speed.
  audio.update = (throttle, speed, airborne) => {
    if (!audio.started || audio.muted) return;
    const t = audio.ctx.currentTime;
    const base = 46 + throttle * 58;
    audio.engine[0].frequency.setTargetAtTime(base, t, 0.1);
    audio.engine[1].frequency.setTargetAtTime(base * 1.5, t, 0.1);
    audio.engineGain.gain.setTargetAtTime(airborne ? 0.05 + throttle * 0.05 : throttle * 0.05, t, 0.15);
    audio.windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0016), t, 0.2);
  };

  // A short chime: two sine notes, used for rings and landings.
  audio.chime = (good = true) => {
    if (!audio.started || audio.muted) return;
    const t = audio.ctx.currentTime;
    [good ? 660 : 220, good ? 880 : 175].forEach((freq, i) => {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.16, t + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(audio.ctx.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.4);
    });
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.started) {
      const t = audio.ctx.currentTime;
      audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : 0.06, t, 0.05);
      audio.windGain.gain.setTargetAtTime(audio.muted ? 0 : 0.05, t, 0.05);
    }
    return audio.muted;
  };

  return audio;
}
