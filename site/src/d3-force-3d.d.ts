// Minimal types for the d3-force-3d fork — identical to d3-force except
// forceSimulation takes a numDimensions arg (2 | 3). Only the surface we use
// is typed; widen if more is needed.
declare module "d3-force-3d" {
  export interface SimulationNode {
    id?: string;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
  }
  export interface ForceSimulation {
    force(name: string, force: unknown): this;
    tick(): void;
    stop(): this;
  }
  export function forceSimulation(
    nodes: SimulationNode[],
    numDimensions?: number
  ): ForceSimulation;
  export function forceLink(
    links?: Array<{ source: unknown; target: unknown }>
  ): {
    id(accessor: (node: any) => string | number): this;
    distance(d: number): this;
    strength(s: number): this;
  };
  export function forceManyBody(): { strength(s: number): this };
  export function forceRadial(
    radius: number,
    x?: number,
    y?: number,
    z?: number
  ): { strength(s: number): this };
}
