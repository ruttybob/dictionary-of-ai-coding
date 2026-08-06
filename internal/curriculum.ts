// Shared parsing of internal/Curriculum.md + dictionary frontmatter.
// Used by generate-readme.ts and generate-site-data.ts so both enforce the
// same invariants and never drift apart.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

export const CURRICULUM_PATH = join(HERE, "Curriculum.md");
export const DICT_DIR = join(ROOT, "dictionary");

// "## Section N — Title" (em-dash, not a hyphen, is part of the format).
export const SECTION_RE = /^## Section \d+ — .+$/;
export const BULLET_RE = /^- (.+)$/;
// [text](./Target.md) or [text](./Tar%20get.md) — group 1 = label, group 2 = target slug.
export const LINK_RE = /\[([^\]]+)\]\(\.\/([^)]+)\.md\)/g;
export const DESC_RE = /^description:\s*(.+?)\s*$/m;

export type Section = { heading: string; terms: string[] };

export function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export function readCurriculum(): string {
  return readFileSync(CURRICULUM_PATH, "utf8");
}

export function parseCurriculum(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  text.split("\n").forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trimEnd();
    if (line === "") return;

    if (line.startsWith("## ")) {
      if (!SECTION_RE.test(line)) {
        fail(
          `Curriculum.md:${lineNo}: section heading must match "## Section N — Title" (em-dash required): ${line}`
        );
      }
      current = { heading: line.slice(3), terms: [] };
      sections.push(current);
      return;
    }

    if (line.startsWith("- ")) {
      if (!current)
        fail(`Curriculum.md:${lineNo}: bullet before any section heading`);
      const m = line.match(BULLET_RE);
      if (!m || !m[1])
        fail(`Curriculum.md:${lineNo}: malformed bullet: ${line}`);
      const term = m[1];
      if (term.trim() !== term)
        fail(`Curriculum.md:${lineNo}: term has surrounding whitespace`);
      if (/[*_`\[]/.test(term))
        fail(
          `Curriculum.md:${lineNo}: term must be plain text, no markdown: ${term}`
        );
      current.terms.push(term);
      return;
    }

    fail(
      `Curriculum.md:${lineNo}: only "## Section N — Title" headings and "- Term" bullets are allowed: ${line}`
    );
  });

  return sections;
}

export function stripFrontmatter(body: string): string {
  if (!body.startsWith("---\n")) return body;
  const end = body.indexOf("\n---\n", 4);
  if (end === -1) return body;
  return body.slice(end + 5).replace(/^\n+/, "");
}

// Read a dictionary entry by term name; fail with a clear message if absent.
export function readEntry(name: string): string {
  const path = join(DICT_DIR, `${name}.md`);
  try {
    return readFileSync(path, "utf8");
  } catch {
    return fail(
      `Curriculum.md references "${name}" but ${path} does not exist`
    );
  }
}

// Every dictionary file must be referenced by Curriculum, else a generator
// would silently drop content from its output.
export function assertNoOrphans(seen: Set<string>): void {
  const onDisk = new Set(
    readdirSync(DICT_DIR)
      .filter((n) => n.endsWith(".md"))
      .map((n) => n.slice(0, -3))
  );
  const orphans = [...onDisk].filter((t) => !seen.has(t)).sort();
  if (orphans.length)
    fail(
      `dictionary/ entries not referenced by Curriculum.md: ${orphans.join(", ")}`
    );
}

// Iterate every [text](./target.md) link in body. Wraps the shared global
// LINK_RE so callers never manage lastIndex themselves.
export function forEachLink(
  body: string,
  cb: (text: string, target: string) => void
): void {
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(body)) !== null) {
    if (m[1] && m[2]) cb(m[1], decodeURIComponent(m[2]));
  }
}
