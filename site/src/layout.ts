import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceRadial,
} from "d3-force-3d";
import type { Derived, GraphData, Layout, SimNode, V3 } from "./types";
import { colorForSection } from "./palette";

// Derive everything that depends only on data.json: degree, colours, adjacency,
// section hubs, and the Curriculum order. Computed once per session.
export function derive(data: GraphData): Derived {
  const degree = new Map<string, number>();
  for (const n of data.nodes) degree.set(n.id, 0);
  const neighbors = new Map<string, Set<string>>();
  for (const n of data.nodes) neighbors.set(n.id, new Set());
  for (const e of data.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    neighbors.get(e.source)?.add(e.target);
    neighbors.get(e.target)?.add(e.source);
  }

  const colorOf = new Map<string, string>();
  const sectionIndex = new Map<string, number>();
  data.sections.forEach((s, i) => {
    colorOf.set(s.heading, colorForSection(s.heading, i));
    sectionIndex.set(s.heading, i);
  });

  const sectionOf = new Map<string, string>();
  const nodeById = new Map<string, GraphData["nodes"][number]>();
  for (const n of data.nodes) {
    sectionOf.set(n.id, n.section);
    nodeById.set(n.id, n);
  }

  // Top-degree node per section → the 7 always-labelled hubs.
  const sectionHub = new Map<string, string>();
  for (const s of data.sections) {
    let best: { id: string; deg: number } | null = null;
    for (const t of s.terms) {
      const d = degree.get(t) ?? 0;
      if (!best || d > best.deg) best = { id: t, deg: d };
    }
    if (best) sectionHub.set(s.heading, best.id);
  }

  return {
    degree,
    colorOf,
    sectionOf,
    sectionIndex,
    nodeById,
    neighbors,
    sectionHub,
    order: data.order,
  };
}

// Run a static 3D force layout: link + repulsion + weak radial pull so the
// whole graph reads as a loose sphere. 300 ticks from random-on-sphere initial
// positions (without the spread, nodes collapse to the origin).
export function layout(data: GraphData, derived: Derived): Layout {
  const simNodes: SimNode[] = data.nodes.map((n) => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const R = 60;
    return {
      id: n.id,
      x: R * Math.sin(phi) * Math.cos(theta),
      y: R * Math.sin(phi) * Math.sin(theta),
      z: R * Math.cos(phi),
    };
  });
  const links = data.edges.map((e) => ({ source: e.source, target: e.target }));
  const sim = forceSimulation(simNodes, 3)
    .force(
      "link",
      forceLink(links)
        .id((d: { id: string }) => d.id)
        .distance(26)
    )
    .force("charge", forceManyBody().strength(-45))
    .force("radial", forceRadial(72).strength(0.12));
  for (let i = 0; i < 300; i++) sim.tick();
  sim.stop();

  const posById = new Map<string, V3>();
  for (const n of simNodes) posById.set(n.id, [n.x, n.y, n.z]);

  const edgeCross = new Uint8Array(data.edges.length);
  data.edges.forEach((e, i) => {
    const sa = derived.sectionOf.get(e.source);
    const sb = derived.sectionOf.get(e.target);
    edgeCross[i] = sa !== sb ? 1 : 0;
  });

  return { simNodes, posById, edgeCross };
}

// Centroid of a set of node positions — used to recenter the camera on search
// matches.
export function centroid(
  ids: Iterable<string>,
  posById: Map<string, V3>
): V3 | null {
  let x = 0,
    y = 0,
    z = 0,
    n = 0;
  for (const id of ids) {
    const p = posById.get(id);
    if (!p) continue;
    x += p[0];
    y += p[1];
    z += p[2];
    n++;
  }
  if (n === 0) return null;
  return [x / n, y / n, z / n];
}

// Parse an internal "./Term.md" cross-link href into a node id. Shared between
// the Panel link-interceptor and the Playwright seam so the test stays honest
// against the implementation.
export function termIdFromHref(href: string): string {
  return decodeURIComponent(href.replace(/^\.\//, "").replace(/\.md$/, ""));
}
