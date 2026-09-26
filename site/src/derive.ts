import type { Derived, GraphData, GraphNode } from "./types";
import { colorForSection } from "./palette";

export function derive(data: GraphData): Derived {
  const colorOf = new Map<string, string>();
  data.sections.forEach((s, i) => {
    colorOf.set(s.heading, colorForSection(s.heading, i));
  });

  const sectionOf = new Map<string, string>();
  const nodeById = new Map<string, GraphNode>();
  for (const n of data.nodes) {
    sectionOf.set(n.id, n.section);
    nodeById.set(n.id, n);
  }

  const neighbors = new Map<string, Set<string>>();
  for (const n of data.nodes) neighbors.set(n.id, new Set());
  for (const e of data.edges) {
    neighbors.get(e.source)?.add(e.target);
    neighbors.get(e.target)?.add(e.source);
  }

  return {
    colorOf,
    sectionOf,
    nodeById,
    neighbors,
    order: data.order,
  };
}

export function termIdFromHref(href: string): string {
  return decodeURIComponent(href.replace(/^\.\//, "").replace(/\.md$/, ""));
}
