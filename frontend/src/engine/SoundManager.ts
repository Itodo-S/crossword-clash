import { Howl } from 'howler';

export class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private stopMusicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicVolume = 0.4;
  private sfxVolume = 0.7;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.createTilePickup();
    this.createTilePlaceCorrect();
    this.createTilePlaceWrong();
    this.createWordComplete();
    this.createTurnStart();
    this.createAiThinking();
    this.createTimerWarning();
    this.createSwapTiles();
    this.createGameOver();
    this.createVictory();
    this.createDefeat();
    this.createMenuSelect();
    this.createBgMusic();
  }

  private createTilePickup(): void {
    const sr = 44100;
    const dur = 0.08;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 10);
      const freq = 800 + p * 400;
      buf[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.3;
    }
    this.registerSound('tile-pickup', buf, sr);
  }

  private createTilePlaceCorrect(): void {
    const sr = 44100;
    const dur = 0.2;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 6);
      // C5 + E5 harmonic
      const f1 = 523.25;
      const f2 = 659.25;
      buf[i] = (Math.sin(2 * Math.PI * f1 * t) * 0.3 +
                Math.sin(2 * Math.PI * f2 * t) * 0.2) * env * 0.4;
    }
    this.registerSound('tile-place-correct', buf, sr);
  }

  private createTilePlaceWrong(): void {
    const sr = 44100;
    const dur = 0.25;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 5);
      // Buzzy low sawtooth at 120Hz
      const phase = (120 * t) % 1;
      buf[i] = (phase * 2 - 1) * env * 0.25;
    }
    this.registerSound('tile-place-wrong', buf, sr);
  }

  private createWordComplete(): void {
    const sr = 44100;
    const dur = 0.6;
    const buf = new Float32Array(Math.floor(sr * dur));
    // Victory arpeggio: C4-E4-G4-C5
    const notes = [261.63, 329.63, 392.00, 523.25];
    const noteLen = dur / notes.length;
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const noteIdx = Math.min(Math.floor(t / noteLen), notes.length - 1);
      const noteT = t - noteIdx * noteLen;
      const env = Math.exp(-noteT * 4) * (1 - (t / dur) * 0.5);
      buf[i] = Math.sin(2 * Math.PI * notes[noteIdx] * t) * env * 0.3;
    }
    this.registerSound('word-complete', buf, sr);
  }

  private createTurnStart(): void {
    const sr = 44100;
    const dur = 0.25;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 6);
      const freq = p < 0.5 ? 440 : 554.37; // A4 -> C#5
      buf[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.25;
    }
    this.registerSound('turn-start', buf, sr);
  }

  private createAiThinking(): void {
    const sr = 44100;
    const dur = 0.1;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = p < 0.1 ? p / 0.1 : Math.exp(-(p - 0.1) * 15);
      buf[i] = Math.sin(2 * Math.PI * 1200 * t) * env * 0.1;
    }
    this.registerSound('ai-thinking', buf, sr);
  }

  private createTimerWarning(): void {
    const sr = 44100;
    const dur = 0.08;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 12);
      buf[i] = Math.sin(2 * Math.PI * 880 * t) * env * 0.2;
    }
    this.registerSound('timer-warning', buf, sr);
  }

  private createSwapTiles(): void {
    const sr = 44100;
    const dur = 0.3;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.sin(p * Math.PI) * 0.3;
      // White noise swoosh with bandpass
      const noise = Math.random() * 2 - 1;
      const freq = 200 + p * 2000;
      buf[i] = noise * env * Math.sin(2 * Math.PI * freq * t * 0.01);
    }
    this.registerSound('swap-tiles', buf, sr);
  }

  private createGameOver(): void {
    const sr = 44100;
    const dur = 1.0;
    const buf = new Float32Array(Math.floor(sr * dur));
    // Dramatic descending chord
    const freqs = [440, 349.23, 293.66];
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 2);
      let sample = 0;
      for (const f of freqs) {
        sample += Math.sin(2 * Math.PI * f * t) * 0.2;
      }
      buf[i] = sample * env;
    }
    this.registerSound('game-over', buf, sr);
  }

  private createVictory(): void {
    const sr = 44100;
    const dur = 1.2;
    const buf = new Float32Array(Math.floor(sr * dur));
    // Ascending fanfare
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
    const noteLen = dur / notes.length;
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const noteIdx = Math.min(Math.floor(t / noteLen), notes.length - 1);
      const noteT = t - noteIdx * noteLen;
      const env = Math.exp(-noteT * 3) * (1 - t / dur * 0.3);
      buf[i] = (Math.sin(2 * Math.PI * notes[noteIdx] * t) * 0.3 +
                Math.sin(2 * Math.PI * notes[noteIdx] * 2 * t) * 0.1) * env;
    }
    this.registerSound('victory', buf, sr);
  }

  private createDefeat(): void {
    const sr = 44100;
    const dur = 1.0;
    const buf = new Float32Array(Math.floor(sr * dur));
    // Sad descending minor
    const notes = [392, 349.23, 311.13, 261.63];
    const noteLen = dur / notes.length;
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const noteIdx = Math.min(Math.floor(t / noteLen), notes.length - 1);
      const noteT = t - noteIdx * noteLen;
      const env = Math.exp(-noteT * 2.5);
      buf[i] = Math.sin(2 * Math.PI * notes[noteIdx] * t) * env * 0.3;
    }
    this.registerSound('defeat', buf, sr);
  }

  private createMenuSelect(): void {
    const sr = 44100;
    const dur = 0.1;
    const buf = new Float32Array(Math.floor(sr * dur));
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const p = i / buf.length;
      const env = Math.exp(-p * 8);
      buf[i] = Math.sin(2 * Math.PI * 660 * t) * env * 0.25;
    }
    this.registerSound('menu-select', buf, sr);
  }

  private createBgMusic(): void {
    const sr = 44100;
    const dur = 24; // 24 second loop
    const buf = new Float32Array(Math.floor(sr * dur));
    const bpm = 90;
    const beatDur = 60 / bpm;

    // C major scale pad + gentle bass
    const chords = [
      [261.63, 329.63, 392.00], // C major
      [293.66, 349.23, 440.00], // Dm
      [329.63, 392.00, 493.88], // Em
      [261.63, 329.63, 392.00], // C major
    ];
    const chordDur = dur / chords.length;

    for (let i = 0; i < buf.length; i++) {
      const t = i / sr;
      const chordIdx = Math.floor(t / chordDur) % chords.length;
      const chord = chords[chordIdx];

      // Pad (soft sine waves)
      let sample = 0;
      for (const freq of chord) {
        sample += Math.sin(2 * Math.PI * freq * t) * 0.04;
        sample += Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.03; // octave below
      }

      // Gentle bass pulse
      const beatPhase = (t % beatDur) / beatDur;
      const bassFreq = chord[0] * 0.25;
      const bassEnv = Math.exp(-beatPhase * 4);
      sample += Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.06;

      // Subtle arpeggio
      const arpBeat = (t % (beatDur * 0.5)) / (beatDur * 0.5);
      const arpIdx = Math.floor((t / (beatDur * 0.5)) % 3);
      const arpEnv = Math.exp(-arpBeat * 6);
      sample += Math.sin(2 * Math.PI * chord[arpIdx] * 2 * t) * arpEnv * 0.02;

      buf[i] = sample;
    }
    this.registerSound('bg-music', buf, sr);
  }

  private registerSound(id: string, buffer: Float32Array, sampleRate: number): void {
    const wav = this.float32ToWav(buffer, sampleRate);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const isMusic = id === 'bg-music';
    this.sounds.set(id, new Howl({
      src: [url],
      format: ['wav'],
      volume: isMusic ? this.musicVolume : this.sfxVolume,
      loop: isMusic,
    }));
  }

  private float32ToWav(buffer: Float32Array, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  play(id: string): void {
    if (!this.initialized) return;
    const sound = this.sounds.get(id);
    if (sound) {
      sound.volume(this.sfxVolume);
      sound.play();
    }
  }

  playMusic(): void {
    if (!this.initialized) return;
    // Cancel any pending stop so it doesn't kill the new playback
    if (this.stopMusicTimer) {
      clearTimeout(this.stopMusicTimer);
      this.stopMusicTimer = null;
    }
    if (this.currentMusic) {
      this.currentMusic.stop();
    }
    const music = this.sounds.get('bg-music');
    if (music) {
      this.currentMusic = music;
      music.volume(0);
      music.play();
      music.fade(0, this.musicVolume, 500);
    }
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.fade(this.musicVolume, 0, 500);
      this.stopMusicTimer = setTimeout(() => {
        this.currentMusic?.stop();
        this.currentMusic = null;
        this.stopMusicTimer = null;
      }, 500);
    }
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = vol;
    if (this.currentMusic) {
      this.currentMusic.volume(vol);
    }
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = vol;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }
}

export const soundManager = new SoundManager();
