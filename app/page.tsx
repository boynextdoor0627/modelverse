"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Model = {
  id: string; name: string; company: string; companyOrder: number; type: string;
  params: string; activeParams: string; release: string; size: string; openSource: string;
  context: string; maxOutput: string; inputPrice: string; outputPrice: string;
  multimodal: string; reasoning: string; notes: string; industries: string;
  scenarios: string; source: string;
};

type Catalog = {
  meta: { modelCount: number; companyCount: number; generatedAt: string; sourceNote: string };
  models: Model[];
};

const COLORS = ["#58f6ff", "#8d7dff", "#ff6fcf", "#ffae57", "#77ffb4", "#74a5ff", "#f7ff78"];
const TYPE_FILTERS = ["全部", "语言", "推理", "多模态", "代码"];

function hash(text: string) {
  return [...text].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 7);
}

function typeMatches(type: string, filter: string) {
  if (filter === "全部") return true;
  if (filter === "语言") return type.includes("LLM") || type.includes("语言");
  if (filter === "推理") return type.includes("Reasoning") || type.includes("推理");
  if (filter === "多模态") return /VL|视觉|多模态|图像|视频|语音/.test(type);
  return /Code|代码/.test(type);
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [selected, setSelected] = useState<Model | null>(null);
  const [focusedCompany, setFocusedCompany] = useState<string | null>(null);

  useEffect(() => {
    fetch("/models.json").then((response) => response.json()).then(setCatalog);
  }, []);

  const companies = useMemo(() => {
    if (!catalog) return [];
    return [...new Set(catalog.models.map((model) => model.company))];
  }, [catalog]);

  const visible = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog.models.filter((model) => {
      const searchable = `${model.name} ${model.company} ${model.type} ${model.industries} ${model.scenarios}`.toLowerCase();
      return (!needle || searchable.includes(needle)) && typeMatches(model.type, filter) && (!focusedCompany || model.company === focusedCompany);
    });
  }, [catalog, query, filter, focusedCompany]);

  if (!catalog) return <main className="loading"><div className="boot-ring" /><p>正在唤醒模型宇宙</p></main>;

  return (
    <main className="universe">
      <div className="nebula nebula-a" /><div className="nebula nebula-b" /><div className="scanlines" />
      <header className="topbar">
        <button className="brand" onClick={() => { setFocusedCompany(null); setQuery(""); }} aria-label="返回完整模型宇宙">
          <span className="brand-mark">M</span><span><b>MODELVERSE</b><small>语言模型全景图谱</small></span>
        </button>
        <label className="searchbox">
          <span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索模型、公司、行业或应用场景…" aria-label="搜索模型" />
          {query && <button onClick={() => setQuery("")} aria-label="清空搜索">×</button>}
        </label>
        <div className="system-state"><i /> 数据核心在线 <b>{catalog.meta.modelCount}</b></div>
      </header>

      <aside className="left-rail">
        <p className="eyebrow">MODEL CLASS</p>
        <nav aria-label="模型类型">
          {TYPE_FILTERS.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span />{item}</button>)}
        </nav>
        <div className="rail-divider" />
        <p className="eyebrow">GALAXIES</p>
        <div className="company-list">
          <button className={!focusedCompany ? "active" : ""} onClick={() => setFocusedCompany(null)}>全部星系 <em>{companies.length}</em></button>
          {companies.map((company) => <button key={company} className={focusedCompany === company ? "active" : ""} onClick={() => setFocusedCompany(company)}>{company}<em>{catalog.models.filter((m) => m.company === company).length}</em></button>)}
        </div>
      </aside>

      <section className="space" aria-label="模型星图">
        <div className="space-heading">
          <p>NEURAL CONSTELLATION / 2026</p>
          <h1>{focusedCompany || (query ? `“${query}” 的轨迹` : "智能，正在连接")}</h1>
          <span>{visible.length} 个模型节点 · 点击星体查看档案</span>
        </div>
        <div className="orbit-core"><span /><b>AI</b><small>MODEL<br/>CORE</small></div>
        {companies.map((company, companyIndex) => {
          const companyModels = visible.filter((model) => model.company === company);
          if (!companyModels.length) return null;
          const color = COLORS[companyIndex % COLORS.length];
          const angle = (companyIndex / companies.length) * Math.PI * 2 - Math.PI / 2;
          const rx = 34 + (companyIndex % 3) * 5;
          const ry = 31 + ((companyIndex + 1) % 3) * 6;
          const cx = 50 + Math.cos(angle) * rx;
          const cy = 53 + Math.sin(angle) * ry;
          return <div className="galaxy" key={company} style={{ "--gx": `${cx}%`, "--gy": `${cy}%`, "--c": color } as CSSProperties}>
            <button className="galaxy-label" onClick={() => setFocusedCompany(company)}><i />{company}<small>{companyModels.length}</small></button>
            <div className="galaxy-ring" />
            {companyModels.slice(0, focusedCompany ? 48 : 14).map((model, index) => {
              const seed = Math.abs(hash(model.name));
              const nodeAngle = (index / Math.max(companyModels.length, 6)) * Math.PI * 2 + (seed % 30) / 20;
              const radius = 42 + (seed % 74);
              const x = Math.cos(nodeAngle) * radius;
              const y = Math.sin(nodeAngle) * radius * .58;
              const size = 7 + (seed % 9);
              return <button key={model.id} className={`model-node ${selected?.id === model.id ? "selected" : ""}`} style={{ "--x": `${x}px`, "--y": `${y}px`, "--s": `${size}px`, "--delay": `${(seed % 28) / 10}s` } as CSSProperties} onClick={() => setSelected(model)} title={`${model.name} · ${model.type}`} aria-label={`查看 ${model.name}`}><span /><b>{model.name}</b></button>;
            })}
          </div>;
        })}
        {!visible.length && <div className="empty-state"><b>未发现对应星体</b><span>换一个关键词，或清除筛选条件</span><button onClick={() => { setQuery(""); setFilter("全部"); setFocusedCompany(null); }}>重置星图</button></div>}
        <div className="coordinates">X 37.224&nbsp;&nbsp; Y 88.016&nbsp;&nbsp; Z 2048<br/><span>DRAG FIELD · SELECT NODE</span></div>
      </section>

      <footer className="statusbar">
        <span>数据：{catalog.meta.sourceNote}</span><span>20 个公司星系</span><span>更新于 {catalog.meta.generatedAt}</span><button onClick={() => location.reload()}>↻ 重新同步</button>
      </footer>

      {selected && <aside className="detail-panel" aria-label={`${selected.name} 模型详情`}>
        <button className="close" onClick={() => setSelected(null)} aria-label="关闭详情">×</button>
        <div className="detail-orb"><span /></div>
        <p className="eyebrow">MODEL NODE / {selected.id.toUpperCase()}</p>
        <h2>{selected.name}</h2><h3>{selected.company} · {selected.type}</h3>
        <p className="description">{selected.notes || `${selected.company} 的 ${selected.type}，适用于 ${selected.scenarios || "通用智能任务"}。`}</p>
        <div className="metrics">
          <div><small>总参数</small><b>{selected.params || "未公开"}</b></div><div><small>上下文</small><b>{selected.context || "—"}</b></div>
          <div><small>最大输出</small><b>{selected.maxOutput || "—"}</b></div><div><small>发布日期</small><b>{selected.release || "—"}</b></div>
        </div>
        <dl>
          <div><dt>开放方式</dt><dd>{selected.openSource || "未注明"}</dd></div><div><dt>多模态</dt><dd>{selected.multimodal || "—"}</dd></div>
          <div><dt>思考模式</dt><dd>{selected.reasoning || "—"}</dd></div><div><dt>输入价格</dt><dd>{selected.inputPrice || "—"}</dd></div>
          <div><dt>输出价格</dt><dd>{selected.outputPrice || "—"}</dd></div><div><dt>模型大小</dt><dd>{selected.size || "—"}</dd></div>
        </dl>
        <div className="use-case"><small>适用场景</small><p>{selected.scenarios || "暂无详细场景"}</p></div>
        <div className="industries"><small>行业轨道</small><p>{selected.industries || "通用"}</p></div>
        {selected.source.startsWith("http") && <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">查看官方来源 ↗</a>}
      </aside>}
    </main>
  );
}
