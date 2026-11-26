import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function YhlqmdlgStreetDiorama({
  nodes,
  activePoi,
  onSelectPoi,
  onHoverChange,
  getBassEnergy,
  reduced,
}) {
  const boyRef = useRef(null);
  const flyingCarRef = useRef(null);
  const burningCarRef = useRef(null);
  const ladyDogRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;

    if (boyRef.current) {
      boyRef.current.position.y = Math.sin(t * 2.2) * 0.035 + bass * 0.05;
      boyRef.current.rotation.x = Math.sin(t * 1.8) * 0.03;
    }
    if (flyingCarRef.current) {
      flyingCarRef.current.position.y = 3.15 + Math.sin(t * 1.5) * 0.14 + bass * 0.08;
      flyingCarRef.current.rotation.z = Math.sin(t * 1.1) * 0.04;
    }
    if (burningCarRef.current) {
      const pulse = 1.0 + Math.sin(t * 14.0) * 0.015 + bass * 0.03;
      burningCarRef.current.scale.set(1, pulse, 1);
    }
    if (ladyDogRef.current) {
      ladyDogRef.current.position.y = Math.sin(t * 2.0 + 1.2) * 0.04;
    }
  });

  const bindPoi = (poiId, hoverLabel) => ({
    onClick: (e) => {
      e.stopPropagation();
      onSelectPoi(poiId);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverChange?.(hoverLabel);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onHoverChange?.(null);
    },
  });

  return (
    <group>
      {nodes.StreetEnvironment ? (
        <primitive
          object={nodes.StreetEnvironment}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}
      {nodes.BoyOnBike ? (
        <primitive
          ref={boyRef}
          object={nodes.BoyOnBike}
          {...bindPoi('boy', 'Niño del Tercer Ojo en BMX (Clic para acercar)')}
        />
      ) : null}
      {nodes.FlyingCar ? (
        <primitive
          ref={flyingCarRef}
          object={nodes.FlyingCar}
          {...bindPoi('flyingCar', 'Coche Volador con Faros (Clic para acercar)')}
        />
      ) : null}
      {nodes.BurningCar ? (
        <primitive
          ref={burningCarRef}
          object={nodes.BurningCar}
          {...bindPoi('burningCar', 'Coche en Llamas (Clic para acercar)')}
        />
      ) : null}
      <pointLight position={[-3.85, 1.35, -1.65]} color="#ff5500" intensity={3.2} distance={7} />
      {nodes.SparkingPole ? (
        <primitive
          object={nodes.SparkingPole}
          {...bindPoi('pole', 'Farola y Poste con Chispas (Clic para acercar)')}
        />
      ) : null}
      <pointLight position={[-4.45, 4.35, -2.85]} color="#45caff" intensity={3.2} distance={9} />
      {nodes.LadyAndDog ? (
        <primitive
          ref={ladyDogRef}
          object={nodes.LadyAndDog}
          {...bindPoi('ladyDog', 'Señora y Perro Volando (Clic para acercar)')}
        />
      ) : null}
    </group>
  );
}
