export const GIF_LOOPS_PER_CLIP = 2;

export function advanceGifAfterLoop(gifIndex, loopsCompleted, gifCount) {
  const completedLoops = loopsCompleted + 1;
  if (completedLoops < GIF_LOOPS_PER_CLIP) {
    return { gifIndex, loopsCompleted: completedLoops };
  }
  return { gifIndex: (gifIndex + 1) % gifCount, loopsCompleted: 0 };
}
