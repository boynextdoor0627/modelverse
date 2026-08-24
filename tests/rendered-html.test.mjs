import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the MODELVERSE loading shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>MODELVERSE · 语言模型宇宙<\/title>/i);
  assert.match(html, /<main class="loading">/);
  assert.match(html, /class="boot-ring"/);
  assert.match(html, /正在唤醒模型宇宙/);
});

test("ships an interactive bilingual catalog with auditable sources", async () => {
  const [page, css, catalogText, reportText, workflow, officialRegistryText] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/models.json", import.meta.url), "utf8"),
    readFile(new URL("../data/catalog-report.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/update-model-catalog.yml", import.meta.url), "utf8"),
    readFile(new URL("../data/official-model-registry.json", import.meta.url), "utf8"),
  ]);
  const catalog = JSON.parse(catalogText);
  const report = JSON.parse(reportText);
  const officialRegistry = JSON.parse(officialRegistryText);

  assert.match(page, /fetch\("\/models\.json"\)/);
  assert.match(page, /type Lang = "zh" \| "en"/);
  assert.match(page, /<canvas/);
  assert.match(page, /onPointerMove/);
  assert.match(page, /onWheel/);
  assert.match(css, /touch-action:\s*none/);
  assert.ok(catalog.meta.modelCount >= 700);
  assert.ok(catalog.meta.companyCount >= 60);
  assert.equal(catalog.meta.modelCount, catalog.models.length);
  assert.equal(catalog.meta.companyCount, new Set(catalog.models.map((model) => model.company)).size);
  assert.equal(new Set(catalog.models.map((model) => model.id)).size, catalog.models.length);
  assert.equal(report.final.modelCount, catalog.meta.modelCount);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /node scripts\/update-model-catalog\.mjs/);
  assert.match(page, /official-model-registry\.json/);
  assert.match(page, /model\.sourceKind !== "curated"/);
  assert.ok(officialRegistry.models.length >= 20);
  assert.ok(officialRegistry.models.every((model) => /^https:\/\//.test(model.source)));
});
