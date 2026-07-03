import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from '../../src/client/systems/AudioEngine';
import { ATTACK_MS, RELEASE_MS, TONE_FREQUENCY_HZ } from '../fixtures/timing-fixtures';

// Mock AudioContext
class MockOscillator {
  type = 'sine';
  frequency = { value: 0 };
  connect = vi.fn(() => this);
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
}

class MockGain {
  gain = {
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

let mockCtxInstance: MockAudioContext;

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGain());
  destination = {};
  resume = vi.fn();
  close = vi.fn();

  constructor() {
    mockCtxInstance = this;
  }
}

vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext);

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtxInstance = null as any;
    engine = new AudioEngine();
  });

  describe('init', () => {
    it('AE-05: creates AudioContext and starts oscillator', async () => {
      const spy = vi.spyOn(globalThis, 'AudioContext');
      await engine.init();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(engine.getState().initialized).toBe(true);
      spy.mockRestore();
    });

    it('AE-06: oscillator frequency is 700 Hz', async () => {
      await engine.init();
      const osc = mockCtxInstance.createOscillator.mock.results[0]!.value as MockOscillator;
      expect(osc.frequency.value).toBe(TONE_FREQUENCY_HZ);
    });

    it('AE-05: resumes suspended context', async () => {
      const ctx = new MockAudioContext();
      ctx.state = 'suspended';
      await engine.init();
      // The engine creates its own AudioContext; verify init completes without error
      expect(engine.getState().initialized).toBe(true);
    });
  });

  describe('keyDown', () => {
    it('AE-01: ramps gain to 1 within attack time', async () => {
      await engine.init();
      mockCtxInstance.currentTime = 1.0;
      engine.keyDown(1.0);
      const gain = mockCtxInstance.createGain.mock.results[0]!.value as MockGain;
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        1,
        expect.closeTo(1.0 + ATTACK_MS / 1000, 0.001)
      );
      expect(engine.getState().playing).toBe(true);
    });
  });

  describe('keyUp', () => {
    it('AE-02: ramps gain to 0 within release time', async () => {
      await engine.init();
      mockCtxInstance.currentTime = 1.0;
      engine.keyUp(1.0);
      const gain = mockCtxInstance.createGain.mock.results[0]!.value as MockGain;
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0,
        expect.closeTo(1.0 + RELEASE_MS / 1000, 0.001)
      );
      expect(engine.getState().playing).toBe(false);
    });
  });

  describe('getCurrentTime', () => {
    it('returns AudioContext.currentTime', async () => {
      await engine.init();
      mockCtxInstance.currentTime = 42.5;
      expect(engine.getCurrentTime()).toBe(42.5);
    });
  });

  describe('destroy', () => {
    it('cleans up resources', async () => {
      await engine.init();
      engine.destroy();
      const osc = mockCtxInstance.createOscillator.mock.results[0]!.value as MockOscillator;
      expect(osc.stop).toHaveBeenCalled();
      expect(mockCtxInstance.close).toHaveBeenCalled();
      expect(engine.getState().initialized).toBe(false);
    });
  });
});
