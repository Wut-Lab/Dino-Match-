/*
 * Background music, made live in code (Web Audio, no audio files).
 *
 * The menu and each game pick one of the TRACKS at random. A track is about
 * a minute long and loops. Music follows the Background Music volume in the
 * All Sounds menu, pauses while the page is hidden, and dips quieter while
 * the game is speaking.
 *
 * How a track is written:
 *   bpm       speed in beats per minute
 *   steps     eighth notes per bar (8 = 4/4 time, 6 = 3/4 waltz)
 *   lead      the tune's instrument (see voice() below)
 *   bass      one token per step: R root, 5 fifth, O root an octave up, . rest
 *   chords    one token per step: x short chord pluck, P soft chord held for
 *             the bar, . nothing
 *   drums     one token per step: k kick, s snare, t tick, . nothing
 *   sections  named 8-bar parts; each bar is [chord, tune]. The tune has one
 *             token per step: a note like C5 or F#4, - to hold, . for silence
 *   form      the order the sections play in
 */
(function (DM) {
  'use strict';

  const TRACKS = [
    {
      name: 'Dino Stomp',
      bpm: 120,
      steps: 8,
      lead: { type: 'square', vol: 0.05, filter: 1800 },
      bass: 'R . 5 . O . 5 .',
      chords: '. . x . . . x .',
      drums: 'k . s . k . s .',
      sections: {
        A: [
          ['C', 'C5 - E5 - G5 - E5 -'],
          ['F', 'F5 - A5 - G5 - F5 -'],
          ['G', 'E5 - D5 - G4 - B4 -'],
          ['C', 'C5 - - - . . G4 -'],
          ['C', 'C5 - E5 - G5 - C6 -'],
          ['F', 'A5 - G5 - F5 - A5 -'],
          ['G7', 'G5 - F5 - D5 - B4 -'],
          ['C', 'C5 - - - . . . .'],
        ],
        B: [
          ['Am', 'A4 - C5 - E5 - C5 -'],
          ['F', 'F5 - E5 - D5 - C5 -'],
          ['C', 'E5 - G5 - - - E5 -'],
          ['G', 'D5 - - - B4 - . .'],
          ['Am', 'A4 - C5 - E5 - A5 -'],
          ['F', 'A5 - G5 - F5 - E5 -'],
          ['G', 'D5 - E5 - F5 - D5 -'],
          ['G7', 'G5 - . . G4 - B4 -'],
        ],
      },
      form: ['A', 'A', 'B', 'A'],
    },
    {
      name: 'Fern Waltz',
      bpm: 150,
      steps: 6,
      lead: { type: 'sine', vol: 0.09, pluck: true, sparkle: true },
      bass: 'R . . . . .',
      chords: '. . x . x .',
      drums: '. . . . . .',
      sections: {
        A: [
          ['F', 'A4 - C5 - F5 -'],
          ['Bb', 'D5 - - - Bb4 -'],
          ['F', 'C5 - A4 - F4 -'],
          ['C', 'G4 - - - - -'],
          ['F', 'A4 - C5 - F5 -'],
          ['Bb', 'F5 - G5 - D5 -'],
          ['C', 'C5 - E5 - G4 -'],
          ['F', 'F4 - - - - -'],
        ],
        B: [
          ['Dm', 'F5 - E5 - D5 -'],
          ['Gm', 'D5 - Bb4 - G4 -'],
          ['C', 'C5 - D5 - E5 -'],
          ['F', 'F5 - - - C5 -'],
          ['Dm', 'A5 - G5 - F5 -'],
          ['Gm', 'Bb5 - A5 - G5 -'],
          ['C', 'E5 - G5 - E5 -'],
          ['C7', 'C5 - - - . .'],
        ],
      },
      form: ['A', 'A', 'B', 'A', 'B', 'A'],
    },
    {
      name: 'Lava Hop',
      bpm: 132,
      steps: 8,
      lead: { type: 'triangle', vol: 0.11 },
      bass: 'R O R O R O R O',
      chords: 'P . . . . . . .',
      drums: 'k . s . k k s .',
      sections: {
        A: [
          ['G', 'G4 . B4 . D5 - B4 .'],
          ['Em', 'E5 . G5 . E5 - B4 .'],
          ['C', 'C5 . E5 . G5 - E5 .'],
          ['D', 'D5 - F#5 - A5 - - -'],
          ['G', 'G5 . F#5 . G5 - D5 .'],
          ['Em', 'E5 . D5 . B4 - G4 .'],
          ['D', 'A4 - B4 - C5 - F#4 -'],
          ['G', 'G4 - - - . . . .'],
        ],
        B: [
          ['C', 'E5 - E5 . G5 - E5 .'],
          ['D', 'F#5 - F#5 . A5 - F#5 .'],
          ['Bm', 'D5 - B4 - F#4 - B4 -'],
          ['Em', 'E5 - - - G5 - - -'],
          ['Am', 'C5 - A4 - C5 - E5 -'],
          ['D', 'D5 - F#5 - A5 - F#5 -'],
          ['G', 'G5 - - - D5 - B4 -'],
          ['D7', 'A4 - C5 - F#5 - A5 -'],
        ],
      },
      form: ['A', 'A', 'B', 'A'],
    },
  ];

  const VOLUME = 0.55;  // music level at full volume, under the sound effects
  const DUCKED = 0.35;  // share of VOLUME left while the game is talking
  const LOOKAHEAD = 0.2; // seconds of music scheduled ahead of time

  // ---- Notes and chords ----
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // "C5", "F#4", "Bb4" -> MIDI note number
  function noteMidi(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) throw new Error(`Bad note "${name}"`);
    return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }

  // "C", "Am", "G7", "Bb" -> root MIDI note (in the given octave) and chord notes
  function chord(name, octave) {
    const m = /^([A-G][#b]?)(m|7)?$/.exec(name);
    if (!m) throw new Error(`Bad chord "${name}"`);
    const root = noteMidi(m[1] + octave);
    const shape = m[2] === 'm' ? [0, 3, 7] : m[2] === '7' ? [0, 4, 7, 10] : [0, 4, 7];
    return { root, notes: shape.map((i) => root + i) };
  }

  // Turn a track into a flat list of bars, each with its tune notes worked out.
  function compile(track) {
    const toks = (s) => s.trim().split(/\s+/);
    const bars = [];
    for (const sec of track.form) {
      for (const [ch, tune] of track.sections[sec]) {
        const t = toks(tune);
        if (t.length !== track.steps) throw new Error(`${track.name} ${sec}: "${tune}" needs ${track.steps} steps`);
        const notes = [];
        t.forEach((tok, i) => {
          if (tok === '-' || tok === '.') return;
          let len = 1;
          while (t[i + len] === '-') len++;
          notes.push({ step: i, midi: noteMidi(tok), len });
        });
        bars.push({ bass: chord(ch, 3), pad: chord(ch, 4), notes });
      }
    }
    return {
      track,
      bars,
      step: 60 / track.bpm / 2,
      bass: toks(track.bass),
      chords: toks(track.chords),
      drums: toks(track.drums),
    };
  }

  const Music = {
    want: false,    // a game is on, so music should play when it can
    playing: false,
    song: null,
    out: null,      // this playthrough's volume knob (a GainNode)
    timer: null,
    duckId: 0,
    ducked: false,

    get ctx() { return DM.Sound.ctx; },

    // Start a random track. Called on the menu and when a game starts.
    start() {
      this.want = true;
      const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
      this.song = compile(track);
      this.halt();
      this.refresh();
    },

    // Fade out and forget the track. Called on the win screen.
    stop() {
      this.want = false;
      this.halt();
    },

    // Play or pause to match the volume setting and whether the page is visible.
    refresh() {
      const ok = this.want && this.song && DM.Sound.level('music') > 0 && this.ctx && !document.hidden;
      if (ok && !this.playing) this.play();
      else if (!ok && this.playing) this.halt();
    },

    play() {
      const c = this.ctx;
      this.out = c.createGain();
      this.out.gain.setValueAtTime(0.0001, c.currentTime);
      this.out.gain.exponentialRampToValueAtTime(this.target(), c.currentTime + 1);
      this.out.connect(c.destination);
      this.playing = true;
      this.bar = 0;
      this.stepIdx = 0;
      this.next = c.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 50);
      this.schedule();
    },

    halt() {
      if (!this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      const out = this.out;
      const t = this.ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => out.disconnect(), 1500);
    },

    // Quieter while the game talks, so "Find the T-Rex!" is easy to hear.
    // Returns a function that undoes it.
    duck() {
      const id = ++this.duckId;
      this.ducked = true;
      this.applyVolume();
      return () => {
        if (id !== this.duckId) return;
        this.ducked = false;
        this.applyVolume();
      };
    },

    // How loud the music should be right now.
    target() {
      return Math.max(0.0001, VOLUME * DM.Sound.gain('music') * (this.ducked ? DUCKED : 1));
    },

    // Glide to the right loudness after a volume change or ducking, and
    // start or stop if the music was turned up from, or down to, nothing.
    applyVolume() {
      this.refresh();
      if (!this.playing) return;
      const g = this.out.gain;
      const t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(this.target(), t, 0.08);
    },

    // Queue every step that starts within the next LOOKAHEAD seconds.
    schedule() {
      const c = this.ctx;
      const s = this.song;
      // If the timer fell behind (a busy or sleepy device), skip ahead
      // instead of playing a pile-up of late notes all at once.
      if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
      while (this.next < c.currentTime + LOOKAHEAD) {
        this.playStep(s, s.bars[this.bar], this.stepIdx, this.next);
        this.next += s.step;
        if (++this.stepIdx >= s.track.steps) {
          this.stepIdx = 0;
          this.bar = (this.bar + 1) % s.bars.length;
        }
      }
    },

    playStep(s, bar, i, t) {
      const lead = s.track.lead;
      for (const n of bar.notes) {
        if (n.step === i) this.voice(hz(n.midi), t, n.len * s.step * 0.92, lead);
      }
      const b = s.bass[i];
      if (b !== '.') {
        const midi = bar.bass.root + (b === '5' ? 7 : b === 'O' ? 12 : 0);
        this.voice(hz(midi), t, s.step * 0.9, { type: 'triangle', vol: 0.14 });
      }
      const ch = s.chords[i];
      if (ch === 'x') bar.pad.notes.forEach((m) => this.voice(hz(m), t, s.step * 0.8, { type: 'triangle', vol: 0.025, pluck: true }));
      if (ch === 'P') bar.pad.notes.forEach((m) => this.voice(hz(m), t, s.step * s.track.steps, { type: 'sine', vol: 0.03, attack: 0.15 }));
      const d = s.drums[i];
      if (d === 'k') this.kick(t);
      if (d === 's') this.noise(t, 0.12, 1800, 0.05);
      if (d === 't') this.noise(t, 0.04, 7000, 0.03);
    },

    // One note. Options: type (wave shape), vol, attack, filter (soften a
    // buzzy wave), pluck (fades like a plucked string), sparkle (adds a soft
    // note an octave up, like a music box).
    voice(freq, t, dur, o) {
      const c = this.ctx;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type;
      osc.frequency.setValueAtTime(freq, t);
      const attack = o.attack || 0.01;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol, t + attack);
      if (o.pluck) {
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.35));
      } else {
        g.gain.setValueAtTime(o.vol, t + Math.max(attack, dur - 0.05));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      }
      let node = osc;
      if (o.filter) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = o.filter;
        node = node.connect(f);
      }
      node.connect(g).connect(this.out);
      osc.start(t);
      osc.stop(t + Math.max(dur, 0.35) + 0.1);
      if (o.sparkle) this.voice(freq * 2, t, dur, { type: 'sine', vol: o.vol * 0.25, pluck: true });
    },

    kick(t) {
      const c = this.ctx;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g).connect(this.out);
      osc.start(t);
      osc.stop(t + 0.2);
    },

    noise(t, dur, highpass, vol) {
      const c = this.ctx;
      if (!this.noiseBuf) {
        this.noiseBuf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = highpass;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.out);
      src.start(t);
      src.stop(t + dur + 0.02);
    },
  };

  document.addEventListener('visibilitychange', () => Music.refresh());

  DM.Music = Music;
  DM.MUSIC_TRACKS = TRACKS;
})(window.DinoMatch = window.DinoMatch || {});
