// covers/yhlqmdlg/src/components/BlenderWorld.jsx — Blender 4.2 3D Diorama & 180-Degree Turntable.
//
// Loads `covers/yhlqmdlg/public/yhlqmdlg-world.glb` (modeled and exported with Blender 4.2 LTS)
// via a route-relative URL (`new URL('../../public/yhlqmdlg-world.glb', import.meta.url).href`).
//
// Interactive 3D elements in the front street diorama:
//   - BoyOnBike: The 3-eyed boy popping a wheelie on his blue BMX
//   - FlyingCar: The 80s sedan flying in the stormy sky with blazing headlight cones
//   - BurningCar: The car engulfed in 3D flames on the left side of the road
//   - LadyAndDog: The shocked lady in her robe with her flying chihuahua and trash cans
//   - SparkingPole: The leaning utility pole and streetlamp shooting electric sparks
//
// 180-Degree Rear Turntable (`Z = +7.5`, behind the initial camera):
//   - No vinyl sleeve! Only the turntable deck (`TurntableBase`), spinning 33 RPM record
//     (`TurntablePlatter`) with our custom GLSL shader (`YhlqmdlgMaterial`) + KTX2/PNG album cover
//     printed on the circular center label, and the pivoting needle (`TurntableTonearm`).
//   - Clicking the tonearm or vinyl toggles `needleOnRecord`. Music ONLY plays while the needle
//     is physically touching the record!

import { Suspense, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector2 } from 'three';
import YhlqmdlgMaterial from '../YhlqmdlgMaterial.jsx';
import {
  inspectSleeveTexture,
  useYhlqmdlgKtx2,
  useYhlqmdlgPng,
} from '../sleevePicture.js';

export const WORLD_GLB_URL = new URL('../../public/yhlqmdlg-world.glb', import.meta.url).href;

// Tonearm rotation angles around its gimbal pivot (1.10, 0.82, 6.72)
const TONEARM_REST_Y = 0.42; // Parked on the arm rest (needle off the record -> no music)
const TONEARM_PLAY_Y = 0.0; // Swung onto the vinyl grooves (needle touching -> music plays!)

function MeasuredCenterLabel({
  texture,
  mode,
  onTextureInfo,
  thirdEyeActive,
  pointerUvRef,
  tintRgb,
  getBassEnergy,
  reduced,
}) {
  useEffect(() => {
    const info = inspectSleeveTexture(texture, mode);
    onTextureInfo?.(info);
    return () => {
      texture.dispose();
    };
  }, [texture, mode, onTextureInfo]);

  return (
    <YhlqmdlgMaterial
      map={texture}
      thirdEyeActive={thirdEyeActive}
      pointerUvRef={pointerUvRef}
      tintRgb={tintRgb}
      getBassEnergy={getBassEnergy}
      reduced={reduced}
    />
  );
}

function PngLabelBranch(props) {
  const texture = useYhlqmdlgPng();
  return <MeasuredCenterLabel texture={texture} mode="png" {...props} />;
}

function Ktx2LabelBranch({ mode, ...props }) {
  const texture = useYhlqmdlgKtx2(mode);
  return <MeasuredCenterLabel texture={texture} mode={mode} {...props} />;
}

export default function BlenderWorld({
  textureMode,
  onTextureInfo,
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

  const boyRef = useRef(null);
  const flyingCarRef = useRef(null);
  const burningCarRef = useRef(null);
  const ladyDogRef = useRef(null);
  const poleRef = useRef(null);
  const platterGroupRef = useRef(null);
  const tonearmRef = useRef(null);
  const pointerUvRef = useRef(new Vector2(0.5, 0.63));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const bass = reduced ? 0 : getBassEnergy ? getBassEnergy() : 0;

    if (!reduced) {
      // Subtle wheelie balance rock on the Boy on BMX
      if (boyRef.current) {
        boyRef.current.position.y = Math.sin(t * 2.2) * 0.035 + bass * 0.05;
        boyRef.current.rotation.x = Math.sin(t * 1.8) * 0.03;
      }

      // Levitation hover on the Flying Car
      if (flyingCarRef.current) {
        flyingCarRef.current.position.y = 3.15 + Math.sin(t * 1.5) * 0.14 + bass * 0.08;
        flyingCarRef.current.rotation.z = Math.sin(t * 1.1) * 0.04;
      }

      // Flickering pulse on the Burning Car flames
      if (burningCarRef.current) {
        const pulse = 1.0 + Math.sin(t * 14.0) * 0.015 + bass * 0.03;
        burningCarRef.current.scale.set(1, pulse, 1);
      }

      // Floating motion on the Lady & Flying Chihuahua
      if (ladyDogRef.current) {
        ladyDogRef.current.position.y = Math.sin(t * 2.0 + 1.2) * 0.04;
      }
    }

    // Spin the Turntable Platter + Circular Album Center when the needle touches the record!
    if (platterGroupRef.current && !reduced) {
      const spinSpeed = needleOnRecord ? (isPlaying ? 1.85 + bass * 0.9 : 1.15) : 0.0;
      platterGroupRef.current.rotation.y -= dt * spinSpeed;
    }

    // Pivot the Tonearm between Rest (off record) and Play (needle touching vinyl grooves)
    if (tonearmRef.current) {
      const targetArmY = needleOnRecord ? TONEARM_PLAY_Y : TONEARM_REST_Y;
      const targetArmX = needleOnRecord ? 0.035 : -0.05; // Lower needle slightly onto disc when engaged
      tonearmRef.current.rotation.y += (targetArmY - tonearmRef.current.rotation.y) * (reduced ? 1.0 : 0.14);
      tonearmRef.current.rotation.x += (targetArmX - tonearmRef.current.rotation.x) * (reduced ? 1.0 : 0.14);
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
    <meshStandardMaterial color="#181230" roughness={0.5} metalness={0.2} />
  );

  const sharedShaderProps = {
    onTextureInfo,
    thirdEyeActive,
    pointerUvRef,
    tintRgb: activeTrack.tint,
    getBassEnergy,
    reduced,
  };

  let centerLabelMaterial = fallbackLabelMat;
  if (textureMode === 'png') {
    centerLabelMaterial = <PngLabelBranch {...sharedShaderProps} />;
  } else if (textureMode === 'etc1s' || textureMode === 'uastc') {
    centerLabelMaterial = (
      <Ktx2LabelBranch key={textureMode} mode={textureMode} {...sharedShaderProps} />
    );
  }

  return (
    <group>
      {/* 1. Street Environment (Dutch-angle tilted street, houses, palms, parked cars, ice cream truck) */}
      {nodes.StreetEnvironment ? (
        <primitive
          object={nodes.StreetEnvironment}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}

      {/* 2. Interactive POI: The 3-Eyed Boy on the Blue BMX Bike */}
      {nodes.BoyOnBike ? (
        <primitive
          ref={boyRef}
          object={nodes.BoyOnBike}
          {...bindPoiMesh('boy', 'Niño del Tercer Ojo en BMX (Clic para acercar)')}
        />
      ) : null}

      {/* 3. Interactive POI: The Flying 80s Sedan with Blazing Headlights */}
      {nodes.FlyingCar ? (
        <primitive
          ref={flyingCarRef}
          object={nodes.FlyingCar}
          {...bindPoiMesh('flyingCar', 'Coche Volador con Faros (Clic para acercar)')}
        />
      ) : null}

      {/* 4. Interactive POI: The Burning Car on the Left Street */}
      {nodes.BurningCar ? (
        <primitive
          ref={burningCarRef}
          object={nodes.BurningCar}
          {...bindPoiMesh('burningCar', 'Coche en Llamas (Clic para acercar)')}
        />
      ) : null}
      {/* PointLight inside the burning car's fire plumes */}
      <pointLight position={[-3.85, 1.35, -1.65]} color="#ff5500" intensity={3.2} distance={7} />

      {/* 5. Interactive POI: The Sparking Utility Pole & Streetlamp */}
      {nodes.SparkingPole ? (
        <primitive
          ref={poleRef}
          object={nodes.SparkingPole}
          {...bindPoiMesh('pole', 'Farola y Poste con Chispas (Clic para acercar)')}
        />
      ) : null}
      <pointLight position={[-4.45, 4.35, -2.85]} color="#45caff" intensity={3.2} distance={9} />

      {/* 6. Interactive POI: The Shocked Lady & Levitating Chihuahua Dog */}
      {nodes.LadyAndDog ? (
        <primitive
          ref={ladyDogRef}
          object={nodes.LadyAndDog}
          {...bindPoiMesh('ladyDog', 'Señora y Perro Volando (Clic para acercar)')}
        />
      ) : null}

      {/* =====================================================================
          7. REAR 180-DEGREE TURNTABLE (Behind initial camera at Z = +7.5)
             - No sleeve! Just the turntable deck, spinning vinyl with the
               YHLQMDLG cover printed on the circular center, and the needle.
             - If the needle doesn't touch the record, music cannot play.
         ===================================================================== */}
      <group>
        {/* Turntable Plinth Base */}
        {nodes.TurntableBase ? (
          <primitive
            object={nodes.TurntableBase}
            onClick={(e) => {
              e.stopPropagation();
              if (activePoi !== 'turntable') {
                onSelectPoi('turntable');
              } else {
                onToggleNeedle();
              }
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverChange?.('Tocadiscos YHLQMDLG (Clic para ver / mover aguja)');
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHoverChange?.(null);
            }}
          />
        ) : null}

        {/* Spinning Platter + Sleeveless Vinyl Disc + Circular Album Cover Center Label */}
        <group
          ref={platterGroupRef}
          position={[-0.22, 0.72, 7.5]}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'turntable') {
              onSelectPoi('turntable');
            } else {
              onToggleNeedle();
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverChange?.(
              needleOnRecord
                ? 'Vinilo girando (Clic para levantar aguja y parar música)'
                : 'Vinilo detenido (Clic para bajar la aguja al disco y reproducir)',
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

          {/* Circular Album Cover Center Label (No Sleeve! Printed directly in the circular center of the vinyl) */}
          <mesh
            position={[0, 0.052, 0]}
            rotation={[-Math.PI / 2, Math.PI, 0]}
          >
            <circleGeometry args={[0.46, 64]} />
            <Suspense fallback={fallbackLabelMat}>{centerLabelMaterial}</Suspense>
          </mesh>

          {/* Neon Ring Framing the Circular Album Cover Center */}
          <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.455, 0.478, 64]} />
            <meshStandardMaterial
              color={activeTrack.hex}
              emissive={activeTrack.hex}
              emissiveIntensity={needleOnRecord ? 2.2 : 0.6}
            />
          </mesh>
        </group>

        {/* Interactive Pivoting Tonearm & Glowing Stylus Needle */}
        {nodes.TurntableTonearm ? (
          <primitive
            ref={tonearmRef}
            object={nodes.TurntableTonearm}
            onClick={(e) => {
              e.stopPropagation();
              if (activePoi !== 'turntable') {
                onSelectPoi('turntable');
              }
              onToggleNeedle();
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverChange?.(
                needleOnRecord
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

        {/* Dedicated Spotlight illuminating the rear 180° Turntable */}
        <pointLight
          position={[0.0, 2.6, 7.5]}
          color={needleOnRecord ? activeTrack.hex : '#66d9ff'}
          intensity={3.4}
          distance={7}
        />
      </group>
    </group>
  );
}
