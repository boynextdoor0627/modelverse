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

const COLORS = ["#58f6ff", "#8d7dff", "#ff6fcf", "#ffae57", "#77ffb4", "#74a5ff", "#f7ff78"];
const FILTERS = ["all", "llm", "reasoning", "multimodal", "code"] as const;
const UI = {
  zh: {
    subtitle: "语言模型全景图谱", search: "搜索模型、公司、行业或应用场景…", online: "数据核心在线",
    modelClass: "模型类型", galaxies: "公司星系", allGalaxies: "全部星系", heading: "智能，正在连接",
    hint: "拖拽旋转 · 滚轮缩放 · 双指移动与捏合", source: "数据", companies: "个公司星系", updated: "更新于",
    sync: "重新同步", reset: "复位视角", micro: "微观参数视图", noResult: "未发现对应模型", resetMap: "重置星图",
    modelNode: "模型节点", description: "模型简介", totalParams: "总参数", context: "上下文", maxOutput: "最大输出",
    release: "发布日期", access: "开放方式", multimodal: "多模态", reasoning: "思考模式", inputPrice: "输入价格",
    outputPrice: "输出价格", size: "模型大小", useCases: "适用场景", industries: "行业轨道", official: "查看官方来源",
    filters: { all: "全部", llm: "语言", reasoning: "推理", multimodal: "多模态", code: "代码" },
  },
  en: {
    subtitle: "THE LANGUAGE MODEL ATLAS", search: "Search models, companies, industries or use cases…", online: "DATA CORE ONLINE",
    modelClass: "MODEL CLASS", galaxies: "GALAXIES", allGalaxies: "All galaxies", heading: "INTELLIGENCE, CONNECTED",
    hint: "Drag to orbit · Wheel to zoom · Two-finger pan and pinch", source: "Source", companies: "company galaxies", updated: "Updated",
    sync: "Resync", reset: "Reset view", micro: "MICRO PARAMETER VIEW", noResult: "No matching models", resetMap: "Reset map",
    modelNode: "MODEL NODE", description: "Model profile", totalParams: "Parameters", context: "Context", maxOutput: "Max output",
    release: "Released", access: "Access", multimodal: "Multimodal", reasoning: "Reasoning", inputPrice: "Input price",
    outputPrice: "Output price", size: "Model size", useCases: "Use cases", industries: "Industries", official: "Official source",
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
  const [focusedCompany, setFocusedCompany] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<ScreenNode[]>([]);
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

  const companies = useMemo(() => catalog ? [...new Set(catalog.models.map((model) => model.company))] : [], [catalog]);
  const visible = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog.models.filter((model) => {
      const text = `${model.name} ${model.company} ${model.type} ${model.industries} ${model.scenarios}`.toLowerCase();
      return (!needle || text.includes(needle)) && typeMatches(model.type, filter) && (!focusedCompany || model.company === focusedCompany);
    });
  }, [catalog, query, filter, focusedCompany]);

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
    function line(a: Point3, b: Point3, color: string, alpha: number, lineWidth = 1) {
      const p1 = project(a), p2 = project(b); if (!p1 || !p2) return;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
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
      const seconds = time / 1000; const groups: Array<{ depth: number; company: string; color: string; primary: Point3[]; pair: Point3[]; models: Model[] }> = [];
      companies.forEach((company, companyIndex) => {
        const models = visible.filter((model) => model.company === company); if (!models.length) return;
        const angle = companyIndex * 2.39996; const radius = 330 + (companyIndex % 3) * 52; const drift = 8 + companyIndex % 9;
        const center = { x: Math.cos(angle) * radius + Math.sin(seconds * .22 + companyIndex) * drift, y: Math.sin(angle) * 210 + Math.cos(seconds * .18 + companyIndex) * drift, z: Math.sin(angle * 1.7) * 260 + Math.sin(seconds * .16 + companyIndex) * drift };
        const primary: Point3[] = [], pair: Point3[] = [];
        models.forEach((model, index) => { const theta = index * .72 + companyIndex * .31; const y = (index - (models.length - 1) / 2) * 18; primary.push({ x: center.x + Math.cos(theta) * 54, y: center.y + y, z: center.z + Math.sin(theta) * 54 }); pair.push({ x: center.x - Math.cos(theta) * 54, y: center.y + y, z: center.z - Math.sin(theta) * 54 }); });
        groups.push({ depth: rotate(center).z, company, color: COLORS[companyIndex % COLORS.length], primary, pair, models });
      });
      groups.sort((a, b) => a.depth - b.depth);
      const hitNodes: ScreenNode[] = [];
      groups.forEach((group) => {
        for (let i = 0; i < group.models.length; i++) {
          line(group.primary[i], group.pair[i], group.color, .18, .7);
          if (i > 0) { line(group.primary[i - 1], group.primary[i], group.color, .58, 1.25); line(group.pair[i - 1], group.pair[i], group.color, .32, 1); }
          const pair = project(group.pair[i]); if (pair) { ctx.globalAlpha = clamp(pair.scale * .45, .15, .65); ctx.fillStyle = group.color; ctx.beginPath(); ctx.arc(pair.x, pair.y, clamp(pair.scale * 2.1, 1, 3.2), 0, Math.PI * 2); ctx.fill(); }
          const p = project(group.primary[i]); if (!p || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) continue;
          const radius = clamp(p.scale * 4.2, 1.7, 8.5); ctx.globalAlpha = clamp(p.scale * .8, .28, 1); ctx.fillStyle = group.color; ctx.shadowColor = group.color; ctx.shadowBlur = radius * 2.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          hitNodes.push({ x: p.x, y: p.y, radius: Math.max(9, radius + 4), depth: p.depth, model: group.models[i] });
        }
        const top = group.primary.reduce((best, point) => point.y < best.y ? point : best, group.primary[0]); const label = top && project({ ...top, y: top.y - 27 });
        if (label) { ctx.globalAlpha = clamp(label.scale * .9, .3, .9); ctx.fillStyle = group.color; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillText(`${group.company} · ${group.models.length}`, label.x, label.y); ctx.textAlign = "start"; }
      });
      nodesRef.current = hitNodes.sort((a, b) => a.depth - b.depth);
      if (c.distance < 570) hitNodes.sort((a, b) => Math.hypot(a.x - width / 2, a.y - height / 2) - Math.hypot(b.x - width / 2, b.y - height / 2)).slice(0, 6).forEach(drawCard);
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [catalog, companies, visible, lang]);

  function pointerCenter() {
    const points = [...pointers.current.values()]; const x = points.reduce((sum, p) => sum + p.x, 0) / points.length; const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y, distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
  }
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture.current = { ...pointerCenter(), moved: false }; }
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) return; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const next = pointerCenter(); const dx = next.x - gesture.current.x; const dy = next.y - gesture.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
    const c = camera.current;
    if (pointers.current.size > 1) { c.targetPanX += dx; c.targetPanY += dy; if (next.distance && gesture.current.distance) c.targetDistance = clamp(c.targetDistance / (next.distance / gesture.current.distance), 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }
    else { c.targetYaw += dx * .006; c.targetPitch = clamp(c.targetPitch + dy * .0045, -.9, .9); }
    gesture.current = { ...next, moved: gesture.current.moved };
  }
  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    const wasMoved = gesture.current.moved; pointers.current.delete(event.pointerId);
    if (!wasMoved) { const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left, y = event.clientY - rect.top; const node = [...nodesRef.current].reverse().find((item) => Math.hypot(item.x - x, item.y - y) <= item.radius); if (node) setSelected(node.model); }
    if (pointers.current.size) gesture.current = { ...pointerCenter(), moved: false };
  }
  function onWheel(event: ReactWheelEvent<HTMLCanvasElement>) { event.preventDefault(); const c = camera.current; c.targetDistance = clamp(c.targetDistance * Math.exp(event.deltaY * .00115), 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }
  function resetView() { const c = camera.current; Object.assign(c, { yaw: -.18, pitch: .12, distance: 1200, targetYaw: -.18, targetPitch: .12, targetDistance: 1200, panX: 0, panY: 0, targetPanX: 0, targetPanY: 0 }); setZoom(100); }
  function zoomBy(factor: number) { const c = camera.current; c.targetDistance = clamp(c.targetDistance * factor, 410, 1800); setZoom(Math.round(120000 / c.targetDistance)); }

  if (!catalog) return <main className="loading"><div className="boot-ring" /><p>{lang === "zh" ? "正在唤醒模型宇宙" : "INITIALIZING MODELVERSE"}</p></main>;
  const description = selected ? (lang === "zh" ? (selected.notes || `${selected.company} 的${selected.type}。`) : `${selected.name} is a ${englishType(selected.type).toLowerCase()} developed by ${selected.company}.`) : "";

  return <main className="universe">
    <header className="topbar">
      <button className="brand" onClick={() => { setFocusedCompany(null); setQuery(""); resetView(); }}><span className="brand-mark">M</span><span><b>MODELVERSE</b><small>{t.subtitle}</small></span></button>
      <label className="searchbox"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />{query && <button onClick={() => setQuery("")}>×</button>}</label>
      <div className="top-actions"><div className="language"><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div><div className="system-state"><i />{t.online}<b>{catalog.meta.modelCount}</b></div></div>
    </header>
    <aside className="left-rail"><p className="eyebrow">{t.modelClass}</p><nav>{FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span />{t.filters[item]}</button>)}</nav><div className="rail-divider" /><p className="eyebrow">{t.galaxies}</p><div className="company-list"><button className={!focusedCompany ? "active" : ""} onClick={() => setFocusedCompany(null)}>{t.allGalaxies}<em>{companies.length}</em></button>{companies.map((company) => <button key={company} className={focusedCompany === company ? "active" : ""} onClick={() => setFocusedCompany(company)}>{company}<em>{catalog.models.filter((model) => model.company === company).length}</em></button>)}</div></aside>
    <section className="space"><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onWheel={onWheel} aria-label={lang === "zh" ? "可旋转缩放的三维模型宇宙" : "Interactive 3D model universe"} />
      <div className="space-heading"><p>NEURAL DNA CONSTELLATION / 2026</p><h1>{focusedCompany || (query ? `“${query}”` : t.heading)}</h1><span>{visible.length} MODELS · {t.hint}</span></div>
      <div className="view-controls"><button onClick={() => zoomBy(.82)}>＋</button><span>{zoom}%</span><button onClick={() => zoomBy(1.22)}>−</button><button onClick={resetView} title={t.reset}>◎</button></div>
      {zoom >= 210 && <div className="micro-mode">{t.micro}</div>}
      {!visible.length && <div className="empty-state"><b>{t.noResult}</b><button onClick={() => { setQuery(""); setFilter("all"); setFocusedCompany(null); }}>{t.resetMap}</button></div>}
      <div className="coordinates">ORBIT / ZOOM / EXPLORE<br/><span>{t.hint.toUpperCase()}</span></div>
    </section>
    <footer className="statusbar"><span>{t.source}: {catalog.meta.sourceNote}</span><span>{catalog.meta.companyCount} {t.companies}</span><span>{t.updated} {catalog.meta.generatedAt}</span><button onClick={() => location.reload()}>↻ {t.sync}</button></footer>
    {selected && <aside className="detail-panel"><button className="close" onClick={() => setSelected(null)}>×</button><div className="detail-orb"><span /></div><p className="eyebrow">{t.modelNode} / {selected.id.toUpperCase()}</p><h2>{selected.name}</h2><h3>{selected.company} · {lang === "en" ? englishType(selected.type) : selected.type}</h3><p className="description">{description}</p><div className="metrics"><div><small>{t.totalParams}</small><b>{selected.params || "—"}</b></div><div><small>{t.context}</small><b>{selected.context || "—"}</b></div><div><small>{t.maxOutput}</small><b>{selected.maxOutput || "—"}</b></div><div><small>{t.release}</small><b>{selected.release || "—"}</b></div></div><dl><div><dt>{t.access}</dt><dd>{selected.openSource || "—"}</dd></div><div><dt>{t.multimodal}</dt><dd>{selected.multimodal || "—"}</dd></div><div><dt>{t.reasoning}</dt><dd>{selected.reasoning || "—"}</dd></div><div><dt>{t.inputPrice}</dt><dd>{selected.inputPrice || "—"}</dd></div><div><dt>{t.outputPrice}</dt><dd>{selected.outputPrice || "—"}</dd></div><div><dt>{t.size}</dt><dd>{selected.size || "—"}</dd></div></dl>{lang === "zh" && <><div className="use-case"><small>{t.useCases}</small><p>{selected.scenarios || "—"}</p></div><div className="industries"><small>{t.industries}</small><p>{selected.industries || "—"}</p></div></>}{selected.source.startsWith("http") && <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">{t.official} ↗</a>}</aside>}
  </main>;
}
