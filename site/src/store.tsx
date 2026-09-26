import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import raw from "./data.json";
import type { AppState, Derived, GraphData } from "./types";
import { derive } from "./derive";

const data = raw as GraphData;

type Action =
  | { type: "select"; id: string | null }
  | { type: "search"; query: string };

function matches(query: string): Set<string> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set<string>();
  const out = new Set<string>();
  for (const n of data.nodes) {
    const hay = `${n.label} ${n.description} ${n.body}`.toLowerCase();
    if (hay.includes(q)) out.add(n.id);
  }
  return out;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "select":
      return { ...state, selection: action.id };
    case "search": {
      const searchMatches = matches(action.query);
      return { ...state, search: action.query, searchMatches };
    }
    default:
      return state;
  }
}

// derive() is data-only; compute once at module scope.
const derived: Derived = derive(data);

type Ctx = {
  data: GraphData;
  derived: Derived;
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Curriculum-order navigation.
  prev: () => void;
  next: () => void;
  select: (id: string | null) => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    selection: null,
    search: "",
    searchMatches: new Set<string>(),
  });

  const value = useMemo<Ctx>(() => {
    // Curriculum-order step with wrap-around, so prev/next stay active at
    // the ends of the tour. A null selection counts as position -1: the
    // first next() lands on order[0], prev() on the last entry.
    const step = (delta: number) => {
      const order = derived.order;
      const cur = state.selection;
      const idx = cur ? order.indexOf(cur) : -1;
      const nextIdx = (idx + delta + order.length) % order.length;
      const id = order[nextIdx];
      if (id) dispatch({ type: "select", id });
    };
    return {
      data,
      derived,
      state,
      dispatch,
      prev: () => step(-1),
      next: () => step(1),
      select: (id) => dispatch({ type: "select", id }),
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
