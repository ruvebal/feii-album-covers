// covers/badbunny/src/components/BlenderWorld.jsx — Blender 4.2 3D Diorama, Retro Listening Studio,
// 180-Degree Turntable, Playing-Card Vinyl Fan & 3D Record Placement Animation.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector2 } from 'three';
import BadBunnyMaterial from '../YhlqmdlgMaterial.jsx';
import { useAlbumCoverTexture, useStudioFrameTexture } from '../albumLabelTexture.js';
import { useBadBunnyKtx2 } from '../sleevePicture.js';

export const WORLD_GLB_URL = new URL('../../public/yhlqmdlg-world.glb', import.meta.url).href;

// Tonearm rotation angles around its gimbal pivot (1.10, 0.82, 6.72)
const TONEARM_REST_Y = 0.42; // Parked on the arm rest (needle off the record -> no music)
const TONEARM_PLAY_Y = 0.0; // Swung onto the vinyl grooves (needle touching -> music plays)

function Ktx2LabelBranch(props) {
  const texture = useBadBunnyKtx2('uastc');

  useEffect(() => {
    if (!texture) return undefined;
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return <BadBunnyMaterial map={texture} {...props} />;
}

function DownloadedAlbumLabelBranch({ albumId, ...props }) {
  const texture = useAlbumCoverTexture(albumId);
  return <BadBunnyMaterial map={texture} {...props} />;
}

function SleeveCoverArtMaterial({ albumId }) {
  const texture = useAlbumCoverTexture(albumId);
  return <meshStandardMaterial map={texture} roughness={0.42} metalness={0.04} />;
}

function StudioFramePhotoMaterial({ frameKey }) {
  const texture = useStudioFrameTexture(frameKey);
  return <meshStandardMaterial map={texture} roughness={0.42} metalness={0.04} />;
}

function VinylDeckCard({
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
      {/* 1. HALF-TUCKED BLACK VINYL RECORD */}
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

      {/* 2. SQUARE ALBUM SLEEVE JACKET */}
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

function PlacingVinylAnimation({ placingState, onFinishPlacing, reduced }) {
  const groupRef = useRef(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!placingState || !groupRef.current) return;
    const duration = reduced ? 0.08 : 1.15;
    progressRef.current = Math.min(1, progressRef.current + Math.min(delta, 0.05) / duration);
    const p = progressRef.current;

    const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const startX = placingState.startX ?? 0.05;
    const endX = -0.22;
    const x = startX + (endX - startX) * ease;

    const startY = 1.55;
    const endY = 0.75;
    const linearY = startY + (endY - startY) * ease;
    const arcLift = Math.sin(ease * Math.PI) * 0.55;
    const y = linearY + arcLift;

    const startZ = 5.55;
    const endZ = 7.5;
    const z = startZ + (endZ - startZ) * ease;

    groupRef.current.position.set(x, y, z);

    const startRotX = -1.15;
    const endRotX = 0.0;
    groupRef.current.rotation.set(startRotX + (endRotX - startRotX) * ease, ease * Math.PI, 0);

    const scale = 0.62 + 0.38 * ease;
    groupRef.current.scale.setScalar(scale);

    if (p >= 1) {
      onFinishPlacing(placingState.albumId);
    }
  });

  if (!placingState) return null;

  return (
    <group ref={groupRef} position={[placingState.startX ?? 0.05, 1.55, 5.55]}>
      <mesh>
        <cylinderGeometry args={[0.92, 0.92, 0.018, 64]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.24} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.6, 64]} />
        <meshBasicMaterial color="#1f2430" />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 0.78, 64]} />
        <meshBasicMaterial color="#1f2430" />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, Math.PI, 0]}>
        <circleGeometry args={[0.45, 64]} />
        <Suspense fallback={<meshBasicMaterial color="#27272a" />}>
          <SleeveCoverArtMaterial albumId={placingState.albumId} />
        </Suspense>
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 24]} />
        <meshBasicMaterial color="#050811" />
      </mesh>
    </group>
  );
}

export default function BlenderWorld({
  activeAlbumId = null,
  deckAlbums = [],
  showVinylDeck = true,
  placingState = null,
  onStartPlaceAlbum,
  onFinishPlaceAlbum,
  activePoi,
  onSelectPoi,
  needleOnRecord,
  onToggleNeedle,
  isPlaying,
  thirdEyeActive,
  activeTrack,
  getBassEnergy,
  reduced,
  onHoverChange,
}) {
  const { nodes } = useGLTF(WORLD_GLB_URL);
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null);

  const hasRecordSeated = Boolean(activeAlbumId) && !placingState;
  const showYhlqmdlgDiorama = hasRecordSeated && activeAlbumId === 'yhlqmdlg';
  const isAtTurntable = activePoi === 'turntable';
  const shouldShowDeck = isAtTurntable && showVinylDeck && !placingState && deckAlbums.length > 0;

  const boyRef = useRef(null);
  const flyingCarRef = useRef(null);
  const burningCarRef = useRef(null);
  const ladyDogRef = useRef(null);
  const poleRef = useRef(null);
  const platterGroupRef = useRef(null);
  const tonearmRef = useRef(null);
  const deckGroupRef = useRef(null);
  const turntableRootRef = useRef(null);
  const pointerUvRef = useRef(new Vector2(0.5, 0.63));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const bass = reduced ? 0 : getBassEnergy ? getBassEnergy() : 0;

    if (!reduced && showYhlqmdlgDiorama) {
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
    }

    if (deckGroupRef.current) {
      const targetDeckY = shouldShowDeck ? 1.27 : -1.6;
      deckGroupRef.current.position.y +=
        (targetDeckY - deckGroupRef.current.position.y) * (reduced ? 1.0 : 0.16);
      deckGroupRef.current.visible = deckGroupRef.current.position.y > -1.3;
    }

    if (platterGroupRef.current && !reduced) {
      const spinSpeed =
        hasRecordSeated && needleOnRecord ? (isPlaying ? 1.85 + bass * 0.9 : 1.15) : 0.0;
      platterGroupRef.current.rotation.y -= dt * spinSpeed;
    }

    if (tonearmRef.current) {
      const targetArmY = hasRecordSeated && needleOnRecord ? TONEARM_PLAY_Y : TONEARM_REST_Y;
      const targetArmX = hasRecordSeated && needleOnRecord ? 0.035 : -0.05;
      tonearmRef.current.rotation.y +=
        (targetArmY - tonearmRef.current.rotation.y) * (reduced ? 1.0 : 0.14);
      tonearmRef.current.rotation.x +=
        (targetArmX - tonearmRef.current.rotation.x) * (reduced ? 1.0 : 0.14);
    }
  });

  const bindPoiMesh = (poiId, hoverLabel) => ({
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

  const fallbackLabelMat = (
    <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.2} />
  );

  const sharedShaderProps = {
    thirdEyeActive,
    pointerUvRef,
    tintRgb: activeTrack?.tint || [0.0, 0.94, 1.0],
    getBassEnergy,
    reduced,
  };

  let centerLabelMaterial = fallbackLabelMat;
  if (activeAlbumId && activeAlbumId !== 'yhlqmdlg') {
    centerLabelMaterial = (
      <DownloadedAlbumLabelBranch
        key={activeAlbumId}
        albumId={activeAlbumId}
        {...sharedShaderProps}
      />
    );
  } else if (activeAlbumId === 'yhlqmdlg') {
    centerLabelMaterial = <Ktx2LabelBranch {...sharedShaderProps} />;
  }

  return (
    <group>
      {/* OPPOSITE SIDE (Z < 0): YHLQMDLG 3D Diorama */}
      {showYhlqmdlgDiorama ? (
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
              {...bindPoiMesh('boy', 'Niño del Tercer Ojo en BMX (Clic para acercar)')}
            />
          ) : null}

          {nodes.FlyingCar ? (
            <primitive
              ref={flyingCarRef}
              object={nodes.FlyingCar}
              {...bindPoiMesh('flyingCar', 'Coche Volador con Faros (Clic para acercar)')}
            />
          ) : null}

          {nodes.BurningCar ? (
            <primitive
              ref={burningCarRef}
              object={nodes.BurningCar}
              {...bindPoiMesh('burningCar', 'Coche en Llamas (Clic para acercar)')}
            />
          ) : null}
          <pointLight position={[-3.85, 1.35, -1.65]} color="#ff5500" intensity={3.2} distance={7} />

          {nodes.SparkingPole ? (
            <primitive
              ref={poleRef}
              object={nodes.SparkingPole}
              {...bindPoiMesh('pole', 'Farola y Poste con Chispas (Clic para acercar)')}
            />
          ) : null}
          <pointLight position={[-4.45, 4.35, -2.85]} color="#45caff" intensity={3.2} distance={9} />

          {nodes.LadyAndDog ? (
            <primitive
              ref={ladyDogRef}
              object={nodes.LadyAndDog}
              {...bindPoiMesh('ladyDog', 'Señora y Perro Volando (Clic para acercar)')}
            />
          ) : null}
        </group>
      ) : null}

      {/* REAR 180-DEGREE TURNTABLE (Z = +7.5), RETRO LISTENING STUDIO & FOREGROUND CARD DECK */}
      <group ref={turntableRootRef}>
        {/* 1. FOREGROUND PLAYING-CARD-STYLE VINYL DECK */}
        <group
          ref={deckGroupRef}
          position={[0.05, 1.27, 5.55]}
          rotation={[0, Math.PI, 0]}
        >
          <group rotation={[-0.38, 0, 0]}>
            {deckAlbums.map((album, idx) => (
              <VinylDeckCard
                key={album.id}
                album={album}
                index={idx}
                total={deckAlbums.length}
                hoveredIndex={hoveredCardIndex}
                onHoverCard={setHoveredCardIndex}
                onSelectCard={onStartPlaceAlbum}
                onHoverChange={onHoverChange}
                reduced={reduced}
              />
            ))}
          </group>

          <pointLight position={[0, 0.55, 1.1]} color="#fff7ed" intensity={1.8} distance={4.5} />
        </group>

        {/* 2. 3D ANIMATION OF PLACING THE VINYL ONTO THE TURNTABLE */}
        {placingState ? (
          <PlacingVinylAnimation
            key={`${placingState.albumId}-${placingState.startedAt}`}
            placingState={placingState}
            onFinishPlacing={onFinishPlaceAlbum}
            reduced={reduced}
          />
        ) : null}

        {/* 2.5. Retro Vinyl Studio / Listening Corner Behind & Under the Turntable */}
        {nodes.TurntableStudioRoom ? <primitive object={nodes.TurntableStudioRoom} /> : null}

        {/* Framed Photos (Puerto Rico Flag & Bad Bunny Portrait) inside the two center wall gallery frames */}
        <mesh position={[-0.5, 1.92, 9.31]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.62, 0.62]} />
          <Suspense fallback={<meshStandardMaterial color="#1e293b" />}>
            <StudioFramePhotoMaterial frameKey="banderaPr" />
          </Suspense>
        </mesh>
        <mesh position={[0.5, 1.92, 9.31]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.62, 0.62]} />
          <Suspense fallback={<meshStandardMaterial color="#1e293b" />}>
            <StudioFramePhotoMaterial frameKey="badBunny" />
          </Suspense>
        </mesh>

        {/* Warm Retro Mushroom Lamp PointLight illuminating the studio wall & turntable */}
        <pointLight position={[-1.32, 1.38, 8.85]} color="#ffaa44" intensity={2.2} distance={5.5} />

        {/* 3. Turntable Plinth Base */}
        {nodes.TurntableBase ? (
          <primitive
            object={nodes.TurntableBase}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasRecordSeated) return;
              if (activePoi !== 'turntable') {
                onSelectPoi('turntable');
              } else {
                onToggleNeedle();
              }
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverChange?.(
                hasRecordSeated
                  ? 'Tocadiscos (Clic para apoyar o levantar la aguja)'
                  : 'Tocadiscos vacío — Elige primero un vinilo de la baraja para ponerlo',
              );
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHoverChange?.(null);
            }}
          />
        ) : null}

        {/* Empty Platter Rubber Slipmat & Spindle */}
        {!hasRecordSeated ? (
          <group position={[-0.22, 0.72, 7.5]}>
            <mesh position={[0, 0.01, 0]}>
              <cylinderGeometry args={[0.92, 0.94, 0.03, 48]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.07, 16]} />
              <meshStandardMaterial color="#d4d4d8" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        ) : null}

        {/* Seated Vinyl Record + Circular Album Cover Center Label */}
        <group
          ref={platterGroupRef}
          position={[-0.22, 0.72, 7.5]}
          visible={hasRecordSeated}
          onClick={(e) => {
            e.stopPropagation();
            if (!hasRecordSeated) return;
            if (activePoi !== 'turntable') {
              onSelectPoi('turntable');
            } else {
              onToggleNeedle();
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!hasRecordSeated) return;
            onHoverChange?.(
              needleOnRecord
                ? 'Vinilo girando (Clic para levantar aguja y parar música)'
                : 'Vinilo en el plato (Clic para bajar la aguja al disco y reproducir)',
            );
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHoverChange?.(null);
            pointerUvRef.current.set(0.5, 0.63);
          }}
          onPointerMove={(e) => {
            if (e.uv) {
              pointerUvRef.current.copy(e.uv);
            }
          }}
        >
          {nodes.TurntablePlatter ? (
            <primitive object={nodes.TurntablePlatter} position={[0, 0, 0]} />
          ) : null}

          {hasRecordSeated ? (
            <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, Math.PI, 0]}>
              <circleGeometry args={[0.46, 64]} />
              <Suspense fallback={fallbackLabelMat}>{centerLabelMaterial}</Suspense>
            </mesh>
          ) : null}
        </group>

        {/* Interactive Pivoting Tonearm */}
        {nodes.TurntableTonearm ? (
          <primitive
            ref={tonearmRef}
            object={nodes.TurntableTonearm}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasRecordSeated) return;
              if (activePoi !== 'turntable') {
                onSelectPoi('turntable');
              }
              onToggleNeedle();
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverChange?.(
                !hasRecordSeated
                  ? 'Brazo del tocadiscos — Pon primero un disco en el plato'
                  : needleOnRecord
                    ? 'Aguja sobre el vinilo · Sonando (Clic para levantar aguja)'
                    : 'Aguja levantada · Silencio (Clic para apoyar aguja en el disco)',
              );
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHoverChange?.(null);
            }}
          />
        ) : null}

        {/* Warm natural key light illuminating the rear Turntable */}
        <pointLight position={[0.0, 2.6, 7.5]} color="#fff7ed" intensity={2.8} distance={7} />
      </group>
    </group>
  );
}
