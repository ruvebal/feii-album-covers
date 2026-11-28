import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../src/player.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Off the Wall audio player', () => {
  it('applies the selected volume when starting and while playing', async () => {
    const gainParam = {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    };
    const analyser = {
      connect: vi.fn((next) => next),
      getByteFrequencyData: vi.fn(),
      frequencyBinCount: 256,
    };
    const gain = {
      gain: gainParam,
      connect: vi.fn((next) => next),
    };
    class MockAudioContext {
      currentTime = 0;
      state = 'running';
      destination = {};
      createMediaElementSource = vi.fn(() => ({ connect: vi.fn((next) => next) }));
      createGain = vi.fn(() => gain);
      createAnalyser = vi.fn(() => analyser);
      close = vi.fn();
    }
    class MockAudio extends EventTarget {
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      removeAttribute = vi.fn();
      load = vi.fn();
    }
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            results: [{ wrapperType: 'track', trackNumber: 1, previewUrl: 'https://example.test/preview.m4a' }],
          }),
      }),
    );

    const player = createPlayer({ onChange: vi.fn() });
    await player.ready;
    player.setVolume(0.75);
    await player.play(0);

    expect(gainParam.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.75, 0.3);

    player.setVolume(0.6);
    expect(gainParam.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.6, 0.3);
    player.setVolume(1);
    expect(gainParam.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, 0.3);
    player.dispose();
  });
});
