import { useApp } from "../store";
import { prettySectionName } from "../palette";

export function Legend() {
  const { data, derived, state, dispatch } = useApp();
  return (
    <nav id="legend" className="legend" aria-label="Секции словаря">
      {data.sections.map((s) => {
        const color = derived.colorOf.get(s.heading) ?? "#888";
        const active = state.sectionFocus === s.heading;
        const name = prettySectionName(s.heading);
        return (
          <button
            key={s.heading}
            className={`chip ${active ? "active" : ""}`}
            onClick={() =>
              dispatch({ type: "toggleSection", heading: s.heading })
            }
            title={s.heading}
          >
            <i style={{ background: color }} />
            {name}
          </button>
        );
      })}
    </nav>
  );
}
