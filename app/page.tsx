"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type Lang = "zh" | "en";
type Model = {
  id: string; name: string; company: string; companyOrder: number; type: string;
  params: string; activeParams: string; release: string; size: string; openSource: string;
  context: string; maxOutput: string; inputPrice: string; outputPrice: string;
  multimodal: string; reasoning: string; notes: string; industries: string;
  scenarios: string; source: string; sourceKind?: string; lifecycle?: string; discoveredAt?: string; downloads?: number;
};
type Catalog = { meta: { modelCount: number; companyCount: number; generatedAt: string; sourceNote: string }; models: Model[] };
type Point3 = { x: number; y: number; z: number };
type ScreenNode = { x: number; y: number; radius: number; depth: number; model: Model };
type ScreenCompany = { x: number; y: number; radius: number; depth: number; company: string };
type MotionMode = "full" | "reduced" | "static";
type ViewMode = "models" | "agents";
type AgentItem = { name: string; maker: string; category: string; models: string; tools: string; access: string; status: string; description: string; source?: string };

const COLORS = ["#58f6ff", "#8d7dff", "#ff6fcf", "#ffae57", "#77ffb4", "#74a5ff", "#f7ff78"];
const COMPANY_LOGOS: Record<string, string> = {
  OpenAI: "openai", Anthropic: "anthropic", "Google DeepMind": "googledeepmind", Meta: "meta", Microsoft: "microsoft",
  NVIDIA: "nvidia", Amazon: "amazon", Apple: "apple", IBM: "ibm", Salesforce: "salesforce", Perplexity: "perplexity",
  "Hugging Face": "huggingface", Cohere: "cohere", xAI: "x", Alibaba: "alibabacloud", Tencent: "tencentqq",
  ByteDance: "bytedance", Baidu: "baidu", Xiaomi: "xiaomi", xiaomi: "xiaomi", bilibili: "bilibili", Meituan: "meituan",
  DeepSeek: "deepseek", MistralAI: "mistralai", "Mistral AI": "mistralai", StabilityAI: "stabilityai", "Stability AI": "stabilityai",
  NAVER: "naver", "LG AI Research": "lg", "SK Telecom": "sktelecom", "Allen Institute for AI": "allenai", H2Oai: "h2oai", "H2O.ai": "h2oai",
};
const COMPANY_REGIONS: Record<string, string> = {
  "01.AI":"China", "AI21 Labs":"Israel", "Aion Labs":"Israel", Alibaba:"China", "Allen Institute for AI":"United States", Amazon:"United States", Anthropic:"United States", Apple:"United States", "Arcee AI":"United States", Baichuan:"China", Baidu:"China", BigCode:"Global", BigScience:"Global", bilibili:"China", ByteDance:"China", Cohere:"Canada", "Deep Cogito":"United States", DeepSeek:"China", EleutherAI:"Global", "Google DeepMind":"United Kingdom / United States", GSAI:"China", "H2O.ai":"United States", "Hugging Face":"United States / France", IBM:"United States", Inception:"United Arab Emirates", InclusionAI:"China", InternScience:"China", Kuaishou:"China", "LG AI Research":"South Korea", "Liquid AI":"United States", Meituan:"China", Meta:"United States", Microsoft:"United States", MiniMax:"China", "Mistral AI":"France", ModelBest:"China", "Moonshot AI":"China", Morph:"United States", NAVER:"South Korea", "Nexa AI":"United States", "Nous Research":"United States", NVIDIA:"United States", OpenAI:"United States", OpenBMB:"China", Perplexity:"United States", Poolside:"United States / France", "Preferred Networks":"Japan", "Reka AI":"United States", Relace:"United States", Rinna:"Japan", "Sakana AI":"Japan", Salesforce:"United States", "Sarvam AI":"India", "SB Intuitions":"Japan", "SCB 10X":"Thailand", SenseTime:"China", "Shanghai AI Lab":"China", "SK Telecom":"South Korea", Snowflake:"United States", SpeakLeash:"Poland", "Stability AI":"United Kingdom", "Stanford CRFM":"United States", "State Spaces":"United States", StepFun:"China", "Swiss AI":"Switzerland", Tencent:"China", "Thinking Machines":"United States", TII:"United Arab Emirates", TinyLlama:"Global", "Tokyo Tech":"Japan", Upstage:"South Korea", Writer:"United States", xAI:"United States", Xiaomi:"China", "Zhipu AI":"China",
};
function canonicalCompany(company: string) {
  const aliases: Record<string, string> = { xiaomi:"Xiaomi", mistralai:"Mistral AI", h2oai:"H2O.ai", stabilityai:"Stability AI" };
  return aliases[company.trim().toLowerCase()] || company.trim();
}
const REGION_ZH: Record<string, string> = { China:"中国", "Hong Kong, China":"中国香港", "Taiwan, China":"中国台湾", "United States":"美国", "United Kingdom":"英国", France:"法国", Canada:"加拿大", Israel:"以色列", "United Arab Emirates":"阿联酋", "South Korea":"韩国", Japan:"日本", India:"印度", Thailand:"泰国", Poland:"波兰", Switzerland:"瑞士", Global:"全球" };
function regionLabel(company: string, lang: Lang) {
  const value = COMPANY_REGIONS[company] || "Global";
  if (lang === "en") return value;
  return value.split(" / ").map((part) => REGION_ZH[part] || part).join(" / ");
}
function regionGroup(company: string) {
  const value = COMPANY_REGIONS[company] || "Global";
  if (/China|Hong Kong|Taiwan/.test(value)) return "china";
  if (/United States|Canada/.test(value)) return "northAmerica";
  if (/France|United Kingdom|Poland|Switzerland/.test(value)) return "europe";
  if (/Japan|South Korea|India|Thailand|Israel|Emirates/.test(value)) return "asia";
  return "global";
}
const FILTERS = ["all", "llm", "reasoning", "multimodal", "code"] as const;
const AGENTS: AgentItem[] = [
  { name:"Claude", maker:"Anthropic", category:"通用", models:"Claude 系列", tools:"文件、网页、连接器、Artifacts", access:"云服务", status:"active", description:"面向知识工作、分析、创作与多步骤任务的通用智能助手。", source:"https://www.anthropic.com/claude" },
  { name:"Claude Code", maker:"Anthropic", category:"开发", models:"Claude 系列", tools:"代码、终端、MCP、GitHub", access:"云服务", status:"active", description:"可理解完整代码库、修改代码并执行端到端工程任务的编码 Agent。", source:"https://www.anthropic.com/product/claude-code" },
  { name:"WorkBuddy", maker:"Tencent", category:"通用", models:"多模型", tools:"办公、代码、设计、多 Agent", access:"桌面端 / 云服务", status:"active", description:"腾讯推出的全场景 AI 工作台，可拆解并执行办公、开发与创意任务。", source:"https://cloud.tencent.com/product/workbuddy" },
  { name:"OpenAI Codex", maker:"OpenAI", category:"开发", models:"GPT 系列", tools:"代码、终端、GitHub、并行任务", access:"云服务", status:"active", description:"面向软件开发、代码审查与长周期工程协作的编码 Agent。", source:"https://openai.com/codex/" },
  { name:"ChatGPT Agent", maker:"OpenAI", category:"通用", models:"GPT 系列", tools:"浏览器、文件、研究、代码", access:"云服务", status:"active", description:"在统一工作区中研究、分析并执行多步骤任务的通用 Agent。" },
  { name:"Gemini CLI", maker:"Google", category:"开发", models:"Gemini 系列", tools:"代码、终端、搜索", access:"开放源码", status:"active", description:"面向终端工作流的开源智能 Agent。" },
  { name:"Gemini", maker:"Google", category:"通用", models:"Gemini 系列", tools:"搜索、Workspace、浏览器、文件", access:"云服务", status:"active", description:"连接 Google 生态，用于研究、创作与跨应用任务执行。" },
  { name:"Manus", maker:"Butterfly Effect", category:"通用", models:"多模型", tools:"浏览器、文件、代码", access:"云服务", status:"active", description:"可规划并执行多步骤通用任务的自主 Agent。" },
  { name:"Devin", maker:"Cognition", category:"开发", models:"多模型", tools:"IDE、终端、浏览器", access:"云服务", status:"active", description:"面向端到端软件工程任务的 Agent。" },
  { name:"Cursor", maker:"Anysphere", category:"开发", models:"多模型", tools:"IDE、代码库、终端、Agent", access:"桌面端 / 云服务", status:"active", description:"将代码理解、编辑和任务执行整合进开发环境的编程 Agent。" },
  { name:"GitHub Copilot", maker:"GitHub / Microsoft", category:"开发", models:"多模型", tools:"IDE、GitHub、代码审查、终端", access:"云服务", status:"active", description:"覆盖编辑器到 GitHub 工作流的开发协作 Agent。" },
  { name:"Windsurf", maker:"Cognition", category:"开发", models:"多模型", tools:"IDE、代码库、终端", access:"桌面端 / 云服务", status:"active", description:"以 Agent 工作流驱动代码理解、生成与工程修改。" },
  { name:"Replit Agent", maker:"Replit", category:"开发", models:"多模型", tools:"应用构建、部署、数据库", access:"云服务", status:"active", description:"从自然语言需求出发构建、测试并部署完整应用。" },
  { name:"Perplexity Comet", maker:"Perplexity", category:"浏览器", models:"多模型", tools:"浏览器、搜索、网页操作", access:"桌面端 / 云服务", status:"active", description:"将搜索、理解与网页任务执行结合在浏览器中的个人 Agent。" },
  { name:"Microsoft Copilot", maker:"Microsoft", category:"办公", models:"多模型", tools:"Microsoft 365、网页、企业数据", access:"云服务", status:"active", description:"面向个人与企业办公流程的生产力 Agent。" },
  { name:"Amazon Q Developer", maker:"Amazon", category:"开发", models:"多模型", tools:"IDE、AWS、终端、代码转换", access:"云服务", status:"active", description:"面向软件开发和 AWS 运维任务的企业级 Agent。" },
  { name:"Agentforce", maker:"Salesforce", category:"企业", models:"Atlas / 多模型", tools:"CRM、流程、企业数据", access:"企业云服务", status:"active", description:"在 Salesforce 数据与业务流程上构建和运行企业 Agent。" },
  { name:"OpenHands", maker:"All Hands AI", category:"开源框架", models:"可配置", tools:"代码、终端、浏览器", access:"开放源码", status:"community", description:"可自行部署的软件开发 Agent 平台。" },
  { name:"Aider", maker:"社区", category:"开源框架", models:"可配置", tools:"代码、终端、Git", access:"开放源码", status:"community", description:"在终端中与代码库协作的轻量开源编程 Agent。" },
  { name:"AutoGPT", maker:"Significant Gravitas", category:"开源框架", models:"可配置", tools:"插件、浏览器、代码", access:"开放源码", status:"community", description:"早期自主 Agent 框架与实验生态。" },
  { name:"LangGraph", maker:"LangChain", category:"编排框架", models:"可配置", tools:"工作流、状态、工具", access:"开放源码", status:"active", description:"构建有状态、多步骤 Agent 工作流的编排框架。" },
  { name:"CrewAI", maker:"CrewAI", category:"多 Agent", models:"可配置", tools:"角色、任务、工具", access:"开放源码", status:"active", description:"以角色和团队协作为核心的多 Agent 框架。" },
  { name:"Dify", maker:"Dify", category:"编排框架", models:"可配置", tools:"工作流、知识库、工具、发布", access:"开放源码 / 云服务", status:"active", description:"用于构建、编排和发布生产级 Agent 应用的平台。" },
  { name:"n8n AI Agents", maker:"n8n", category:"编排框架", models:"可配置", tools:"工作流、应用连接、自动化", access:"开放源码 / 云服务", status:"active", description:"把 Agent 推理与跨应用自动化工作流连接起来。" },
];
function lifecycleOf(model: Model) { return model.lifecycle || (/preview|beta/i.test(model.name) ? "preview" : "stable"); }
function lifecycleText(model: Model, lang: Lang) { const value = lifecycleOf(model); const labels = lang === "zh" ? { stable:"持续维护", preview:"预览版本", deprecated:"停止维护" } : { stable:"Maintained", preview:"Preview", deprecated:"Deprecated" }; return labels[value as keyof typeof labels] || (lang === "zh" ? "状态待确认" : "Status unverified"); }
function sourceTrust(model: Model, lang: Lang) { const official = model.source.startsWith("http"); const curated = model.sourceKind === "curated"; const trust = lang === "zh" ? (official ? "官方来源 · 已验证" : curated ? "人工整理 · 待官方复核" : "公开目录 · 自动收录") : (official ? "Official · Verified" : curated ? "Curated · Pending official review" : "Public catalog · Automated"); return `${trust} · ${popularityText(model, lang)}`; }
type ModelTier = "flagship" | "stable" | "lightweight" | "specialized" | "historical" | "deprecated";
const TIER_ORDER: ModelTier[] = ["flagship", "stable", "lightweight", "specialized", "historical", "deprecated"];
const TIER_STYLE: Record<ModelTier, { distance: number; size: number; alpha: number; color: string }> = {
  flagship:{ distance:.42, size:2.25, alpha:1, color:"#e8ffff" }, stable:{ distance:.68, size:1.25, alpha:.9, color:"#70e7f3" },
  lightweight:{ distance:.91, size:.82, alpha:.78, color:"#77ffb4" }, specialized:{ distance:1.13, size:1, alpha:.76, color:"#a99bff" },
  historical:{ distance:1.38, size:.62, alpha:.4, color:"#647c8d" }, deprecated:{ distance:1.62, size:.44, alpha:.22, color:"#755966" },
};
function tierLabel(tier: ModelTier, lang: Lang) { const zh = { flagship:"当前旗舰", stable:"主流稳定", lightweight:"轻量模型", specialized:"专项模型", historical:"历史模型", deprecated:"停止维护" }; const en = { flagship:"Flagship", stable:"Mainstream", lightweight:"Lightweight", specialized:"Specialized", historical:"Historical", deprecated:"Deprecated" }; return (lang === "zh" ? zh : en)[tier]; }
function modelTier(model: Model, index: number): ModelTier {
  const lifecycle = lifecycleOf(model); if (lifecycle === "deprecated") return "deprecated";
  const releaseYear = Number(String(model.release).match(/20\d{2}/)?.[0] || 0); if (releaseYear && releaseYear <= 2023) return "historical";
  const param = parseMetric(model.params); const text = `${model.name} ${model.type}`;
  if (/max|ultra|\bpro\b|flagship|gpt-5|opus|maverick|deepseek-v[34]/i.test(model.name) || param >= 200) return "flagship";
  if (param > 0 && param <= 15 || /mini|nano|tiny|lite|small|\b[0-9](?:\.[0-9])?b\b/i.test(model.name)) return "lightweight";
  if (/code|coder|vl|视觉|多模态|图像|视频|语音|audio|math|embed|rerank|reason|推理/i.test(text)) return "specialized";
  return "stable";
}
function parseMetric(value: string) { const match = String(value).replaceAll(",", "").match(/[\d.]+/); return match ? Number(match[0]) : 0; }
function contextKOf(value: string) {
  const amount = parseMetric(value); if (!amount) return 8;
  return /\bM\b|million/i.test(value) ? amount * 1000 : /\bK\b/i.test(value) ? amount : amount > 2048 ? amount / 1000 : amount;
}
type PrecisionKey = "bf16" | "fp8" | "int4";
const PRECISIONS: Record<PrecisionKey, { bytes: number; zh: string; en: string; noteZh: string; noteEn: string }> = {
  bf16:{ bytes:2, zh:"BF16 · 质量优先", en:"BF16 · Quality first", noteZh:"质量基准，显存需求最高", noteEn:"Reference quality, highest memory use" },
  fp8:{ bytes:1, zh:"FP8 / INT8 · 生产均衡", en:"FP8 / INT8 · Production balance", noteZh:"常见生产起点，需确认模型与硬件支持", noteEn:"Common production starting point; verify model and hardware support" },
  int4:{ bytes:.5, zh:"INT4 · 容量优先", en:"INT4 · Capacity first", noteZh:"显存最低，复杂任务应先做质量评测", noteEn:"Lowest memory use; evaluate quality on complex tasks" },
};
const GPU_PROFILES = [
  { id:"24", memory:22, zh:"24 GB 级 · 可用约 22 GB", en:"24 GB class · ~22 GB usable" },
  { id:"48", memory:44, zh:"48 GB 级 · 可用约 44 GB", en:"48 GB class · ~44 GB usable" },
  { id:"80", memory:74, zh:"80 GB 级 · 可用约 74 GB", en:"80 GB class · ~74 GB usable" },
  { id:"96", memory:88, zh:"96 GB 级 · 可用约 88 GB", en:"96 GB class · ~88 GB usable" },
  { id:"141", memory:130, zh:"141 GB 级 · 可用约 130 GB", en:"141 GB class · ~130 GB usable" },
];
// A deliberately short deployment shortlist. It favors widely used, currently
// offered open/open-weight families and keeps a useful spread of model sizes.
const DEPLOYMENT_FEATURED_IDS = [
  "m-8", "m-7", "m-9", "m-12", "m-11", "m-730", "m-124", "m-126",
  "m-112", "m-345", "m-346", "m-411", "m-427", "m-292", "m-364", "m-721",
];
function kvCoefficient(model: Model) {
  const text = `${model.name} ${model.type} ${model.notes}`;
  if (/MLA|DeepSeek/i.test(text)) return 72;
  if (/MoE|混合专家/i.test(text) || (parseMetric(model.activeParams) > 0 && parseMetric(model.activeParams) < parseMetric(model.params) * .5)) return 128;
  return parseMetric(model.params) <= 15 ? 96 : 256;
}
function popularityScore(model: Model) {
  if (model.downloads && model.downloads > 0) return clamp((Math.log10(model.downloads + 1) - 2) / 5.5, .08, 1);
  const tier = modelTier(model, 99); return tier === "flagship" ? .88 : tier === "stable" ? .56 : tier === "specialized" ? .5 : tier === "lightweight" ? .4 : tier === "historical" ? .24 : .1;
}
function popularityText(model: Model, lang: Lang) { if (model.downloads) return `${model.downloads.toLocaleString(lang === "zh" ? "zh-CN" : "en-US")} Hugging Face ${lang === "zh" ? "下载" : "downloads"}`; return lang === "zh" ? "主流代理指标 · 非公开使用量" : "Popularity proxy · not public usage"; }
const SEARCH_ALIASES: Record<string, string[]> = {
  "谷歌":["google deepmind","gemini"], "deep mind":["google deepmind"], "阿里":["alibaba","qwen"], "通义":["alibaba","qwen"], "通义千问":["qwen"],
  "字节":["bytedance","doubao"], "豆包":["bytedance","doubao"], "腾讯":["tencent","hunyuan"], "混元":["tencent","hunyuan"], "百度":["baidu","ernie"], "文心":["baidu","ernie"],
  "月之暗面":["moonshot ai","kimi"], "kimi":["moonshot ai","kimi"], "智谱":["zhipu ai","glm","chatglm"], "清言":["zhipu ai","glm"], "零一万物":["01.ai","yi"],
  "小米":["xiaomi","mimo"], "抱抱脸":["hugging face"], "脸书":["meta","llama"], "facebook":["meta","llama"], "chatgpt":["openai","gpt"],
  "bard":["google deepmind","gemini"], "claud":["anthropic","claude"], "mistrial":["mistral ai","mistral"], "deep seek":["deepseek"], "千问":["qwen"],
};
function normalizeSearch(value: string) { return value.normalize("NFKC").toLowerCase().replace(/[\s._/\\-]+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim(); }
function editDistance(a: string, b: string) { const row = Array.from({ length:b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = old; } } return row[b.length]; }
function aliasTerms(query: string) { const value = normalizeSearch(query); const terms = new Set(value.split(" ").filter(Boolean)); Object.entries(SEARCH_ALIASES).forEach(([alias, targets]) => { if (value.includes(alias)) targets.forEach((target) => terms.add(target)); }); return [...terms]; }
function searchScore(model: Model, query: string) {
  if (!query.trim()) return 1; const q = normalizeSearch(query); const text = normalizeSearch(`${model.name} ${model.company} ${model.type} ${model.industries} ${model.scenarios} ${model.notes} ${model.openSource} ${model.context} ${model.reasoning}`);
  const wantsCheap = /便宜|低成本|省钱|cheap|low cost|budget/.test(q); const wantsLocal = /本地|私有化|离线|local|on premise|self host/.test(q);
  const wantsCode = /代码|编程|程序|code|coding|developer/.test(q); const wantsChinese = /中文|汉语|chinese/.test(q); const wantsService = /客服|客户服务|customer service|support bot/.test(q);
  const wantsVision = /图片|图像|视觉|多模态|image|vision|multimodal/.test(q); const wantsReasoning = /推理|数学|逻辑|reasoning|math/.test(q); const wantsLong = /长上下文|长文本|long context/.test(q);
  if (wantsCheap && !((parseMetric(model.inputPrice) > 0 && parseMetric(model.inputPrice) <= 1) || (parseMetric(model.outputPrice) > 0 && parseMetric(model.outputPrice) <= 3))) return 0;
  if (wantsLocal && !/开源|开放权重|open source|open weight/i.test(model.openSource)) return 0;
  if (wantsCode && !/代码|code|coder/i.test(`${model.type} ${model.name} ${model.scenarios}`)) return 0;
  if (wantsChinese && !(regionGroup(model.company) === "china" || /中文|chinese/i.test(text))) return 0;
  if (wantsService && !/客服|对话|聊天|customer|chat|assistant/i.test(`${model.scenarios} ${model.notes} ${model.type}`)) return 0;
  if (wantsVision && !/多模态|视觉|图像|vl|vision|image/i.test(`${model.type} ${model.multimodal} ${model.name}`)) return 0;
  if (wantsReasoning && !/推理|数学|reason|math/i.test(`${model.type} ${model.reasoning} ${model.scenarios}`)) return 0;
  if (wantsLong && parseMetric(model.context) < 100) return 0;
  let score = 1; const compactQuery = q.replaceAll(" ", ""); const compactName = normalizeSearch(model.name).replaceAll(" ", ""); const compactCompany = normalizeSearch(model.company).replaceAll(" ", "");
  if (compactName === compactQuery || compactCompany === compactQuery) score += 100; else if (compactName.includes(compactQuery) || compactCompany.includes(compactQuery)) score += 45;
  aliasTerms(query).forEach((term) => { const normalized = normalizeSearch(term); if (normalized.length > 1 && text.includes(normalized)) score += normalized.length > 4 ? 18 : 8; });
  const queryTokens = q.split(" ").filter((token) => token.length >= 4); const candidateTokens = `${compactName} ${compactCompany}`.split(" ");
  if (queryTokens.some((token) => candidateTokens.some((candidate) => Math.abs(token.length - candidate.length) <= 2 && editDistance(token, candidate) <= (token.length >= 6 ? 2 : 1)))) score += 22;
  const hasIntent = wantsCheap || wantsLocal || wantsCode || wantsChinese || wantsService || wantsVision || wantsReasoning || wantsLong;
  return score > 1 || hasIntent ? score : 0;
}
const UI = {
  zh: {
    subtitle: "AI 模型决策平台", search: "搜索模型、公司或使用场景…", online: "持续更新",
    modelClass: "发现模型", galaxies: "模型公司", allGalaxies: "全部公司", heading: "找到适合你的 AI 模型", region: "研发国家/地区", allRegions: "全部地区",
    hint: "点击公司恒星展开 · 拖拽旋转 · 滚轮缩放", source: "数据", companies: "个公司星系", updated: "更新于",
    sync: "重新同步", reset: "复位视角", micro: "微观参数视图", noResult: "未发现对应模型", resetMap: "重置星图",
    modelNode: "模型节点", description: "模型简介", totalParams: "总参数", context: "上下文", maxOutput: "最大输出",
    release: "发布日期", access: "开放方式", multimodal: "多模态", reasoning: "思考模式", inputPrice: "输入价格", developedIn: "主要研发国家/地区",
    outputPrice: "输出价格", size: "模型大小", useCases: "适用场景", industries: "行业轨道", official: "查看官方来源",
    compare: "模型对比", addCompare: "加入对比", addedCompare: "已加入对比", compareHint: "选择 2–3 个模型，快速判断能力与成本差异",
    clear: "清空", closeCompare: "关闭对比", mapGuide: "星图图例", starMeaning: "恒星代表公司", planetMeaning: "行星代表模型版本",
    colorMeaning: "颜色区分公司星系", sizeMeaning: "大小反映参数规模与数据完整度", levelEcosystem: "生态总览", levelCompany: "公司星系", levelModel: "模型档案",
    workspace: "对比工作区", chooseModels: "返回星图选择模型", canvasLabel: "可旋转缩放的三维模型宇宙",
    filters: { all: "全部", llm: "语言", reasoning: "推理", multimodal: "多模态", code: "代码" }, regions: { all: "全部地区", china: "中国", northAmerica: "北美", europe: "欧洲", asia: "亚洲其他地区", global: "全球社区" },
  },
  en: {
    subtitle: "AI MODEL DECISION PLATFORM", search: "Search models, companies or use cases…", online: "ALWAYS CURRENT",
    modelClass: "DISCOVER", galaxies: "COMPANIES", allGalaxies: "All companies", heading: "FIND THE RIGHT AI MODEL", region: "R&D REGION", allRegions: "All regions",
    hint: "Select a company star · Drag to orbit · Wheel to zoom", source: "Source", companies: "company galaxies", updated: "Updated",
    sync: "Resync", reset: "Reset view", micro: "MICRO PARAMETER VIEW", noResult: "No matching models", resetMap: "Reset map",
    modelNode: "MODEL NODE", description: "Model profile", totalParams: "Parameters", context: "Context", maxOutput: "Max output",
    release: "Released", access: "Access", multimodal: "Multimodal", reasoning: "Reasoning", inputPrice: "Input price", developedIn: "Primary R&D country / region",
    outputPrice: "Output price", size: "Model size", useCases: "Use cases", industries: "Industries", official: "Official source",
    compare: "COMPARE", addCompare: "Add to compare", addedCompare: "Added", compareHint: "Select 2–3 models to compare capability and cost",
    clear: "Clear", closeCompare: "Close comparison", mapGuide: "MAP LEGEND", starMeaning: "Stars are companies", planetMeaning: "Planets are model versions",
    colorMeaning: "Colors identify company systems", sizeMeaning: "Size reflects scale and data completeness", levelEcosystem: "Ecosystem", levelCompany: "Company system", levelModel: "Model profile",
    workspace: "DECISION WORKSPACE", chooseModels: "Choose models on the map", canvasLabel: "Interactive 3D model universe",
    filters: { all: "All", llm: "Language", reasoning: "Reasoning", multimodal: "Multimodal", code: "Code" }, regions: { all: "All regions", china: "China", northAmerica: "North America", europe: "Europe", asia: "Other Asia", global: "Global communities" },
  },
};

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function hash(text: string) { return [...text].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 7); }
function typeMatches(type: string, filter: typeof FILTERS[number]) {
  if (filter === "all") return true;
  if (filter === "llm") return type.includes("LLM") || type.includes("语言");
  if (filter === "reasoning") return type.includes("Reasoning") || type.includes("推理");
  if (filter === "multimodal") return /VL|视觉|多模态|图像|视频|语音/.test(type);
  return /Code|代码/.test(type);
}
function rgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
}
function englishType(type: string) {
  if (/Reasoning|推理/.test(type)) return "Reasoning model";
  if (/VL|视觉|多模态|图像|视频|语音/.test(type)) return "Multimodal model";
  if (/Code|代码/.test(type)) return "Code model";
  return "Language model";
}
function modelValue(model: Model, key: keyof Model, lang: Lang) {
  const raw = String(model[key] || "—");
  if (lang === "zh" || !/[\u4e00-\u9fff]/.test(raw)) return raw;
  if (key === "type") return englishType(raw);
  const exact: Record<string, string> = {
    "✅ 开源": "Open source", "❌ 闭源": "Proprietary", "✅ 开放权重": "Open weights", "开放权重 / API": "Open weights / API",
    "未公开": "Undisclosed", "未公开(未发布)": "Undisclosed", "❌ 闭源(未发布)": "Proprietary · Unreleased",
    "否": "No", "是": "Yes", "无": "No", "可选": "Optional", "支持": "Supported", "标准": "Standard", "默认开启": "Enabled by default",
    "深度推理": "Deep reasoning", "推理蒸馏": "Distilled reasoning", "纯RL推理": "Pure RL reasoning", "自适应思考": "Adaptive reasoning",
    "深度思考": "Extended thinking", "多路径推理": "Multi-path reasoning", "混合推理": "Hybrid reasoning", "强制思考": "Always-on reasoning",
    "推理模式": "Reasoning mode", "可控思考": "Controllable reasoning", "长程Agentic": "Long-horizon agentic",
  };
  if (exact[raw]) return exact[raw];
  const translated = raw
    .replaceAll("开源", "Open source").replaceAll("闭源", "Proprietary").replaceAll("开放权重", "Open weights")
    .replaceAll("未公开", "Undisclosed").replaceAll("图像", "image").replaceAll("视频", "video").replaceAll("文档", "document")
    .replaceAll("音频", "audio").replaceAll("声音", "audio").replaceAll("语音", "speech").replaceAll("文本", "text")
    .replaceAll("文生图", "text-to-image").replaceAll("文生", "text-to-").replaceAll("图生", "image-to-")
    .replaceAll("理解", "understanding").replaceAll("生成", "generation").replaceAll("编辑", "editing")
    .replaceAll("全模态", "omnimodal").replaceAll("视觉编程", "visual coding").replaceAll("实时", "real-time")
    .replace(/^是/, "Yes").replace(/^否/, "No").replaceAll("支持", "Supports").replaceAll("可选", "Optional");
  return /[\u4e00-\u9fff]/.test(translated) ? "See official model card" : translated;
}

function deploymentText(model: Model, lang: Lang) {
  const open = /开源|开放权重|open source|open weight/i.test(model.openSource);
  if (open) return lang === "zh" ? "本地 / 私有化 / 云端服务" : "Local / private cloud / hosted API";
  return lang === "zh" ? "官方云端 API 或产品服务" : "Official cloud API or product service";
}
function modelVerdict(model: Model, lang: Lang) {
  const text = `${model.type} ${model.name} ${model.reasoning} ${model.multimodal} ${model.scenarios}`;
  const typeZh = model.type.replace(/\s*\([^)]*\)/g, "").replace("语言模型", "大语言模型").trim();
  const traitsZh: string[] = [];
  const traitsEn: string[] = [];
  if (/code|代码|编程|coder/i.test(text)) { traitsZh.push("代码生成与工程任务"); traitsEn.push("coding and software-engineering tasks"); }
  if (/推理|reason|数学|逻辑/i.test(text)) { traitsZh.push("复杂推理"); traitsEn.push("complex reasoning"); }
  if (/多模态|视觉|vl|image|图像|视频|语音|audio/i.test(text)) { traitsZh.push("多模态理解"); traitsEn.push("multimodal understanding"); }
  if (parseMetric(model.context) >= 100) { traitsZh.push(`${model.context} 长上下文处理`); traitsEn.push(`${model.context} long-context processing`); }
  if (/mini|nano|tiny|lite|small|flash|轻量/i.test(text)) { traitsZh.push("轻量或高频调用"); traitsEn.push("efficient high-volume use"); }
  if (/开源|开放权重|open source|open weight/i.test(model.openSource)) { traitsZh.push("本地或私有化部署"); traitsEn.push("local or private deployment"); }
  const scenariosZh = model.scenarios?.split(/[、,，]/).map((item) => item.trim()).filter(Boolean).slice(0, 3).join("、") || "对话、内容生成与知识处理";
  const cleanEnglishNote = model.notes?.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[<>*_`]/g, "").replace(/\s+/g, " ").trim();
  if (lang === "zh") {
    const rawNote = model.notes?.trim() || "";
    const isMetadataNote = /Hugging Face 官方组织模型|downloads?|https?:|\[[^\]]+\]\(/i.test(rawNote);
    const isUsefulChineseNote = !isMetadataNote && /[\u4e00-\u9fff]/.test(rawNote) && normalizeSearch(rawNote) !== normalizeSearch(model.name);
    const noteFeature = isUsefulChineseNote ? rawNote.split(/[;；。]/)[0].replace(/[，,]+/g, "、").replace(/\s+/g, "").slice(0, 46) : "";
    const scale = !/未公开|—/.test(model.params) ? `${model.params} 参数规模的` : "";
    const core = traitsZh.length ? traitsZh.slice(0, 3).join("、") : scenariosZh;
    const featureSentence = noteFeature ? `该版本强调${noteFeature}，并支持${core}。` : `它主要面向${core}。`;
    return `${model.name} 是 ${model.company} 推出的${scale}${typeZh || "AI 模型"}。${featureSentence}`;
  }
  if (model.sourceKind === "openrouter" && cleanEnglishNote && !/[\u4e00-\u9fff]/.test(cleanEnglishNote)) {
    const sentence = cleanEnglishNote.split(/(?<=[.!?])\s/)[0].slice(0, 220).replace(/[.…]+$/, "");
    if (sentence.length > 45) return `${sentence}.`;
  }
  const scale = !/未公开|—|Undisclosed/i.test(model.params) ? `${model.params} ` : "";
  return `${model.name} is a ${scale}${englishType(model.type).toLowerCase()} from ${model.company}, designed for ${traitsEn.slice(0, 3).join(", ") || "conversation, content generation and knowledge work"}.`;
}
function modelLimits(model: Model, lang: Lang) {
  const limits: string[] = [];
  if (lifecycleOf(model) === "preview") limits.push(lang === "zh" ? "预览阶段，能力、价格或接口仍可能变化" : "Preview-stage capabilities, pricing or APIs may change");
  if (/未公开|—|undisclosed/i.test(`${model.params}${model.context}`)) limits.push(lang === "zh" ? "部分关键技术参数尚未公开" : "Some important technical specifications are undisclosed");
  if (!/开源|开放权重|open source|open weight/i.test(model.openSource)) limits.push(lang === "zh" ? "依赖厂商服务，不适合完全离线部署" : "Vendor-dependent and unsuitable for fully offline deployment");
  limits.push(lang === "zh" ? "公开参数不能替代业务数据上的实际评测" : "Published specifications cannot replace evaluation on your data");
  return limits.slice(0, 3);
}
function modelStrengths(model: Model, lang: Lang) {
  const strengths: string[] = [];
  if (/推理|reason/i.test(`${model.type} ${model.reasoning}`)) strengths.push(lang === "zh" ? "面向复杂任务的推理能力" : "Reasoning for complex tasks");
  if (/多模态|视觉|vl|image|audio|视频|图像|语音/i.test(`${model.type} ${model.multimodal}`)) strengths.push(lang === "zh" ? "支持跨模态信息处理" : "Cross-modal understanding");
  if (/开源|开放权重|open source|open weight/i.test(model.openSource)) strengths.push(lang === "zh" ? "可控部署与二次开发空间" : "Flexible deployment and customization");
  if (parseMetric(model.context) >= 100) strengths.push(lang === "zh" ? "长上下文任务适配度较高" : "Well suited to long-context workloads");
  if (!strengths.length) strengths.push(lang === "zh" ? "覆盖较广的通用任务能力" : "Broad general-purpose capability");
  return strengths.slice(0, 3);
}

function companyPositioning(models: Model[], lang: Lang) {
  const text = models.map((model) => `${model.type} ${model.reasoning} ${model.multimodal}`).join(" ");
  const strengths: string[] = [];
  if (/推理|reason/i.test(text)) strengths.push(lang === "zh" ? "推理模型" : "reasoning");
  if (/多模态|视觉|图像|视频|语音|vl|image|audio/i.test(text)) strengths.push(lang === "zh" ? "多模态" : "multimodal");
  if (/code|代码/i.test(text)) strengths.push(lang === "zh" ? "代码智能" : "coding");
  if (!strengths.length) strengths.push(lang === "zh" ? "通用语言模型" : "general language models");
  return lang === "zh" ? `以${strengths.slice(0, 3).join("、")}为核心的 AI 模型研发与服务提供者` : `AI model developer and provider focused on ${strengths.slice(0, 3).join(", ")}`;
}

function CompanyOverview({ company, models, lang, updatedAt, open, onToggle }: { company: string; models: Model[]; lang: Lang; updatedAt: string; open: boolean; onToggle: () => void }) {
  const openCount = models.filter((model) => /开源|开放权重|open source|open weight/i.test(model.openSource)).length;
  const proprietaryCount = models.length - openCount;
  const strategy = openCount === 0 ? (lang === "zh" ? "以闭源 API 与产品服务为主" : "Primarily proprietary APIs and products") : proprietaryCount === 0 ? (lang === "zh" ? "以开源与开放权重路线为主" : "Primarily open source and open weights") : (lang === "zh" ? `混合路线 · ${openCount} 个开放模型 / ${proprietaryCount} 个闭源或未公开模型` : `Hybrid strategy · ${openCount} open / ${proprietaryCount} proprietary or undisclosed`);
  const routes = [...new Set(models.map((model) => lang === "zh" ? model.type.replace(/\([^)]*\)/g, "").trim() : englishType(model.type)))].filter(Boolean).slice(0, 4);
  const representatives = [...models].sort((a, b) => TIER_ORDER.indexOf(modelTier(a, 0)) - TIER_ORDER.indexOf(modelTier(b, 0)) || popularityScore(b) - popularityScore(a) || b.companyOrder - a.companyOrder).slice(0, 3);
  const labels = lang === "zh" ? { profile:"公司概览", routes:"主要模型路线", strategy:"开放策略", models:"代表模型", region:"研发国家 / 地区", updated:"最近更新时间", expand:"展开", collapse:"收起" } : { profile:"Company overview", routes:"Model directions", strategy:"Access strategy", models:"Representative models", region:"R&D country / region", updated:"Last updated", expand:"Expand", collapse:"Collapse" };
  return <aside className={`company-overview ${open ? "expanded" : "collapsed"}`} aria-label={`${company} ${labels.profile}`}>
    <button className="company-overview-toggle" onClick={onToggle} aria-expanded={open}><span><small>{labels.profile}</small><b>{company}</b><em>{companyPositioning(models, lang)}</em></span><i>{open ? labels.collapse : labels.expand} {open ? "−" : "+"}</i></button>
    {open && <div className="company-overview-body"><dl><div><dt>{labels.routes}</dt><dd>{routes.join(" · ") || "—"}</dd></div><div><dt>{labels.strategy}</dt><dd>{strategy}</dd></div><div><dt>{labels.models}</dt><dd>{representatives.map((model) => model.name).join(" · ")}</dd></div><div><dt>{labels.region}</dt><dd>{regionLabel(company, lang)}</dd></div><div><dt>{labels.updated}</dt><dd>{updatedAt}</dd></div></dl><p>{lang === "zh" ? `基于当前收录的 ${models.length} 个模型自动归纳` : `Inferred from ${models.length} cataloged models`}</p></div>}
  </aside>;
}

function DeploymentLab({ model, models, lang, updatedAt, onModelChange, onClose }: { model: Model; models: Model[]; lang: Lang; updatedAt: string; onModelChange: (model: Model) => void; onClose: () => void }) {
  const [precision, setPrecision] = useState<PrecisionKey>("fp8");
  const [contextK, setContextK] = useState(Math.max(1, Math.min(1024, Math.round(contextKOf(model.context)))));
  const [concurrency, setConcurrency] = useState(8);
  const [kvPrecision, setKvPrecision] = useState<"bf16" | "int8">("int8");
  const [headroom, setHeadroom] = useState(20);
  const [gpuId, setGpuId] = useState("80");
  const paramsB = parseMetric(model.params);
  const gpu = GPU_PROFILES.find((item) => item.id === gpuId) || GPU_PROFILES[2];
  const kvKB = kvCoefficient(model) * (kvPrecision === "int8" ? .5 : 1);
  const weights = paramsB * PRECISIONS[precision].bytes;
  const kv = kvKB * contextK * 1000 * concurrency / 1_000_000;
  const runtime = weights * .1;
  const baseline = weights + kv + runtime;
  const recommended = baseline * (1 + headroom / 100);
  const minimumCards = Math.max(1, Math.ceil(baseline / gpu.memory));
  const recommendedCards = Math.max(minimumCards, Math.ceil(recommended / gpu.memory));
  const isMoe = parseMetric(model.activeParams) > 0 && parseMetric(model.activeParams) < paramsB * .5 || /MoE|混合专家/i.test(`${model.type} ${model.notes}`);
  const deployable = /开源|开放权重|open source|open weight/i.test(model.openSource);
  const format = (value: number) => value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
  const labels = lang === "zh" ? {
    kicker:"DEPLOYMENT LAB · 第一期", title:"本地部署计算器", intro:"从首页选择模型，把规格翻译成可讨论的显存与 GPU 容量方案。", choose:"选择模型", precision:"权重精度", context:"实际上下文", concurrency:"峰值并发", kv:"KV Cache 精度", headroom:"生产余量", gpu:"GPU 容量参照", weights:"模型权重", cache:"KV Cache", runtime:"运行时开销", total:"生产建议显存", minimum:"最低可运行", suggested:"生产建议", cards:"张", result:"容量结论", assumptions:"计算假设", back:"返回模型宇宙", warning:"当前目录未确认该模型可下载权重；以下仅做容量演算，不代表可以本地部署。", moe:"这是 MoE 模型：显存按总参数估算，速度更接近激活参数规模。", dense:"Dense 模型跨卡越多，通信开销通常越明显。", kvTip:"当前 KV Cache 已超过模型权重，建议缩短上下文、降低并发或使用低精度 KV。", estimate:"结果是架构前期估算，不代替推理框架实测、硬件兼容性验证和 POC。", formula:"权重 + KV Cache + 约 10% 运行时开销，再加入生产余量。", updated:"模型数据更新", source:"模型参数来源"
  } : {
    kicker:"DEPLOYMENT LAB · PHASE 1", title:"Local deployment calculator", intro:"Choose a model from the home screen and translate its specifications into a memory and GPU capacity plan.", choose:"Choose model", precision:"Weight precision", context:"Working context", concurrency:"Peak concurrency", kv:"KV cache precision", headroom:"Production headroom", gpu:"GPU capacity reference", weights:"Model weights", cache:"KV cache", runtime:"Runtime overhead", total:"Recommended VRAM", minimum:"Minimum viable", suggested:"Production plan", cards:"cards", result:"Capacity result", assumptions:"Assumptions", back:"Back to model universe", warning:"Downloadable weights are not confirmed in the catalog. This is capacity modeling only, not proof of deployability.", moe:"This is a MoE model: memory follows total parameters, while speed is closer to active parameters.", dense:"Dense models generally incur more communication overhead as card count grows.", kvTip:"KV cache exceeds model weights. Consider shorter context, lower concurrency, or lower-precision KV.", estimate:"This is an early architecture estimate, not a substitute for framework benchmarks, hardware validation, or a POC.", formula:"Weights + KV cache + ~10% runtime overhead, followed by production headroom.", updated:"Model data updated", source:"Model parameter source"
  };
  const choices = [model, ...models].filter((item, index, list) => parseMetric(item.params) > 0 && list.findIndex((candidate) => candidate.id === item.id) === index);
  return <section className="deployment-lab" aria-label={`${model.name} ${labels.title}`}>
    <button className="deployment-close" onClick={onClose} aria-label={labels.back}>×</button>
    <header className="deployment-header"><div><small>{labels.kicker}</small><h2>{labels.title}</h2><p>{labels.intro}</p></div><label className="deployment-model"><span>{labels.choose} · {choices.length} {lang === "zh" ? "款主流模型" : "featured models"}</span><select value={model.id} onChange={(event) => { const next = choices.find((item) => item.id === event.target.value); if (next) onModelChange(next); }}>{choices.map((item) => <option key={item.id} value={item.id}>{item.company} · {item.name}</option>)}</select><i>{model.params || "—"} · {model.context || "—"}</i></label></header>
    {!deployable && <div className="deployment-warning">⚠ {labels.warning}</div>}
    <div className="deployment-layout"><form className="deployment-controls" onSubmit={(event) => event.preventDefault()}>
      <label><span>{labels.precision}</span><select value={precision} onChange={(event) => setPrecision(event.target.value as PrecisionKey)}>{Object.entries(PRECISIONS).map(([key,value]) => <option key={key} value={key}>{lang === "zh" ? value.zh : value.en}</option>)}</select><small>{lang === "zh" ? PRECISIONS[precision].noteZh : PRECISIONS[precision].noteEn}</small></label>
      <div className="deployment-pair"><label><span>{labels.context} · K tokens</span><input type="number" min="1" max="1024" value={contextK} onChange={(event) => setContextK(Math.max(1, Number(event.target.value) || 1))} /></label><label><span>{labels.concurrency}</span><input type="number" min="1" max="500" value={concurrency} onChange={(event) => setConcurrency(Math.max(1, Number(event.target.value) || 1))} /></label></div>
      <div className="deployment-pair"><label><span>{labels.kv}</span><select value={kvPrecision} onChange={(event) => setKvPrecision(event.target.value as "bf16" | "int8")}><option value="bf16">BF16</option><option value="int8">INT8</option></select></label><label><span>{labels.headroom} · {headroom}%</span><input className="deployment-range" type="range" min="10" max="50" step="5" value={headroom} onChange={(event) => setHeadroom(Number(event.target.value))} /></label></div>
      <label><span>{labels.gpu}</span><select value={gpuId} onChange={(event) => setGpuId(event.target.value)}>{GPU_PROFILES.map((item) => <option key={item.id} value={item.id}>{lang === "zh" ? item.zh : item.en}</option>)}</select><small>{lang === "zh" ? "只按可用显存估算，不绑定品牌、价格或合规结论" : "Capacity-only reference; no brand, price, or compliance claim"}</small></label>
    </form><div className="deployment-results">
      <div className="memory-orbit" style={{ "--fill":`${Math.min(100, recommended / (recommendedCards * gpu.memory) * 100)}%` } as CSSProperties}><div><small>{labels.total}</small><b>{format(recommended)}</b><span>GB</span></div></div>
      <div className="deployment-stats"><article><span>{labels.weights}</span><b>{format(weights)} GB</b></article><article><span>{labels.cache}</span><b>{format(kv)} GB</b></article><article><span>{labels.runtime}</span><b>{format(runtime)} GB</b></article></div>
      <section className="deployment-recommendation"><small>{labels.result}</small><div><span>{labels.minimum}</span><b>{minimumCards} {labels.cards}</b><i>× {gpu.id} GB class</i></div><div className="recommended"><span>{labels.suggested}</span><b>{recommendedCards} {labels.cards}</b><i>{format(recommendedCards * gpu.memory)} GB usable</i></div></section>
      <div className="deployment-tips"><p>{isMoe ? labels.moe : labels.dense}</p>{kv > weights && <p>{labels.kvTip}</p>}</div>
    </div></div>
    <footer className="deployment-foot"><div><small>{labels.assumptions}</small><p>{labels.formula} KV ≈ {kvKB} KB/token × {contextK}K × {concurrency}.</p><p>{labels.estimate}</p></div><dl><div><dt>{labels.updated}</dt><dd>{model.discoveredAt || updatedAt}</dd></div><div><dt>{labels.source}</dt><dd>{model.source.startsWith("http") ? <a href={model.source} target="_blank" rel="noreferrer">{model.company} ↗</a> : "Catalog estimate"}</dd></div></dl><button onClick={onClose}>← {labels.back}</button></footer>
  </section>;
}

function ModelDetailSheet({ model, lang, updatedAt, tier, compared, onCompare, onDeploy, onShare, onClose, copied }: { model: Model; lang: Lang; updatedAt: string; tier: ModelTier; compared: boolean; onCompare: () => void; onDeploy: () => void; onShare: () => void; onClose: () => void; copied: boolean }) {
  const limits = modelLimits(model, lang);
  const goodFor = model.scenarios || (lang === "zh" ? "通用模型应用、原型验证与能力评估" : "General applications, prototyping and model evaluation");
  const notFor = limits[0];
  const labels = lang === "zh" ? { conclusion:"模型简介", good:"推荐使用场景", bad:"不推荐使用场景", strengths:"核心优势", limits:"主要限制", specs:"关键参数", price:"价格", context:"上下文", license:"开源与许可", deployment:"部署方式", updated:"数据更新时间", source:"官方来源", input:"输入", output:"输出", parameters:"参数规模", outputLimit:"最大输出", release:"发布日期", region:"研发国家 / 地区", evidence:"信息依据", compare:"加入对比", compared:"已加入对比", deploy:"评估本地部署", share:"分享", copied:"已复制", unavailable:"暂无可点击的官方链接" } : { conclusion:"Overview", good:"Recommended for", bad:"Not recommended for", strengths:"Core strengths", limits:"Key limitations", specs:"Specifications", price:"Pricing", context:"Context", license:"Access & license", deployment:"Deployment", updated:"Data updated", source:"Official source", input:"Input", output:"Output", parameters:"Parameters", outputLimit:"Max output", release:"Released", region:"R&D country / region", evidence:"Evidence", compare:"Add to compare", compared:"Added", deploy:"Plan local deployment", share:"Share", copied:"Copied", unavailable:"No official link currently available" };
  return <aside className="model-sheet" aria-label={`${model.name} ${labels.specs}`}>
    <button className="sheet-close" onClick={onClose} aria-label={lang === "zh" ? "关闭详情" : "Close details"}>×</button>
    <header className="sheet-header"><p>{model.company} · {tierLabel(tier, lang)}</p><h2>{model.name}</h2><span>{modelValue(model, "type", lang)} · {regionLabel(model.company, lang)}</span><div className="sheet-status"><i className={`life-${lifecycleOf(model)}`}>{lifecycleText(model, lang)}</i><i>{popularityText(model, lang)}</i></div></header>
    <section className="verdict-card"><small>{labels.conclusion}</small><h3>{modelVerdict(model, lang)}</h3></section>
    <div className="decision-grid"><section><small>{labels.good}</small><p>{goodFor}</p></section><section><small>{labels.bad}</small><p>{notFor}</p></section></div>
    <div className="insight-grid"><section><small>{labels.strengths}</small><ul>{modelStrengths(model, lang).map((item) => <li key={item}>{item}</li>)}</ul></section><section><small>{labels.limits}</small><ul>{limits.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
    <section className="spec-section"><div className="spec-heading"><small>{labels.specs}</small><span>{lang === "zh" ? "基于当前公开资料" : "Based on currently public data"}</span></div><div className="spec-cards"><article><small>{labels.context}</small><b>{modelValue(model, "context", lang)}</b></article><article><small>{labels.price}</small><b>{labels.input} {modelValue(model, "inputPrice", lang)}</b><span>{labels.output} {modelValue(model, "outputPrice", lang)}</span></article><article><small>{labels.parameters}</small><b>{modelValue(model, "params", lang)}</b></article><article><small>{labels.outputLimit}</small><b>{modelValue(model, "maxOutput", lang)}</b></article></div><dl className="spec-list"><div><dt>{labels.license}</dt><dd>{modelValue(model, "openSource", lang)}</dd></div><div><dt>{labels.deployment}</dt><dd>{deploymentText(model, lang)}</dd></div><div><dt>{labels.release}</dt><dd>{modelValue(model, "release", lang)}</dd></div><div><dt>{labels.region}</dt><dd>{regionLabel(model.company, lang)}</dd></div><div><dt>{labels.updated}</dt><dd>{model.discoveredAt || updatedAt}</dd></div><div><dt>{labels.evidence}</dt><dd>{sourceTrust(model, lang)}</dd></div></dl></section>
    <footer className="sheet-footer"><button className="deploy-cta" onClick={onDeploy}>◌ {labels.deploy}</button><button className={compared ? "primary active" : "primary"} onClick={onCompare}>{compared ? `✓ ${labels.compared}` : `＋ ${labels.compare}`}</button><button onClick={onShare}>{copied ? labels.copied : labels.share}</button>{model.source.startsWith("http") ? <a href={model.source} target="_blank" rel="noreferrer">{labels.source} ↗</a> : <span>{labels.unavailable}</span>}</footer>
  </aside>;
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [lang, setLang] = useState<Lang>("zh");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof FILTERS[number]>("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [selected, setSelected] = useState<Model | null>(null);
  const [comparison, setComparison] = useState<Model[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [focusedCompany, setFocusedCompany] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("models");
  const [motionMode, setMotionMode] = useState<MotionMode>("full");
  const [searchFocused, setSearchFocused] = useState(false);
  const [shareNotice, setShareNotice] = useState(false);
  const [companyOverviewOpen, setCompanyOverviewOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [deploymentModel, setDeploymentModel] = useState<Model | null>(null);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const nodesRef = useRef<ScreenNode[]>([]);
  const companyNodesRef = useRef<ScreenCompany[]>([]);
  const hoveredId = useRef<string | null>(null);
  const hoveredCompany = useRef<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const autoOrbitResumeAt = useRef(0);
  const gesture = useRef({ x: 0, y: 0, distance: 0, moved: false });
  const camera = useRef({ yaw: -.18, pitch: .12, distance: 1200, targetYaw: -.18, targetPitch: .12, targetDistance: 1200, panX: 0, panY: 0, targetPanX: 0, targetPanY: 0 });
  const t = UI[lang];

  useEffect(() => {
    if (window.matchMedia("(max-width: 650px)").matches) {
      Object.assign(camera.current, { distance: 1480, targetDistance: 1480 });
      setZoom(81);
    }
    const saved = window.localStorage.getItem("modelverse-lang");
    if (saved === "zh" || saved === "en") setLang(saved);
    const savedMotion = window.localStorage.getItem("modelverse-motion") as MotionMode | null;
    if (savedMotion === "full" || savedMotion === "reduced" || savedMotion === "static") setMotionMode(savedMotion);
    else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMotionMode("reduced");
    fetch("/models.json").then((response) => response.json()).then((data: Catalog) => {
      const models = data.models.map((model) => ({ ...model, company:canonicalCompany(model.company) }));
      setCatalog({ ...data, meta:{ ...data.meta, companyCount:new Set(models.map((model) => model.company)).size }, models });
    });
  }, []);
  useEffect(() => { window.localStorage.setItem("modelverse-lang", lang); }, [lang]);
  useEffect(() => { window.localStorage.setItem("modelverse-motion", motionMode); }, [motionMode]);
  useEffect(() => { setCompanyOverviewOpen(false); }, [focusedCompany]);
  useEffect(() => { if (!selected) setDeploymentModel(null); }, [selected]);
  useEffect(() => {
    if (!catalog) return; const params = new URLSearchParams(window.location.search);
    const company = params.get("company"); const modelId = params.get("model"); const compareIds = params.get("compare")?.split(",") || [];
    if (params.get("view") === "agents") setViewMode("agents");
    if (company && catalog.models.some((model) => model.company === company)) setFocusedCompany(company);
    if (modelId) setSelected(catalog.models.find((model) => model.id === modelId) || null);
    if (compareIds.length) setComparison(catalog.models.filter((model) => compareIds.includes(model.id)).slice(0, 3));
  }, [catalog]);
  useEffect(() => {
    if (!catalog) return; const params = new URLSearchParams();
    if (viewMode === "agents") params.set("view", "agents");
    if (focusedCompany) params.set("company", focusedCompany); if (selected) params.set("model", selected.id);
    if (comparison.length) params.set("compare", comparison.map((model) => model.id).join(","));
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [catalog, viewMode, focusedCompany, selected, comparison]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (compareOpen) setCompareOpen(false);
      else if (selected) setSelected(null);
      else if (focusedCompany) showAllGalaxies();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const companies = useMemo(() => catalog ? [...new Set(catalog.models.map((model) => model.company))] : [], [catalog]);
  const visible = useMemo(() => {
    if (!catalog) return [];
    return catalog.models.map((model) => ({ model, score:searchScore(model, query) })).filter(({ model, score }) => score > 0 && typeMatches(model.type, filter) && (regionFilter === "all" || regionGroup(model.company) === regionFilter) && (!focusedCompany || model.company === focusedCompany)).sort((a,b) => b.score - a.score || a.model.companyOrder - b.model.companyOrder).map(({ model }) => model);
  }, [catalog, query, filter, regionFilter, focusedCompany]);
  const visibleCompanies = useMemo(() => [...new Set(visible.map((model) => model.company))], [visible]);
  const suggestions = useMemo<Array<{ kind: "company" | "model"; label: string; sub: string; model?: Model }>>(() => {
    if (!catalog || !query.trim()) return [];
    const q = normalizeSearch(query); const aliases = aliasTerms(query); const companyHits = companies.map((company) => { const name = normalizeSearch(company); let score = name.includes(q) ? 50 : 0; aliases.forEach((alias) => { if (name.includes(normalizeSearch(alias))) score += 20; }); if (!score && q.length >= 4 && editDistance(q.replaceAll(" ", ""), name.replaceAll(" ", "")) <= (q.length >= 6 ? 2 : 1)) score = 16; return { company, score }; }).filter((item) => item.score > 0).sort((a,b) => b.score - a.score).slice(0, 3).map((item) => item.company);
    const modelHits = catalog.models.map((model) => ({ model, score:searchScore(model, query) })).filter((item) => item.score > 1).sort((a,b) => b.score - a.score).slice(0, 5).map((item) => item.model);
    return [...companyHits.map((company) => ({ kind:"company", label:company, sub:regionLabel(company, lang) })), ...modelHits.map((model) => ({ kind:"model", label:model.name, sub:model.company, model }))].slice(0, 6);
  }, [catalog, query, companies, lang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !catalog) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx = context;
    let frame = 0;
    let width = 1;
    let height = 1;
    let ratio = 1;
    const distantGalaxies = Array.from({ length: 7 }, (_, index) => ({
      x: (Math.abs(hash(`gx${index}`)) % 1000) / 1000,
      y: .12 + (Math.abs(hash(`gy${index}`)) % 760) / 1000,
      angle: (index * 1.9) % Math.PI,
      scale: .55 + (index % 4) * .22,
    }));
    const fogSeed = Array.from({ length: 38 }, (_, index) => ({
      x: (Math.abs(hash(`fx${index}`)) % 1200) / 1000 - .1,
      y: (Math.abs(hash(`fy${index}`)) % 1200) / 1000 - .1,
      radius: 70 + (Math.abs(hash(`fr${index}`)) % 150),
      squash: .22 + (Math.abs(hash(`fs${index}`)) % 48) / 100,
      angle: (Math.abs(hash(`fa${index}`)) % 628) / 100,
      phase: (Math.abs(hash(`fp${index}`)) % 628) / 100,
      alpha: .028 + (Math.abs(hash(`fo${index}`)) % 45) / 1000,
      tone: index % 7 === 0 ? "104,79,128" : index % 5 === 0 ? "54,110,109" : index % 3 === 0 ? "91,103,119" : "54,83,109",
      dark: index % 9 === 0,
    }));
    const logoImages = new Map<string, HTMLImageElement>();
    const nebulaImage = new Image(); nebulaImage.src = window.matchMedia("(max-width: 650px)").matches ? "/nebula-bg-mobile.jpg" : "/nebula-bg.png";
    Object.entries(COMPANY_LOGOS).forEach(([company, slug]) => {
      const image = new Image(); image.crossOrigin = "anonymous"; image.src = `https://cdn.simpleicons.org/${slug}/ffffff`;
      logoImages.set(company, image);
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height); ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);

    function rotate(point: Point3) {
      const c = camera.current;
      const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
      const x1 = point.x * cy - point.z * sy;
      const z1 = point.x * sy + point.z * cy;
      return { x: x1, y: point.y * cp - z1 * sp, z: point.y * sp + z1 * cp };
    }
    function project(point: Point3) {
      const r = rotate(point); const depth = camera.current.distance - r.z;
      if (depth < 75) return null;
      const scale = 880 / depth;
      return { x: width / 2 + camera.current.panX + r.x * scale, y: height / 2 + camera.current.panY + r.y * scale, scale, depth };
    }
    function drawCard(node: ScreenNode) {
      const model = node.model; const x = clamp(node.x + 12, 8, width - 168); const y = clamp(node.y + 12, 8, height - 92);
      ctx.globalAlpha = .96; ctx.fillStyle = "rgba(3,14,26,.94)"; ctx.strokeStyle = "rgba(93,235,255,.32)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, 160, 82, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e6ffff"; ctx.font = "600 10px Arial"; ctx.fillText(model.name.slice(0, 25), x + 9, y + 17);
      ctx.font = "8px monospace"; ctx.fillStyle = "#587b8c";
      const labels = lang === "zh" ? ["参数", "上下文", "大小"] : ["PARAMS", "CONTEXT", "SIZE"];
      const values = [model.params || "—", model.context || "—", (model.size || "—").slice(0, 24)];
      labels.forEach((label, index) => { ctx.fillStyle = "#4d7183"; ctx.fillText(label, x + 9, y + 36 + index * 14); ctx.fillStyle = "#a8c4ce"; ctx.fillText(values[index], x + 60, y + 36 + index * 14); });
    }

    const render = (time: number) => {
      const c = camera.current;
      const seconds = motionMode === "static" ? 0 : time / 1000 * (motionMode === "reduced" ? .35 : 1);
      if (motionMode === "full" && !pointers.current.size && time >= autoOrbitResumeAt.current) {
        c.targetYaw += .00072;
      }
      c.yaw += (c.targetYaw - c.yaw) * .34; c.pitch += (c.targetPitch - c.pitch) * .34; c.distance += (c.targetDistance - c.distance) * .3;
      c.panX += (c.targetPanX - c.panX) * .34; c.panY += (c.targetPanY - c.panY) * .34;
      ctx.clearRect(0, 0, width, height); ctx.globalAlpha = 1;
      const nebulaBreath = .5 + Math.sin(seconds * .56) * .5;
      const distantBreath = .5 + Math.sin(seconds * .39 + Math.PI) * .5;
      const nebulaX = width * (.7 + Math.sin(seconds * .09) * .026);
      const nebulaY = height * (.3 + Math.cos(seconds * .075) * .022);
      const background = ctx.createRadialGradient(width * .52, height * .48, 0, width * .52, height * .48, Math.max(width, height) * .75);
      background.addColorStop(0, `rgb(${5 + nebulaBreath * 3},${14 + nebulaBreath * 4},${24 + nebulaBreath * 5})`); background.addColorStop(.4, "#030812"); background.addColorStop(1, "#000207"); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      if (nebulaImage.complete && nebulaImage.naturalWidth) {
        const imageScale = Math.max(width / nebulaImage.naturalWidth, height / nebulaImage.naturalHeight) * (1.025 + nebulaBreath * .04);
        const imageWidth = nebulaImage.naturalWidth * imageScale; const imageHeight = nebulaImage.naturalHeight * imageScale;
        const imageX = (width - imageWidth) / 2 + Math.sin(seconds * .025) * 10 - Math.sin(c.yaw) * 7;
        const imageY = (height - imageHeight) / 2 + Math.cos(seconds * .021) * 7 - Math.sin(c.pitch) * 5;
        ctx.save(); ctx.globalAlpha = .54 + nebulaBreath * .12; ctx.filter = `brightness(${.6 + nebulaBreath * .12}) saturate(${.58 + nebulaBreath * .08})`;
        ctx.drawImage(nebulaImage, imageX, imageY, imageWidth, imageHeight); ctx.restore();
        ctx.fillStyle = `rgba(0,3,9,${.34 - nebulaBreath * .06})`; ctx.fillRect(0, 0, width, height);
      }
      const nebulaRadius = Math.max(width, height) * (.32 + nebulaBreath * .17);
      const nebula = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, nebulaRadius);
      nebula.addColorStop(0, `rgba(66,88,99,${.14 + nebulaBreath * .09})`); nebula.addColorStop(.28, `rgba(42,59,78,${.1 + nebulaBreath * .06})`); nebula.addColorStop(.6, `rgba(43,40,63,${.055 + nebulaBreath * .035})`); nebula.addColorStop(1, "rgba(2,5,12,0)"); ctx.fillStyle = nebula; ctx.fillRect(0, 0, width, height);
      const farX = width * (.2 + Math.cos(seconds * .038) * .012); const farY = height * (.78 + Math.sin(seconds * .041) * .014);
      const farNebula = ctx.createRadialGradient(farX, farY, 0, farX, farY, Math.max(width, height) * (.24 + distantBreath * .12));
      farNebula.addColorStop(0, `rgba(28,121,104,${.1 + distantBreath * .13})`); farNebula.addColorStop(.38, `rgba(27,67,100,${.07 + distantBreath * .07})`); farNebula.addColorStop(.72, `rgba(72,35,92,${.035 + distantBreath * .04})`); farNebula.addColorStop(1, "rgba(2,5,12,0)"); ctx.fillStyle = farNebula; ctx.fillRect(0, 0, width, height);
      const colorClouds = [
        { x: .42, y: .15, r: .39, inner: `rgba(72,63,105,${.1 + nebulaBreath * .045})`, mid: "rgba(40,67,91,.07)" },
        { x: .82, y: .68, r: .38, inner: `rgba(42,91,91,${.09 + distantBreath * .05})`, mid: "rgba(34,60,82,.065)" },
        { x: .12, y: .42, r: .34, inner: `rgba(94,69,62,${.055 + nebulaBreath * .025})`, mid: "rgba(61,48,70,.05)" },
        { x: .55, y: .88, r: .3, inner: `rgba(49,70,99,${.075 + distantBreath * .035})`, mid: "rgba(38,52,74,.05)" },
        { x: .67, y: .42, r: .22, inner: `rgba(106,119,123,${.045 + nebulaBreath * .025})`, mid: "rgba(45,67,83,.035)" },
      ];
      colorClouds.forEach((cloud, index) => {
        const cx = width * (cloud.x + Math.sin(seconds * (.035 + index * .008) + index) * .012);
        const cy = height * (cloud.y + Math.cos(seconds * (.03 + index * .006) + index) * .014);
        const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * cloud.r * (.92 + nebulaBreath * .12));
        haze.addColorStop(0, cloud.inner); haze.addColorStop(.46, cloud.mid); haze.addColorStop(1, "rgba(2,5,12,0)");
        ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height);
      });
      ctx.save(); ctx.globalCompositeOperation = "screen";
      fogSeed.forEach((fog, index) => {
        const driftX = Math.sin(seconds * (.018 + index % 4 * .004) + fog.phase) * 18;
        const driftY = Math.cos(seconds * (.015 + index % 5 * .003) + fog.phase) * 13;
        const radius = fog.radius * (.92 + Math.sin(seconds * .12 + fog.phase) * .08);
        ctx.save(); ctx.translate(fog.x * width + driftX, fog.y * height + driftY); ctx.rotate(fog.angle); ctx.scale(1, fog.squash);
        const cloudlet = ctx.createRadialGradient(0, 0, radius * .08, 0, 0, radius);
        cloudlet.addColorStop(0, `rgba(${fog.tone},${fog.alpha * (1.05 + nebulaBreath * .35)})`);
        cloudlet.addColorStop(.34, `rgba(${fog.tone},${fog.alpha * .7})`); cloudlet.addColorStop(.7, `rgba(${fog.tone},${fog.alpha * .2})`); cloudlet.addColorStop(1, `rgba(${fog.tone},0)`);
        ctx.fillStyle = cloudlet; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      ctx.restore();
      fogSeed.filter((fog) => fog.dark).forEach((fog, index) => {
        const cx = fog.x * width + Math.cos(seconds * .014 + fog.phase) * 12; const cy = fog.y * height + Math.sin(seconds * .017 + fog.phase) * 9;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(fog.angle + index); ctx.scale(1, fog.squash * 1.25);
        const voidCloud = ctx.createRadialGradient(0, 0, 0, 0, 0, fog.radius * 1.2);
        voidCloud.addColorStop(0, "rgba(1,5,12,.2)"); voidCloud.addColorStop(.55, "rgba(2,8,16,.1)"); voidCloud.addColorStop(1, "rgba(2,8,16,0)");
        ctx.fillStyle = voidCloud; ctx.beginPath(); ctx.arc(0, 0, fog.radius * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      const foregroundFog = [
        { x: -.08, y: .28, r: .46, squash: .3, phase: 0 }, { x: .36, y: .9, r: .42, squash: .24, phase: 1.7 },
        { x: .72, y: .12, r: .38, squash: .28, phase: 3.2 }, { x: 1.04, y: .67, r: .44, squash: .33, phase: 4.6 },
      ];
      ctx.save(); ctx.globalCompositeOperation = "screen";
      foregroundFog.forEach((fog, index) => {
        const cx = width * fog.x + Math.sin(seconds * .018 + fog.phase) * 42; const cy = height * fog.y + Math.cos(seconds * .014 + fog.phase) * 18;
        const radius = Math.max(width, height) * fog.r; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.18 + index * .31); ctx.scale(1, fog.squash);
        const veil = ctx.createRadialGradient(0, 0, radius * .04, 0, 0, radius); veil.addColorStop(0, `rgba(112,130,140,${.055 + nebulaBreath * .018})`); veil.addColorStop(.42, "rgba(72,91,103,.042)"); veil.addColorStop(.78, "rgba(42,61,74,.016)"); veil.addColorStop(1, "rgba(20,37,49,0)");
        ctx.fillStyle = veil; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }); ctx.restore();
      ctx.fillStyle = "rgba(0,2,7,.2)"; ctx.fillRect(0, 0, width, height);
      distantGalaxies.forEach((galaxy, index) => {
        ctx.save(); ctx.translate(galaxy.x * width, galaxy.y * height); ctx.rotate(galaxy.angle); ctx.scale(1, .27);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * galaxy.scale); glow.addColorStop(0, "rgba(205,238,255,.18)"); glow.addColorStop(.2, "rgba(107,164,203,.09)"); glow.addColorStop(1, "rgba(37,82,122,0)");
        ctx.globalAlpha = .35 + (index % 3) * .12; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 22 * galaxy.scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      const groups: Array<{ depth: number; company: string; color: string; center: Point3; planets: Point3[]; models: Model[]; prominence: number[]; totalModels: number; popularity: number }> = [];
      visibleCompanies.forEach((company, companyIndex) => {
        const companyModels = visible.filter((model) => model.company === company); if (!companyModels.length) return;
        const models = visibleCompanies.length === 1 ? companyModels : companyModels.slice(0, 12);
        const longitude = companyIndex * 2.399963; const vertical = 1 - 2 * ((companyIndex + .5) / Math.max(visibleCompanies.length, 1));
        const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical)); const shell = 475 + (companyIndex % 4) * 58; const drift = 7 + companyIndex % 8;
        const center = visibleCompanies.length === 1
          ? { x: 0, y: 0, z: 0 }
          : { x: Math.cos(longitude) * radial * shell + Math.sin(seconds * .19 + companyIndex) * drift, y: vertical * shell * .72 + Math.cos(seconds * .16 + companyIndex) * drift, z: Math.sin(longitude) * radial * shell + Math.sin(seconds * .14 + companyIndex) * drift };
        const isolated = visibleCompanies.length === 1;
        const closeUp = clamp((820 - c.distance) / 360, 0, 1);
        const compactRadius = clamp(34 + Math.sqrt(models.length) * 4.5, 46, 92);
        const expandedRadius = (68 + Math.sqrt(models.length) * 10) * (1 + closeUp * .55);
        const systemRadius = isolated ? expandedRadius : compactRadius;
        const systemSpeed = .055 + (Math.abs(hash(company)) % 9) * .003;
        const systemDirection = Math.abs(hash(company)) % 2 ? 1 : -1;
        const popularityOrder = [...models].sort((a, b) => popularityScore(b) - popularityScore(a) || modelTier(a, 0).localeCompare(modelTier(b, 0)) || a.companyOrder - b.companyOrder);
        const prominence = models.map((model) => models.length < 2 ? 1 : 1 - popularityOrder.findIndex((item) => item.id === model.id) / (models.length - 1));
        const planets = models.map((model, index) => {
          const seed = Math.abs(hash(model.name));
          const modelVertical = 1 - 2 * ((index + .5) / models.length);
          const modelRadial = Math.sqrt(Math.max(0, 1 - modelVertical * modelVertical));
          const personalSpeed = systemSpeed * (.68 + (seed % 31) / 42);
          const phase = index * 2.399963 + seconds * personalSpeed * (seed % 3 === 0 ? -systemDirection : systemDirection) + Math.sin(seconds * .073 + seed) * .14;
          const tier = modelTier(model, index);
          const relativeDistance = .46 + (1 - prominence[index]) * 1.02 + TIER_ORDER.indexOf(tier) * .045;
          const orbitRadius = isolated ? systemRadius * relativeDistance * (.96 + (seed % 9) / 100) : systemRadius * (.78 + (seed % 23) / 100);
          const eccentricity = .82 + (seed % 23) / 100;
          const float = Math.sin(seconds * (.31 + (seed % 11) * .017) + seed) * (2.5 + (1 - prominence[index]) * 3.5);
          return {
            x: center.x + Math.cos(phase) * modelRadial * orbitRadius * eccentricity,
            y: center.y + modelVertical * orbitRadius * (.68 + (seed % 17) / 100) + float,
            z: center.z + Math.sin(phase) * modelRadial * orbitRadius * (1.08 - (seed % 13) / 100),
          };
        });
        groups.push({ depth: rotate(center).z, company, color: COLORS[companyIndex % COLORS.length], center, planets, models, prominence, totalModels: companyModels.length, popularity:companyModels.reduce((best, model) => Math.max(best, popularityScore(model)), 0) });
      });
      groups.sort((a, b) => a.depth - b.depth);
      const hitNodes: ScreenNode[] = [];
      const companyHitNodes: ScreenCompany[] = [];
      groups.forEach((group) => {
        const star = project(group.center);
        const focusMode = visibleCompanies.length === 1;
        if (focusMode && star) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const ringBase = clamp(star.scale * 150, 112, 215);
          TIER_ORDER.forEach((tier, ring) => {
            const style = TIER_STYLE[tier]; const radius = ringBase * style.distance;
            const direction = ring % 2 === 0 ? 1 : -1;
            const irregularRotation = direction * (seconds * (.014 + ring * .0045) + Math.sin(seconds * (.11 + ring * .017) + ring * 1.37) * (.24 + ring * .035) + Math.cos(seconds * (.043 + ring * .006) + ring) * .18) + ring * .31;
            const orbitalSquash = .43 + ring * .012 + Math.sin(seconds * (.09 + ring * .011) + ring * 2.1) * .018;
            ctx.globalAlpha = tier === "flagship" ? .32 : tier === "deprecated" ? .07 : .14;
            ctx.strokeStyle = group.color;
            ctx.lineWidth = tier === "flagship" ? 1.5 : .7;
            ctx.setLineDash(tier === "deprecated" ? [2, 9] : tier === "historical" ? [4, 8] : ring % 2 ? [3, 7] : [16, 9]);
            ctx.lineDashOffset = direction * (seconds * (2.2 + ring * .7) + Math.sin(seconds * (.19 + ring * .021) + ring) * 7);
            ctx.beginPath();
            ctx.ellipse(star.x, star.y, radius, radius * orbitalSquash, irregularRotation, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
          const pulseEvery = Math.max(1, Math.ceil(group.planets.length / 42));
          group.planets.forEach((planet, index) => {
            const node = project(planet); if (!node || node.x < -20 || node.x > width + 20 || node.y < -20 || node.y > height + 20) return;
            const highlighted = hoveredId.current === group.models[index].id;
            const depthAlpha = clamp(node.scale * .085, .025, .13);
            ctx.globalAlpha = highlighted ? .7 : depthAlpha;
            ctx.strokeStyle = highlighted ? "#dffeff" : group.color;
            ctx.lineWidth = highlighted ? 1.15 : .55;
            ctx.beginPath(); ctx.moveTo(star.x, star.y); ctx.lineTo(node.x, node.y); ctx.stroke();
            if (index % pulseEvery === 0) {
              const progress = (seconds * (.13 + (index % 5) * .018) + index * .173) % 1;
              const pulseX = star.x + (node.x - star.x) * progress; const pulseY = star.y + (node.y - star.y) * progress;
              ctx.globalAlpha = .32 + progress * .36; ctx.fillStyle = "#bdf8ff";
              ctx.beginPath(); ctx.arc(pulseX, pulseY, 1.15, 0, Math.PI * 2); ctx.fill();
            }
          });
          ctx.globalAlpha = .16; ctx.strokeStyle = group.color; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(star.x, star.y, 42 + Math.sin(seconds * 1.2) * 3, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        if (star) {
          const pulse = 1 + Math.sin(seconds * 1.35 + Math.abs(hash(group.company))) * .13;
          const starRadius = focusMode ? clamp(star.scale * 22 * pulse, 18, 34) : clamp(star.scale * 9.5 * pulse * (.82 + group.popularity * .5), 3.8, 21);
          const corona = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, starRadius * 3.6);
          corona.addColorStop(0, "rgba(255,255,255,.98)"); corona.addColorStop(.12, group.color); corona.addColorStop(.42, rgba(group.color, .34)); corona.addColorStop(1, rgba(group.color, 0));
          ctx.globalAlpha = clamp(star.scale * 1.2, .48, 1); ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(star.x, star.y, starRadius * 3.6, 0, Math.PI * 2); ctx.fill();
          const coreRadius = Math.max(8, starRadius * .72);
          ctx.globalAlpha = 1; ctx.fillStyle = "rgba(2,9,18,.96)"; ctx.beginPath(); ctx.arc(star.x, star.y, coreRadius, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = rgba(group.color, .82); ctx.lineWidth = 1; ctx.stroke();
          const logo = logoImages.get(group.company);
          if (logo?.complete && logo.naturalWidth) {
            const logoSize = coreRadius * 1.15; ctx.drawImage(logo, star.x - logoSize / 2, star.y - logoSize / 2, logoSize, logoSize);
          } else {
            const initials = group.company.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
            ctx.fillStyle = "#eaffff"; ctx.font = `600 ${Math.max(7, coreRadius * .72)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(initials, star.x, star.y + .4); ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
          }
          if (hoveredCompany.current === group.company) {
            ctx.strokeStyle = "rgba(236,255,255,.96)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(star.x, star.y, Math.max(14, starRadius * 2), 0, Math.PI * 2); ctx.stroke();
          }
          companyHitNodes.push({ x: star.x, y: star.y, radius: Math.max(20, starRadius * 2.2), depth: star.depth, company: group.company });
        }
        for (let i = 0; i < group.models.length; i++) {
          const p = project(group.planets[i]); if (!p || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) continue;
          const seed = Math.abs(hash(group.models[i].name));
          const breath = 1 + Math.sin(seconds * (1.05 + (seed % 7) * .06) + seed) * .19;
          const tier = modelTier(group.models[i], i); const tierStyle = TIER_STYLE[tier]; const popularity = popularityScore(group.models[i]);
          const relativeProminence = group.prominence[i];
          const visualSize = focusMode ? (.68 + relativeProminence * .72) * (tier === "flagship" ? 1.12 : tier === "deprecated" ? .72 : 1) : .64 + popularity * 1.18;
          const visualAlpha = focusMode ? clamp(.34 + relativeProminence * .66, .28, 1) * tierStyle.alpha : .5 + popularity * .5;
          const planetRadius = clamp(p.scale * (3.5 + seed % 4) * breath * visualSize, focusMode ? 1.3 : 1.8, focusMode ? 11.5 : 11);
          const planetGlow = ctx.createRadialGradient(p.x - planetRadius * .28, p.y - planetRadius * .34, .2, p.x, p.y, planetRadius * 1.85);
          planetGlow.addColorStop(0, "rgba(255,255,255,.96)"); planetGlow.addColorStop(.18, group.color); planetGlow.addColorStop(.62, rgba(group.color, .7)); planetGlow.addColorStop(1, rgba(group.color, 0));
          const lifecycleAlpha = visualAlpha;
          ctx.globalAlpha = clamp(p.scale * .92, .32, 1) * lifecycleAlpha; ctx.fillStyle = planetGlow; ctx.beginPath(); ctx.arc(p.x, p.y, planetRadius * 1.85, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = .9 * lifecycleAlpha; ctx.fillStyle = group.color; ctx.beginPath(); ctx.arc(p.x, p.y, planetRadius * .58, 0, Math.PI * 2); ctx.fill();
          if (hoveredId.current === group.models[i].id) {
            ctx.globalAlpha = .95; ctx.strokeStyle = "rgba(229,255,255,.92)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(11, planetRadius * 1.75), 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(226,255,255,.96)"; ctx.font = "9px monospace"; ctx.textAlign = "center";
            ctx.fillText(group.models[i].name.slice(0, 28), p.x, p.y - Math.max(16, planetRadius * 2.2)); ctx.textAlign = "start";
          }
          hitNodes.push({ x: p.x, y: p.y, radius: Math.max(12, planetRadius + 5), depth: p.depth, model: group.models[i] });
        }
        const label = project({ ...group.center, y: group.center.y - 36 });
        if (label && (focusMode || hoveredCompany.current === group.company || label.scale > .9)) { ctx.globalAlpha = focusMode || hoveredCompany.current === group.company ? .92 : clamp((label.scale - .86) * 2.2, .18, .62); ctx.fillStyle = group.color; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillText(`${group.company}${focusMode ? ` · ${group.totalModels}` : ""}`, label.x, label.y); ctx.textAlign = "start"; }
      });
      nodesRef.current = hitNodes.sort((a, b) => a.depth - b.depth);
      companyNodesRef.current = companyHitNodes.sort((a, b) => a.depth - b.depth);
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [catalog, visible, visibleCompanies, lang, motionMode]);

  function pointerCenter() {
    const points = [...pointers.current.values()]; const x = points.reduce((sum, p) => sum + p.x, 0) / points.length; const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y, distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
  }
  function pauseAutoOrbit(delay = 1600) { autoOrbitResumeAt.current = performance.now() + delay; }
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) { pauseAutoOrbit(); event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture.current = { ...pointerCenter(), moved: false }; }
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) {
      const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
      const company = visibleCompanies.length > 1 ? pickCompany(x, y, event.pointerType) : undefined;
      const node = company ? undefined : pickNode(x, y, event.pointerType, true);
      hoveredCompany.current = company?.company ?? null; hoveredId.current = node?.model.id ?? null;
      event.currentTarget.style.cursor = company || node ? "pointer" : "grab"; return;
    }
    hoveredId.current = null; hoveredCompany.current = null; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const next = pointerCenter(); const dx = next.x - gesture.current.x; const dy = next.y - gesture.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
    const c = camera.current;
    if (pointers.current.size > 1) {
      c.panX += dx; c.panY += dy; c.targetPanX = c.panX; c.targetPanY = c.panY;
      if (next.distance && gesture.current.distance) { c.distance = clamp(c.distance / (next.distance / gesture.current.distance), 410, 1800); c.targetDistance = c.distance; }
      setZoom(Math.round(120000 / c.distance));
    } else {
      c.yaw += dx * .0072; c.targetYaw = c.yaw;
      c.pitch += dy * .0062; c.targetPitch = c.pitch;
      if (Math.abs(c.yaw) > Math.PI * 4) { c.yaw %= Math.PI * 2; c.targetYaw = c.yaw; }
      if (Math.abs(c.pitch) > Math.PI * 4) { c.pitch %= Math.PI * 2; c.targetPitch = c.pitch; }
    }
    gesture.current = { ...next, moved: gesture.current.moved };
  }
  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    pauseAutoOrbit(1300);
    const wasMoved = gesture.current.moved; pointers.current.delete(event.pointerId);
    if (!wasMoved) {
      const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
      const company = visibleCompanies.length > 1 ? pickCompany(x, y, event.pointerType) : undefined;
      if (company) focusCompany(company.company); else { const node = pickNode(x, y, event.pointerType); if (node) setSelected(node.model); }
    }
    if (pointers.current.size) gesture.current = { ...pointerCenter(), moved: false };
  }
  function pickNode(x: number, y: number, pointerType: string, hover = false) {
    const magnet = pointerType === "touch" ? 38 : hover ? 22 : zoom >= 150 ? 32 : 25;
    return nodesRef.current
      .map((node) => ({ node, distance: Math.hypot(node.x - x, node.y - y) }))
      .filter(({ node, distance }) => distance <= Math.max(node.radius, magnet))
      .sort((a, b) => a.distance - b.distance || a.node.depth - b.node.depth)[0]?.node;
  }
  function pickCompany(x: number, y: number, pointerType: string) {
    const magnet = pointerType === "touch" ? 42 : 26;
    return companyNodesRef.current
      .map((node) => ({ node, distance: Math.hypot(node.x - x, node.y - y) }))
      .filter(({ node, distance }) => distance <= Math.max(node.radius, magnet))
      .sort((a, b) => a.distance - b.distance || a.node.depth - b.node.depth)[0]?.node;
  }
  function focusCompany(company: string) {
    setFocusedCompany(company); setSelected(null); hoveredCompany.current = null;
    const mobile = window.matchMedia("(max-width: 650px)").matches;
    const distance = mobile ? 980 : 760;
    const c = camera.current; Object.assign(c, { targetDistance: distance, targetPanX: 0, targetPanY: 0 }); setZoom(Math.round(120000 / distance));
  }
  function showAllGalaxies() { setFocusedCompany(null); setSelected(null); hoveredId.current = null; hoveredCompany.current = null; resetView(); }
  function onPointerLeave(event: ReactPointerEvent<HTMLCanvasElement>) { if (!pointers.current.size) { hoveredId.current = null; hoveredCompany.current = null; event.currentTarget.style.cursor = "grab"; } }
  function onWheel(event: ReactWheelEvent<HTMLCanvasElement>) { event.preventDefault(); pauseAutoOrbit(); const c = camera.current; c.distance = clamp(c.distance * Math.exp(event.deltaY * .00082), 410, 1800); c.targetDistance = c.distance; setZoom(Math.round(120000 / c.distance)); }
  function resetView() { const mobile = window.matchMedia("(max-width: 650px)").matches; const distance = mobile ? 1480 : 1200; const c = camera.current; Object.assign(c, { yaw: -.18, pitch: .12, distance, targetYaw: -.18, targetPitch: .12, targetDistance: distance, panX: 0, panY: 0, targetPanX: 0, targetPanY: 0 }); setZoom(Math.round(120000 / distance)); }
  function zoomBy(factor: number) { pauseAutoOrbit(); const c = camera.current; c.distance = clamp(c.distance * factor, 410, 1800); c.targetDistance = c.distance; setZoom(Math.round(120000 / c.distance)); }
  function toggleCompare(model: Model) {
    setComparison((current) => current.some((item) => item.id === model.id) ? current.filter((item) => item.id !== model.id) : [...current.slice(-2), model]);
  }
  function cycleMotion() { setMotionMode((current) => current === "full" ? "reduced" : current === "reduced" ? "static" : "full"); }
  async function toggleBgm() {
    const audio = audioRef.current; if (!audio) return;
    audio.volume = .28;
    if (audio.paused) { try { await audio.play(); setBgmPlaying(true); } catch { setBgmPlaying(false); } }
    else { audio.pause(); setBgmPlaying(false); }
  }
  async function shareCurrent() { await navigator.clipboard?.writeText(window.location.href); setShareNotice(true); window.setTimeout(() => setShareNotice(false), 1600); }

  if (!catalog) return <main className="loading"><div className="boot-ring" /><p>{lang === "zh" ? "正在唤醒模型宇宙" : "INITIALIZING MODELVERSE"}</p></main>;
  const description = selected ? (lang === "zh" ? (selected.notes || `${selected.company} 的${selected.type}。`) : `${selected.name} is a ${englishType(selected.type).toLowerCase()} developed by ${selected.company}.`) : "";
  const agentResults = AGENTS.filter((agent) => !query.trim() || `${agent.name} ${agent.maker} ${agent.category} ${agent.models} ${agent.tools} ${agent.description}`.toLowerCase().includes(query.toLowerCase()));
  const focusedModels = focusedCompany ? visible.filter((model) => model.company === focusedCompany) : [];
  const tierCounts = focusedModels.reduce((counts, model, index) => { const tier = modelTier(model, index); counts[tier]++; return counts; }, { flagship:0, stable:0, lightweight:0, specialized:0, historical:0, deprecated:0 } as Record<ModelTier, number>);
  const selectedTier = selected ? modelTier(selected, catalog.models.filter((model) => model.company === selected.company).findIndex((model) => model.id === selected.id)) : null;
  const compareInsights = comparison.length > 1 ? [
    { label: lang === "zh" ? "上下文更长" : "Longest context", model: [...comparison].sort((a,b) => parseMetric(b.context) - parseMetric(a.context))[0] },
    { label: lang === "zh" ? "输入成本更低" : "Lower input cost", model: [...comparison].filter((model) => parseMetric(model.inputPrice)).sort((a,b) => parseMetric(a.inputPrice) - parseMetric(b.inputPrice))[0] },
    { label: lang === "zh" ? "更适合推理" : "Reasoning-oriented", model: comparison.find((model) => /推理|reason/i.test(`${model.type} ${model.reasoning}`)) },
  ].filter((item) => item.model) : [];
  const deploymentModels = DEPLOYMENT_FEATURED_IDS.map((id) => catalog.models.find((model) => model.id === id)).filter((model): model is Model => Boolean(model));
  const deploymentDefault = deploymentModels[0] || [...catalog.models].filter((model) => parseMetric(model.params) > 0).sort((a,b) => Number(/开源|开放权重|open source|open weight/i.test(b.openSource)) - Number(/开源|开放权重|open source|open weight/i.test(a.openSource)) || popularityScore(b) - popularityScore(a))[0] || catalog.models[0];

  return <main className={`universe view-${viewMode} motion-${motionMode} ${focusedCompany ? "is-focused" : "is-overview"} ${selected ? "has-selection" : ""} ${compareOpen ? "has-compare" : ""} ${mobileFiltersOpen ? "has-mobile-filters" : ""} ${deploymentModel ? "has-deployment" : ""}`} lang={lang}>
    <header className="topbar">
      <button className="brand" onClick={() => { setQuery(""); showAllGalaxies(); }}><span className="brand-mark"><img src="/modelverse-logo.png" alt="" /></span><span><b>MODELVERSE</b><small>{t.subtitle}</small></span></button>
      <div className="search-wrap"><label className="searchbox"><span>⌕</span><input value={query} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />{query && <button onClick={() => setQuery("")}>×</button>}</label>{searchFocused && suggestions.length > 0 && viewMode === "models" && <div className="search-suggestions">{suggestions.map((suggestion, index) => <button key={`${suggestion.kind}-${suggestion.label}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (suggestion.kind === "company") { setQuery(""); focusCompany(suggestion.label); } else if (suggestion.model) { setQuery(""); setFocusedCompany(suggestion.model.company); setSelected(suggestion.model); } setSearchFocused(false); }}><span>{suggestion.kind === "company" ? "✦" : "●"}</span><b>{suggestion.label}</b><small>{suggestion.sub}</small></button>)}</div>}</div>
      <button className={`bgm-control ${bgmPlaying ? "playing" : "muted"}`} onClick={toggleBgm} aria-label={lang === "zh" ? (bgmPlaying ? "关闭背景音乐" : "播放背景音乐") : (bgmPlaying ? "Mute background music" : "Play background music")} title={lang === "zh" ? (bgmPlaying ? "关闭音乐" : "播放音乐") : (bgmPlaying ? "Mute" : "Play music")}><i aria-hidden="true"><img src="/wave-sound.png" alt="" /></i></button>
      <div className="top-actions"><div className="view-switch"><button className={viewMode === "models" ? "active" : ""} onClick={() => setViewMode("models")}>{lang === "zh" ? "模型" : "Models"}</button><button className={viewMode === "agents" ? "active" : ""} onClick={() => { setViewMode("agents"); setSelected(null); setCompareOpen(false); }}>{lang === "zh" ? "Agent" : "Agents"}</button></div><button className="deployment-trigger" onClick={() => { setCompareOpen(false); setMobileFiltersOpen(false); setDeploymentModel(selected || deploymentDefault); }}>◌ {lang === "zh" ? "部署计算器" : "Deploy calculator"}</button><button className="motion-toggle" onClick={cycleMotion} title={lang === "zh" ? "动态效果" : "Motion"}>{motionMode === "full" ? "◉" : motionMode === "reduced" ? "◐" : "○"}</button><button className={`compare-trigger ${comparison.length ? "ready" : ""}`} onClick={() => setCompareOpen(true)}>{t.compare}<b>{comparison.length}</b></button><div className="language"><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div></div>
    </header>
    <aside className="left-rail">{viewMode === "models" ? <><p className="eyebrow">{t.modelClass}</p><nav>{FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span />{t.filters[item]}</button>)}</nav><label className="region-filter"><span>{t.region}</span><select value={regionFilter} onChange={(event) => { setRegionFilter(event.target.value); setFocusedCompany(null); }}>{Object.entries(t.regions).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="rail-divider" /><p className="eyebrow">{t.galaxies}</p><div className="company-list"><button className={!focusedCompany ? "active" : ""} onClick={showAllGalaxies}>{t.allGalaxies}<em>{companies.length}</em></button>{companies.filter((company) => regionFilter === "all" || regionGroup(company) === regionFilter).map((company) => <button key={company} className={focusedCompany === company ? "active" : ""} onClick={() => focusCompany(company)}>{company}<em>{catalog.models.filter((model) => model.company === company).length}</em></button>)}</div></> : <><p className="eyebrow">{lang === "zh" ? "AGENT 生态" : "AGENT ECOSYSTEM"}</p><nav>{["全部","开发","通用","开源框架","编排框架","多 Agent"].map((item) => <button key={item} onClick={() => setQuery(item === "全部" ? "" : item)}><span />{item}</button>)}</nav><div className="agent-note">{lang === "zh" ? "Agent 与基础模型分层展示。资料将持续补充，不与模型参数直接排名。" : "Agents are cataloged separately from foundation models and are not ranked by model parameters."}</div></>}</aside>
    <section className="space"><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={onPointerLeave} onWheel={onWheel} aria-label={t.canvasLabel} />
      {viewMode === "agents" && <div className="agent-layer"><header><p>{lang === "zh" ? "AGENT 生态导航" : "AGENT ECOSYSTEM"}</p><h1>{lang === "zh" ? "发现构建于模型之上的智能体" : "Explore intelligence built on models"}</h1><span>{lang === "zh" ? "按任务、工具、底层模型与开放方式了解 Agent 产品和框架" : "Understand agent products and frameworks by task, tools, models and access"}</span></header><div className="agent-grid">{agentResults.map((agent) => <article key={agent.name}><div className="agent-card-head"><i>{agent.category}</i><span className={`agent-status ${agent.status}`}>{agent.status === "active" ? (lang === "zh" ? "活跃" : "Active") : (lang === "zh" ? "社区维护" : "Community")}</span></div><h2>{agent.name}</h2><h3>{agent.maker}</h3><p>{agent.description}</p><dl><div><dt>{lang === "zh" ? "底层模型" : "Models"}</dt><dd>{agent.models}</dd></div><div><dt>{lang === "zh" ? "工具能力" : "Tools"}</dt><dd>{agent.tools}</dd></div><div><dt>{lang === "zh" ? "开放方式" : "Access"}</dt><dd>{agent.access}</dd></div></dl></article>)}</div></div>}
      <div className="space-heading"><p>{lang === "zh" ? "发现 · 比较 · 评估 · 追踪" : "DISCOVER · COMPARE · EVALUATE · TRACK"}</p><div className="breadcrumb"><button onClick={showAllGalaxies}>{t.levelEcosystem}</button><i>›</i>{focusedCompany && <><b>{focusedCompany}</b><i>›</i></>}<span>{selected ? t.levelModel : focusedCompany ? t.levelCompany : t.heading}</span></div><div className="heading-line">{focusedCompany && <button className="back-galaxy" onClick={showAllGalaxies}><i>←</i>{lang === "zh" ? "返回全部公司" : "All companies"}<kbd>ESC</kbd></button>}<h1>{focusedCompany || (query ? `“${query}”` : t.heading)}</h1></div><span>{focusedCompany ? (lang === "zh" ? `${visible.length} 个模型 · 悬停识别 · 点击查看档案` : `${visible.length} MODELS · HOVER TO IDENTIFY · SELECT FOR PROFILE`) : (lang === "zh" ? `浏览 ${catalog.meta.companyCount} 家公司与 ${catalog.meta.modelCount} 个模型，快速完成技术选型` : `Explore ${catalog.meta.modelCount} models from ${catalog.meta.companyCount} companies`)}</span></div>
      <div className="view-controls"><button onClick={() => zoomBy(.82)}>＋</button><span>{zoom}%</span><button onClick={() => zoomBy(1.22)}>−</button><button onClick={resetView} title={t.reset}>◎</button></div>
      {!focusedCompany && viewMode === "models" && <div className="mobile-canvas-hint">{lang === "zh" ? "拖动探索 · 双指缩放 · 点击公司" : "Drag · pinch · select a company"}</div>}
      {focusedCompany && <div className="map-legend tier-legend"><p>{lang === "zh" ? "模型轨道层级" : "MODEL ORBITS"}</p>{TIER_ORDER.map((tier) => <span key={tier}><i className={`tier-dot tier-${tier}`} />{tierLabel(tier, lang)}<b>{tierCounts[tier]}</b></span>)}</div>}
      {zoom >= 210 && <div className="micro-mode">{t.micro}</div>}
      {!visible.length && <div className="empty-state"><b>{t.noResult}</b><button onClick={() => { setQuery(""); setFilter("all"); setRegionFilter("all"); setFocusedCompany(null); }}>{t.resetMap}</button></div>}
      <div className="coordinates">ORBIT / ZOOM / EXPLORE<br/><span>{t.hint.toUpperCase()}</span></div>
    </section>
    {selected && <aside className="detail-panel"><button className="close" onClick={() => setSelected(null)}>×</button><div className="detail-orb"><span /></div><p className="eyebrow">{t.modelNode} / {selected.id.toUpperCase()}</p><h2>{selected.name}</h2><h3>{selected.company} · {modelValue(selected, "type", lang)}</h3><div className="model-badges"><span className={`life-${lifecycleOf(selected)}`}>{lifecycleText(selected, lang)}</span><span>{modelTier(selected, 0) === "flagship" ? (lang === "zh" ? "旗舰候选" : "Flagship candidate") : (lang === "zh" ? "模型版本" : "Model release")}</span></div><div className="detail-actions"><button className={`add-compare ${comparison.some((item) => item.id === selected.id) ? "active" : ""}`} onClick={() => toggleCompare(selected)}><span>{comparison.some((item) => item.id === selected.id) ? "✓" : "+"}</span>{comparison.some((item) => item.id === selected.id) ? t.addedCompare : t.addCompare}</button><button className="share-button" onClick={shareCurrent}>{shareNotice ? (lang === "zh" ? "已复制" : "Copied") : (lang === "zh" ? "分享" : "Share")}</button></div><div className="decision-summary"><small>{lang === "zh" ? "一句话判断" : "QUICK TAKE"}</small><p>{description}</p></div><div className="fit-grid"><div><small>{lang === "zh" ? "更适合" : "GOOD FOR"}</small><p>{selected.scenarios || (lang === "zh" ? "通用模型应用与能力评估" : "General model applications and evaluation")}</p></div><div><small>{lang === "zh" ? "选择前注意" : "WATCH FOR"}</small><p>{lifecycleOf(selected) === "preview" ? (lang === "zh" ? "预览版本可能调整能力、价格或接口。" : "Preview capabilities, pricing or APIs may change.") : /未公开|—/.test(`${selected.params}${selected.context}`) ? (lang === "zh" ? "部分关键参数尚未公开，应在采购前复核。" : "Some key specifications remain undisclosed; verify before procurement.") : (lang === "zh" ? "实际效果取决于任务、提示词与部署环境，建议先做小规模评测。" : "Results depend on tasks, prompts and deployment; run a pilot evaluation.")}</p></div></div><div className="trust-strip"><i>✓</i><span><b>{sourceTrust(selected, lang)}</b><small>{lang === "zh" ? `收录于 ${selected.discoveredAt || catalog.meta.generatedAt}` : `Cataloged ${selected.discoveredAt || catalog.meta.generatedAt}`}</small></span></div><div className="metrics"><div><small>{t.totalParams}</small><b>{modelValue(selected, "params", lang)}</b></div><div><small>{t.context}</small><b>{modelValue(selected, "context", lang)}</b></div><div><small>{t.maxOutput}</small><b>{modelValue(selected, "maxOutput", lang)}</b></div><div><small>{t.release}</small><b>{modelValue(selected, "release", lang)}</b></div></div><dl><div><dt>{t.developedIn}</dt><dd>{regionLabel(selected.company, lang)}</dd></div><div><dt>{t.access}</dt><dd>{modelValue(selected, "openSource", lang)}</dd></div><div><dt>{t.multimodal}</dt><dd>{modelValue(selected, "multimodal", lang)}</dd></div><div><dt>{t.reasoning}</dt><dd>{modelValue(selected, "reasoning", lang)}</dd></div><div><dt>{t.inputPrice}</dt><dd>{modelValue(selected, "inputPrice", lang)}</dd></div><div><dt>{t.outputPrice}</dt><dd>{modelValue(selected, "outputPrice", lang)}</dd></div><div><dt>{t.size}</dt><dd>{modelValue(selected, "size", lang)}</dd></div></dl>{lang === "zh" && <div className="industries"><small>{t.industries}</small><p>{selected.industries || "—"}</p></div>}{selected.source.startsWith("http") && <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">{t.official} ↗</a>}</aside>}
    {compareOpen && <section className="compare-panel" aria-label={t.compare}><div className="compare-head"><div><p className="eyebrow">{t.workspace}</p><h2>{t.compare}</h2><span>{t.compareHint}</span></div><div><button onClick={shareCurrent}>{shareNotice ? (lang === "zh" ? "已复制链接" : "Link copied") : (lang === "zh" ? "分享对比" : "Share")}</button><button onClick={() => setComparison([])}>{t.clear}</button><button className="close-compare" onClick={() => setCompareOpen(false)} aria-label={t.closeCompare}>×</button></div></div>{compareInsights.length > 0 && <div className="compare-insights"><p>{lang === "zh" ? "快速结论 · 仅基于当前公开字段" : "Quick take · based only on current public fields"}</p>{compareInsights.map((item) => <span key={item.label}><b>{item.label}</b>{item.model?.name}</span>)}</div>}{comparison.length ? <div className="compare-table"><div className="compare-row compare-models"><b />{comparison.map((model) => <div key={model.id}><button onClick={() => toggleCompare(model)}>×</button><strong>{model.name}</strong><span>{model.company} · {lifecycleText(model, lang)}</span></div>)}</div>{[[t.developedIn,"region"],[t.totalParams,"params"],[t.context,"context"],[t.release,"release"],[t.access,"openSource"],[t.multimodal,"multimodal"],[t.reasoning,"reasoning"],[t.inputPrice,"inputPrice"],[t.outputPrice,"outputPrice"]].map(([label,key]) => <div className="compare-row" key={key}><b>{label}</b>{comparison.map((model) => <span key={model.id}>{key === "region" ? regionLabel(model.company, lang) : modelValue(model, key as keyof Model, lang)}</span>)}</div>)}</div> : <div className="compare-empty"><span>＋</span><p>{t.compareHint}</p><button onClick={() => setCompareOpen(false)}>{t.chooseModels}</button></div>}</section>}
    {mobileFiltersOpen && <section className="mobile-filter-sheet" aria-label={lang === "zh" ? "筛选模型" : "Filter models"}><header><div><small>{lang === "zh" ? "探索设置" : "EXPLORE"}</small><h2>{lang === "zh" ? "筛选模型宇宙" : "Filter the model universe"}</h2></div><button onClick={() => setMobileFiltersOpen(false)} aria-label={lang === "zh" ? "关闭筛选" : "Close filters"}>×</button></header><div className="mobile-filter-scroll"><div className="mobile-language"><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button></div><section><small>{t.modelClass}</small><div className="mobile-filter-chips">{FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => { setFilter(item); setFocusedCompany(null); }}>{t.filters[item]}</button>)}</div></section><label className="mobile-region"><small>{t.region}</small><select value={regionFilter} onChange={(event) => { setRegionFilter(event.target.value); setFocusedCompany(null); }}>{Object.entries(t.regions).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><details className="mobile-company-picker"><summary><span><small>{lang === "zh" ? "公司" : "COMPANY"}</small><b>{focusedCompany || t.allGalaxies}</b></span><i>⌄</i></summary><div className="mobile-company-grid"><button className={!focusedCompany ? "active" : ""} onClick={() => { showAllGalaxies(); setMobileFiltersOpen(false); }}>{t.allGalaxies}<i>{companies.length}</i></button>{companies.filter((company) => regionFilter === "all" || regionGroup(company) === regionFilter).map((company) => <button key={company} className={focusedCompany === company ? "active" : ""} onClick={() => { focusCompany(company); setMobileFiltersOpen(false); }}>{company}<i>{catalog.models.filter((model) => model.company === company).length}</i></button>)}</div></details></div></section>}
    <nav className="mobile-dock" aria-label={lang === "zh" ? "主要导航" : "Primary navigation"}><button className={viewMode === "models" ? "active" : ""} onClick={() => { setViewMode("models"); setMobileFiltersOpen(false); }}><i>✦</i><span>{lang === "zh" ? "模型" : "Models"}</span></button><button className={viewMode === "agents" ? "active" : ""} onClick={() => { setViewMode("agents"); setSelected(null); setCompareOpen(false); setMobileFiltersOpen(false); }}><i>◎</i><span>Agent</span></button><button onClick={() => { setCompareOpen(false); setMobileFiltersOpen(false); setDeploymentModel(selected || deploymentDefault); }}><i>◌</i><span>{lang === "zh" ? "计算" : "Deploy"}</span></button><button className={mobileFiltersOpen ? "active" : ""} onClick={() => setMobileFiltersOpen(true)}><i>≡</i><span>{lang === "zh" ? "筛选" : "Filter"}</span></button><button className={comparison.length ? "active" : ""} onClick={() => { setCompareOpen(true); setMobileFiltersOpen(false); }}><i>▦{comparison.length > 0 && <b>{comparison.length}</b>}</i><span>{lang === "zh" ? "对比" : "Compare"}</span></button></nav>
    <audio ref={audioRef} src="/audio/silent-universe.mp3" loop preload="none" onPause={() => setBgmPlaying(false)} onPlay={() => setBgmPlaying(true)} />
    {focusedCompany && viewMode === "models" && !selected && <CompanyOverview company={focusedCompany} models={catalog.models.filter((model) => model.company === focusedCompany)} lang={lang} updatedAt={catalog.meta.generatedAt} open={companyOverviewOpen} onToggle={() => setCompanyOverviewOpen((current) => !current)} />}
    {selected && selectedTier && !deploymentModel && <ModelDetailSheet model={selected} lang={lang} updatedAt={catalog.meta.generatedAt} tier={selectedTier} compared={comparison.some((item) => item.id === selected.id)} onCompare={() => toggleCompare(selected)} onDeploy={() => setDeploymentModel(selected)} onShare={shareCurrent} onClose={() => setSelected(null)} copied={Boolean(shareNotice)} />}
    {deploymentModel && <DeploymentLab key={deploymentModel.id} model={deploymentModel} models={deploymentModels} lang={lang} updatedAt={catalog.meta.generatedAt} onModelChange={setDeploymentModel} onClose={() => setDeploymentModel(null)} />}
  </main>;
}
