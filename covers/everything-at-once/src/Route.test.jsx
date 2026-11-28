import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Route from './Route.jsx';

const state = vi.hoisted(() => ({ canvas: null, probe: null }));
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }) => { state.canvas = props; return <div>{children}</div>; },
  useFrame() {}, events() {},
}));
vi.mock('@react-three/drei', () => ({ PerformanceMonitor: () => null }));
vi.mock('./Record.jsx', () => ({ default: () => null, Backdrop: () => null }));
vi.mock('./Diorama.jsx', () => ({ FOV: 40, FRONT_Z: 0, VIEW_DISTANCE: 3, PULL_BACK: 1 }));
vi.mock('./RouteBudgetProbe.jsx', () => ({ default: (props) => { state.probe = props; return null; } }));

beforeEach(() => {
  Object.defineProperty(SVGElement.prototype, 'points', { configurable: true, get: () => ({ numberOfItems: 8 }) });
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('FontFace', function () { this.load = () => Promise.resolve(); });
  Object.defineProperty(document, 'fonts', { configurable: true, value: { add() {}, delete() {} } });
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter><Route /></MemoryRouter>);

it.each(['getItem', 'setItem'])('keeps the cover usable when sessionStorage.%s is blocked', (method) => {
  vi.mocked(Storage.prototype[method]).mockImplementation(() => { throw new Error('Blocked'); });
  expect(mount).not.toThrow();
  expect(screen.getByRole('heading', { name: 'Everything at Once' })).toBeInTheDocument();
});

it('accepts member number shortcuts from a focused member control', () => {
  mount();
  const lucy = screen.getByRole('button', { name: 'Lucy', exact: true });
  lucy.focus();
  fireEvent.keyDown(lucy, { key: '2' });
  expect(screen.getByRole('button', { name: 'Javi', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Turn the record over' })).not.toHaveAttribute('aria-keyshortcuts');
});

it('does not subscribe the normal route to debug budget updates', () => {
  mount();
  expect(state.probe.onSample).toBeUndefined();
});

it('shows the poster and an explanation after GPU context loss', () => {
  const view = mount();
  const gl = { onDeviceLost: vi.fn() };
  state.canvas.onCreated({ gl });
  act(() => gl.onDeviceLost({ reason: 'lost' }));
  expect(view.container.querySelector('.eao__poster')).toHaveAttribute('data-shown', 'true');
  expect(screen.getByText(/3D record could not load/)).toBeInTheDocument();
});

it('leaves modified number keys to the browser', () => {
  mount();
  const lucy = screen.getByRole('button', { name: 'Lucy', exact: true });
  fireEvent.keyDown(lucy, { key: '2', ctrlKey: true });
  expect(screen.getByRole('button', { name: 'Javi', exact: true })).toHaveAttribute('aria-pressed', 'false');
});
