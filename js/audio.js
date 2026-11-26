'use strict';
/* Audio: everything synthesized with WebAudio — zero audio files. */
const AudioSys = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  muted: localStorage.getItem('lulu_muted') === '1',
  seqTimer:null, nextNote:0, step:0, playing:false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = .12;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = .55;
    this.sfxGain.connect(this.master);
    this.startMusic();
  },
  setMuted(m) {
    this.muted = m; localStorage.setItem('lulu_muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, .05);
  },
  /* --- tiny helpers --- */
  tone(freq, dur, {type='sine', vol=.5, dest, slide=0, when=0} = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .008);
    g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + .05);
  },
  noise(dur, {vol=.3, freq=800, when=0} = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },
  /* --- game sfx --- */
  coin(combo) {
    const p = Math.min(combo, 12);
    const f = 740 * Math.pow(2, p / 12);
    this.tone(f, .09, {type:'square', vol:.2});
    this.tone(f * 1.5, .13, {type:'square', vol:.16, when:.05});
    this.tone(f * 3, .09, {type:'sine', vol:.08, when:.02});
  },
  bigCoin() {
    [0,.09,.18,.3].forEach((w,i)=> this.tone(520*Math.pow(2,i/6), .18, {type:'square', vol:.24, when:w}));
  },
  jump() { this.tone(200, .16, {type:'triangle', vol:.5, slide:480}); this.noise(.05,{vol:.08,freq:1400}); },
  land() { this.tone(110, .12, {type:'sine', vol:.5, slide:-50}); this.noise(.08,{vol:.2,freq:500}); },
  whoosh() { this.tone(220, .35, {type:'sawtooth', vol:.09, slide:260}); },
  powerup() { [523,659,784,1047].forEach((f,i)=> this.tone(f,.13,{type:'triangle',vol:.3,when:i*.06})); },
  laugh() {
    for (let i = 0; i < 4; i++) {
      const f = 300 - i * 30;
      this.tone(f, .1, {type:'square', vol:.2, slide:60, when:i*.11});
    }
  },
  milestone() { [659,784,988,1319].forEach((f,i)=> this.tone(f,.2,{type:'square',vol:.22,when:i*.09})); },
  ui() { this.tone(880, .07, {type:'triangle', vol:.25}); },
  /* --- background music: silly loop --- */
  MELODY: [76,0,76,0,79,0,76,0, 74,0,72,0,69,0,71,0, 72,0,76,0,79,0,81,0, 79,0,76,74,72,0,0,0],
  BASS:   [48,0,48,0,53,0,53,0, 50,0,50,0,45,0,45,0, 48,0,48,0,53,0,53,0, 55,0,55,0,50,0,50,0],
  startMusic() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    const SPB = 60 / 132 / 4;  // 16th note at 132 bpm
    this.nextNote = this.ctx.currentTime + .1;
    this.seqTimer = setInterval(() => {
      while (this.nextNote < this.ctx.currentTime + .25) {
        const m = this.MELODY[this.step % 32], b = this.BASS[this.step % 32];
        const when = Math.max(0, this.nextNote - this.ctx.currentTime);
        if (m) this.tone(440*Math.pow(2,(m-69)/12), .16, {type:'square', vol:.07, dest:this.musicGain, when});
        if (b) this.tone(440*Math.pow(2,(b-69)/12), .3, {type:'triangle', vol:.13, dest:this.musicGain, when});
        if (this.step % 4 === 2) this.noise(.03, {vol:.015, freq:6000, when});
        this.nextNote += SPB; this.step++;
      }
    }, 90);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
};
