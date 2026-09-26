import { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./store";
import { Sidebar } from "./ui/Sidebar";
import { Home } from "./ui/Home";
import { Article } from "./ui/Article";

function Shell() {
  const { derived, state, dispatch } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Hash → selection (initial load + browser back/forward). Subscribing this
  // effect on selection changes would let the two URL effects oscillate;
  // read the current selection through a ref instead.
  const selectionRef = useRef(state.selection);
  selectionRef.current = state.selection;

  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const cur = selectionRef.current;
      if (h && derived.nodeById.has(h) && h !== cur) {
        dispatch({ type: "select", id: h });
      } else if (!h && cur) {
        dispatch({ type: "select", id: null });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [derived, dispatch]);

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

  useEffect(() => {
    document.documentElement.dataset.ready = "true";
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [state.selection]);

  const hasArticle =
    state.selection !== null && derived.nodeById.has(state.selection);

  return (
    <>
      <button
        id="menu-btn"
        aria-label="Открыть содержание"
        title="Содержание"
        onClick={() => setDrawerOpen(true)}
      >
        ☰
      </button>
      {drawerOpen && (
        <div
          className="backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      <main id="main" ref={mainRef}>
        {hasArticle ? <Article /> : <Home />}
      </main>
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
