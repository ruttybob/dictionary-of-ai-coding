import { useApp } from "../store";
import { prettySectionName } from "../palette";
import { Search } from "./Search";

type SidebarProps = {
  open: boolean;
  onNavigate: () => void;
};

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { data, derived, state, select } = useApp();
  const searching = state.search.trim().length > 0;

  return (
    <nav id="sidebar" className={open ? "open" : ""} aria-label="Содержание">
      <button className="brand" onClick={() => select(null)} title="На главную">
        Словарь AI-кодинга
      </button>
      <Search />
      <div className="toc">
        {data.sections.map((s) => {
          const color = derived.colorOf.get(s.heading) ?? "#888";
          return (
            <section className="toc-section" key={s.heading}>
              <h2 className="toc-heading" style={{ color }}>
                <i className="toc-dot" style={{ background: color }} />
                {prettySectionName(s.heading)}
              </h2>
              <ul className="toc-list">
                {s.terms.map((id) => {
                  const node = derived.nodeById.get(id);
                  if (!node) return null;
                  const active = state.selection === id;
                  const dim = searching && !state.searchMatches.has(id);
                  return (
                    <li key={id}>
                      <a
                        className="toc-link"
                        href={`#${encodeURIComponent(id)}`}
                        style={active ? { color } : undefined}
                        aria-current={active ? "true" : undefined}
                        data-dim={dim ? "true" : undefined}
                        onClick={onNavigate}
                      >
                        {node.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
