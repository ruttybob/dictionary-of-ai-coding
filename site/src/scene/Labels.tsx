import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import type { Derived, Layout, SimNode } from "../types";
import { useApp } from "../store";

type LabelEntry = {
  id: string;
  label: string;
  pos: [number, number, number];
  baseOpacity: number;
};

// Distance over which labels fade as the camera pulls back (US#14).
const NEAR = 120;
const FAR = 320;

export function Labels({
  simNodes,
  lay,
  derived,
}: {
  simNodes: SimNode[];
  lay: Layout;
  derived: Derived;
}) {
  const { state } = useApp();
  const textRefs = useRef(new Map<string, { fillOpacity: number }>());

  const entries = useMemo<LabelEntry[]>(() => {
    const out: LabelEntry[] = [];
    const seen = new Set<string>();
    const add = (id: string, baseOpacity: number) => {
      if (seen.has(id)) return;
      const p = lay.posById.get(id);
      const node = derived.nodeById.get(id);
      if (!p || !node) return;
      seen.add(id);
      out.push({ id, label: node.label, pos: p, baseOpacity });
    };

    if (state.selection) add(state.selection, 1);
    if (state.hovered && state.hovered !== state.selection)
      add(state.hovered, 1);
    if (state.search.trim()) {
      for (const id of state.searchMatches) add(id, 0.92);
    } else {
      for (const hubId of derived.sectionHub.values()) add(hubId, 0.78);
    }
    return out;
  }, [
    state.selection,
    state.hovered,
    state.search,
    state.searchMatches,
    derived,
    lay,
  ]);

  const rate = state.reducedMotion ? 1 : 0.1;

  // Fade labels with camera distance so far nodes don't clutter the view.
  useFrame((frameState) => {
    const cam = frameState.camera.position;
    for (const e of entries) {
      const t = textRefs.current.get(e.id);
      if (!t) continue;
      const nodePos = lay.posById.get(e.id);
      if (!nodePos) continue;
      const dist = cam.distanceTo(
        new THREE.Vector3(nodePos[0], nodePos[1], nodePos[2])
      );
      // smoothstep(FAR, NEAR, dist): 1 when close, 0 when far.
      const distFactor = THREE.MathUtils.smoothstep(dist, FAR, NEAR);
      const target = e.baseOpacity * Math.max(distFactor, 0.18);
      t.fillOpacity += (target - t.fillOpacity) * rate;
    }
  });

  return (
    <>
      {entries.map((e) => {
        const deg = derived.degree.get(e.id) ?? 1;
        const r = 0.7 + Math.sqrt(deg) * 0.42;
        return (
          <Billboard key={e.id} position={e.pos}>
            <Text
              ref={(m: unknown) => {
                if (m && typeof m === "object" && "fillOpacity" in m) {
                  textRefs.current.set(e.id, m as { fillOpacity: number });
                } else {
                  textRefs.current.delete(e.id);
                }
              }}
              position={[0, r + 1.4, 0]}
              fontSize={2.4}
              color="#e6e8f0"
              fillOpacity={e.baseOpacity}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.25}
              outlineColor="#05060a"
              // Labels must not steal pointer events from the sphere below.
              raycast={() => null}
            >
              {e.label}
            </Text>
          </Billboard>
        );
      })}
    </>
  );
}
