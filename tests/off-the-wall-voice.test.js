import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoice } from '../covers/off-the-wall/src/voice.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Off the Wall voice', () => {
  it('uses the supplied recordings for the controls and allows overlapping sounds', () => {
    const instances = [];
    class MockAudio extends EventTarget {
      constructor(src) {
        super();
        this.src = src;
        this.play = vi.fn().mockResolvedValue(undefined);
        this.pause = vi.fn();
        this.removeAttribute = vi.fn();
        this.load = vi.fn();
        instances.push(this);
      }
    }
    vi.stubGlobal('Audio', MockAudio);
    const voice = createVoice();
    for (const name of ['hee', 'ow', 'whoo', 'hoo', 'snap', 'hee']) voice.play(name);

    expect(instances.map((audio) => audio.src)).toEqual([
      expect.stringContaining('hee.mp3'),
      expect.stringContaining('ow.mp3'),
      expect.stringContaining('uhh.mp3'),
      expect.stringContaining('uhh.mp3'),
      expect.stringContaining('snap.mp3'),
      expect.stringContaining('hee.mp3'),
    ]);
    expect(instances.every((audio) => audio.play.mock.calls.length === 1)).toBe(true);

    instances[0].dispatchEvent(new Event('ended'));
    voice.dispose();
    expect(instances[0].pause).not.toHaveBeenCalled();
    for (const audio of instances.slice(1)) {
      expect(audio.pause).toHaveBeenCalledOnce();
      expect(audio.removeAttribute).toHaveBeenCalledWith('src');
      expect(audio.load).toHaveBeenCalledOnce();
    }
    voice.play('ow');
    expect(instances).toHaveLength(6);
  });

  it('reports playback failures', async () => {
    const failure = new Error('Playback blocked');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    class MockAudio extends EventTarget {
      play() {
        return Promise.reject(failure);
      }
    }
    vi.stubGlobal('Audio', MockAudio);
    const voice = createVoice();
    voice.play('ow');
    await Promise.resolve();
    expect(error).toHaveBeenCalledWith('No se pudo reproducir el sonido "ow".', failure);
    voice.dispose();
  });
});
