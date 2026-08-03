"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type Lang = "zh" | "en";
type Model = {
  id: string; name: string; company: string; companyOrder: number; type: string;
  params: string; activeParams: string; release: string; size: string; openSource: string;
  context: string; maxOutput: string; inputPrice: string; outputPrice: string;
  multimodal: string; reasoning: string; notes: string; industries: string;
  scenarios: string; source: string;
};
type Catalog = { meta: { modelCount: number; companyCount: number; generatedAt: string; sourceNote: string }; models: Model[] };
type Point3 = { x: number; y: number; z: number };
type ScreenNode = { x: number; y: number; radius: number; depth: number; model: Model };
type ScreenCompany = { x: number; y: number; radius: number; depth: number; company: string };

const COLORS = ["#58f6ff", "#8d7dff", "#ff6fcf", "#ffae57", "#77ffb4", "#74a5ff", "#f7ff78"];
const COMPANY_LOGOS: Record<string, string> = {
  OpenAI: "openai", Anthropic: "anthropic", "Google DeepMind": "googledeepmind", Meta: "meta", Microsoft: "microsoft",
  NVIDIA: "nvidia", Amazon: "amazon", Apple: "apple", IBM: "ibm", Salesforce: "salesforce", Perplexity: "perplexity",
  "Hugging Face": "huggingface", Cohere: "cohere", xAI: "x", Alibaba: "alibabacloud", Tencent: "tencentqq",
  ByteDance: "bytedance", Baidu: "baidu", Xiaomi: "xiaomi", xiaomi: "xiaomi", bilibili: "bilibili", Meituan: "meituan",
  DeepSeek: "deepseek", MistralAI: "mistralai", "Mistral AI": "mistralai", StabilityAI: "stabilityai", "Stability AI": "stabilityai",
  NAVER: "naver", "LG AI Research": "lg", "SK Telecom": "sktelecom", "Allen Institute for AI": "allenai", H2Oai: "h2oai", "H2O.ai": "h2oai",
};
const FILTERS = ["all", "llm", "reasoning", "multimodal", "code"] as const;
const UI = {
  zh: {
    subtitle: "语言模型全景图谱", search: "搜索模型、公司、行业或应用场景…", online: "数据核心在线",
    modelClass: "模型类型", galaxies: "公司星系", allGalaxies: "全部星系", heading: "智能，正在连接",
    hint: "点击公司恒星展开 · 拖拽旋转 · 滚轮缩放", source: "数据", companies: "个公司星系", updated: "更新于",
    sync: "重新同步", reset: "复位视角", micro: "微观参数视图", noResult: "未发现对应模型", resetMap: "重置星图",
    modelNode: "模型节点", description: "模型简介", totalParams: "总参数", context: "上下文", maxOutput: "最大输出",
    release: "发布日期", access: "开放方式", multimodal: "多模态", reasoning: "思考模式", inputPrice: "输入价格",
    outputPrice: "输出价格", size: "模型大小", useCases: "适用场景", industries: "行业轨道", official: "查看官方来源",
    compare: "模型对比", addCompare: "加入对比", addedCompare: "已加入对比", compareHint: "选择 2–3 个模型，快速判断能力与成本差异",
    clear: "清空", closeCompare: "关闭对比", mapGuide: "星图图例", starMeaning: "恒星代表公司", planetMeaning: "行星代表模型版本",
    colorMeaning: "颜色区分公司星系", sizeMeaning: "大小反映参数规模与数据完整度", levelEcosystem: "生态总览", levelCompany: "公司星系", levelModel: "模型档案",
    filters: { all: "全部", llm: "语言", reasoning: "推理", multimodal: "多模态", code: "代码" },
  },
  en: {
    subtitle: "THE LANGUAGE MODEL ATLAS", search: "Search models, companies, industries or use cases…", online: "DATA CORE ONLINE",
    modelClass: "MODEL CLASS", galaxies: "GALAXIES", allGalaxies: "All galaxies", heading: "INTELLIGENCE, CONNECTED",
    hint: "Select a company star · Drag to orbit · Wheel to zoom", source: "Source", companies: "company galaxies", updated: "Updated",
    sync: "Resync", reset: "Reset view", micro: "MICRO PARAMETER VIEW", noResult: "No matching models", resetMap: "Reset map",
    modelNode: "MODEL NODE", description: "Model profile", totalParams: "Parameters", context: "Context", maxOutput: "Max output",
    release: "Released", access: "Access", multimodal: "Multimodal", reasoning: "Reasoning", inputPrice: "Input price",
    outputPrice: "Output price", size: "Model size", useCases: "Use cases", industries: "Industries", official: "Official source",
    compare: "COMPARE", addCompare: "Add to compare", addedCompare: "Added", compareHint: "Select 2–3 models to compare capability and cost",
    clear: "Clear", closeCompare: "Close comparison", mapGuide: "MAP LEGEND", starMeaning: "Stars are companies", planetMeaning: "Planets are model versions",
    colorMeaning: "Colors identify company systems", sizeMeaning: "Size reflects scale and data completeness", levelEcosystem: "Ecosystem", levelCompany: "Company system", levelModel: "Model profile",
    filters: { all: "All", llm: "Language", reasoning: "Reasoning", multimodal: "Multimodal", code: "Code" },
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

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [lang, setLang] = useState<Lang>("zh");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof FILTERS[number]>("all");
  const [selected, setSelected] = useState<Model | null>(null);
  const [comparison, setComparison] = useState<Model[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [focusedCompany, setFocusedCompany] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<ScreenNode[]>([]);
  const companyNodesRef = useRef<ScreenCompany[]>([]);
  const hoveredId = useRef<string | null>(null);
  const hoveredCompany = useRef<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, distance: 0, moved: false });
  const camera = useRef({ yaw: -.18, pitch: .12, distance: 1200, targetYaw: -.18, targetPitch: .12, targetDistance: 1200, panX: 0, panY: 0, targetPanX: 0, targetPanY: 0 });
  const t = UI[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem("modelverse-lang");
    if (saved === "zh" || saved === "en") setLang(saved);
    fetch("/models.json").then((response) => response.json()).then(setCatalog);
  }, []);
  useEffect(() => { window.localStorage.setItem("modelverse-lang", lang); }, [lang]);
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
    const needle = query.trim().toLowerCase();
    return catalog.models.filter((model) => {
      const text = `${model.name} ${model.company} ${model.type} ${model.industries} ${model.scenarios}`.toLowerCase();
      return (!needle || text.includes(needle)) && typeMatches(model.type, filter) && (!focusedCompany || model.company === focusedCompany);
    });
  }, [catalog, query, filter, focusedCompany]);
  const visibleCompanies = useMemo(() => [...new Set(visible.map((model) => model.company))], [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !catalog) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let frame = 0;
    let width = 1;
    let height = 1;
    let ratio = 1;
    const starSeed = Array.from({ length: 110 }, (_, index) => ({ x: (hash(`sx${index}`) & 1023) / 1023, y: (hash(`sy${index}`) & 1023) / 1023, a: .12 + (index % 5) * .04 }));
    const logoImages = new Map<string, HTMLImageElement>();
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
      c.yaw += (c.targetYaw - c.yaw) * .14; c.pitch += (c.targetPitch - c.pitch) * .14; c.distance += (c.targetDistance - c.distance) * .16;
      c.panX += (c.targetPanX - c.panX) * .16; c.panY += (c.targetPanY - c.panY) * .16;
      ctx.clearRect(0, 0, width, height); ctx.globalAlpha = 1;
      const background = ctx.createRadialGradient(width * .5, height * .52, 0, width * .5, height * .52, Math.max(width, height) * .68);
      background.addColorStop(0, "#0a1d2c"); background.addColorStop(.45, "#050d1a"); background.addColorStop(1, "#020610"); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      starSeed.forEach((star) => { ctx.globalAlpha = star.a; ctx.fillStyle = "#c8fbff"; ctx.fillRect(star.x * width, star.y * height, 1, 1); });
      const seconds = time / 1000; const groups: Array<{ depth: number; company: string; color: string; center: Point3; planets: Point3[]; models: Model[] }> = [];
      visibleCompanies.forEach((company, companyIndex) => {
        const models = visible.filter((model) => model.company === company); if (!models.length) return;
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
        const planets = models.map((model, index) => {
          const seed = Math.abs(hash(model.name));
          const modelVertical = 1 - 2 * ((index + .5) / models.length);
          const modelRadial = Math.sqrt(Math.max(0, 1 - modelVertical * modelVertical));
          const phase = index * 2.399963 + seconds * systemSpeed * systemDirection;
          const orbitRadius = systemRadius * (.78 + (seed % 23) / 100);
          const float = Math.sin(seconds * .43 + seed) * 3.5;
          return {
            x: center.x + Math.cos(phase) * modelRadial * orbitRadius,
            y: center.y + modelVertical * orbitRadius * .78 + float,
            z: center.z + Math.sin(phase) * modelRadial * orbitRadius,
          };
        });
        groups.push({ depth: rotate(center).z, company, color: COLORS[companyIndex % COLORS.length], center, planets, models });
      });
      groups.sort((a, b) => a.depth - b.depth);
      const hitNodes: ScreenNode[] = [];
      const companyHitNodes: ScreenCompany[] = [];
      groups.forEach((group) => {
        const star = project(group.center);
        if (star) {
          const pulse = 1 + Math.sin(seconds * 1.35 + Math.abs(hash(group.company))) * .13;
          const starRadius = clamp(star.scale * 9.5 * pulse, 4.2, 18);
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
          const planetRadius = clamp(p.scale * (3.7 + seed % 5) * breath, 1.8, 11);
          const planetGlow = ctx.createRadialGradient(p.x - planetRadius * .28, p.y - planetRadius * .34, .2, p.x, p.y, planetRadius * 1.85);
          planetGlow.addColorStop(0, "rgba(255,255,255,.96)"); planetGlow.addColorStop(.18, group.color); planetGlow.addColorStop(.62, rgba(group.color, .7)); planetGlow.addColorStop(1, rgba(group.color, 0));
          ctx.globalAlpha = clamp(p.scale * .92, .32, 1); ctx.fillStyle = planetGlow; ctx.beginPath(); ctx.arc(p.x, p.y, planetRadius * 1.85, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = .9; ctx.fillStyle = group.color; ctx.beginPath(); ctx.arc(p.x, p.y, planetRadius * .58, 0, Math.PI * 2); ctx.fill();
          if (hoveredId.current === group.models[i].id) {
            ctx.globalAlpha = .95; ctx.strokeStyle = "rgba(229,255,255,.92)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(11, planetRadius * 1.75), 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(226,255,255,.96)"; ctx.font = "9px monospace"; ctx.textAlign = "center";
            ctx.fillText(group.models[i].name.slice(0, 28), p.x, p.y - Math.max(16, planetRadius * 2.2)); ctx.textAlign = "start";
          }
          hitNodes.push({ x: p.x, y: p.y, radius: Math.max(12, planetRadius + 5), depth: p.depth, model: group.models[i] });
        }
        const label = project({ ...group.center, y: group.center.y - 36 });
        if (label) { ctx.globalAlpha = clamp(label.scale * 1.05, .38, .98); ctx.fillStyle = group.color; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillText(`${group.company} · ${group.models.length}`, label.x, label.y); ctx.textAlign = "start"; }
      });
      nodesRef.current = hitNodes.sort((a, b) => a.depth - b.depth);
      companyNodesRef.current = companyHitNodes.sort((a, b) => a.depth - b.depth);
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [catalog, visible, visibleCompanies, lang]);

  function pointerCenter() {
    const points = [...pointers.current.values()]; const x = points.reduce((sum, p) => sum + p.x, 0) / points.length; const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y, distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
  }
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture.current = { ...pointerCenter(), moved: false }; }
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
    if (pointers.current.size > 1) { c.targetPanX += dx; c.targetPanY += dy; if (next.distance && gesture.current.distance) c.targetDistance = clamp(c.targetDistance / (next.distance / gesture.current.distance), 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }
    else { c.targetYaw += dx * .006; c.targetPitch = clamp(c.targetPitch + dy * .0045, -.9, .9); }
    gesture.current = { ...next, moved: gesture.current.moved };
  }
  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
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
    const c = camera.current; Object.assign(c, { targetDistance: 760, targetPanX: 0, targetPanY: 0 }); setZoom(158);
  }
  function showAllGalaxies() { setFocusedCompany(null); setSelected(null); hoveredId.current = null; hoveredCompany.current = null; resetView(); }
  function onPointerLeave(event: ReactPointerEvent<HTMLCanvasElement>) { if (!pointers.current.size) { hoveredId.current = null; hoveredCompany.current = null; event.currentTarget.style.cursor = "grab"; } }
  function onWheel(event: ReactWheelEvent<HTMLCanvasElement>) { event.preventDefault(); const c = camera.current; c.targetDistance = clamp(c.targetDistance * Math.exp(event.deltaY * .00115), 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }
  function resetView() { const c = camera.current; Object.assign(c, { yaw: -.18, pitch: .12, distance: 1200, targetYaw: -.18, targetPitch: .12, targetDistance: 1200, panX: 0, panY: 0, targetPanX: 0, targetPanY: 0 }); setZoom(100); }
  function zoomBy(factor: number) { const c = camera.current; c.targetDistance = clamp(c.targetDistance * factor, 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }
  function toggleCompare(model: Model) {
    setComparison((current) => current.some((item) => item.id === model.id) ? current.filter((item) => item.id !== model.id) : [...current.slice(-2), model]);
  }

  if (!catalog) return <main className="loading"><div className="boot-ring" /><p>{lang === "zh" ? "正在唤醒模型宇宙" : "INITIALIZING MODELVERSE"}</p></main>;
  const description = selected ? (lang === "zh" ? (selected.notes || `${selected.company} 的${selected.type}。`) : `${selected.name} is a ${englishType(selected.type).toLowerCase()} developed by ${selected.company}.`) : "";

  return <main className="universe">
    <header className="topbar">
      <button className="brand" onClick={() => { setQuery(""); showAllGalaxies(); }}><span className="brand-mark">M</span><span><b>MODELVERSE</b><small>{t.subtitle}</small></span></button>
      <label className="searchbox"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />{query && <button onClick={() => setQuery("")}>×</button>}</label>
      <div className="top-actions"><button className={`compare-trigger ${comparison.length ? "ready" : ""}`} onClick={() => setCompareOpen(true)}>{t.compare}<b>{comparison.length}</b></button><div className="language"><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div><div className="system-state"><i />{t.online}<b>{catalog.meta.modelCount}</b></div></div>
    </header>
    <aside className="left-rail"><p className="eyebrow">{t.modelClass}</p><nav>{FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span />{t.filters[item]}</button>)}</nav><div className="rail-divider" /><p className="eyebrow">{t.galaxies}</p><div className="company-list"><button className={!focusedCompany ? "active" : ""} onClick={showAllGalaxies}>{t.allGalaxies}<em>{companies.length}</em></button>{companies.map((company) => <button key={company} className={focusedCompany === company ? "active" : ""} onClick={() => focusCompany(company)}>{company}<em>{catalog.models.filter((model) => model.company === company).length}</em></button>)}</div></aside>
    <section className="space"><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onPointerLeave={onPointerLeave} onWheel={onWheel} aria-label={lang === "zh" ? "可旋转缩放的三维模型宇宙" : "Interactive 3D model universe"} />
      <div className="space-heading"><p>MODEL ECOSYSTEM NAVIGATOR / 2026</p><div className="breadcrumb"><button onClick={showAllGalaxies}>{t.levelEcosystem}</button><i>›</i>{focusedCompany && <><b>{focusedCompany}</b><i>›</i></>}<span>{selected ? t.levelModel : focusedCompany ? t.levelCompany : t.heading}</span></div><div className="heading-line">{focusedCompany && <button className="back-galaxy" onClick={showAllGalaxies}><i>←</i>{lang === "zh" ? "返回全部星系" : "All galaxies"}<kbd>ESC</kbd></button>}<h1>{focusedCompany || (query ? `“${query}”` : t.heading)}</h1></div><span>{visible.length} MODELS · {focusedCompany ? (lang === "zh" ? "悬停识别 · 点击查看模型档案" : "Hover to identify · Select for profile") : t.hint}</span></div>
      <div className="view-controls"><button onClick={() => zoomBy(.82)}>＋</button><span>{zoom}%</span><button onClick={() => zoomBy(1.22)}>−</button><button onClick={resetView} title={t.reset}>◎</button></div>
      <div className="map-legend"><p>{t.mapGuide}</p><span><i className="legend-star" />{t.starMeaning}</span><span><i className="legend-planet" />{t.planetMeaning}</span><span><i className="legend-color" />{t.colorMeaning}</span><span><i className="legend-scale" />{t.sizeMeaning}</span></div>
      {zoom >= 210 && <div className="micro-mode">{t.micro}</div>}
      {!visible.length && <div className="empty-state"><b>{t.noResult}</b><button onClick={() => { setQuery(""); setFilter("all"); setFocusedCompany(null); }}>{t.resetMap}</button></div>}
      <div className="coordinates">ORBIT / ZOOM / EXPLORE<br/><span>{t.hint.toUpperCase()}</span></div>
    </section>
    <footer className="statusbar"><span>{t.source}: {catalog.meta.sourceNote}</span><span>{catalog.meta.companyCount} {t.companies}</span><span>{t.updated} {catalog.meta.generatedAt}</span><button onClick={() => location.reload()}>↻ {t.sync}</button></footer>
    {selected && <aside className="detail-panel"><button className="close" onClick={() => setSelected(null)}>×</button><div className="detail-orb"><span /></div><p className="eyebrow">{t.modelNode} / {selected.id.toUpperCase()}</p><h2>{selected.name}</h2><h3>{selected.company} · {lang === "en" ? englishType(selected.type) : selected.type}</h3><button className={`add-compare ${comparison.some((item) => item.id === selected.id) ? "active" : ""}`} onClick={() => toggleCompare(selected)}><span>{comparison.some((item) => item.id === selected.id) ? "✓" : "+"}</span>{comparison.some((item) => item.id === selected.id) ? t.addedCompare : t.addCompare}</button><p className="description">{description}</p><div className="metrics"><div><small>{t.totalParams}</small><b>{selected.params || "—"}</b></div><div><small>{t.context}</small><b>{selected.context || "—"}</b></div><div><small>{t.maxOutput}</small><b>{selected.maxOutput || "—"}</b></div><div><small>{t.release}</small><b>{selected.release || "—"}</b></div></div><dl><div><dt>{t.access}</dt><dd>{selected.openSource || "—"}</dd></div><div><dt>{t.multimodal}</dt><dd>{selected.multimodal || "—"}</dd></div><div><dt>{t.reasoning}</dt><dd>{selected.reasoning || "—"}</dd></div><div><dt>{t.inputPrice}</dt><dd>{selected.inputPrice || "—"}</dd></div><div><dt>{t.outputPrice}</dt><dd>{selected.outputPrice || "—"}</dd></div><div><dt>{t.size}</dt><dd>{selected.size || "—"}</dd></div></dl>{lang === "zh" && <><div className="use-case"><small>{t.useCases}</small><p>{selected.scenarios || "—"}</p></div><div className="industries"><small>{t.industries}</small><p>{selected.industries || "—"}</p></div></>}{selected.source.startsWith("http") && <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">{t.official} ↗</a>}</aside>}
    {compareOpen && <section className="compare-panel" aria-label={t.compare}><div className="compare-head"><div><p className="eyebrow">DECISION WORKSPACE</p><h2>{t.compare}</h2><span>{t.compareHint}</span></div><div><button onClick={() => setComparison([])}>{t.clear}</button><button className="close-compare" onClick={() => setCompareOpen(false)} aria-label={t.closeCompare}>×</button></div></div>{comparison.length ? <div className="compare-table"><div className="compare-row compare-models"><b />{comparison.map((model) => <div key={model.id}><button onClick={() => toggleCompare(model)}>×</button><strong>{model.name}</strong><span>{model.company}</span></div>)}</div>{[[t.totalParams,"params"],[t.context,"context"],[t.release,"release"],[t.access,"openSource"],[t.multimodal,"multimodal"],[t.reasoning,"reasoning"],[t.inputPrice,"inputPrice"],[t.outputPrice,"outputPrice"]].map(([label,key]) => <div className="compare-row" key={key}><b>{label}</b>{comparison.map((model) => <span key={model.id}>{model[key as keyof Model] || "—"}</span>)}</div>)}</div> : <div className="compare-empty"><span>＋</span><p>{t.compareHint}</p><button onClick={() => setCompareOpen(false)}>{lang === "zh" ? "返回星图选择模型" : "Choose models on the map"}</button></div>}</section>}
  </main>;
}
