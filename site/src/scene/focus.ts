import type { AppState, Derived, GraphData, Layout } from "../types";

// The α-hierarchy (US#30, #34, #36, #37, #38). Precedence:
// search → section-focus → selection → hover → rest.
// "lit" = full α; "halo" = bright-but-not-full (≈0.9, neighbours of the focus).
// hubBoost only at rest — when something is in focus, hubs drop into the
// "прочие" band so the focus signal reads clearly (PRD Implementation Decisions).
export type Focus = {
  lit: Set<string>;
  halo: Set<string>;
  restAlpha: number;
  hubBoost: boolean;
};

export function computeFocus(state: AppState, _derived: Derived): Focus {
  const { selection, hovered, search, searchMatches, sectionFocus } = state;

  if (search.trim()) {
    // Search dominates: matches lit, everything else near-invisible (US#30).
    return {
      lit: new Set(searchMatches),
      halo: new Set(),
      restAlpha: 0.08,
      hubBoost: false,
    };
  }

  if (sectionFocus) {
    const lit = new Set<string>();
    for (const n of _derived.nodeById.values()) {
      if (n.section === sectionFocus) lit.add(n.id);
    }
    return { lit, halo: new Set(), restAlpha: 0.14, hubBoost: false };
  }

  if (selection) {
    const halo = _derived.neighbors.get(selection) ?? new Set();
    return {
      lit: new Set([selection]),
      halo,
      restAlpha: 0.16,
      hubBoost: false,
    };
  }

  if (hovered) {
    const halo = _derived.neighbors.get(hovered) ?? new Set();
    return { lit: new Set([hovered]), halo, restAlpha: 0.45, hubBoost: false };
  }

  // Rest: nothing lit, hubs a touch brighter than leaves (material hierarchy).
  return { lit: new Set(), halo: new Set(), restAlpha: 0.7, hubBoost: true };
}

export function nodeAlpha(id: string, isHub: boolean, focus: Focus): number {
  if (focus.lit.has(id)) return 1;
  if (focus.halo.has(id)) return 0.9;
  return focus.hubBoost && isHub
    ? Math.max(focus.restAlpha, 0.95)
    : focus.restAlpha;
}

// Four edge buckets so the eye reads structure (US#34 bridges, US#38 cross):
//   lit        — both endpoints in focus (bright)
//   bridge     — exactly one endpoint in focus (visible bridge)
//   withinRest — neither, within-section (calm)
//   crossRest  — neither, cross-section (faintest at rest)
export type EdgeBuckets = {
  lit: Float32Array;
  bridge: Float32Array;
  withinRest: Float32Array;
  crossRest: Float32Array;
};

const F = (xs: number[]) => Float32Array.from(xs);

export function buildEdges(
  data: GraphData,
  focus: Focus,
  lay: Layout
): EdgeBuckets {
  const active = new Set<string>([...focus.lit, ...focus.halo]);
  const lit: number[] = [];
  const bridge: number[] = [];
  const withinRest: number[] = [];
  const crossRest: number[] = [];
  data.edges.forEach((e, i) => {
    const a = lay.posById.get(e.source);
    const b = lay.posById.get(e.target);
    if (!a || !b) return;
    const inS = active.has(e.source);
    const inT = active.has(e.target);
    const bucket =
      inS && inT
        ? lit
        : inS || inT
          ? bridge
          : lay.edgeCross[i]
            ? crossRest
            : withinRest;
    bucket.push(...a, ...b);
  });
  return {
    lit: F(lit),
    bridge: F(bridge),
    withinRest: F(withinRest),
    crossRest: F(crossRest),
  };
}
