import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Texture } from 'three/webgpu';
import { useLoader } from '@react-three/fiber';
import { useReleaseOnUnmount } from './materials.js';

vi.mock('@react-three/fiber', () => ({ useLoader: { clear: vi.fn() } }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it('keeps textures through StrictMode rehearsal, then releases textures and cache on each real unmount', () => {
  vi.useFakeTimers();
  for (let cycle = 0; cycle < 3; cycle++) {
    const texture = new Texture();
    const disposed = vi.fn();
    texture.addEventListener('dispose', disposed);
    const releaseGeometry = vi.fn();
    function Owner() {
      useReleaseOnUnmount(['/cover.ktx2'], [texture], releaseGeometry);
      return null;
    }
    const view = render(<StrictMode><Owner /></StrictMode>);
    vi.runAllTimers();
    expect(disposed).not.toHaveBeenCalled();
    view.unmount();
    vi.runAllTimers();
    expect(disposed).toHaveBeenCalledOnce();
    expect(releaseGeometry).toHaveBeenCalledOnce();
    expect(useLoader.clear).toHaveBeenCalledTimes(cycle + 1);
    expect(useLoader.clear).toHaveBeenLastCalledWith(expect.anything(), '/cover.ktx2');
  }
});
