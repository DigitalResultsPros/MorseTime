import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TouchInput } from '../../src/client/systems/TouchInput';
import type { MorseElement } from '../../src/client/systems/TouchInput';
import {
  DIT_THRESHOLD_MS,
  DAH_MIN_MS,
  MAX_DAH_MS,
} from '../fixtures/timing-fixtures';

describe('TouchInput', () => {
  let touchInput: TouchInput;
  let onElement: (element: MorseElement, durationMs: number) => void;
  let haptic: ((ms: number) => void) | undefined;

  beforeEach(() => {
    haptic = vi.fn() as unknown as ((ms: number) => void) | undefined;
    onElement = vi.fn() as unknown as (element: MorseElement, durationMs: number) => void;
    touchInput = new TouchInput(haptic);
    touchInput.bind({ onElement });
  });

  describe('pointer down', () => {
    it('TI-05: calls haptic on pointer down', () => {
      touchInput['handlePointerDown']();
      expect(haptic).toHaveBeenCalledWith(10);
    });
  });

  describe('pointer up classification', () => {
    it('TI-01: 80ms hold → dit', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1080);
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      expect(onElement).toHaveBeenCalledWith('dit', 80);
    });

    it('TI-02: 200ms hold → dah', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1200);
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      expect(onElement).toHaveBeenCalledWith('dah', 200);
    });

    it('TI-03: 2500ms hold → clamped to MAX_DAH_MS', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3500);
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      expect(onElement).toHaveBeenCalledWith('dah', MAX_DAH_MS);
    });

    it('ignores pointer up without prior down', () => {
      touchInput['handlePointerUp']();
      expect(onElement).not.toHaveBeenCalled();
    });
  });

  describe('rapid alternating', () => {
    it('TI-04: emits correct sequence of dits and dahs', () => {
      const times = [0, 80, 100, 280, 300, 500];
      let idx = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => times[idx++]!);

      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();

      expect(onElement).toHaveBeenNthCalledWith(1, 'dit', 80);
      expect(onElement).toHaveBeenNthCalledWith(2, 'dah', 180);
      expect(onElement).toHaveBeenNthCalledWith(3, 'dah', 200);
    });
  });

  describe('state management', () => {
    it('reset clears state', () => {
      vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1200);
      touchInput['handlePointerDown']();
      touchInput['handlePointerUp']();
      expect(touchInput.getState().element).toBe('dah');

      touchInput.reset();
      expect(touchInput.getState().element).toBeNull();
      expect(touchInput.getState().keyDownTime).toBeNull();
    });
  });
});
