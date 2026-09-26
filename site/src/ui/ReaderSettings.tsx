import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type ReaderFont = "sans" | "serif" | "mono";

export interface ReaderSettings {
  measurePx: number | null;
  sizePx: number;
  font: ReaderFont;
}

const STORAGE_KEY = "reader-settings-v2";

const DEFAULTS: ReaderSettings = {
  measurePx: null,
  sizePx: 15.5,
  font: "sans",
};

const SIZE_MIN = 12;
const SIZE_MAX = 24;

const clampSize = (px: number): number =>
  Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(px * 2) / 2));

const MEASURE_MIN = 440;
const MEASURE_MAX = 1600;
const MEASURE_STEP = 16;

const clampMeasure = (px: number): number =>
  Math.min(MEASURE_MAX, Math.max(MEASURE_MIN, Math.round(px)));

export const FONT_STACKS: Record<ReaderFont, string> = {
  sans: '-apple-system, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
  serif: 'Charter, "Iowan Old Style", Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
};

const FONT_LABELS: Record<ReaderFont, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
};

function load(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      measurePx:
        typeof parsed.measurePx === "number"
          ? clampMeasure(parsed.measurePx)
          : DEFAULTS.measurePx,
      sizePx:
        typeof parsed.sizePx === "number"
          ? clampSize(parsed.sizePx)
          : DEFAULTS.sizePx,
      font:
        parsed.font && parsed.font in FONT_STACKS ? parsed.font : DEFAULTS.font,
    };
  } catch {
    return DEFAULTS;
  }
}

function apply(settings: ReaderSettings) {
  const root = document.documentElement;
  if (settings.measurePx !== null) {
    root.style.setProperty("--article-measure", `${settings.measurePx}px`);
  } else {
    root.style.removeProperty("--article-measure");
  }
  root.style.setProperty("--reader-size", `${settings.sizePx}px`);
  root.style.setProperty("--reader-font", FONT_STACKS[settings.font]);
}

export function useReaderSettings(): [
  ReaderSettings,
  (next: ReaderSettings) => void,
] {
  const [settings, setSettings] = useState<ReaderSettings>(load);

  useEffect(() => {
    apply(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings];
}

export function ReaderControls() {
  const [settings, setSettings] = useReaderSettings();
  const [sizeDraft, setSizeDraft] = useState(String(settings.sizePx));

  useEffect(() => {
    setSizeDraft(String(settings.sizePx));
  }, [settings.sizePx]);

  const commitSize = () => {
    const next = Number(sizeDraft.replace(",", "."));
    if (Number.isFinite(next) && next > 0) {
      setSettings({ ...settings, sizePx: clampSize(next) });
    } else {
      setSizeDraft(String(settings.sizePx));
    }
  };

  return (
    <div className="reader-controls">
      <label className="reader-field">
        <span className="reader-field-label">Текст</span>
        <input
          className="reader-input"
          type="text"
          inputMode="decimal"
          value={sizeDraft}
          aria-label={`Размер текста, от ${SIZE_MIN} до ${SIZE_MAX} пикселей`}
          onChange={(e) => setSizeDraft(e.target.value)}
          onBlur={commitSize}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitSize();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="reader-field-label">px</span>
      </label>
      <label className="reader-field">
        <span className="reader-field-label">Шрифт</span>
        <select
          className="reader-select"
          value={settings.font}
          aria-label="Гарнитура"
          onChange={(e) => {
            setSettings({ ...settings, font: e.target.value as ReaderFont });
            e.target.blur();
          }}
        >
          {(Object.keys(FONT_STACKS) as ReaderFont[]).map((f) => (
            <option key={f} value={f}>
              {FONT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ReaderDragHandle({ side }: { side: "left" | "right" }) {
  const [settings, setSettings] = useReaderSettings();

  const resizeTo = (startWidth: number, startX: number, currentX: number) => {
    const delta = side === "right" ? currentX - startX : startX - currentX;
    return clampMeasure(startWidth + delta);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const column = e.currentTarget.parentElement;
    if (!column) return;
    const startWidth = column.getBoundingClientRect().width;
    const startX = e.clientX;

    const move = (ev: PointerEvent) => {
      document.documentElement.style.setProperty(
        "--article-measure",
        `${resizeTo(startWidth, startX, ev.clientX)}px`
      );
      document.body.style.userSelect = "none";
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      setSettings({
        ...settings,
        measurePx: resizeTo(startWidth, startX, ev.clientX),
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = settings.measurePx ?? 776;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      setSettings({
        ...settings,
        measurePx: clampMeasure(current - MEASURE_STEP),
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      setSettings({
        ...settings,
        measurePx: clampMeasure(current + MEASURE_STEP),
      });
    }
  };

  return (
    <div
      className={`reader-drag reader-drag-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Ширина страницы, потяните или используйте стрелки"
      title="Потяните, чтобы изменить ширину страницы"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
