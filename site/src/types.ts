// Shared domain types for the 3D graph site.

export type V3 = [number, number, number];

export type GraphNode = {
  id: string;
  label: string;
  section: string;
  description: string;
  body: string;
};

export type GraphData = {
  sections: { heading: string; terms: string[] }[];
  nodes: GraphNode[];
  edges: { source: string; target: string }[];
  order: string[];
};

// Everything derived once from data.json — kept stable for the session.
export type Derived = {
  degree: Map<string, number>;
  colorOf: Map<string, string>; // section heading → hex
  sectionOf: Map<string, string>; // node id → section heading
  sectionIndex: Map<string, number>; // section heading → 0..6
  nodeById: Map<string, GraphNode>;
  neighbors: Map<string, Set<string>>; // adjacency (bidirectional)
  sectionHub: Map<string, string>; // section heading → top-degree node id
  order: string[];
};

export type SimNode = { id: string; x: number; y: number; z: number };

export type Layout = {
  simNodes: SimNode[];
  posById: Map<string, V3>;
  // Per-edge cross-section flag: 1 = cross-section, 0 = within-section.
  // Cross-edges render fainter at rest (US#38) and read as bridges under a
  // section focus (US#34).
  edgeCross: Uint8Array;
};

export type AppState = {
  selection: string | null;
  hovered: string | null;
  search: string;
  searchMatches: Set<string>;
  sectionFocus: string | null;
  reducedMotion: boolean;
};
