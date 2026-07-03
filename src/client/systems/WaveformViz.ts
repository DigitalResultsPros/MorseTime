/**
 * Canvas 2D waveform visualization for Morse code.
 * Draws target (ghost) and user (live) waveforms with color-coded feedback.
 */

export type WaveformElement = {
  type: 'dit' | 'dah';
  startTime: number;
  duration: number;
  isTarget: boolean;
  correct?: boolean;
  early?: boolean;
};

export class WaveformViz {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private elements: WaveformElement[] = [];
  private currentTime: number = 0;
  private viewportMs: number = 5000; // Show 5 seconds of history
  private animationId: number | null = null;
  private onFrame: (() => void) | null = null;

  // Colors
  private readonly COLOR_CORRECT = '#22c55e'; // green-500
  private readonly COLOR_EARLY = '#ef4444';   // red-500
  private readonly COLOR_LATE = '#ef4444';    // red-500
  private readonly COLOR_WRONG = '#eab308';   // yellow-500
  private readonly COLOR_TARGET = '#94a3b8';  // slate-400
  private readonly COLOR_BG = '#0f172a';      // slate-900
  private readonly COLOR_GRID = '#1e293b';    // slate-800

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setViewportMs(ms: number): void {
    this.viewportMs = ms;
  }

  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  addElement(element: WaveformElement): void {
    this.elements.push(element);
    // Prune old elements
    const cutoff = this.currentTime - this.viewportMs - 2000;
    this.elements = this.elements.filter((el) => el.startTime > cutoff);
  }

  clear(): void {
    this.elements = [];
  }

  start(onFrame: () => void): void {
    this.onFrame = onFrame;
    this.tick();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.onFrame = null;
  }

  private tick = (): void => {
    this.draw();
    this.onFrame?.();
    this.animationId = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const width = this.canvas.getBoundingClientRect().width;
    const height = this.canvas.getBoundingClientRect().height;
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = this.COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    // Grid lines (time markers every 1 second)
    ctx.strokeStyle = this.COLOR_GRID;
    ctx.lineWidth = 1;
    const startTime = this.currentTime - this.viewportMs;
    for (let t = Math.ceil(startTime / 1000) * 1000; t < this.currentTime; t += 1000) {
      const x = this.timeToX(t, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw elements
    const baseline = height * 0.5;
    const amplitude = height * 0.35;

    for (const el of this.elements) {
      const x = this.timeToX(el.startTime, width);
      const w = this.msToX(el.duration, width);
      const y = el.isTarget ? baseline - amplitude * 0.6 : baseline;

      // Determine color
      let color = this.COLOR_TARGET;
      if (!el.isTarget && el.correct === false) {
        color = el.early !== undefined ? (el.early ? this.COLOR_EARLY : this.COLOR_LATE) : this.COLOR_WRONG;
      } else if (!el.isTarget && el.correct === true) {
        color = this.COLOR_CORRECT;
      }

      // Draw bar
      ctx.fillStyle = color;
      ctx.globalAlpha = el.isTarget ? 0.4 : 0.9;
      ctx.fillRect(x, y - 4, Math.max(w, 2), 8);
      ctx.globalAlpha = 1;

      // Draw label for target
      if (el.isTarget) {
        ctx.fillStyle = this.COLOR_TARGET;
        ctx.font = '10px monospace';
        ctx.fillText(el.type.toUpperCase(), x + 2, y - 8);
      }
    }

    // Playhead
    const playheadX = this.timeToX(this.currentTime, width);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }

  private timeToX(time: number, width: number): number {
    const startTime = this.currentTime - this.viewportMs;
    return ((time - startTime) / this.viewportMs) * width;
  }

  private msToX(ms: number, width: number): number {
    return (ms / this.viewportMs) * width;
  }

  destroy(): void {
    this.stop();
    this.elements = [];
  }
}
