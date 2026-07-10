/**
 * Touch and keyboard input handling for Morse code tap detection.
 * Classifies input as 'dit' or 'dah' based on hold duration (WPM-relative threshold).
 */

export type MorseElement = 'dit' | 'dah';

export type TouchInputState = {
  keyDownTime: number | null;
  element: MorseElement | null;
  durationMs: number | null;
};

export type TouchInputEvents = {
  onElement: (element: MorseElement, durationMs: number) => void;
  /** Fired when key/pointer goes down (sidetone / provisional bar). */
  onKeyDown?: () => void;
  /** Fired on release after classification (same moment as onElement). */
  onKeyUp?: (element: MorseElement, durationMs: number) => void;
};

const DEFAULT_DIT_THRESHOLD_MS = 150;
const MAX_DAH_MS = 2000;

export class TouchInput {
  private ditThresholdMs = DEFAULT_DIT_THRESHOLD_MS;
  private readonly maxDahMs = MAX_DAH_MS;

  private state: TouchInputState = {
    keyDownTime: null,
    element: null,
    durationMs: null,
  };

  private events: TouchInputEvents | null = null;
  private haptic: ((ms: number) => void) | undefined;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(haptic?: (ms: number) => void) {
    this.haptic = haptic;
  }

  /** Set dit/dah threshold (e.g. from ditDahThresholdMs(charWpm)). */
  setDitThresholdMs(ms: number): void {
    this.ditThresholdMs = ms > 0 ? ms : DEFAULT_DIT_THRESHOLD_MS;
  }

  getDitThresholdMs(): number {
    return this.ditThresholdMs;
  }

  bind(events: TouchInputEvents): {
    onPointerDown: () => void;
    onPointerUp: () => void;
    bindKeyboard: (element: HTMLElement | Document) => void;
    unbindKeyboard: (element: HTMLElement | Document) => void;
  } {
    this.events = events;
    return {
      onPointerDown: () => this.handlePointerDown(),
      onPointerUp: () => this.handlePointerUp(),
      bindKeyboard: (element) => this.attachKeyboard(element),
      unbindKeyboard: (element) => this.detachKeyboard(element),
    };
  }

  private attachKeyboard(element: HTMLElement | Document): void {
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.handlePointerDown();
      }
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.handlePointerUp();
      }
    };
    element.addEventListener('keydown', this.keyDownHandler as EventListener);
    element.addEventListener('keyup', this.keyUpHandler as EventListener);
  }

  private detachKeyboard(element: HTMLElement | Document): void {
    if (this.keyDownHandler) {
      element.removeEventListener('keydown', this.keyDownHandler as EventListener);
    }
    if (this.keyUpHandler) {
      element.removeEventListener('keyup', this.keyUpHandler as EventListener);
    }
    this.keyDownHandler = null;
    this.keyUpHandler = null;
  }

  private handlePointerDown(): void {
    if (this.state.keyDownTime !== null) return;
    this.state.keyDownTime = performance.now();
    this.haptic?.(10);
    this.events?.onKeyDown?.();
  }

  private handlePointerUp(): void {
    if (this.state.keyDownTime === null) return;

    const duration = performance.now() - this.state.keyDownTime;
    const clampedDuration = Math.min(duration, this.maxDahMs);
    const element: MorseElement =
      clampedDuration < this.ditThresholdMs ? 'dit' : 'dah';

    this.state = {
      keyDownTime: null,
      element,
      durationMs: clampedDuration,
    };

    this.events?.onElement(element, clampedDuration);
    this.events?.onKeyUp?.(element, clampedDuration);
  }

  getState(): TouchInputState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      keyDownTime: null,
      element: null,
      durationMs: null,
    };
  }
}
