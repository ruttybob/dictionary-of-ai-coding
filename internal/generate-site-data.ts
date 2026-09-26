#!/usr/bin/env -S npx tsx

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DESC_RE,
  assertNoOrphans,
  forEachLink,
  parseCurriculum,
  readCurriculum,
  readEntry,
  stripFrontmatter,
  fail,
} from "./curriculum.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const OUT_DIR = join(ROOT, "site", "src");
const OUT = join(OUT_DIR, "data.json");

type Node = {
  id: string;
  label: string;
  section: string;
  description: string;
  body: string;
};

const sections = parseCurriculum(readCurriculum());

const seen = new Set<string>();
const nodes: Node[] = [];
const linksByTerm = new Map<string, string[]>();

for (const section of sections) {
  if (section.terms.length === 0)
    fail(`Curriculum.md: section "${section.heading}" has no terms`);
  for (const name of section.terms) {
    if (seen.has(name)) fail(`Curriculum.md: duplicate term "${name}"`);
    seen.add(name);
    const raw = readEntry(name);
    const body = stripFrontmatter(raw).trimEnd();
    const descMatch = raw.match(DESC_RE);
    const description =
      descMatch && descMatch[1]
        ? descMatch[1].replace(/^["']|["']$/g, "")
        : fail(`${name}.md: missing "description" frontmatter field`);

    const targets: string[] = [];
    forEachLink(raw, (_text, target) => targets.push(target));
    linksByTerm.set(name, targets);
    nodes.push({
      id: name,
      label: name,
      section: section.heading,
      description,
      body,
    });
  }
}

assertNoOrphans(seen);

const termNames = new Set(nodes.map((n) => n.id));

const edgeSet = new Set<string>();
const edges: { source: string; target: string }[] = [];
for (const node of nodes) {
  for (const target of linksByTerm.get(node.id) ?? []) {
    if (target === node.id) continue;
    if (!termNames.has(target))
      fail(`${node.id}.md links to "./${target}.md" but no such term exists`);
    const key = [node.id, target].sort().join("→");
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edges.push({ source: node.id, target });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      sections: sections.map((s) => ({ heading: s.heading, terms: s.terms })),
      nodes,
      edges,
      order: nodes.map((n) => n.id),
    },
    null,
    2
  )
);

console.log(`Wrote ${OUT}: ${nodes.length} nodes, ${edges.length} edges.`);
