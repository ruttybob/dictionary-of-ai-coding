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

export type Derived = {
  colorOf: Map<string, string>;
  sectionOf: Map<string, string>;
  nodeById: Map<string, GraphNode>;
  neighbors: Map<string, Set<string>>;
  order: string[];
};

export type AppState = {
  selection: string | null;
  search: string;
  searchMatches: Set<string>;
};
