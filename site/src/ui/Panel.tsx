import { useEffect, useMemo, type MouseEvent } from "react";
import { marked } from "marked";
import { useApp } from "../store";
import { termIdFromHref } from "../layout";
import { prettySectionName } from "../palette";

export function Panel() {
  const { data, derived, state, prev, next, select } = useApp();
  const node = state.selection ? derived.nodeById.get(state.selection) : null;

  // Esc closes the panel (US#41).
  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, select]);

  const html = useMemo(() => {
    if (!node) return "";
    return marked.parse(node.body, { async: false }) as string;
  }, [node]);

  if (!node) return null;

  // Intercept "./Term.md" cross-links: route them to node selection instead of
  // letting the browser navigate (US#26).
  const onClickBody = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a[href^="./"]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href") ?? "";
    const id = termIdFromHref(href);
    if (derived.nodeById.has(id)) select(id);
  };

  const color = derived.colorOf.get(node.section) ?? "#e6e8f0";

  return (
    <aside id="panel" data-term={node.id} aria-hidden={!node}>
      <header className="panel-head" style={{ borderColor: color }}>
        <button
          className="nav-btn"
          onClick={prev}
          aria-label="Предыдущий термин"
          title="Предыдущий (Curriculum)"
        >
          ‹
        </button>
        <div className="panel-title">
          <div id="panel-title">{node.label}</div>
          <small style={{ color }}>{prettySectionName(node.section)}</small>
        </div>
        <button
          className="nav-btn"
          onClick={next}
          aria-label="Следующий термин"
          title="Следующий (Curriculum)"
        >
          ›
        </button>
        <button
          className="close-btn"
          onClick={() => select(null)}
          aria-label="Закрыть панель"
          title="Закрыть (Esc)"
        >
          ✕
        </button>
      </header>
      <p className="panel-desc">{node.description}</p>
      <div
        id="panel-body"
        className="panel-body markdown"
        onClick={onClickBody}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <footer className="panel-foot">
        <span>
          {
            data.edges.filter(
              (e) => e.source === node.id || e.target === node.id
            ).length
          }{" "}
          связей в графе
        </span>
        <a
          className="attribution"
          href="https://github.com/mattpocock/dictionary-of-ai-coding"
          target="_blank"
          rel="noreferrer noopener"
        >
          русский перевод словаря Matt Pocock
        </a>
      </footer>
    </aside>
  );
}
