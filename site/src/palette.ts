// 7 section colours — muted OKLCH L≈0.62–0.74, C≈0.07–0.08, pre-converted to
// hex because three.js Color does not parse oklch() (silently falls to black).
// "Object" saturation, not "emissive" — reads as colour on near-black.
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

// Curriculum headings read as "Section N — Name"; strip the prefix for display.
export const prettySectionName = (heading: string): string =>
  heading.replace(/^Section \d+ — /, "");
