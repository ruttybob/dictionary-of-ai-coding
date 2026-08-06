import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Derived, SimNode } from "../types";
import { useApp } from "../store";
import { nodeAlpha, type Focus } from "./focus";

// Top-10% by degree render as frosted hubs (transmission); the rest as matte
// leaves. Rate-limits the expensive transmission material (~7 of 69 nodes).
function useHubs(derived: Derived): Set<string> {
  return useMemo(() => {
    const entries = [...derived.degree.entries()].sort((a, b) => b[1] - a[1]);
    const hubCount = Math.max(1, Math.ceil(entries.length * 0.1));
    return new Set(entries.slice(0, hubCount).map(([id]) => id));
  }, [derived]);
}

function lerpOpacity(
  mat: THREE.Material | THREE.Material[] | undefined,
  target: number,
  rate: number
) {
  if (!mat) return;
  const m = Array.isArray(mat) ? mat[0] : mat;
  if (!m || !("opacity" in m)) return;
  m.opacity += (target - m.opacity) * rate;
}

export function Nodes({
  simNodes,
  focus,
}: {
  simNodes: SimNode[];
  focus: Focus;
}) {
  const { derived, dispatch, state } = useApp();
  const hubs = useHubs(derived);
  const meshRefs = useRef(new Map<string, THREE.Mesh>());

  // Frame-rate-independent-ish lerp factor; close enough for a fade.
  const fadeRate = state.reducedMotion ? 1 : 0.12;

  useFrame(() => {
    for (const n of simNodes) {
      const mesh = meshRefs.current.get(n.id);
      if (!mesh) continue;
      lerpOpacity(
        mesh.material,
        nodeAlpha(n.id, hubs.has(n.id), focus),
        fadeRate
      );
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = (e.object.userData.id as string) ?? null;
    if (id) {
      dispatch({ type: "hover", id });
      document.body.style.cursor = "pointer";
    }
  };
  const onOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dispatch({ type: "hover", id: null });
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = (e.object.userData.id as string) ?? null;
    if (id) dispatch({ type: "select", id });
  };

  return (
    <>
      {simNodes.map((n) => {
        const section = derived.sectionOf.get(n.id) ?? "";
        const color = derived.colorOf.get(section) ?? "#e6e8f0";
        const r = 0.7 + Math.sqrt(derived.degree.get(n.id) ?? 1) * 0.42;
        const isHub = hubs.has(n.id);
        return (
          <mesh
            key={n.id}
            ref={(m) => {
              if (m) meshRefs.current.set(n.id, m);
              else meshRefs.current.delete(n.id);
            }}
            position={[n.x, n.y, n.z]}
            userData={{ id: n.id }}
            onPointerOver={onOver}
            onPointerOut={onOut}
            onClick={onClick}
          >
            <sphereGeometry args={[r, 32, 32]} />
            {isHub ? (
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                roughness={0.35}
                metalness={0}
                transmission={1}
                thickness={0.6}
                ior={1.3}
                attenuationDistance={1.2}
                attenuationColor={color}
                envMapIntensity={1}
                clearcoat={0}
                transparent
                opacity={nodeAlpha(n.id, true, focus)}
              />
            ) : (
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.2}
                roughness={0.85}
                metalness={0}
                envMapIntensity={0.4}
                transparent
                opacity={nodeAlpha(n.id, false, focus)}
              />
            )}
          </mesh>
        );
      })}
    </>
  );
}
