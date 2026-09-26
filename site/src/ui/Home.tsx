import { useApp } from "../store";
import { prettySectionName } from "../palette";

export function Home() {
  const { data, derived } = useApp();

  return (
    <div id="home" className="home">
      <h1 className="home-title">Словарь AI-кодинга</h1>
      <div className="home-intro">
        <p>
          Словарь объясняет термины AI-кодинга: модели, контексты, инструменты,
          сбои и приёмы работы с агентами.
        </p>
        <p>
          Термин можно найти через поиск или перейти на него по ссылке из другой
          статьи. Кнопки «предыдущий» и «следующий» листают словарь в порядке
          учебного курса Curriculum.
        </p>
      </div>
      {data.sections.map((s) => {
        const color = derived.colorOf.get(s.heading) ?? "#888";
        return (
          <section className="home-section" key={s.heading}>
            <h2 className="home-section-title" style={{ color }}>
              <i className="toc-dot" style={{ background: color }} />
              {prettySectionName(s.heading)}
            </h2>
            <ul className="home-terms">
              {s.terms.map((id) => {
                const node = derived.nodeById.get(id);
                if (!node) return null;
                return (
                  <li key={id}>
                    <a
                      className="home-term"
                      href={`#${encodeURIComponent(id)}`}
                    >
                      {node.label}
                    </a>
                    <p className="home-snippet">{node.description}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
