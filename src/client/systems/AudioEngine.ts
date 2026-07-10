/**
 * Web Audio engine for Morse code tone generation.
 * Listen sequences use one oscillator per beep (reliable scheduling).
 * Live keying uses a sustained sidetone osc + gain.
 */

export type AudioEngineState = {
  initialized: boolean;
  playing: boolean;
};

type ScheduledBeep = {
  osc: OscillatorNode;
  gain: GainNode;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  /** Continuous oscillator for live key-down sidetone */
  private sideOsc: OscillatorNode | null = null;
  private sideGain: GainNode | null = null;
  private scheduled: ScheduledBeep[] = [];
  private readonly FREQUENCY_HZ = 700;
  private readonly ATTACK_MS = 3;
  private readonly RELEASE_MS = 3;
  /** Peak gain — full 1.0 can clip; still clearly audible */
  private readonly PEAK = 0.55;

  private state: AudioEngineState = {
    initialized: false,
    playing: false,
  };

  async init(): Promise<void> {
    if (this.state.initialized && this.ctx) {
      await this.resume();
      return;
    }

    const Ctx =
      globalThis.AudioContext ||
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) {
      throw new Error('Web Audio API not available');
    }

    this.ctx = new Ctx();

    this.sideGain = this.ctx.createGain();
    this.sideGain.gain.value = 0;
    this.sideGain.connect(this.ctx.destination);

    this.sideOsc = this.ctx.createOscillator();
    this.sideOsc.type = 'sine';
    this.sideOsc.frequency.value = this.FREQUENCY_HZ;
    this.sideOsc.connect(this.sideGain);
    this.sideOsc.start();

    this.state.initialized = true;
    await this.resume();
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Schedule a Morse element as its own oscillator (does not share gain automation
   * with other beeps — avoids cancelScheduledValues wiping the sequence).
   */
  scheduleTone(startSec: number, durationSec: number): void {
    if (!this.ctx || durationSec <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = this.FREQUENCY_HZ;

    const attack = this.ATTACK_MS / 1000;
    const release = this.RELEASE_MS / 1000;
    const start = Math.max(startSec, this.ctx.currentTime);
    const end = start + durationSec;
    const attackEnd = Math.min(start + attack, end);
    const releaseStart = Math.max(attackEnd, end - release);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(this.PEAK, attackEnd);
    if (releaseStart > attackEnd) {
      gain.gain.setValueAtTime(this.PEAK, releaseStart);
    }
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);

    const beep: ScheduledBeep = { osc, gain };
    this.scheduled.push(beep);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
      this.scheduled = this.scheduled.filter((b) => b !== beep);
    };
  }

  /** Stop live sidetone only — does NOT cancel listen sequence. */
  stopSidetone(): void {
    if (!this.ctx || !this.sideGain) return;
    const t = this.ctx.currentTime;
    this.sideGain.gain.cancelScheduledValues(t);
    this.sideGain.gain.setValueAtTime(0, t);
    this.state.playing = false;
  }

  /** Cancel scheduled listen beeps + silence sidetone. */
  stopAll(): void {
    this.stopSidetone();
    for (const { osc, gain } of this.scheduled) {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.scheduled = [];
  }

  /**
   * Live keyer: immediate tone.
   * If `at` is provided in the future, schedules a key-down edge on sidetone gain
   * (prefer scheduleTone for full Morse sequences).
   */
  keyDown(at?: number): void {
    if (!this.ctx || !this.sideGain) return;
    const time = at ?? this.ctx.currentTime;
    const g = this.sideGain.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(0, time);
    g.linearRampToValueAtTime(this.PEAK, time + this.ATTACK_MS / 1000);
    this.state.playing = true;
  }

  keyUp(at?: number): void {
    if (!this.ctx || !this.sideGain) return;
    const time = at ?? this.ctx.currentTime;
    const g = this.sideGain.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(this.PEAK, time);
    g.linearRampToValueAtTime(0, time + this.RELEASE_MS / 1000);
    this.state.playing = false;
  }

  getState(): AudioEngineState {
    return { ...this.state };
  }

  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** AudioContext state for debugging (running | suspended | closed). */
  getContextState(): string {
    return this.ctx?.state ?? 'none';
  }

  destroy(): void {
    this.stopAll();
    try {
      this.sideOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.sideOsc?.disconnect();
    this.sideGain?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
    this.sideOsc = null;
    this.sideGain = null;
    this.state = { initialized: false, playing: false };
  }
}
