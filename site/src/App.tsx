import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { AppProvider, useApp } from "./store";
import { Graph } from "./scene/Graph";
import { Panel } from "./ui/Panel";
import { Search } from "./ui/Search";
import { Legend } from "./ui/Legend";

function Shell() {
  const { derived, state, dispatch } = useApp();

  // Hash → selection (initial load + browser back/forward).
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (h && derived.nodeById.has(h) && h !== state.selection) {
        dispatch({ type: "select", id: h });
      } else if (!h && state.selection) {
        dispatch({ type: "select", id: null });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection → hash (shareable deep-link, US#21).
  useEffect(() => {
    const desired = state.selection
      ? `#${state.selection}`
      : window.location.pathname;
    if (
      (state.selection && window.location.hash !== `#${state.selection}`) ||
      (!state.selection && window.location.hash)
    ) {
      window.history.replaceState(null, "", desired);
    }
  }, [state.selection]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 240], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Graph />
      </Canvas>

      <div className="brand">Граф AI-кодинга</div>
      <Legend />
      <Search />
      <Panel />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
