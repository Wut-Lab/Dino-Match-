/*
 * Tiny synth sound effects (Web Audio, no audio files) plus spoken prompts
 * via the browser's speech synthesis so pre-readers hear the dino's name.
 *
 * There are three kinds of sound, each with its own volume and mute:
 * 'voice' (spoken prompts), 'music' (js/music.js) and 'sfx' (effects).
 */
(function (DM) {
  'use strict';

  const Sound = {
    ctx: null,
    sfxOut: null, // volume knob for all sound effects
    levels: { voice: 1, music: 1, sfx: 1 }, // 0 to 1
    muted: { voice: false, music: false, sfx: false },

    // Browsers only allow audio after a user gesture, so call this from one.
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.ctx = new AC();
          this.sfxOut = this.ctx.createGain();
          this.sfxOut.gain.value = this.gain('sfx');
          this.sfxOut.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    // How loud a kind of sound is right now, 0 to 1 (0 when muted).
    level(kind) {
      return this.muted[kind] ? 0 : this.levels[kind];
    },

    // Slider position -> loudness. Squaring makes the slider feel even.
    gain(kind) {
      const v = this.level(kind);
      return v * v;
    },

    setLevel(kind, v) {
      this.levels[kind] = v;
      this.apply(kind);
    },

    setMuted(kind, on) {
      this.muted[kind] = on;
      this.apply(kind);
    },

    apply(kind) {
      if (kind === 'sfx' && this.sfxOut) this.sfxOut.gain.setTargetAtTime(this.gain('sfx'), this.ctx.currentTime, 0.03);
      if (kind === 'voice' && !this.level('voice') && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (kind === 'music' && DM.Music) DM.Music.applyVolume();
    },

    note(freq, start, dur, type = 'sine', vol = 0.18, slideTo = null) {
      const c = this.ctx;
      const t = c.currentTime + start;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.sfxOut);
      o.start(t);
      o.stop(t + dur + 0.05);
    },

    noise(start, dur, highpass, vol) {
      const c = this.ctx;
      const t = c.currentTime + start;
      if (!this.noiseBuf) {
        this.noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = highpass;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.sfxOut);
      src.start(t);
      src.stop(t + dur + 0.05);
    },

    play(name) {
      if (!this.ctx || !this.level('sfx')) return;
      switch (name) {
        case 'tap':
          this.note(880, 0, 0.08, 'triangle', 0.12);
          break;
        case 'hop':
          this.note(520, 0, 0.12, 'sine', 0.12, 900);
          break;
        case 'correct':
          [523, 659, 784, 1047].forEach((f, i) => this.note(f, i * 0.09, 0.18, 'triangle', 0.16));
          break;
        case 'miss':
          // Wrong dino: a soft "pok-pok", like a ping-pong ball bouncing.
          this.note(760, 0, 0.07, 'sine', 0.22, 420);
          this.note(820, 0.15, 0.05, 'sine', 0.1, 460);
          break;
        case 'wrong':
          this.note(330, 0, 0.28, 'sine', 0.16, 180);
          break;
        case 'golden':
          [1047, 1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => this.note(f, i * 0.07, 0.25, 'sine', 0.1));
          break;
        case 'rustle':
          // A faint, leafy rustle: two short bursts of soft noise.
          this.noise(0, 0.16, 2400, 0.05);
          this.noise(0.12, 0.2, 3000, 0.035);
          break;
        case 'win':
          [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.note(f, i * 0.14, i === 5 ? 0.6 : 0.2, 'triangle', 0.16));
          [262, 392].forEach((f) => this.note(f, 0.7, 0.6, 'sine', 0.1));
          break;
      }
    },

    speak(text) {
      const vol = this.level('voice');
      if (!vol || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.pitch = 1.25;
        u.volume = vol;
        // Dip the music while talking. The timer is a backup for browsers
        // that forget to say when speech has finished.
        const unduck = DM.Music ? DM.Music.duck() : () => {};
        u.onend = u.onerror = unduck;
        setTimeout(unduck, 4000);
        window.speechSynthesis.speak(u);
      } catch (e) { /* speech not available */ }
    },
  };

  DM.Sound = Sound;
})(window.DinoMatch = window.DinoMatch || {});
