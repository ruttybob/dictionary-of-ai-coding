#!/usr/bin/env -S npx tsx
// Generate README.md from internal/Curriculum.md + dictionary/*.md + internal/README.template.md.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  LINK_RE,
  parseCurriculum,
  readCurriculum,
  readEntry,
  assertNoOrphans,
  stripFrontmatter,
  fail,
} from "./curriculum.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const TEMPLATE = join(HERE, "README.template.md");
const OUTPUT = join(ROOT, "README.md");
const MARKER = "<!-- CURRICULUM -->";
const TOC_MARKER = "<!-- TOC -->";

// Mirrors GitHub's heading slugger: lowercase, strip punctuation (keeping hyphens),
// then replace spaces with hyphens. "Section 1 — Foundations" → "section-1--foundations".
function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .replace(/ /g, "-");
}

function rewriteLinks(body: string): string {
  return body.replace(LINK_RE, (_whole, text: string, target: string) => {
    return `[${text}](#${headingSlug(decodeURIComponent(target))})`;
  });
}

function main(): void {
  const template = readFileSync(TEMPLATE, "utf8");
  if (!template.includes(MARKER)) fail(`Template missing ${MARKER} marker`);
  if (!template.includes(TOC_MARKER))
    fail(`Template missing ${TOC_MARKER} marker`);

  const sections = parseCurriculum(readCurriculum());

  const seen = new Set<string>();
  const parts: string[] = [];
  for (const section of sections) {
    parts.push(`## ${section.heading}`, "");
    for (const term of section.terms) {
      if (seen.has(term)) fail(`Curriculum.md: duplicate term "${term}"`);
      seen.add(term);
      const body = readEntry(term);
      parts.push(
        `### ${term}`,
        "",
        rewriteLinks(stripFrontmatter(body).trimEnd()),
        ""
      );
    }
  }

  assertNoOrphans(seen);

  const block = parts.join("\n").trimEnd() + "\n";
  const toc = sections
    .map((s) => {
      const terms = s.terms
        .map((t) => `- [${t}](#${headingSlug(t)})`)
        .join("\n");
      return [
        "<details>",
        `<summary>${s.heading}</summary>`,
        "",
        terms,
        "",
        "</details>",
      ].join("\n");
    })
    .join("\n\n");
  const banner =
    "<!--\n" +
    "  GENERATED FILE — DO NOT EDIT.\n" +
    "  Source: dictionary/*.md, internal/Curriculum.md, internal/README.template.md\n" +
    "  Regenerate: npm run generate\n" +
    "-->\n\n";
  writeFileSync(
    OUTPUT,
    banner + template.replace(TOC_MARKER, toc).replace(MARKER, block)
  );
}

main();
