import { afterEach, expect, it, vi } from 'vitest';
import { createTransport } from './audio.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('clears every pending resume timeout and ignores late completion after close', async () => {
  vi.useFakeTimers();
  let finishResume;
  const context = {
    createGain: () => ({ gain: { value: 0 }, connect() {} }),
    resume: vi.fn(() => new Promise((resolve) => { finishResume = resolve; })),
    close: vi.fn(() => Promise.resolve()),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const status = vi.fn();
  const transport = createTransport(status);
  transport.unlock();
  transport.unlock();
  transport.close();
  expect(context.close).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  status.mockClear();
  finishResume();
  await Promise.resolve();
  expect(status).not.toHaveBeenCalled();
});

it('does not start audio when a fetch finishes after close', async () => {
  let finishFetch;
  vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finishFetch = resolve; })));
  const gain = { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {} };
  const context = {
    state: 'running', currentTime: 0,
    createGain: () => ({ gain, connect() {} }),
    resume: () => Promise.resolve(), close: () => Promise.resolve(),
    decodeAudioData: vi.fn(), createBufferSource: vi.fn(),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const transport = createTransport(vi.fn());
  transport.unlock();
  transport.setOn(true);
  transport.close();
  finishFetch({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(context.createBufferSource).not.toHaveBeenCalled();
  expect(transport.sounding()).toEqual([]);
});

it('suspends the silent context after an abandoned vinyl pull', async () => {
  vi.useFakeTimers();
  const context = {
    createGain: () => ({ gain: { value: 0 }, connect() {} }),
    resume: () => Promise.resolve(), suspend: vi.fn(() => Promise.resolve()),
    close: () => Promise.resolve(),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const transport = createTransport(vi.fn());
  transport.unlock();
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(1200);
  expect(context.suspend).toHaveBeenCalledOnce();
  transport.close();
});

it('starts loading on retry when AudioContext creation initially failed', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const context = {
    state: 'running', createGain: () => ({ gain: { value: 0 }, connect() {} }),
    resume: () => Promise.resolve(), close: () => Promise.resolve(),
  };
  let attempts = 0;
  vi.stubGlobal('AudioContext', function () {
    if (++attempts === 1) throw new Error('Unavailable');
    return context;
  });
  const transport = createTransport(vi.fn());
  transport.unlock();
  transport.setOn(true);
  transport.unlock();
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledOnce();
  transport.close();
});
