import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Intro from '../covers/off-the-wall/src/Intro.jsx';
import { COVER_URLS, createSleeves, labelGeometry, setSleeveLabelSlot, sleeveGeometry, sleeveLabelGeometry } from '../covers/off-the-wall/src/sleeves.js';

afterEach(() => vi.restoreAllMocks());

describe('Off the Wall artwork', () => {
  it('draws the five album covers into the correct atlas slots', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
    const covers = COVER_URLS.map((url) => ({ image: { url } }));
    const texture = createSleeves(covers);
    expect(COVER_URLS.map((url) => url.split('/').pop())).toEqual([
      'abc.jpg', 'christmas.jpg', 'the-jacksons.jpg', 'monitor-cover.jpg', 'diana-ross-presents.jpg',
    ]);
    expect(drawImage).toHaveBeenCalledTimes(5);
    covers.forEach((cover, index) => {
      expect(drawImage).toHaveBeenNthCalledWith(index + 1, cover.image, index * 512, 0, 512, 512);
      const geometry = sleeveGeometry(index);
      const uv = geometry.attributes.uv;
      expect(uv.getX(0)).toBeCloseTo(index / 5);
      expect(uv.getX(1)).toBeCloseTo((index + 1) / 5);
      geometry.dispose();
    });
    texture.dispose();
  });

  it('shows the record while loading and only enables entry when ready', () => {
    const onEnter = vi.fn();
    const { container, rerender } = render(<Intro stage={1} entered={false} onEnter={onEnter} />);
    expect(container.querySelector('.otw__intro-label').style.backgroundImage).toContain('monitor-cover.jpg');
    expect(screen.getByRole('button', { name: 'Entrar al plató' })).toBeDisabled();
    rerender(<Intro stage={3} entered={false} onEnter={onEnter} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar al plató' }));
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('maps each circular record label to the matching artwork and preserves its spindle hole', () => {
    const changing = sleeveLabelGeometry(3);
    for (let slot = 0; slot < 5; slot += 1) {
      const label = sleeveLabelGeometry(slot);
      setSleeveLabelSlot(changing, slot);
      const uv = label.attributes.uv;
      const position = label.attributes.position;
      expect(Math.hypot(position.getX(0), position.getY(0))).toBeCloseTo(0.0045);
      for (let i = 0; i < uv.count; i += 1) {
        expect(changing.attributes.uv.getX(i)).toBeCloseTo(uv.getX(i));
        expect(uv.getX(i)).toBeGreaterThanOrEqual(slot / 5 - 0.00001);
        expect(uv.getX(i)).toBeLessThanOrEqual((slot + 1) / 5 + 0.00001);
        expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
        expect(uv.getY(i)).toBeLessThanOrEqual(1);
      }
      changing.dispose();
      label.dispose();
    }

    const gold = labelGeometry(0.006, 0.055, { x: 0.04, y: 0.22, width: 0.5, height: 0.7 });
    const uv = gold.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0.04 - 0.00001);
      expect(uv.getX(i)).toBeLessThanOrEqual(0.54 + 0.00001);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0.22 - 0.00001);
      expect(uv.getY(i)).toBeLessThanOrEqual(0.92 + 0.00001);
    }
    gold.dispose();
  });
});
