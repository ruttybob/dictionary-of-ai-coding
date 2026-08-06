import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// The single visitor-facing seam (see .scratch/ru-graph-site/PRD.md, Testing Decisions).
// Asserts behaviour a visitor can see, never D3/SVG internals. Expected values are
// read from the generated site/data.json so the test tracks the real content.
const data = JSON.parse(readFileSync("./site/data.json", "utf8")) as {
  nodes: { id: string; label: string; description: string; body: string }[];
  edges: { source: string; target: string }[];
};
const totalNodes = data.nodes.length;
const token = data.nodes.find((n) => n.id === "Token");
expect(token, "Token entry must exist in data.json for the smoke").toBeTruthy();

// A query that matches a strict subset of nodes, so filtering is observable.
const QUERY = "token";
const matchesQuery = (n: {
  label: string;
  description: string;
  body: string;
}) => `${n.label} ${n.description} ${n.body}`.toLowerCase().includes(QUERY);
const aMatch = data.nodes.find(matchesQuery)!;
const aNonMatch = data.nodes.find((n) => !matchesQuery(n))!;

test("graph renders one node per term", async ({ page }) => {
  await page.goto("/");
  await page.locator("svg#graph .node").first().waitFor();
  const count = await page.locator("svg#graph .node").count();
  expect(count).toBe(totalNodes);
});

test("search filters visible nodes and lists matches", async ({ page }) => {
  await page.goto("/");
  await page.locator("svg#graph .node").first().waitFor();

  await page.locator("#search").fill(QUERY);

  // a known match stays visible, a known non-match gets dimmed
  await expect(
    page.locator(`svg#graph .node[data-id="${aMatch.id}"]:not(.dimmed)`)
  ).toHaveCount(1);
  await expect(
    page.locator(`svg#graph .node[data-id="${aNonMatch.id}"].dimmed`)
  ).toHaveCount(1);
  // results list surfaces the match
  await expect(
    page.locator(`#results .result[data-id="${aMatch.id}"]`)
  ).toHaveCount(1);
});

test("clicking a node opens the panel with its definition", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("svg#graph .node").first().waitFor();

  await page.locator(`svg#graph .node[data-id="Token"] circle`).click();

  await expect(page.locator("#panel")).toBeVisible();
  await expect(page.locator("#panel")).toHaveAttribute("data-term", "Token");
  await expect(page.locator("#panel-title")).toHaveText("Token");
  // the rendered body carries the term's Russian definition. Compare against a
  // plain-text prefix of the body (links reduced to their label text) so the
  // assertion is robust to emphasis/link markup in the source.
  const snippet = token!.body
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  await expect(page.locator("#panel-body")).toContainText(snippet);
});

test("clicking a cross-link inside a definition navigates to that term", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("svg#graph .node").first().waitFor();
  await page.locator(`svg#graph .node[data-id="Token"] circle`).click();

  const link = page.locator('#panel-body a[href^="./"]').first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const target = decodeURIComponent(
    href.replace(/^\.\//, "").replace(/\.md$/, "")
  );

  await link.click();

  await expect(page.locator("#panel-title")).toHaveText(target);
  expect(page.url()).toContain(encodeURIComponent(target));
});

test("theme toggle flips and persists across reload", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("html").getAttribute("data-theme");

  await page.locator("#theme-toggle").click();
  const after = await page.locator("html").getAttribute("data-theme");
  expect(after).not.toBe(before);

  await page.reload();
  const persisted = await page.locator("html").getAttribute("data-theme");
  expect(persisted).toBe(after);
});

test("first visit honours prefers-color-scheme: light", async ({ browser }) => {
  // Fresh context: no stored theme, emulated light preference → light theme.
  const ctx = await browser.newContext({ colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await ctx.close();
});

test("hash deep-link opens the term on load", async ({ page }) => {
  await page.goto("/#Token");
  await expect(page.locator("#panel")).toBeVisible();
  await expect(page.locator("#panel-title")).toHaveText("Token");
});
