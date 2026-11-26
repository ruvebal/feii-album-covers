import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAlbumCoverTexture } from '../albumLabelTexture.js';

export function SleeveCoverArtMaterial({ albumId }) {
  const texture = useAlbumCoverTexture(albumId);
  return <meshStandardMaterial map={texture} roughness={0.42} metalness={0.04} />;
}

export default function VinylDeckCard({
  album,
  index,
  total,
  hoveredIndex,
  onHoverCard,
  onSelectCard,
  onHoverChange,
  reduced,
}) {
  const cardGroupRef = useRef(null);
  const discGroupRef = useRef(null);

  const isHovered = hoveredIndex === index;
  const offset = index - (total - 1) / 2;

  const baseX = offset * 0.36;
  const baseY = -Math.abs(offset) * 0.075;
  const baseZ = index * 0.042;
  const baseRotZ = -offset * 0.175;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const lerpFactor = reduced ? 1.0 : 0.18;

    if (cardGroupRef.current) {
      let targetX = baseX;
      let targetY = baseY;
      let targetZ = baseZ;
      let targetRotZ = baseRotZ;
      let targetScale = 1.0;

      if (isHovered) {
        targetX = baseX + offset * 0.04;
        targetY = baseY + 0.25;
        targetZ = 0.26;
        targetRotZ = baseRotZ * 0.32;
        targetScale = 1.15;
      } else if (hoveredIndex !== null) {
        const pushDir = index < hoveredIndex ? -1 : 1;
        targetX = baseX + pushDir * 0.075;
        targetY = baseY - 0.03;
        targetZ = baseZ - 0.02;
      }

      cardGroupRef.current.position.x += (targetX - cardGroupRef.current.position.x) * lerpFactor;
      cardGroupRef.current.position.y += (targetY - cardGroupRef.current.position.y) * lerpFactor;
      cardGroupRef.current.position.z += (targetZ - cardGroupRef.current.position.z) * lerpFactor;
      cardGroupRef.current.rotation.z +=
        (targetRotZ - cardGroupRef.current.rotation.z) * lerpFactor;

      const s =
        cardGroupRef.current.scale.x + (targetScale - cardGroupRef.current.scale.x) * lerpFactor;
      cardGroupRef.current.scale.setScalar(s);
    }

    if (discGroupRef.current) {
      const targetDiscX = isHovered ? 0.13 : 0.085;
      const targetDiscY = isHovered ? 0.32 : 0.21;
      discGroupRef.current.position.x +=
        (targetDiscX - discGroupRef.current.position.x) * lerpFactor;
      discGroupRef.current.position.y +=
        (targetDiscY - discGroupRef.current.position.y) * lerpFactor;

      if (isHovered && !reduced) {
        discGroupRef.current.rotation.z -= dt * 1.1;
      }
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    onHoverCard(index);
    onHoverChange?.(
      `💿 ${album.title} (${album.year}) — Haz clic para poner este vinilo en el tocadiscos`,
    );
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    onHoverCard((prev) => (prev === index ? null : prev));
    onHoverChange?.(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onHoverCard(null);
    onHoverChange?.(null);
    const worldStartX = 0.05 - baseX;
    onSelectCard(album.id, worldStartX);
  };

  return (
    <group
      ref={cardGroupRef}
      position={[baseX, baseY, baseZ]}
      rotation={[0, 0, baseRotZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <group ref={discGroupRef} position={[0.085, 0.21, -0.004]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.275, 0.275, 0.008, 48]} />
          <meshStandardMaterial color="#0b0c10" roughness={0.26} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[0.165, 0.172, 48]} />
          <meshBasicMaterial color="#1f2430" />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[0.225, 0.232, 48]} />
          <meshBasicMaterial color="#1f2430" />
        </mesh>
        <mesh position={[0, 0, 0.0055]}>
          <circleGeometry args={[0.098, 36]} />
          <Suspense fallback={<meshBasicMaterial color="#27272a" />}>
            <SleeveCoverArtMaterial albumId={album.id} />
          </Suspense>
        </mesh>
        <mesh position={[0, 0, 0.0065]}>
          <circleGeometry args={[0.016, 20]} />
          <meshBasicMaterial color="#050811" />
        </mesh>
      </group>

      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial color="#141418" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[0.604, 0.604, 0.008]} />
        <meshStandardMaterial color="#1c1c22" roughness={0.78} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={[0.59, 0.59]} />
        <Suspense fallback={<meshStandardMaterial color="#1e293b" />}>
          <SleeveCoverArtMaterial albumId={album.id} />
        </Suspense>
      </mesh>
    </group>
  );
}
