import { useEffect, useMemo, useRef } from "react";
import {
  OrbitControls,
  Environment,
  Stars,
  AdaptiveDpr,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { ControlsLike } from "./CameraRig";
import { CameraRig } from "./CameraRig";
import { Edges } from "./Edges";
import { Nodes } from "./Nodes";
import { Labels } from "./Labels";
import { computeFocus } from "./focus";
import { layout } from "../layout";
import { useApp } from "../store";

export function Graph() {
  const { data, derived, state } = useApp();
  const lay = useMemo(() => layout(data, derived), [data, derived]);
  const focus = useMemo(() => computeFocus(state, derived), [state, derived]);
  const controlsRef = useRef<ControlsLike>(null);

  // Visitor test seam: scene is mounted and the layout has produced positions.
  useEffect(() => {
    document.documentElement.dataset.ready = "true";
  }, []);

  return (
    <>
      <color attach="background" args={["#07060d"]} />
      <fogExp2 attach="fog" args={["#07060d", 0.005]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[100, 140, 160]} intensity={1.6} />
      <directionalLight position={[-80, -20, -100]} intensity={0.7} />
      <Environment preset="studio" />
      <Stars
        radius={200}
        depth={80}
        count={1500}
        factor={4}
        saturation={0}
        fade
      />
      <AdaptiveDpr pixelated />
      <Edges data={data} lay={lay} focus={focus} />
      <Nodes simNodes={lay.simNodes} focus={focus} />
      <Labels simNodes={lay.simNodes} lay={lay} derived={derived} />
      <OrbitControls
        ref={controlsRef as any}
        makeDefault
        autoRotate={!state.reducedMotion}
        autoRotateSpeed={0.35}
        enablePan={false}
        minDistance={40}
        maxDistance={400}
      />
      <CameraRig controlsRef={controlsRef} posById={lay.posById} />
      {!state.reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={1.0}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.85}
            mipmapBlur
            radius={0.9}
          />
        </EffectComposer>
      )}
    </>
  );
}
