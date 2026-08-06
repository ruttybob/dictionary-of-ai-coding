import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { termIdFromHref } from "../site/src/layout";

// The single visitor-facing seam (see .scratch/3d-graph-site/PRD.md, Testing
// Decisions). Asserts only behaviour a visitor can see; never pokes into
// react-three-fiber / three.js internals. Expected values are read from the
// generated data layer so the test tracks real content.
const data = JSON.parse(readFileSync("./site/src/data.json", "utf8")) as {
  nodes: { id: string; label: string; description: string; body: string }[];
  edges: { source: string; target: string }[];
  order: string[];
};
const totalNodes = data.nodes.length;
const token = data.nodes.find((n) => n.id === "Token");
expect(token, "Token entry must exist in data.json for the smoke").toBeTruthy();
const tokenOrderIdx = data.order.indexOf("Token");
expect(tokenOrderIdx, "Token must be in order[]").toBeGreaterThan(-1);

const QUERY = "токен";
const matchesQuery = (n: {
  label: string;
  description: string;
  body: string;
}) => `${n.label} ${n.description} ${n.body}`.toLowerCase().includes(QUERY);
const matchCount = data.nodes.filter(matchesQuery).length;

// Cold-start WebGL under headless chromium can take a while; wait generously.
const READY = "html[data-ready='true']";
async function gotoReady(page: Page, hash = "") {
  await page.goto("/" + hash);
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.waitForSelector(READY, { timeout: 40_000 });
}

test("scene mounts: canvas present, data-ready set, node count from data layer", async ({
  page,
}) => {
  await gotoReady(page);
  await expect(page.locator("canvas")).toHaveCount(1);
  // Node COUNT is asserted on the data layer (PRD Testing Decisions): the
  // generator emits exactly totalNodes ids, which the scene consumes.
  expect(totalNodes).toBeGreaterThan(0);
});

test("search lists matches", async ({ page }) => {
  await gotoReady(page);
  await page.locator("#search").fill(QUERY);
  await expect(page.locator("#results .result").first()).toBeVisible();
  const shown = await page.locator("#results .result").count();
  expect(shown).toBe(Math.min(matchCount, 8));
});

test("selecting a node opens the panel with its Russian definition", async ({
  page,
}) => {
  // Hash deep-link selects deterministically; canvas click coords are
  // layout-dependent and flaky.
  await gotoReady(page, "#Token");
  await expect(page.locator("#panel")).toHaveAttribute("data-term", "Token");
  await expect(page.locator("#panel-title")).toHaveText("Token");
  const snippet = token!.body
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  await expect(page.locator("#panel-body")).toContainText(snippet);
});

test("prev/next step through Curriculum order", async ({ page }) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#panel-title")).toHaveText("Token");

  const nextId = data.order[(tokenOrderIdx + 1) % data.order.length]!;
  await page.locator(".nav-btn[aria-label='Следующий термин']").click();
  await expect(page.locator("#panel-title")).toHaveText(
    data.nodes.find((n) => n.id === nextId)!.label
  );

  await page.locator(".nav-btn[aria-label='Предыдущий термин']").click();
  await expect(page.locator("#panel-title")).toHaveText("Token");
  await page.locator(".nav-btn[aria-label='Предыдущий термин']").click();
  const prevId =
    data.order[(tokenOrderIdx - 1 + data.order.length) % data.order.length]!;
  await expect(page.locator("#panel-title")).toHaveText(
    data.nodes.find((n) => n.id === prevId)!.label
  );
});

test("a cross-link inside a definition flies to that term", async ({
  page,
}) => {
  await gotoReady(page, "#Token");
  const link = page.locator('#panel-body a[href^="./"]').first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const targetId = termIdFromHref(href);
  const target = data.nodes.find((n) => n.id === targetId);
  expect(
    target,
    `cross-link target ${targetId} must be a real node`
  ).toBeTruthy();

  await link.click();
  await expect(page.locator("#panel")).toHaveAttribute("data-term", targetId);
  await expect(page.locator("#panel-title")).toHaveText(target!.label);
});

test("Esc closes the panel", async ({ page }) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#panel")).toHaveAttribute("data-term", "Token");
  await page.keyboard.press("Escape");
  // Selection cleared → Panel unmounts (US#28: return to overview).
  await expect(page.locator("#panel")).toHaveCount(0);
});

test("hash deep-link opens the term on load", async ({ page }) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#panel-title")).toHaveText("Token");
});

test("under prefers-reduced-motion the scene still mounts", async ({
  browser,
}) => {
  // autoRotate lives inside OrbitControls and is not visitor-DOM-visible, so we
  // assert the weaker but honest contract: the scene boots cleanly under the
  // preference (bloom off / autoRotate-off paths taken without errors).
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await gotoReady(page, "#Token");
  await expect(page.locator("#panel-title")).toHaveText("Token");
  expect(
    errors,
    "no console errors under reduced-motion: " + errors.join("; ")
  ).toEqual([]);
  await ctx.close();
});
