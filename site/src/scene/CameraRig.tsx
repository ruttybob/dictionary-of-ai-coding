import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useApp } from "../store";
import { centroid } from "../layout";
import type { V3 } from "../types";

const VIEW_DISTANCE = 110; // camera offset from the focused node
const ARC_HEIGHT = 0.28; // how far the arc lifts off the straight line
const IDLE_RESUME_MS = 4000;
const OVERVIEW_DISTANCE = 240;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const lerp = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const normalize = (a: V3): V3 => {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

// Quadratic bezier between from→to, midpoint lifted along the radial direction
// (away from the globe centre) so the camera arcs *over* the globe.
function arcPoint(from: V3, to: V3, t: number): V3 {
  const mid = lerp(from, to, 0.5);
  const radial = normalize(mid);
  const span = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const lifted = add(mid, scale(radial, span * ARC_HEIGHT));
  const a = lerp(from, lifted, t);
  const b = lerp(lifted, to, t);
  return lerp(a, b, t);
}

export type ControlsLike = {
  autoRotate: boolean;
  target: {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): void;
  };
  addEventListener: (e: string, fn: () => void) => void;
  removeEventListener: (e: string, fn: () => void) => void;
  update: () => void;
};

export function CameraRig({
  controlsRef,
  posById,
}: {
  controlsRef: React.RefObject<ControlsLike | null>;
  posById: Map<string, [number, number, number]>;
}) {
  const { camera } = useThree();
  const { state } = useApp();
  const idleTimer = useRef<number | null>(null);

  // Pause idle auto-rotate on interaction, resume after a quiet gap.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const pause = () => {
      controls.autoRotate = false;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
    const resumeLater = () => {
      if (state.reducedMotion) return;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        if (controlsRef.current && !state.selection)
          controlsRef.current.autoRotate = true;
      }, IDLE_RESUME_MS);
    };
    controls.addEventListener("start", pause);
    controls.addEventListener("end", resumeLater);
    return () => {
      controls.removeEventListener("start", pause);
      controls.removeEventListener("end", resumeLater);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [controlsRef, state.reducedMotion, state.selection]);

  // Fly to the selected node; pull back to overview when deselected.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const nodePos = state.selection
      ? (posById.get(state.selection) ?? ([0, 0, 0] as V3))
      : ([0, 0, 0] as V3);

    const from: V3 = [camera.position.x, camera.position.y, camera.position.z];
    const radial = normalize(from);
    const target: V3 = state.selection
      ? add(nodePos, scale(normalize(nodePos), VIEW_DISTANCE))
      : scale(radial, OVERVIEW_DISTANCE);
    const targetCenter: V3 = state.selection ? nodePos : ([0, 0, 0] as V3);
    const fromCenter: V3 = [
      controls.target.x,
      controls.target.y,
      controls.target.z,
    ];

    const tweenObj = { t: 0 };
    const tl = gsap.to(tweenObj, {
      t: 1,
      duration: state.reducedMotion ? 0 : 1.2,
      ease: "power2.inOut",
      onUpdate: () => {
        const t = tweenObj.t;
        const camPos = state.reducedMotion ? target : arcPoint(from, target, t);
        camera.position.set(camPos[0], camPos[1], camPos[2]);
        const c = lerp(fromCenter, targetCenter, t);
        controls.target.set(c[0], c[1], c[2]);
        controls.update();
      },
    });
    // While flying, never auto-rotate; the idle-resume effect restarts it.
    controls.autoRotate = false;
    return () => {
      tl.kill();
    };
  }, [state.selection, state.reducedMotion, posById, camera, controlsRef]);

  // Soft recenter on the centroid of search matches.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !state.search.trim()) return;
    const c = centroid(state.searchMatches, posById);
    if (!c) return;
    const start: V3 = [controls.target.x, controls.target.y, controls.target.z];
    const tweenObj = { t: 0 };
    const tl = gsap.to(tweenObj, {
      t: 1,
      duration: state.reducedMotion ? 0 : 0.8,
      ease: "power2.out",
      onUpdate: () => {
        const p = lerp(start, c, tweenObj.t);
        controls.target.set(p[0], p[1], p[2]);
        controls.update();
      },
    });
    return () => {
      tl.kill();
    };
  }, [
    state.search,
    state.searchMatches,
    state.reducedMotion,
    posById,
    controlsRef,
  ]);

  return null;
}
