// Avisa una sola vez cuando la escena ya ha pintado unos fotogramas (para la
// pantalla de entrada).

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/** @param {{ onReady: () => void }} props */
export default function Ready({ onReady }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) onReady();
  });
  return null;
}
