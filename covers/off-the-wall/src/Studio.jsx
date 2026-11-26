// Lo que nunca sale en la portada: el plató de la sesión de fotos.
// Se descubre al ponerse detrás de Michael o al pedir la vista "El plató":
// cámara en trípode, dos ventanas de luz, un reflector y la marca en el suelo.
// Al hacer la foto, las ventanas de luz destellan (prop `flash`).
// Nada del plató proyecta sombra: ahorra llamadas en el mapa de sombras.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, MeshStandardMaterial } from 'three';

/** Materiales del plató, creados una vez y liberados al salir. */
function useStudioMaterials() {
  const mats = useMemo(
    () => ({
      metal: new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.35, metalness: 0.85 }),
      black: new MeshStandardMaterial({ color: '#141416', roughness: 0.55, side: DoubleSide }),
      body: new MeshStandardMaterial({ color: '#1d1d20', roughness: 0.4, metalness: 0.3 }),
      glass: new MeshStandardMaterial({ color: '#0a1420', roughness: 0.05, metalness: 0.6 }),
      silver: new MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.25, metalness: 0.9, side: DoubleSide }),
      tape: new MeshStandardMaterial({ color: '#e8c33a', roughness: 0.7 }),
      // Tela difusora de las ventanas de luz: emite, y el destello la sube.
      diffuser: new MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e2', emissiveIntensity: 1.6, side: DoubleSide }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** Pie de estudio de tres patas con una columna central. */
function Stand({ mats, height }) {
  return (
    <group>
      {/* Tres patas: cada una baja desde la columna hasta el suelo, hacia fuera. */}
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
          <mesh position={[0, 0.19, 0.16]} rotation={[-0.72, 0, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.011, 0.011, 0.5, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, height / 2, 0]} material={mats.metal}>
        <cylinderGeometry args={[0.016, 0.02, height, 10]} />
      </mesh>
    </group>
  );
}

/** Ventana de luz (softbox) que apunta a Michael. */
function Softbox({ mats, position, rotationY, diffuserRef }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Stand mats={mats} height={1.7} />
      <group position={[0, 1.75, 0]} rotation={[0.12, 0, 0]}>
        {/* Caja negra de tela en forma de pirámide; el difusor blanco la cierra delante. */}
        <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, Math.PI / 4, 0]} material={mats.black}>
          <cylinderGeometry args={[0.36, 0.08, 0.34, 4, 1]} />
        </mesh>
        <mesh ref={diffuserRef} position={[0, 0, -0.01]} material={mats.diffuser}>
          <planeGeometry args={[0.5, 0.5]} />
        </mesh>
      </group>
    </group>
  );
}

/** Cámara de medio formato sobre trípode, mirando a Michael. */
function Camera({ mats }) {
  return (
    <group position={[0.9, 0, 3.9]} rotation={[0, Math.PI + 0.23, 0]}>
      <Stand mats={mats} height={1.0} />
      <group position={[0, 1.07, 0]}>
        <mesh material={mats.body}>
          <boxGeometry args={[0.15, 0.13, 0.12]} />
        </mesh>
        <mesh position={[0, 0.085, -0.01]} material={mats.black}>
          <boxGeometry args={[0.1, 0.05, 0.09]} />
        </mesh>
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} material={mats.black}>
          <cylinderGeometry args={[0.042, 0.048, 0.12, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.172]} rotation={[Math.PI / 2, 0, 0]} material={mats.glass}>
          <cylinderGeometry args={[0.036, 0.036, 0.006, 20]} />
        </mesh>
      </group>
    </group>
  );
}

/** @param {{ flash: number | null }} props  `flash` = instante (s) de la última foto. */
export default function Studio({ flash }) {
  const mats = useStudioMaterials();
  // Los difusores se guardan por ref para cambiar su brillo sin estado de React.
  const diffusers = useRef(/** @type {import('three').Mesh[]} */ ([]));

  useFrame(() => {
    // Destello corto: el difusor sube mucho y vuelve en 0,4 s.
    let k = 0;
    if (flash !== null) {
      const dt = performance.now() / 1000 - flash;
      if (dt >= 0 && dt < 0.4) k = 1 - dt / 0.4;
    }
    const first = diffusers.current[0];
    if (first) first.material.emissiveIntensity = 1.6 + k * 10;
  });

  return (
    <group>
      <Softbox mats={mats} position={[-2.1, 0, 2.7]} rotationY={Math.PI - 0.66} diffuserRef={(m) => (diffusers.current[0] = m)} />
      <Softbox mats={mats} position={[2.3, 0, 2.2]} rotationY={Math.PI + 0.82} diffuserRef={(m) => (diffusers.current[1] = m)} />
      <Camera mats={mats} />
      {/* Reflector plateado en el suelo, a la izquierda de Michael. */}
      <group position={[-1.7, 0.42, 2.0]} rotation={[-0.35, 2.44, 0]}>
        <mesh material={mats.silver}>
          <circleGeometry args={[0.42, 40]} />
        </mesh>
      </group>
      {/* Marca en cruz donde se coloca Michael. */}
      {[0.6, -0.6].map((r) => (
        <mesh key={r} position={[0, 0.002, 0.04]} rotation={[-Math.PI / 2, 0, r]} material={mats.tape} receiveShadow>
          <planeGeometry args={[0.32, 0.035]} />
        </mesh>
      ))}
    </group>
  );
}
