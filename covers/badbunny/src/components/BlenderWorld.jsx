import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector2 } from 'three';
import BadBunnyMaterial from '../YhlqmdlgMaterial.jsx';
import { useAlbumCoverTexture, useStudioFrameTexture } from '../albumLabelTexture.js';
import { useBadBunnyKtx2 } from '../sleevePicture.js';
import PlacingVinylAnimation from './PlacingVinylAnimation.jsx';
import VinylDeckCard from './VinylDeckCard.jsx';
import YhlqmdlgStreetDiorama from './YhlqmdlgStreetDiorama.jsx';

export const WORLD_GLB_URL = new URL('../../public/yhlqmdlg-world.glb', import.meta.url).href;

const TONEARM_REST_Y = 0.42;
const TONEARM_PLAY_Y = 0.0;

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

function LocalAlbumLabelBranch({ albumId, ...props }) {
  const texture = useAlbumCoverTexture(albumId);
  return <BadBunnyMaterial map={texture} {...props} />;
}

function StudioFramePhotoMaterial({ frameKey }) {
  const texture = useStudioFrameTexture(frameKey);
  return <meshStandardMaterial map={texture} roughness={0.42} metalness={0.04} />;
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

  const platterGroupRef = useRef(null);
  const tonearmRef = useRef(null);
  const deckGroupRef = useRef(null);
  const pointerUvRef = useRef(new Vector2(0.5, 0.63));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const bass = reduced ? 0 : getBassEnergy ? getBassEnergy() : 0;

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
      <LocalAlbumLabelBranch
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
      {showYhlqmdlgDiorama ? (
        <YhlqmdlgStreetDiorama
          nodes={nodes}
          activePoi={activePoi}
          onSelectPoi={onSelectPoi}
          onHoverChange={onHoverChange}
          getBassEnergy={getBassEnergy}
          reduced={reduced}
        />
      ) : null}

      <group>
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

        {placingState ? (
          <PlacingVinylAnimation
            key={`${placingState.albumId}-${placingState.startedAt}`}
            placingState={placingState}
            onFinishPlacing={onFinishPlaceAlbum}
            reduced={reduced}
          />
        ) : null}

        {nodes.TurntableStudioRoom ? <primitive object={nodes.TurntableStudioRoom} /> : null}

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

        <pointLight position={[-1.32, 1.38, 8.85]} color="#ffaa44" intensity={2.2} distance={5.5} />

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

        <pointLight position={[0.0, 2.6, 7.5]} color="#fff7ed" intensity={2.8} distance={7} />
      </group>
    </group>
  );
}
