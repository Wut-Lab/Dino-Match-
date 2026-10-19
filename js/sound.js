/*
 * Tiny synth sound effects (Web Audio, no audio files) plus spoken prompts
 * via the browser's speech synthesis so pre-readers hear the dino's name.
 */
(function (DM) {
  'use strict';

  const Sound = {
    enabled: true,
    ctx: null,

    // Browsers only allow audio after a user gesture, so call this from one.
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
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
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    },

    play(name) {
      if (!this.enabled || !this.ctx) return;
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
        case 'wrong':
          this.note(330, 0, 0.28, 'sine', 0.16, 180);
          break;
        case 'golden':
          [1047, 1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => this.note(f, i * 0.07, 0.25, 'sine', 0.1));
          break;
        case 'win':
          [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.note(f, i * 0.14, i === 5 ? 0.6 : 0.2, 'triangle', 0.16));
          [262, 392].forEach((f) => this.note(f, 0.7, 0.6, 'sine', 0.1));
          break;
      }
    },

    speak(text) {
      if (!this.enabled || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.pitch = 1.25;
        window.speechSynthesis.speak(u);
      } catch (e) { /* speech not available */ }
    },

    setEnabled(on) {
      this.enabled = on;
      if (!on && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
  };

  DM.Sound = Sound;
})(window.DinoMatch = window.DinoMatch || {});
