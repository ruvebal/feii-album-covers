import { describe, expect, it } from 'vitest';
import { advanceGifAfterLoop } from '../src/gifSequence.js';

describe('GIF rotation', () => {
  it('shows each clip for two loops before switching and repeats the playlist', () => {
    let state = advanceGifAfterLoop(0, 0, 2);
    expect(state).toEqual({ gifIndex: 0, loopsCompleted: 1 });
    state = advanceGifAfterLoop(state.gifIndex, state.loopsCompleted, 2);
    expect(state).toEqual({ gifIndex: 1, loopsCompleted: 0 });
    state = advanceGifAfterLoop(state.gifIndex, state.loopsCompleted, 2);
    expect(state).toEqual({ gifIndex: 1, loopsCompleted: 1 });
    state = advanceGifAfterLoop(state.gifIndex, state.loopsCompleted, 2);
    expect(state).toEqual({ gifIndex: 0, loopsCompleted: 0 });
  });

});
