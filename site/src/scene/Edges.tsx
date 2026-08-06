import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphData, Layout } from "../types";
import { useApp } from "../store";
import { buildEdges, type Focus } from "./focus";

// Target opacity per bucket. "focus" = something selected/hovered/section/searched.
const TARGETS = {
  lit: { none: 0.5, focus: 0.5 },
  bridge: { none: 0, focus: 0.3 }, // bridges only exist when something is in focus
  withinRest: { none: 0.14, focus: 0.06 },
  crossRest: { none: 0.07, focus: 0.03 }, // US#38: cross fainter than within
} as const;

function Bucket({
  positions,
  color,
  opacity,
  matRef,
}: {
  positions: Float32Array;
  color: string;
  opacity: number;
  matRef: React.RefObject<THREE.LineBasicMaterial | null>;
}) {
  if (positions.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export function Edges({
  data,
  lay,
  focus,
}: {
  data: GraphData;
  lay: Layout;
  focus: Focus;
}) {
  const { state } = useApp();
  const litRef = useRef<THREE.LineBasicMaterial>(null);
  const bridgeRef = useRef<THREE.LineBasicMaterial>(null);
  const withinRef = useRef<THREE.LineBasicMaterial>(null);
  const crossRef = useRef<THREE.LineBasicMaterial>(null);

  const buckets = useMemo(
    () => buildEdges(data, focus, lay),
    [data, focus, lay]
  );
  const hasFocus = focus.lit.size + focus.halo.size > 0;
  const mode = hasFocus ? "focus" : "none";
  const rate = state.reducedMotion ? 1 : 0.12;

  useFrame(() => {
    const lerp = (m: THREE.LineBasicMaterial | null, target: number) => {
      if (m) m.opacity += (target - m.opacity) * rate;
    };
    lerp(litRef.current, TARGETS.lit[mode]);
    lerp(bridgeRef.current, TARGETS.bridge[mode]);
    lerp(withinRef.current, TARGETS.withinRest[mode]);
    lerp(crossRef.current, TARGETS.crossRest[mode]);
  });

  return (
    <>
      <Bucket
        positions={buckets.lit}
        color="#9aa6c0"
        opacity={TARGETS.lit[mode]}
        matRef={litRef}
      />
      <Bucket
        positions={buckets.bridge}
        color="#7c87a2"
        opacity={TARGETS.bridge[mode]}
        matRef={bridgeRef}
      />
      <Bucket
        positions={buckets.withinRest}
        color="#5b6478"
        opacity={TARGETS.withinRest[mode]}
        matRef={withinRef}
      />
      <Bucket
        positions={buckets.crossRest}
        color="#4a5163"
        opacity={TARGETS.crossRest[mode]}
        matRef={crossRef}
      />
    </>
  );
}
