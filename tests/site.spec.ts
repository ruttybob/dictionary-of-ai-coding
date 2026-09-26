import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { termIdFromHref } from "../site/src/derive";

// The single visitor-facing seam (see .scratch/wiki-site/PRD.md, Testing
// Decisions). Asserts only behaviour a visitor can see. Expected values are
// read from the generated data layer so the test tracks real content.
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

const READY = "html[data-ready='true']";
async function gotoReady(page: Page, hash = "") {
  await page.goto("/" + hash);
  await page.waitForSelector(READY, { timeout: 15_000 });
}

test("wiki mounts: sidebar visible, data-ready set, contents lists every term", async ({
  page,
}) => {
  await gotoReady(page);
  await expect(page.locator("#sidebar")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#sidebar .toc-link")).toHaveCount(totalNodes);
});

test("search lists matches", async ({ page }) => {
  await gotoReady(page);
  await page.locator("#search").fill(QUERY);
  await expect(page.locator("#results .result").first()).toBeVisible();
  const shown = await page.locator("#results .result").count();
  expect(shown).toBe(Math.min(matchCount, 8));
});

test("hash deep-link opens the term with its Russian definition", async ({
  page,
}) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#article")).toHaveAttribute("data-term", "Token");
  await expect(page.locator("#article-title")).toHaveText("Token");
  const snippet = token!.body
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  await expect(page.locator("#article-body")).toContainText(snippet);
});

test("prev/next step through Curriculum order", async ({ page }) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#article-title")).toHaveText("Token");

  const nextId = data.order[(tokenOrderIdx + 1) % data.order.length]!;
  await page.locator(".nav-btn[aria-label='Следующий термин']").click();
  await expect(page.locator("#article-title")).toHaveText(
    data.nodes.find((n) => n.id === nextId)!.label
  );

  await page.locator(".nav-btn[aria-label='Предыдущий термин']").click();
  await expect(page.locator("#article-title")).toHaveText("Token");
  await page.locator(".nav-btn[aria-label='Предыдущий термин']").click();
  const prevId =
    data.order[(tokenOrderIdx - 1 + data.order.length) % data.order.length]!;
  await expect(page.locator("#article-title")).toHaveText(
    data.nodes.find((n) => n.id === prevId)!.label
  );
});

test("a cross-link inside a definition opens that term", async ({ page }) => {
  await gotoReady(page, "#Token");
  const link = page.locator('#article-body a[href^="./"]').first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const targetId = termIdFromHref(href);
  const target = data.nodes.find((n) => n.id === targetId);
  expect(
    target,
    `cross-link target ${targetId} must be a real node`
  ).toBeTruthy();

  await link.click();
  await expect(page.locator("#article")).toHaveAttribute("data-term", targetId);
  await expect(page.locator("#article-title")).toHaveText(target!.label);
});

test("Esc returns to the home view", async ({ page }) => {
  await gotoReady(page, "#Token");
  await expect(page.locator("#article")).toHaveAttribute("data-term", "Token");
  await page.keyboard.press("Escape");
  await expect(page.locator("#article")).toHaveCount(0);
  await expect(page.locator("#home")).toBeVisible();
});
