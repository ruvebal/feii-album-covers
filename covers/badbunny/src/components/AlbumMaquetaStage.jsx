import { Suspense } from 'react';
import { BackSide } from 'three';
import DtmfBlenderStage, { DTMF_WORLD_GLB_URL } from './DtmfBlenderStage.jsx';
import EutdmBlenderStage, { EUTDM_WORLD_GLB_URL } from './EutdmBlenderStage.jsx';
import { SAPO_CONCHO_GLB_URL } from './SapoConchoModel.jsx';
import UvstBlenderStage, { UVST_WORLD_GLB_URL } from './UvstBlenderStage.jsx';

export { DTMF_WORLD_GLB_URL, EUTDM_WORLD_GLB_URL, SAPO_CONCHO_GLB_URL, UVST_WORLD_GLB_URL };

const STAGE_BY_ALBUM = {
  dtmf: DtmfBlenderStage,
  uvst: UvstBlenderStage,
  eutdm: EutdmBlenderStage,
};

export default function AlbumMaquetaStage({
  album,
  activePoi,
  onSelectPoi,
  getBassEnergy,
  reduced,
  onHoverChange,
}) {
  const StageComponent = STAGE_BY_ALBUM[album.id] || null;

  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[22, 24, 18]} />
        <meshBasicMaterial color={album.bgHex} side={BackSide} />
      </mesh>

      {StageComponent ? (
        <Suspense fallback={null}>
          <StageComponent
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
