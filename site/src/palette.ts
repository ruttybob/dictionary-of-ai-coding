// Pre-converted to hex: not every CSS parser here reads oklch().
export const SECTION_COLORS = [
  "#72b3a6", // Section 1 — The Model (dusty teal)
  "#6f85b7", // Section 2 — Sessions (muted violet)
  "#cca273", // Section 3 — Tools (soft amber)
  "#c1818a", // Section 4 — Failure Modes (dusty rose)
  "#94b68c", // Section 5 — Handoffs (sage green)
  "#6e93b9", // Section 6 — Memory (slate blue)
  "#cb9374", // Section 7 — Patterns (clay orange)
] as const;

export const colorForSection = (heading: string, index: number): string =>
  SECTION_COLORS[index % SECTION_COLORS.length]!;

export const prettySectionName = (heading: string): string =>
  heading.replace(/^Section \d+ — /, "");
