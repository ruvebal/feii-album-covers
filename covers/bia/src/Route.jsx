import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import BudgetProbe from "../../../src/lib/BudgetProbe.jsx";
import usePrefersReducedMotion from "../../../src/lib/usePrefersReducedMotion.js";
import "./route.css";

const SCOPE = "route-bia";
const MODEL_URL = new URL("../public/models/bia-combined.glb", import.meta.url)
  .href;
const HAND_URL = new URL("../public/models/bia_hand.glb", import.meta.url).href;
const LIQUIDS_URL = new URL("../public/models/bia_ls_2.glb", import.meta.url)
  .href;
const SIGNATURE_URL = new URL("../public/bia-signature.png", import.meta.url)
  .href;
const ROCKING_ROTATION_AXIS = new THREE.Vector3(0, 0, 1);
const PLATE_ROTATION_AXIS = new THREE.Vector3(1, 0, 0);
const LIQUID_SWING_ANGLE = THREE.MathUtils.degToRad(5);
const PLATE_SWING_ANGLE = THREE.MathUtils.degToRad(5);
const ANIMATION_BPM = 138;
const TWO_BEAT_SECONDS = (60 / ANIMATION_BPM) * 4;
const ANIMATION_PHASE = Math.PI / TWO_BEAT_SECONDS;
const LIQUID_BACK_OFFSET_Z = -0.035;

function styleLiquidMaterial(material) {
  material.color.set("#ffae00");
  material.emissive?.set("#f4b322");
  material.emissiveIntensity = 0.72;
  material.alphaMode = "OPAQUE";
  material.transparent = false;
  material.opacity = 1;
  material.alphaTest = 0;
  material.depthWrite = true;
  material.metalness = 0;
  material.metalnessFactor = 0;
  material.roughness = 0.12;
  material.roughnessFactor = 0.12;
  if ("transmission" in material) material.transmission = 0;
  if ("ior" in material) material.ior = 1.356;
  if ("clearcoat" in material) material.clearcoat = 0.75;
  if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.05;
  material.needsUpdate = true;
}

function removeSmallLiquidIslands(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    const source = child.geometry.index
      ? child.geometry.toNonIndexed()
      : child.geometry.clone();
    const positions = source.attributes.position;
    const triangleCount = positions.count / 3;
    if (!triangleCount) return;

    const vertexKey = (index) => {
      const position = new THREE.Vector3().fromBufferAttribute(
        positions,
        index,
      );
      return `${position.x.toFixed(5)},${position.y.toFixed(5)},${position.z.toFixed(5)}`;
    };
    const vertexToTriangles = new Map();
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      for (let corner = 0; corner < 3; corner += 1) {
        const vertex = triangle * 3 + corner;
        const key = vertexKey(vertex);
        if (!vertexToTriangles.has(key)) vertexToTriangles.set(key, []);
        vertexToTriangles.get(key).push(triangle);
      }
    }

    const parent = Array.from({ length: triangleCount }, (_, index) => index);
    const find = (index) => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    for (const triangles of vertexToTriangles.values()) {
      for (let index = 1; index < triangles.length; index += 1) {
        union(triangles[0], triangles[index]);
      }
    }

    const componentSizes = new Map();
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const root = find(triangle);
      componentSizes.set(root, (componentSizes.get(root) ?? 0) + 1);
    }

    let largestRoot = null;
    let largestSize = 0;
    for (const [root, size] of componentSizes) {
      if (size > largestSize) {
        largestRoot = root;
        largestSize = size;
      }
    }

    const keep = [];
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      if (find(triangle) === largestRoot) {
        keep.push(triangle);
      }
    }
    if (keep.length === triangleCount) return;

    const filteredPositions = [];
    for (const triangle of keep) {
      for (let corner = 0; corner < 3; corner += 1) {
        const vertex = triangle * 3 + corner;
        filteredPositions.push(
          positions.getX(vertex),
          positions.getY(vertex),
          positions.getZ(vertex),
        );
      }
    }
    const filtered = new THREE.BufferGeometry();
    filtered.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(filteredPositions, 3),
    );
    filtered.computeVertexNormals();
    child.geometry.dispose();
    child.geometry = filtered;
  });
}

function disposeObject(object) {
  if (!object) return;
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose();
      });
    }
  });
}

function normalizeModel(object) {
  object.traverse((child) => {
    if (child.name === "Plane") child.visible = false;
  });

  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  object.traverse((child) => {
    if (child.isCamera || child.isLight || child.name === "Plane") return;
    if (child.isMesh && child.visible) box.expandByObject(child);
  });
  const center = box.getCenter(new THREE.Vector3());
  let cameraData = null;
  object.traverse((child) => {
    if (!cameraData && child.isCamera) {
      child.updateWorldMatrix(true, false);
      cameraData = {
        position: child.getWorldPosition(new THREE.Vector3()),
        quaternion: child.getWorldQuaternion(new THREE.Quaternion()),
        fov: child.isPerspectiveCamera
          ? THREE.MathUtils.radToDeg(child.fov)
          : null,
      };
    }
  });

  object.position.sub(center);
  object.position.y -= 0.15;
  object.updateMatrixWorld(true);

  if (cameraData) {
    cameraData.position.sub(center);
    cameraData.position.y -= 0.15;
    cameraData.position.multiplyScalar(0.78);
  }

  return cameraData;
}

function attachLiquidAndGlassToAxis(root, liquid, glass) {
  root.updateMatrixWorld(true);
  liquid.updateWorldMatrix(true, true);
  const liquidCenter = new THREE.Box3()
    .setFromObject(liquid)
    .getCenter(new THREE.Vector3());
  liquidCenter.z += LIQUID_BACK_OFFSET_Z;

  const pivot = new THREE.Object3D();
  pivot.name = "BiaLiquidAndGlassPivot";
  pivot.position.copy(liquidCenter);
  pivot.position.y += 0.12;
  pivot.quaternion.copy(glass.quaternion);
  root.add(pivot);

  const inverseAxis = glass.quaternion.clone().invert();
  glass.position.sub(pivot.position).applyQuaternion(inverseAxis);
  glass.quaternion.identity();
  liquid.position.sub(pivot.position).applyQuaternion(inverseAxis);
  liquid.quaternion.copy(inverseAxis);
  pivot.add(glass);
  pivot.add(liquid);

  return pivot;
}

function attachPlateToAxis(root, plate, hand, glass) {
  if (!root || !plate || !glass) return null;
  root.updateMatrixWorld(true);
  plate.updateWorldMatrix(true, true);
  glass.updateWorldMatrix(true, true);

  const plateCenter = new THREE.Box3()
    .setFromObject(plate)
    .getCenter(new THREE.Vector3());
  const plateWorldPosition = plate.getWorldPosition(new THREE.Vector3());
  const plateWorldQuaternion = plate.getWorldQuaternion(new THREE.Quaternion());
  const plateWorldScale = plate.getWorldScale(new THREE.Vector3());
  const pivotWorldQuaternion = glass.getWorldQuaternion(new THREE.Quaternion());
  const wristWorldPosition = new THREE.Vector3();

  if (hand) {
    hand.updateWorldMatrix(true, true);
    const handBounds = new THREE.Box3().setFromObject(hand);
    const handCenter = handBounds.getCenter(new THREE.Vector3());
    wristWorldPosition.set(handCenter.x, handBounds.min.y, handCenter.z);
  } else {
    wristWorldPosition.copy(plateCenter);
  }

  const pivot = new THREE.Object3D();
  pivot.name = "BiaPlatePivot";
  pivot.position.copy(root.worldToLocal(wristWorldPosition.clone()));
  pivot.position.y -= 0.04;
  pivot.quaternion.copy(pivotWorldQuaternion);
  root.add(pivot);

  const inverseAxis = pivotWorldQuaternion.clone().invert();
  plate.position
    .copy(plateWorldPosition)
    .sub(wristWorldPosition)
    .applyQuaternion(inverseAxis);
  plate.quaternion.copy(inverseAxis).multiply(plateWorldQuaternion);
  plate.scale.copy(plateWorldScale);

  if (hand) {
    const handWorldPosition = hand.getWorldPosition(new THREE.Vector3());
    const handWorldQuaternion = hand.getWorldQuaternion(new THREE.Quaternion());
    const handWorldScale = hand.getWorldScale(new THREE.Vector3());
    hand.position
      .copy(handWorldPosition)
      .sub(wristWorldPosition)
      .applyQuaternion(inverseAxis);
    hand.quaternion.copy(inverseAxis).multiply(handWorldQuaternion);
    hand.scale.copy(handWorldScale);
  }

  pivot.add(plate);
  if (hand) pivot.add(hand);

  return pivot;
}

function BlenderModel({ onReady }) {
  const group = useRef(null);
  const liquidPivot = useRef(null);
  const platePivot = useRef(null);
  const liquidBaseRotation = useRef(new THREE.Quaternion());
  const liquidSwingRotation = useRef(new THREE.Quaternion());
  const plateBaseRotation = useRef(new THREE.Quaternion());
  const plateSwingRotation = useRef(new THREE.Quaternion());
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("loading");
  const canvasCamera = useThree((state) => state.camera);
  const canvasSize = useThree((state) => state.size);
  const reducedMotion = usePrefersReducedMotion();

  useFrame(({ clock }) => {
    if (!liquidPivot.current) return;
    if (reducedMotion) {
      liquidPivot.current.quaternion.copy(liquidBaseRotation.current);
      if (platePivot.current)
        platePivot.current.quaternion.copy(plateBaseRotation.current);
      return;
    }

    const angle = Math.sin(clock.elapsedTime * ANIMATION_PHASE) * LIQUID_SWING_ANGLE;
    const plateAngle =
      (1 - Math.cos((clock.elapsedTime * ANIMATION_PHASE) - (1.5 * Math.PI))) *
      0.5 *
      PLATE_SWING_ANGLE;
    liquidSwingRotation.current.setFromAxisAngle(ROCKING_ROTATION_AXIS, angle);
    plateSwingRotation.current.setFromAxisAngle(
      PLATE_ROTATION_AXIS,
      plateAngle,
    );
    liquidPivot.current.quaternion
      .copy(liquidBaseRotation.current)
      .multiply(liquidSwingRotation.current);
    if (platePivot.current) {
      platePivot.current.quaternion
        .copy(plateBaseRotation.current)
        .multiply(plateSwingRotation.current);
    }
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    const handLoader = new GLTFLoader();
    const liquidsLoader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    handLoader.setMeshoptDecoder(MeshoptDecoder);
    liquidsLoader.setMeshoptDecoder(MeshoptDecoder);

    loader
      .loadAsync(MODEL_URL)
      .then((gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        gltf.scene.traverse((child) => {
          if (child.name === "Hand.Solid") child.visible = false;
          if (
            child.name === "Liquid_Frame_5_Solid" ||
            child.name === "Liquid_Frame_5_Solid.002" ||
            child.name === "LiquidDomain.001"
          ) {
            child.visible = false;
          }
        });
        const cameraData = normalizeModel(gltf.scene);
        if (cameraData && canvasCamera.isPerspectiveCamera) {
          canvasCamera.position.copy(cameraData.position);
          canvasCamera.quaternion.copy(cameraData.quaternion);
          canvasCamera.rotateZ(Math.PI);
          if (cameraData.fov) canvasCamera.fov = cameraData.fov;
          canvasCamera.aspect = canvasSize.width / canvasSize.height;
          canvasCamera.updateProjectionMatrix();
          canvasCamera.updateMatrixWorld(true);
        }
        gltf.scene.traverse((child) => {
          if (child.name === "plate" || child.name === "Plate") {
            child.renderOrder = 1;
            const plateMaterials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            plateMaterials.forEach((material) => {
              material.roughness = 0.12;
              material.roughnessFactor = 0.12;
              material.metalness = 0.18;
              material.metalnessFactor = 0.18;
              if ("clearcoat" in material) material.clearcoat = 1;
              if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.04;
              material.polygonOffset = true;
              material.polygonOffsetFactor = 1;
              material.polygonOffsetUnits = 1;
              material.depthWrite = true;
              material.needsUpdate = true;
            });
          }
          if (child.isMesh) {
            const liquidMaterials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            liquidMaterials.forEach((material) => {
              if (/^Liquid Gold/i.test(material.name ?? "")) {
                styleLiquidMaterial(material);
              }
            });
            if (
              /Liquid/i.test(child.name ?? "") &&
              child.geometry?.attributes?.normal
            ) {
              child.geometry.computeVertexNormals();
              child.geometry.attributes.normal.needsUpdate = true;
              if ("flatShading" in (child.material ?? {}))
                child.material.flatShading = false;
            }
          }
          if (!child.isLight) return;
          if (child.name === "Point") {
            child.position.set(-0.4, 3.8, 6.2);
            child.intensity = 120;
            child.distance = 10;
            child.decay = 1.5;
            child.color.set("#fff5df");
          }
        });
        return Promise.all([
          handLoader.loadAsync(HAND_URL),
          liquidsLoader.loadAsync(LIQUIDS_URL),
        ]).then(([handGltf, liquidsGltf]) => {
          if (cancelled) {
            disposeObject(gltf.scene);
            disposeObject(handGltf.scene);
            disposeObject(liquidsGltf.scene);
            return;
          }
          handGltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            child.renderOrder = 2;
            child.castShadow = true;
            child.receiveShadow = true;
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((material) => {
              material.color?.set("#FFD9BD");
              material.alphaMode = "OPAQUE";
              material.transparent = false;
              material.alphaTest = 0;
              material.depthWrite = true;
              material.depthTest = true;
              material.side = THREE.FrontSide;
              material.needsUpdate = true;
            });
            if (child.name)
              child.name =
                child.name === "bia_hand" ? "BiaHandReplacement" : child.name;
          });
          gltf.scene.add(handGltf.scene);
          removeSmallLiquidIslands(liquidsGltf.scene);
          liquidsGltf.scene.traverse((child) => {
            if (child.name) child.name = `BiaLs2_${child.name}`;
            if (!child.isMesh) return;
            child.castShadow = false;
            child.receiveShadow = true;
            const liquidMaterials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            liquidMaterials.forEach((material) => {
              styleLiquidMaterial(material);
            });
            if (child.geometry?.attributes?.normal) {
              child.geometry.computeVertexNormals();
              child.geometry.attributes.normal.needsUpdate = true;
            }
          });
          liquidPivot.current = attachLiquidAndGlassToAxis(
            gltf.scene,
            liquidsGltf.scene,
            gltf.scene.getObjectByName("Glass"),
          );
          liquidBaseRotation.current.copy(liquidPivot.current.quaternion);
          const plate =
            gltf.scene.getObjectByName("Plate") ??
            gltf.scene.getObjectByName("plate");
          if (plate) {
            platePivot.current = attachPlateToAxis(
              gltf.scene,
              plate,
              handGltf.scene,
              gltf.scene.getObjectByName("Glass"),
            );
            if (platePivot.current) {
              plateBaseRotation.current.copy(platePivot.current.quaternion);
            }
          }
          setModel(gltf.scene);
          setStatus("ready");
          onReady();
        });
      })
      .catch((error) => {
        console.error("[bia] model load failed", error);
        if (!cancelled) setStatus("missing");
      });

    return () => {
      cancelled = true;
      liquidPivot.current = null;
      platePivot.current = null;
    };
  }, [canvasCamera, canvasSize.height, canvasSize.width, onReady]);

  useEffect(() => () => disposeObject(model), [model]);

  return (
    <group ref={group}>
      {model ? (
        <primitive object={model} />
      ) : (
        <group>
          <mesh position={[0, 0.1, 0]} rotation={[0.22, -0.35, 0]}>
            <boxGeometry args={[1.6, 2.15, 0.18]} />
            <meshStandardMaterial
              color={status === "loading" ? "#aaa7a0" : "#d14e42"}
              metalness={0.12}
              roughness={0.58}
            />
          </mesh>
          <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.05, 0.035, 12, 64]} />
            <meshStandardMaterial
              color="#ece7dc"
              metalness={0.45}
              roughness={0.32}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ThumbShadowLight() {
  return (
    <pointLight
      position={[0.9, 0.7, 2.0]}
      color="#fff2dc"
      intensity={2}
      distance={2.8}
      decay={2}
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
      shadow-bias={-0.0005}
    />
  );
}

function Scene({ showBudget, onSample, onReady }) {
  return (
    <>
      <BlenderModel onReady={onReady} />
      <ThumbShadowLight />
      {showBudget && <BudgetProbe onSample={onSample} />}
    </>
  );
}

function TrackMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`bia__track-menu${open ? " bia__track-menu--open" : ""}`}>
      <button
        className="bia__track-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="bia-track-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span>LISTEN</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="bia__track-panel" id="bia-track-panel">
          <div className="bia__track-heading">SUPERTRAMP · 10 TRACKS</div>
          <div className="bia__track-title">
            <span className="bia__play-icon" aria-hidden="true">
              ▶
            </span>
            <span>Breakfast In America</span>
          </div>
          <iframe
            title="Play the Breakfast In America album by Supertramp on Spotify"
            src="https://open.spotify.com/embed/album/29B5sIbYPnSjJaD5CloPjf?utm_source=generator&theme=0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

export default function Route() {
  const [budget, setBudget] = useState(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [showBudget] = useState(() =>
    new URLSearchParams(window.location.search).has("budget"),
  );
  const handleAssetsReady = useCallback(() => setAssetsReady(true), []);

  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    return () => document.documentElement.classList.remove(SCOPE);
  }, []);

  return (
    <main className="bia">
      <img
        className="bia__signature"
        src={SIGNATURE_URL}
        alt=""
        aria-hidden="true"
      />
      <header className="bia__header">
        <h1>
          <span className="bia__breakfast">BREAKFAST</span>
          <span>IN AMERICA</span>
        </h1>
      </header>

      <div
        className="bia__canvas"
        aria-label="Interactive three-dimensional Blender cover"
      >
        <Canvas
          shadows="percentage"
          camera={{ position: [0, 0.25, 5.2], fov: 49.1 }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <Scene
              showBudget={showBudget}
              onSample={setBudget}
              onReady={handleAssetsReady}
            />
          </Suspense>
        </Canvas>
      </div>

      {!assetsReady && (
        <div className="bia__loading" role="status" aria-label="Loading BIA">
          <span className="bia__loading-icon" aria-hidden="true" />
        </div>
      )}

      <TrackMenu />

      {showBudget && budget && (
        <pre className="bia__budget" aria-label="renderer.info">
          {`calls ${budget.calls}\ntriangles ${budget.triangles}\ngeometries ${budget.geometries}\ntextures ${budget.textures}`}
        </pre>
      )}
    </main>
  );
}
