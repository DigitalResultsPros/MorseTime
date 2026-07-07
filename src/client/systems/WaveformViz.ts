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

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export class WaveformViz {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private elements: WaveformElement[] = [];
  private currentTime: number = 0;
  private viewportMs: number = 5000; // Show 5 seconds of history
  private targetViewportMs: number = 5000;
  private animationId: number | null = null;
  private onFrame: (() => void) | null = null;
  private particles: Particle[] = [];

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
    this.targetViewportMs = ms;
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

  spawnParticles(x: number, y: number, color: string, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  clear(): void {
    this.elements = [];
    this.particles = [];
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

    // Smooth viewport transition
    this.viewportMs += (this.targetViewportMs - this.viewportMs) * 0.08;

    // Dynamic viewport: keep playhead at ~30% from left
    const targetStartTime = this.currentTime - this.viewportMs * 0.3;
    const currentStartTime = this.currentTime - this.viewportMs;
    const smoothStartTime = currentStartTime + (targetStartTime - currentStartTime) * 0.05;

    // Clear
    ctx.fillStyle = this.COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    // CRT scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    // Vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.3,
      width / 2, height / 2, height * 0.9
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Grid lines (time markers every 1 second)
    ctx.strokeStyle = this.COLOR_GRID;
    ctx.lineWidth = 1;
    const startTime = smoothStartTime;
    for (let t = Math.ceil(startTime / 1000) * 1000; t < this.currentTime; t += 1000) {
      const x = this.timeToX(t, width, smoothStartTime);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw elements
    const baseline = height * 0.5;
    const amplitude = height * 0.35;
    const signalMod = Math.sin(this.currentTime * 0.001) * 0.15 + 0.85; // amplitude modulation

    for (const el of this.elements) {
      const x = this.timeToX(el.startTime, width, smoothStartTime);
      const w = this.msToX(el.duration, width);
      const y = el.isTarget ? baseline - amplitude * 0.6 * signalMod : baseline;

      // Determine color
      let color = this.COLOR_TARGET;
      if (!el.isTarget && el.correct === false) {
        color = el.early !== undefined ? (el.early ? this.COLOR_EARLY : this.COLOR_LATE) : this.COLOR_WRONG;
      } else if (!el.isTarget && el.correct === true) {
        color = this.COLOR_CORRECT;
      }

      // Glow
      ctx.shadowBlur = el.isTarget ? 6 : 14;
      ctx.shadowColor = color;

      // Draw sine-wave arc
      ctx.strokeStyle = color;
      ctx.lineWidth = el.isTarget ? 2 : 3;
      ctx.globalAlpha = el.isTarget ? 0.5 : 0.9;
      ctx.beginPath();
      const midY = y;
      const amp = (el.isTarget ? 6 : 10) * signalMod;
      const halfW = w / 2;
      ctx.moveTo(x, midY - amp);
      ctx.quadraticCurveTo(x + halfW, midY + amp, x + w, midY - amp);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Draw label for target
      if (el.isTarget) {
        ctx.fillStyle = this.COLOR_TARGET;
        ctx.font = '10px monospace';
        ctx.fillText(el.type.toUpperCase(), x + 2, y - 12);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / 60 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Playhead
    const playheadX = this.timeToX(this.currentTime, width, smoothStartTime);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  getPlayheadX(width: number): number {
    const startTime = this.currentTime - this.viewportMs;
    const targetStartTime = this.currentTime - this.viewportMs * 0.3;
    const smoothStartTime = startTime + (targetStartTime - startTime) * 0.05;
    return ((this.currentTime - smoothStartTime) / this.viewportMs) * width;
  }

  private timeToX(time: number, width: number, startTime: number): number {
    return ((time - startTime) / this.viewportMs) * width;
  }

  private msToX(ms: number, width: number): number {
    return (ms / this.viewportMs) * width;
  }

  destroy(): void {
    this.stop();
    this.elements = [];
    this.particles = [];
  }
}
