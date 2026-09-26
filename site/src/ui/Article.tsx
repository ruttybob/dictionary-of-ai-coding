import { useEffect, useMemo, type MouseEvent } from "react";
import { marked } from "marked";
import { useApp } from "../store";
import { termIdFromHref } from "../derive";
import { prettySectionName } from "../palette";

export function Article() {
  const { derived, state, prev, next, select } = useApp();
  const node = state.selection ? derived.nodeById.get(state.selection) : null;

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

  // Intercept "./Term.md" cross-links: route them to term selection instead
  // of letting the browser navigate.
  const onClickBody = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a[href^="./"]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href") ?? "";
    const id = termIdFromHref(href);
    if (derived.nodeById.has(id)) select(id);
  };

  const color = derived.colorOf.get(node.section) ?? "#e6e8f0";
  const neighbors = [...(derived.neighbors.get(node.id) ?? [])];

  return (
    <article id="article" data-term={node.id}>
      <header className="article-head">
        <div className="article-actions">
          <button
            className="nav-btn"
            onClick={prev}
            aria-label="Предыдущий термин"
            title="Предыдущий (Curriculum)"
          >
            ‹
          </button>
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
            aria-label="Закрыть статью"
            title="Закрыть (Esc)"
          >
            ✕
          </button>
        </div>
        <small className="article-eyebrow" style={{ color }}>
          {prettySectionName(node.section)}
        </small>
        <h1 id="article-title">{node.label}</h1>
      </header>
      <p className="article-desc">{node.description}</p>
      <div
        id="article-body"
        className="article-body markdown"
        onClick={onClickBody}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <footer className="article-foot">
        <h2 className="related-title">Связанные термины</h2>
        <div className="related-chips">
          {neighbors.map((id) => {
            const n = derived.nodeById.get(id);
            if (!n) return null;
            const c = derived.colorOf.get(n.section) ?? "#888";
            return (
              <a
                key={id}
                className="chip"
                href={`#${encodeURIComponent(id)}`}
                style={{ borderColor: c }}
              >
                <i style={{ background: c }} />
                {n.label}
              </a>
            );
          })}
        </div>
        <a
          className="attribution"
          href="https://github.com/mattpocock/dictionary-of-ai-coding"
          target="_blank"
          rel="noreferrer noopener"
        >
          русский перевод словаря Matt Pocock
        </a>
      </footer>
    </article>
  );
}
