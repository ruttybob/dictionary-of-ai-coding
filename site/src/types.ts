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
  colorOf: Map<string, string>; // section heading → hex
  sectionOf: Map<string, string>; // node id → section heading
  nodeById: Map<string, GraphNode>;
  neighbors: Map<string, Set<string>>; // adjacency (bidirectional)
  order: string[];
};

export type AppState = {
  selection: string | null;
  search: string;
  searchMatches: Set<string>;
};
