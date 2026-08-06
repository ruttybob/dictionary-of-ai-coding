import { useApp } from "../store";

const MAX_RESULTS = 8;

export function Search() {
  const { derived, state, dispatch, select } = useApp();
  const ids = [...state.searchMatches].slice(0, MAX_RESULTS);

  return (
    <div className="search-wrap">
      <input
        id="search"
        type="search"
        placeholder="Поиск термина…"
        autoComplete="off"
        value={state.search}
        onChange={(e) => dispatch({ type: "search", query: e.target.value })}
        aria-label="Поиск по словарю"
      />
      {state.search.trim() && (
        <ul id="results" className="results">
          {ids.length === 0 && (
            <li className="result empty">Ничего не найдено</li>
          )}
          {ids.map((id) => {
            const n = derived.nodeById.get(id);
            if (!n) return null;
            return (
              <li key={id}>
                <button
                  className="result"
                  data-id={id}
                  onClick={() => select(id)}
                >
                  <span className="result-label">{n.label}</span>
                  <span className="result-desc">{n.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
