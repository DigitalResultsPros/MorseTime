/**
 * Web Audio engine for Morse code tone generation.
 * Uses AudioContext for precise scheduling.
 */

export interface AudioEngineState {
  initialized: boolean;
  playing: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private readonly FREQUENCY_HZ = 700;
  private readonly ATTACK_MS = 2;
  private readonly RELEASE_MS = 2;

  private state: AudioEngineState = {
    initialized: false,
    playing: false,
  };

  async init(): Promise<void> {
    if (this.state.initialized) return;

    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    this.osc.type = 'sine';
    this.osc.frequency.value = this.FREQUENCY_HZ;
    this.osc.connect(this.gain).connect(this.ctx.destination);
    this.gain.gain.value = 0;
    this.osc.start();

    this.state.initialized = true;
  }

  keyDown(at?: number): void {
    if (!this.ctx || !this.gain) return;
    const time = at ?? this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(time);
    this.gain.gain.setValueAtTime(this.gain.gain.value, time);
    this.gain.gain.linearRampToValueAtTime(1, time + this.ATTACK_MS / 1000);
    this.state.playing = true;
  }

  keyUp(at?: number): void {
    if (!this.ctx || !this.gain) return;
    const time = at ?? this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(time);
    this.gain.gain.setValueAtTime(this.gain.gain.value, time);
    this.gain.gain.linearRampToValueAtTime(0, time + this.RELEASE_MS / 1000);
    this.state.playing = false;
  }

  getState(): AudioEngineState {
    return { ...this.state };
  }

  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  destroy(): void {
    this.osc?.stop();
    this.osc?.disconnect();
    this.gain?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.state = { initialized: false, playing: false };
  }
}
