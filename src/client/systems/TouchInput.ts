/**
 * Touch and keyboard input handling for Morse code tap detection.
 * Classifies input as 'dit' or 'dah' based on hold duration.
 */

export type MorseElement = 'dit' | 'dah';

export interface TouchInputState {
  keyDownTime: number | null;
  element: MorseElement | null;
  durationMs: number | null;
}

export interface TouchInputEvents {
  onElement: (element: MorseElement, durationMs: number) => void;
}

export class TouchInput {
  private readonly DIT_THRESHOLD_MS = 150;
  private readonly MAX_DAH_MS = 2000;

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
    this.state.keyDownTime = performance.now();
    this.haptic?.(10);
  }

  private handlePointerUp(): void {
    if (this.state.keyDownTime === null) return;

    const duration = performance.now() - this.state.keyDownTime;
    const clampedDuration = Math.min(duration, this.MAX_DAH_MS);
    const element: MorseElement =
      clampedDuration < this.DIT_THRESHOLD_MS ? 'dit' : 'dah';

    this.state = {
      keyDownTime: null,
      element,
      durationMs: clampedDuration,
    };

    this.events?.onElement(element, clampedDuration);
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
