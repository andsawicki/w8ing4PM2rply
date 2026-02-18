/* ─────────────────────────────────────────────
   W8ing4PM — Chiptune Audio Engine
   Pure Web Audio API — zero external files
   ───────────────────────────────────────────── */

const Audio8bit = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let bgLoopTimeout = null;
  let bgPlaying = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ── Low-level tone generators ── */

  function playTone({ freq = 440, type = 'square', vol = 0.3, dur = 0.1,
                      start = 0, attack = 0.005, decay = 0.05,
                      freqEnd = null, detune = 0 } = {}) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    osc.detune.value = detune;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  function playNoise({ vol = 0.15, dur = 0.05, start = 0, freq = 800, q = 0.5 } = {}) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + start;
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  /* ── Sound Effects ── */

  const SFX = {
    shoot() {
      playTone({ freq: 880, freqEnd: 220, type: 'square', vol: 0.18, dur: 0.08, attack: 0.001 });
    },

    explosion() {
      playNoise({ vol: 0.6, dur: 0.35, freq: 200, q: 0.3 });
      playTone({ freq: 80, freqEnd: 40, type: 'sawtooth', vol: 0.4, dur: 0.3, attack: 0.01 });
    },

    playerHit() {
      playNoise({ vol: 0.5, dur: 0.5, freq: 400, q: 0.2 });
      playTone({ freq: 200, freqEnd: 60, type: 'sawtooth', vol: 0.5, dur: 0.45, attack: 0.01 });
      playTone({ freq: 150, freqEnd: 50, type: 'square', vol: 0.3, dur: 0.5, attack: 0.02, start: 0.05 });
    },

    extraLife() {
      const melody = [523, 659, 784, 1047];
      melody.forEach((f, i) => {
        playTone({ freq: f, type: 'square', vol: 0.25, dur: 0.12, start: i * 0.1, attack: 0.005 });
      });
    },

    levelUp() {
      const notes = [523, 659, 784, 880, 1047, 880, 784, 659, 523];
      notes.forEach((f, i) => {
        playTone({ freq: f, type: 'square', vol: 0.22, dur: 0.1, start: i * 0.08 });
      });
    },

    gameOver() {
      const notes = [440, 392, 349, 330, 294, 262];
      notes.forEach((f, i) => {
        playTone({ freq: f, type: 'sawtooth', vol: 0.3, dur: 0.18, start: i * 0.15, attack: 0.01 });
      });
    },

    pmDrop() {
      // A little "blorp" when PM fires a meeting invite
      playTone({ freq: 300, freqEnd: 150, type: 'triangle', vol: 0.15, dur: 0.12, attack: 0.01 });
    },

    powerup() {
      [523, 784, 1047, 1319].forEach((f, i) => {
        playTone({ freq: f, type: 'triangle', vol: 0.2, dur: 0.15, start: i * 0.09 });
      });
    },

    menuBlip() {
      playTone({ freq: 660, type: 'square', vol: 0.1, dur: 0.05, attack: 0.001 });
    },
  };

  /* ── Background Music ── */
  // Chiptune groove — a looping sequence of notes
  // Inspired by River Raid / early Atari vibes

  const BG_TEMPO = 0.135; // seconds per 16th note

  // Bass line pattern (repeats every 16 steps)
  const BASS_PATTERN = [
    { n: 0, oct: 2 }, { n: 0, oct: 2 }, { n: 12, oct: 2 }, { n: 0, oct: 2 },
    { n: 7, oct: 2 }, { n: 7, oct: 2 }, { n: 5, oct: 2 }, { n: 7, oct: 2 },
    { n: 3, oct: 2 }, { n: 3, oct: 2 }, { n: 10, oct: 2 }, { n: 3, oct: 2 },
    { n: 5, oct: 2 }, { n: 5, oct: 2 }, { n: 5, oct: 2 }, { n: 7, oct: 2 },
  ];

  // Lead melody pattern (16 steps)
  const LEAD_PATTERN = [
    { n: 12, oct: 4, hold: false }, { n: -1 },              { n: 12, oct: 4 }, { n: 15, oct: 4 },
    { n: 19, oct: 4 },              { n: -1 },              { n: 17, oct: 4 }, { n: 15, oct: 4 },
    { n: 10, oct: 4 },              { n: 12, oct: 4 },      { n: -1 },         { n: 10, oct: 4 },
    { n: 7,  oct: 4 },              { n: 10, oct: 4 },      { n: 12, oct: 4 }, { n: -1 },
  ];

  // Arpeggio / chord layer
  const ARP_PATTERN = [
    0, 4, 7, 12,  0, 4, 7, 12,  3, 7, 10, 15,  3, 7, 10, 15,
  ];

  function midiToFreq(note, oct) {
    // note = semitone offset, oct = octave
    return 27.5 * Math.pow(2, (note + oct * 12) / 12);
  }

  function scheduleBar(startTime) {
    const steps = 16;

    for (let i = 0; i < steps; i++) {
      const t = startTime + i * BG_TEMPO;

      // Bass
      const b = BASS_PATTERN[i];
      if (b.n >= 0) {
        const freq = midiToFreq(b.n, b.oct);
        playTone({ freq, type: 'sawtooth', vol: 0.12, dur: BG_TEMPO * 0.7, start: t - ctx.currentTime, attack: 0.01 });
      }

      // Lead
      const l = LEAD_PATTERN[i];
      if (l && l.n >= 0) {
        const freq = midiToFreq(l.n, l.oct);
        playTone({ freq, type: 'square', vol: 0.1, dur: BG_TEMPO * 0.85, start: t - ctx.currentTime, attack: 0.005 });
      }

      // Arp (every 4 steps, offset)
      if (i % 4 === 0) {
        const arpNotes = [ARP_PATTERN[i], ARP_PATTERN[i] + 4, ARP_PATTERN[i] + 7];
        arpNotes.forEach((n, ai) => {
          const freq = midiToFreq(n, 4);
          playTone({ freq, type: 'triangle', vol: 0.06, dur: BG_TEMPO * 0.5,
                     start: t + ai * BG_TEMPO * 0.33 - ctx.currentTime, attack: 0.003 });
        });
      }

      // Kick drum (steps 0 and 8)
      if (i === 0 || i === 8) {
        playNoise({ vol: 0.25, dur: 0.06, freq: 120, q: 0.3, start: t - ctx.currentTime });
        playTone({ freq: 80, freqEnd: 30, type: 'sine', vol: 0.35, dur: 0.1, start: t - ctx.currentTime, attack: 0.002 });
      }

      // Snare (steps 4 and 12)
      if (i === 4 || i === 12) {
        playNoise({ vol: 0.3, dur: 0.08, freq: 900, q: 0.4, start: t - ctx.currentTime });
        playTone({ freq: 220, freqEnd: 110, type: 'triangle', vol: 0.12, dur: 0.08, start: t - ctx.currentTime, attack: 0.002 });
      }

      // Hi-hat (every 2 steps)
      if (i % 2 === 0) {
        playNoise({ vol: 0.08, dur: 0.025, freq: 8000, q: 1.5, start: t - ctx.currentTime });
      }
    }
  }

  const BAR_DURATION = 16 * BG_TEMPO; // seconds per bar

  function bgLoop() {
    if (!bgPlaying) return;
    scheduleBar(ctx.currentTime);
    bgLoopTimeout = setTimeout(bgLoop, BAR_DURATION * 1000 - 50);
  }

  function startBG() {
    if (!ctx || bgPlaying) return;
    bgPlaying = true;
    bgLoop();
  }

  function stopBG() {
    bgPlaying = false;
    clearTimeout(bgLoopTimeout);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      stopBG();
      masterGain.gain.value = 0;
    } else {
      masterGain.gain.value = 0.35;
      startBG();
    }
    return muted;
  }

  function setMuted(val) {
    muted = val;
    if (muted) { stopBG(); masterGain.gain.value = 0; }
    else        { masterGain.gain.value = 0.35; startBG(); }
  }

  return { init, resume, startBG, stopBG, toggleMute, setMuted, SFX, get muted() { return muted; } };
})();
