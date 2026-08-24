import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const curatedPath = resolve(root, "data/curated-models.json");
const registryPath = resolve(root, "data/source-registry.json");
const officialRegistryPath = resolve(root, "data/official-model-registry.json");
const outputPath = resolve(root, "public/models.json");
const reportPath = resolve(root, "data/catalog-report.json");
const sourceDir = process.env.CATALOG_SOURCE_DIR;
const today = new Date().toISOString().slice(0, 10);
const MAX_MODELS = 3000;

const [curated, registry, officialRegistry] = await Promise.all([readJson(curatedPath), readJson(registryPath), readJson(officialRegistryPath)]);
const officialEvidence = new Map(officialRegistry.models.map((model) => [evidenceKey(model), model]));
const [openrouterRaw, huggingfaceRaw] = await Promise.all([
  sourceDir ? readJson(resolve(sourceDir, "openrouter.json")) : fetchJson("https://openrouter.ai/api/v1/models"),
  sourceDir ? readJson(resolve(sourceDir, "huggingface.json")) : fetchOfficialHuggingFaceModels(Object.keys(registry.huggingface)),
]);

const stats = {
  curated: { examined: curated.models.length, accepted: 0, rejected: 0, duplicates: 0 },
  openrouter: { examined: openrouterRaw.data?.length ?? 0, accepted: 0, rejected: 0, duplicates: 0 },
  huggingface: { examined: huggingfaceRaw.length ?? 0, accepted: 0, rejected: 0, duplicates: 0 },
};
const accepted = [];
const seen = new Set();

for (const model of curated.models) {
  const evidence = officialEvidence.get(evidenceKey(model));
  if (!evidence || model.variantOf || shouldExclude(model.name)) {
    stats.curated.rejected += 1;
    continue;
  }
  addModel({
    ...model,
    source: evidence.source,
    sourceKind: "curated",
    lifecycle: evidence.lifecycle ?? model.lifecycle ?? inferLifecycle(model.name),
    verificationStatus: evidence.lifecycle === "preview" ? "preview" : "official",
    discoveredAt: officialRegistry.updatedAt ?? today,
  }, "curated");
}

for (const item of openrouterRaw.data ?? []) {
  const model = fromOpenRouter(item);
  if (!model) stats.openrouter.rejected += 1;
  else addModel(model, "openrouter");
}

const officialHuggingFace = [...huggingfaceRaw]
  .filter((item) => registry.huggingface[item.author])
  .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
for (const item of officialHuggingFace) {
  const model = fromHuggingFace(item);
  if (!model) stats.huggingface.rejected += 1;
  else addModel(model, "huggingface");
}

const retained = accepted.slice(0, MAX_MODELS);
const existingCompanyOrder = new Map();
for (const model of curated.models) {
  if (!existingCompanyOrder.has(model.company)) existingCompanyOrder.set(model.company, existingCompanyOrder.size + 1);
}
const companies = [...new Set(retained.map((model) => model.company))];
const remainingCompanies = companies.filter((company) => !existingCompanyOrder.has(company)).sort((a, b) => a.localeCompare(b));
for (const company of remainingCompanies) existingCompanyOrder.set(company, existingCompanyOrder.size + 1);
const companyCounts = Object.fromEntries(companies.map((company) => [company, retained.filter((model) => model.company === company).length]));

const models = retained.map((model, index) => ({
  ...model,
  id: `m-${index + 1}`,
  companyOrder: existingCompanyOrder.get(model.company),
  group: `${String(existingCompanyOrder.get(model.company)).padStart(2, "0")}  ${model.company}  ·  ${companyCounts[model.company]} models`,
}));
const sourceCounts = countBy(models, "sourceKind");
const lifecycleCounts = countBy(models, "lifecycle");

const output = {
  meta: {
    title: "MODELVERSE 模型宇宙",
    generatedAt: today,
    spreadsheetDate: curated.meta?.spreadsheetDate ?? "7.27",
    modelCount: models.length,
    companyCount: companies.length,
    sourceCounts,
    lifecycleCounts,
    updateStrategy: "weekly-curated-plus-public-registry",
    sourceNote: "Excel curated data + OpenRouter catalog + verified Hugging Face organizations",
  },
  models,
};
const report = {
  generatedAt: today,
  final: { modelCount: models.length, companyCount: companies.length, sourceCounts, lifecycleCounts },
  intake: stats,
  excludedByLimit: Math.max(0, accepted.length - models.length),
  companyCounts: Object.fromEntries(Object.entries(companyCounts).sort((a, b) => b[1] - a[1])),
  rules: {
    maximumModels: MAX_MODELS,
    precedence: ["curated", "openrouter", "huggingface"],
    huggingFacePolicy: "All discoverable text-generation models from verified organizations listed in data/source-registry.json",
    exclusions: "Aliases, routers, quantized derivatives, adapters, merges, and incomplete records",
  },
  sources: [
    "https://openrouter.ai/api/v1/models",
    "https://huggingface.co/api/models?author={verified-organization}&pipeline_tag=text-generation&limit=300&full=true",
  ],
};

await Promise.all([
  writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
]);
console.log(`MODELVERSE catalog: ${models.length} models across ${companies.length} companies.`);
console.log(`Sources: ${Object.entries(sourceCounts).map(([key, value]) => `${key}=${value}`).join(", ")}.`);
console.log(`Report: ${reportPath}`);

function addModel(model, source) {
  const key = canonicalKey(model);
  if (seen.has(key)) {
    stats[source].duplicates += 1;
    return;
  }
  seen.add(key);
  accepted.push(model);
  stats[source].accepted += 1;
}

function fromOpenRouter(item) {
  if (!item?.id || item.id.startsWith("~") || item.alias_target) return null;
  const [provider, ...nameParts] = item.id.split("/");
  const company = registry.openrouter[provider];
  if (!company || provider === "openrouter") return null;
  const rawName = nameParts.join("/").replace(/:(free|extended)$/i, "");
  const name = cleanDisplayName(item.name, rawName, company);
  if (!name || shouldExclude(name) || /\b(auto|router)\b/i.test(name)) return null;
  const modalities = item.architecture?.input_modalities ?? [];
  const supported = item.supported_parameters ?? [];
  return {
    group: "",
    companyOrder: 0,
    name,
    company,
    type: inferType(name, modalities),
    params: inferParams(name),
    activeParams: "—",
    release: formatDate(item.created),
    size: "云端 / 未公开",
    openSource: item.hugging_face_id ? "开放权重 / API" : "API",
    context: formatTokens(item.context_length),
    maxOutput: formatTokens(item.top_provider?.max_completion_tokens),
    inputPrice: formatPrice(item.pricing?.prompt),
    outputPrice: formatPrice(item.pricing?.completion),
    multimodal: modalities.some((value) => value !== "text") ? "是" : "否",
    reasoning: supported.includes("reasoning") || /reason|thinking|r\d/i.test(name) ? "支持" : "标准",
    notes: trimText(item.description, 180) || "OpenRouter 可调用模型",
    industries: "通用",
    scenarios: inferScenarios(name, modalities),
    source: `https://openrouter.ai/${item.id}`,
    sourceKind: "openrouter",
    verificationStatus: "third-party",
    lifecycle: item.expiration_date ? "deprecated" : inferLifecycle(name),
    discoveredAt: today,
  };
}

function fromHuggingFace(item) {
  if (!item?.modelId || !item.author || item.private || item.gated === "manual") return null;
  const name = item.modelId.split("/").at(-1);
  if (!name || shouldExclude(name)) return null;
  const tags = item.tags ?? [];
  return {
    group: "",
    companyOrder: 0,
    name,
    company: registry.huggingface[item.author],
    type: inferType(name, tags),
    params: inferParams(name),
    activeParams: "—",
    release: formatDate(item.createdAt),
    size: "开放权重",
    openSource: "✅ 开放权重",
    context: inferContext(tags),
    maxOutput: "—",
    inputPrice: "开源免费",
    outputPrice: "—",
    multimodal: tags.some((tag) => /image|vision|audio|video/i.test(tag)) ? "是" : "否",
    reasoning: /reason|thinking|r\d/i.test(name) ? "支持" : "标准",
    notes: `Hugging Face 官方组织模型 · ${Number(item.downloads ?? 0).toLocaleString("en-US")} downloads`,
    industries: "通用",
    scenarios: inferScenarios(name, tags),
    source: `https://huggingface.co/${item.modelId}`,
    sourceKind: "huggingface",
    verificationStatus: "official",
    lifecycle: inferLifecycle(name),
    discoveredAt: today,
    downloads: item.downloads ?? 0,
  };
}

function canonicalKey(model) {
  const name = String(model.name).toLowerCase().replace(/:(free|extended)$/g, "").replace(/[-_.\s]+latest$/g, "").replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  return `${String(model.company).toLowerCase()}::${name}`;
}

function evidenceKey(model) {
  return `${String(model.company).trim().toLowerCase()}::${String(model.name).trim().toLowerCase()}`;
}

function shouldExclude(name) {
  return /(?:^|[-_.\s])(gguf|awq|gptq|exl2|mlx|fp8|fp16|bf16|int[248]|nf4|[48]bit|bnb|quant(?:ized)?|uncensored|abliterated|heretic|adapter|lora|merge)(?:$|[-_.\s])/i.test(name);
}

function inferLifecycle(name) {
  if (/deprecated|legacy|retired/i.test(name)) return "deprecated";
  if (/preview|experimental|beta|alpha/i.test(name)) return "preview";
  return "stable";
}

function inferType(name, signals = []) {
  const value = `${name} ${signals.join(" ")}`;
  if (/embed/i.test(value)) return "嵌入模型 (Embedding)";
  if (/code|coder|devstral/i.test(value)) return "代码模型 (Coding)";
  if (/vision|vl|image|video|audio|omni/i.test(value)) return "多模态模型 (Multimodal)";
  if (/reason|thinking|r\d/i.test(value)) return "推理模型 (Reasoning)";
  return "语言模型 (LLM)";
}

function inferScenarios(name, signals = []) {
  const value = `${name} ${signals.join(" ")}`;
  if (/code|coder|devstral/i.test(value)) return "代码生成、代码理解、智能编程";
  if (/vision|vl|image|video|audio|omni/i.test(value)) return "多模态理解、内容分析、智能助手";
  if (/reason|thinking|r\d/i.test(value)) return "复杂推理、数学、科学与决策分析";
  return "对话、写作、知识问答、智能助手";
}

function inferParams(name) {
  const matches = String(name).match(/(?:^|[-_.\s])(\d+(?:\.\d+)?)[-_\s]?(T|B|M)(?:$|[-_.\s])/ig);
  if (!matches?.length) return "未公开";
  const last = matches.at(-1).match(/(\d+(?:\.\d+)?)[-_\s]?(T|B|M)/i);
  return `${last[1]}${last[2].toUpperCase()}`;
}

function inferContext(tags) {
  const tag = tags.find((value) => /context[-_ ]?length:/i.test(value));
  const number = tag?.match(/(\d+)/)?.[1];
  return number ? formatTokens(Number(number)) : "—";
}

function formatDate(value) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value ?? 0);
  return Number.isNaN(date.getTime()) ? "—" : `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatTokens(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "—";
  if (number >= 1_000_000) return `${trimNumber(number / 1_000_000)}M`;
  if (number >= 1_000) return `${trimNumber(number / 1_000)}K`;
  return String(number);
}

function formatPrice(value) {
  const perToken = Number(value);
  if (!Number.isFinite(perToken) || perToken < 0) return "—";
  return `$${trimNumber(perToken * 1_000_000, 4)}/M`;
}

function trimNumber(value, digits = 2) {
  return Number(value.toFixed(digits)).toLocaleString("en-US");
}

function cleanDisplayName(displayName, fallback, company) {
  const plain = String(displayName || fallback).trim();
  const companyPrefix = `${company}:`;
  return plain.toLowerCase().startsWith(companyPrefix.toLowerCase()) ? plain.slice(companyPrefix.length).trim() : plain;
}

function trimText(value, length) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function countBy(items, key) {
  return items.reduce((result, item) => {
    result[item[key]] = (result[item[key]] ?? 0) + 1;
    return result;
  }, {});
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "modelverse-catalog/1.0" } });
  if (!response.ok) throw new Error(`Catalog fetch failed: ${response.status} ${url}`);
  return response.json();
}

async function fetchOfficialHuggingFaceModels(authors) {
  const results = [];
  const queue = [...authors];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const author = queue.shift();
      const url = `https://huggingface.co/api/models?author=${encodeURIComponent(author)}&pipeline_tag=text-generation&sort=downloads&direction=-1&limit=300&full=true`;
      const models = await fetchJson(url);
      results.push(...models);
    }
  });
  await Promise.all(workers);
  return results;
}
