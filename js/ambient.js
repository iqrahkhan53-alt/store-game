// Lightweight procedural ambience & Web Audio SFX system
const AmbientCity = (() => {
  let context, master, started = false;

  function getAudioContext() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) context = new AudioContextClass();
    }
    if (context && context.state === 'suspended') {
      context.resume();
    }
    return context;
  }

  function start() {
    if (started) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      master = ctx.createGain();
      const currentVol = (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.volume !== undefined)
        ? GameState.raw.volume : 0.7;
      master.gain.value = 0.05 * currentVol;
      master.connect(ctx.destination);

      const hum = ctx.createOscillator();
      hum.type = 'sine'; hum.frequency.value = 58;
      const humGain = ctx.createGain(); humGain.gain.value = 0.28;
      hum.connect(humGain).connect(master); hum.start();

      const air = ctx.createOscillator();
      air.type = 'triangle'; air.frequency.value = 122;
      const airGain = ctx.createGain(); airGain.gain.value = 0.06;
      air.connect(airGain).connect(master); air.start();
      started = true;
    } catch (e) {
      console.warn('AudioContext init delayed:', e);
    }
  }

  function setVolume(v) {
    const val = Math.max(0, Math.min(1, parseFloat(v) || 0));
    if (master && context) {
      master.gain.setValueAtTime(0.05 * val, context.currentTime);
    }
  }

  return { start, setVolume, getAudioContext };
})();

// Sound Effects Engine (Procedural Synths)
const SFX = (() => {
  function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    try {
      const ctx = AmbientCity.getAudioContext();
      if (!ctx) return;
      const vol = (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.volume !== undefined)
        ? GameState.raw.volume : 0.7;
      if (vol <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playCash() {
    try {
      const ctx = AmbientCity.getAudioContext();
      if (!ctx) return;
      const vol = (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.volume !== undefined) ? GameState.raw.volume : 0.7;
      if (vol <= 0) return;

      // Double-note chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine'; osc1.frequency.setValueAtTime(987.77, now); // B5
      osc2.type = 'triangle'; osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (e) {}
  }

  function playBeep() {
    playTone(1046.50, 0.08, 'square', 0.12);
  }

  function playPickup() {
    try {
      const ctx = AmbientCity.getAudioContext();
      if (!ctx) return;
      const vol = (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.volume !== undefined) ? GameState.raw.volume : 0.7;
      if (vol <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.25 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  function playStock() {
    try {
      const ctx = AmbientCity.getAudioContext();
      if (!ctx) return;
      const vol = (typeof GameState !== 'undefined' && GameState.raw && GameState.raw.volume !== undefined) ? GameState.raw.volume : 0.7;
      if (vol <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (e) {}
  }

  function playClick() {
    playTone(600, 0.04, 'sine', 0.08);
  }

  function playSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 0.2, 'triangle', 0.15), idx * 70);
    });
  }

  function playError() {
    playTone(150, 0.22, 'sawtooth', 0.15);
  }

  return { playCash, playBeep, playPickup, playStock, playClick, playSuccess, playError };
})();

