// covers/badbunny/src/components/AlbumMaquetaStage.jsx — Full Blender 3D Album Worlds (180° opposite the turntable).
//
// When the user selects DTmF, Un Verano Sin Ti, or El Último Tour Del Mundo on the turntable
// and turns 180°, this component renders the full Blender-authored 3D scene matching the original
// album cover framing from `CAMERA_POIS.overview`, including `sapo_concho.glb` in DTmF.

import { Suspense, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { BackSide } from 'three';

export const SAPO_CONCHO_GLB_URL = new URL('../../public/sapo_concho.glb', import.meta.url).href;
export const EUTDM_WORLD_GLB_URL = new URL('../../public/eutdm-world.glb', import.meta.url).href;
export const DTMF_WORLD_GLB_URL = new URL('../../public/dtmf-world.glb', import.meta.url).href;
export const UVST_WORLD_GLB_URL = new URL('../../public/uvst-world.glb', import.meta.url).href;

const NOOP_RAYCAST = () => null;

function SapoConchoModel({ onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { scene } = useGLTF(SAPO_CONCHO_GLB_URL);
  const sapoRef = useRef(null);

  // Disable per-triangle CPU raycasting on the detailed frog mesh;
  // a lightweight low-poly bounding cylinder handles hover/click instead.
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.raycast = NOOP_RAYCAST;
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (!sapoRef.current || reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;
    // Subtle breathing / rhythm bounce on Sapo Concho standing in the patio clearing
    sapoRef.current.position.y = 0.68 + Math.sin(t * 2.4) * 0.025 + bass * 0.065;
    sapoRef.current.rotation.y = Math.sin(t * 0.9) * 0.1;
  });

  return (
    <group ref={sapoRef} position={[-0.02, 0.68, 1.55]} scale={0.72}>
      <primitive object={scene} />
      {/* Lightweight proxy hitbox (24 triangles) so mouse hover/zoom never lags */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelectPoi('dtmfSapoConcho');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange?.('🐸 Sapo Concho de DTmF en el Patio Boricua (Clic para acercar)');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange?.(null);
        }}
      >
        <cylinderGeometry args={[0.5, 0.5, 1.85, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EutdmBlenderStage({ activePoi, onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { nodes } = useGLTF(EUTDM_WORLD_GLB_URL);
  const truckRef = useRef(null);
  const badBunnyRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;

    // Subtle V8 diesel engine idle rumble + bass pulse on the Peterbilt 379 truck
    if (truckRef.current) {
      truckRef.current.position.y = Math.sin(t * 26.0) * 0.004 + bass * 0.025;
      truckRef.current.rotation.z = Math.sin(t * 13.0) * 0.002;
    }

    // Subtle breathing / coat wind sway on Bad Bunny standing atop the hood
    if (badBunnyRef.current) {
      badBunnyRef.current.position.y = Math.sin(t * 2.4) * 0.012 + bass * 0.035;
      badBunnyRef.current.rotation.y = Math.sin(t * 1.1) * 0.025;
    }
  });

  const bindMeshPoi = (poiId, label) => ({
    onClick: (e) => {
      e.stopPropagation();
      onSelectPoi(poiId);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverChange?.(label);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onHoverChange?.(null);
    },
  });

  return (
    <group>
      {/* 1. Desert Highway, Yellow Shoulder Line, Prairie & Apocalyptic Crimson/Starry Sky */}
      {nodes.EutdmDesertHighway ? (
        <primitive
          object={nodes.EutdmDesertHighway}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}

      {/* 2. Front-Facing Peterbilt 379 Semi-Truck (Facing Camera +Z, License Plate YHLQMDLG) */}
      {nodes.EutdmPeterbiltTruck ? (
        <primitive
          ref={truckRef}
          object={nodes.EutdmPeterbiltTruck}
          {...bindMeshPoi(
            'eutdmFrontGrille',
            '🚛 Peterbilt 379 de Frente · Parrilla Cromada y Matrícula YHLQMDLG (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 3. Bad Bunny Standing on Top of the Truck Hood */}
      {nodes.EutdmBadBunny ? (
        <primitive
          ref={badBunnyRef}
          object={nodes.EutdmBadBunny}
          {...bindMeshPoi(
            'eutdmBadBunnyHood',
            '🐰 Bad Bunny sobre el Capó del Camión (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 4. Telegraph Poles & Overhead Power Lines on the Left */}
      {nodes.EutdmTelegraphPoles ? (
        <primitive
          object={nodes.EutdmTelegraphPoles}
          {...bindMeshPoi(
            'eutdmPolesHighway',
            '🏜️ Poste Eléctrico, Cables y Autopista del Desierto (Clic para acercar)',
          )}
        />
      ) : null}

      {/* Dramatic Sunset & Chrome Reflection Lighting matching the Album Cover */}
      <pointLight position={[0.0, 2.2, 4.2]} color="#ffd8be" intensity={3.2} distance={14} />
      <pointLight position={[0.0, 0.45, 2.65]} color="#ff8c1a" intensity={2.6} distance={6} />
      <pointLight position={[0.0, 3.8, -4.5]} color="#ff2a00" intensity={5.0} distance={18} />
    </group>
  );
}

function DtmfBlenderStage({ activePoi, onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { nodes } = useGLTF(DTMF_WORLD_GLB_URL);
  const plantainRef = useRef(null);
  const groveRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;

    // Gentle tropical breeze sway on the hanging green plantain bunch + bass pulse
    if (plantainRef.current) {
      plantainRef.current.rotation.z = Math.sin(t * 1.6) * 0.018 + bass * 0.025;
      plantainRef.current.position.y = Math.sin(t * 2.2) * 0.008 + bass * 0.02;
    }

    // Subtle wind rustle on the banana leaves & realistic pinnate coconut palms
    if (groveRef.current) {
      groveRef.current.rotation.z = Math.sin(t * 1.1) * 0.006;
    }
  });

  const bindMeshPoi = (poiId, label) => ({
    onClick: (e) => {
      e.stopPropagation();
      onSelectPoi(poiId);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverChange?.(label);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onHoverChange?.(null);
    },
  });

  return (
    <group>
      {/* 1. Patio Ground: Patchy Red-Brown Soil, Dry Straw & 320 Tropical Grass Tufts */}
      {nodes.DtmfPatioGround ? (
        <primitive
          object={nodes.DtmfPatioGround}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}

      {/* 2. The Two Iconic White Plastic Monoblock Chairs (Exact Cover Framing) */}
      {nodes.DtmfPlasticChairs ? (
        <primitive
          object={nodes.DtmfPlasticChairs}
          {...bindMeshPoi(
            'dtmfChairs',
            '🪑 Las Dos Sillas Plásticas Blancas de DTmF (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 3. Lush Banana Grove, Realistic Pinnate Coconut Palms, Dried Sheaths & Monte Shrub */}
      {nodes.DtmfBananaGrove ? (
        <primitive
          ref={groveRef}
          object={nodes.DtmfBananaGrove}
          {...bindMeshPoi(
            'dtmfBananaGrove',
            '🌴 Palmeras Reales, Matas de Plátano y Monte Boricua (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 4. Hanging Green Plantain Bunch ("Racimo de Plátanos") */}
      {nodes.DtmfPlantainBunch ? (
        <primitive
          ref={plantainRef}
          object={nodes.DtmfPlantainBunch}
          {...bindMeshPoi(
            'dtmfPlantains',
            '🍌 Racimo de Plátanos Verdes Colgando (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 5. 3D Model: El Sapo Concho (`sapo_concho.glb`) standing between the two white chairs! */}
      <Suspense fallback={null}>
        <SapoConchoModel
          onSelectPoi={onSelectPoi}
          onHoverChange={onHoverChange}
          getBassEnergy={getBassEnergy}
          reduced={reduced}
        />
      </Suspense>

      {/* Warm Puerto Rican Daylight & Tropical Canopy Bounce Lighting */}
      <pointLight position={[0.5, 3.8, 3.5]} color="#fffbeb" intensity={2.8} distance={15} />
      <pointLight position={[-1.5, 2.2, 3.2]} color="#dcfce7" intensity={1.8} distance={12} />
      <pointLight position={[0.0, 2.6, 0.5]} color="#bef264" intensity={1.6} distance={10} />
    </group>
  );
}

function UvstBlenderStage({ activePoi, onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { nodes } = useGLTF(UVST_WORLD_GLB_URL);
  const heartRef = useRef(null);
  const palmsRef = useRef(null);
  const dolphinsRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;

    // Subtle heartbeat bounce & sway on the Sad Cyclops Heart character
    if (heartRef.current) {
      heartRef.current.position.y = Math.sin(t * 2.2) * 0.025 + bass * 0.055;
      heartRef.current.rotation.z = Math.sin(t * 1.1) * 0.015;
    }

    // Gentle Caribbean sea breeze on the pinnate coconut palm trees
    if (palmsRef.current) {
      palmsRef.current.rotation.z = Math.sin(t * 1.4) * 0.008;
    }

    // Smooth wave arc motion on the two leaping lavender dolphins
    if (dolphinsRef.current) {
      dolphinsRef.current.position.y = Math.sin(t * 1.8) * 0.035 + bass * 0.04;
      dolphinsRef.current.rotation.z = Math.cos(t * 1.8) * 0.015;
    }
  });

  const bindMeshPoi = (poiId, label) => ({
    onClick: (e) => {
      e.stopPropagation();
      onSelectPoi(poiId);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverChange?.(label);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onHoverChange?.(null);
    },
  });

  return (
    <group>
      {/* 1. Golden-Orange Sand Dunes, 4 Pink Flowers, Turquoise Sea, Coral Sky & Spiky Sun */}
      {nodes.UvstBeachSunset ? (
        <primitive
          object={nodes.UvstBeachSunset}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}

      {/* 2. Iconic 3D Sad Cyclops Heart Character (Centered in Frame like the Cover) */}
      {nodes.UvstSadHeart ? (
        <primitive
          ref={heartRef}
          object={nodes.UvstSadHeart}
          {...bindMeshPoi(
            'uvstSadHeart',
            '❤️ Corazón Triste de Un Verano Sin Ti (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 3. Realistic Pinnate Coconut Palm Trees on Left & Right Sand Dunes */}
      {nodes.UvstPalmTrees ? (
        <primitive
          ref={palmsRef}
          object={nodes.UvstPalmTrees}
          {...bindMeshPoi(
            'uvstPalmsBeach',
            '🌴 Palmeras Cocoteras y Dunas Doradas (Clic para acercar)',
          )}
        />
      ) : null}

      {/* 4. Two Leaping Lavender-Blue Dolphins in the Upper-Left Sky */}
      {nodes.UvstDolphins ? (
        <primitive
          ref={dolphinsRef}
          object={nodes.UvstDolphins}
          {...bindMeshPoi(
            'uvstDolphinsSun',
            '🐬 Delfines Saltando y Sol con Gaviotas (Clic para acercar)',
          )}
        />
      ) : null}

      {/* Warm Caribbean Sunset & Beach Fill Lighting */}
      <pointLight position={[0.0, 3.2, 4.0]} color="#fff7ed" intensity={2.4} distance={16} />
      <pointLight position={[1.5, 3.5, -2.5]} color="#fde047" intensity={2.8} distance={16} />
    </group>
  );
}

export default function AlbumMaquetaStage({
  album,
  activePoi,
  onSelectPoi,
  getBassEnergy,
  reduced,
  onHoverChange,
}) {
  return (
    <group>
      {/* Enclosing Sky Dome tinted to the selected album */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[22, 24, 18]} />
        <meshBasicMaterial color={album.bgHex} side={BackSide} />
      </mesh>

      {/* =====================================================================
          ESCENARIO A: DTmF — DeBÍ TiRAR MáS FOToS (2025) — Full Blender 3D Scene
          Patio puertorriqueño idéntico a la portada desde la cámara:
          las dos sillas plásticas blancas, el Sapo Concho 3D (`sapo_concho.glb`),
          el racimo de plátanos verdes colgando, matas de plátano y palmeras reales.
         ===================================================================== */}
      {album.id === 'dtmf' ? (
        <Suspense fallback={null}>
          <DtmfBlenderStage
            activePoi={activePoi}
            onSelectPoi={onSelectPoi}
            onHoverChange={onHoverChange}
            getBassEnergy={getBassEnergy}
            reduced={reduced}
          />
        </Suspense>
      ) : null}

      {/* =====================================================================
          ESCENARIO B: Un Verano Sin Ti (2022) — Full Blender 3D Scene
          Playa caribeña idéntica a la portada desde la cámara:
          Corazón Triste cíclope de frente con guantes blancos y botas sobre la arena,
          dos palmeras cocoteras reales con hojas pinnadas, dos delfines lavanda
          saltando, flores rosas en primer plano y el sol amarillo con rayos rojos.
         ===================================================================== */}
      {album.id === 'uvst' ? (
        <Suspense fallback={null}>
          <UvstBlenderStage
            activePoi={activePoi}
            onSelectPoi={onSelectPoi}
            onHoverChange={onHoverChange}
            getBassEnergy={getBassEnergy}
            reduced={reduced}
          />
        </Suspense>
      ) : null}

      {/* =====================================================================
          ESCENARIO C: El Último Tour Del Mundo (2020) — Full Blender 3D Scene
          Camión Peterbilt 379 de frente (matrícula YHLQMDLG, 15 luces ámbar,
          parrilla cromada de 4 columnas y Bad Bunny sobre el capó) en la
          autopista desértica bajo el cielo rojo y estrellado de la portada.
         ===================================================================== */}
      {album.id === 'eutdm' ? (
        <Suspense fallback={null}>
          <EutdmBlenderStage
            activePoi={activePoi}
            onSelectPoi={onSelectPoi}
            onHoverChange={onHoverChange}
            getBassEnergy={getBassEnergy}
            reduced={reduced}
          />
        </Suspense>
      ) : null}
    </group>
  );
}
