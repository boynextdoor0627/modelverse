# MODELVERSE · 模型宇宙

<p align="center">
  <img src="public/modelverse-logo.png" width="104" alt="MODELVERSE logo" />
</p>

<p align="center">
  <strong>Don’t browse AI models. Navigate their universe.</strong><br />
  帮助开发者与企业发现、比较、评估并持续追踪 AI 模型
</p>

<p align="center">
  <a href="https://modelverse.tech"><strong>探索在线模型宇宙</strong></a>
  · <a href="#核心功能">核心功能</a>
  · <a href="#本地部署选型计算器">选型计算器</a>
  · <a href="#english">English</a>
</p>

![MODELVERSE AI model universe](public/modelverse-readme-hero.png)

## MODELVERSE 是什么

MODELVERSE 是一个面向开发者与企业的 **AI 模型生态可视化导航与决策平台**。它把模型公司变成恒星，把模型变成围绕公司运行的行星，将散落在发布公告、模型仓库、价格页面和技术文档中的信息，组织成一个可以探索、筛选、比较与持续更新的模型宇宙。

它不仅回答“现在有哪些模型”，更希望帮助用户判断：**哪个模型适合我的业务、预算和部署条件？**

## 核心功能

| 能力 | 你可以做什么 |
| --- | --- |
| **可视化模型宇宙** | 旋转、拖动、缩放并探索公司恒星和模型行星；支持鼠标、触控与双指缩放。 |
| **公司模型星系** | 进入公司后查看完整模型家族；旗舰、主流、轻量、专项、历史和停止维护模型以距离、大小与亮度区分。 |
| **公司概览** | 快速了解公司定位、主要技术路线、开源或闭源策略、代表模型、研发国家／地区和更新时间。 |
| **智能搜索** | 支持模型名、公司别名、旧名称、拼写容错、中英文混合和自然语言需求，例如“便宜的代码模型”“适合中文客服”“可以本地部署”。 |
| **多维筛选** | 按模型类型、公司、研发国家或地区以及应用方向缩小候选范围。 |
| **模型详情** | 先呈现简介、推荐与不推荐场景，再展示核心优势、主要限制、价格、上下文、开源协议、部署方式、更新时间和官方来源。 |
| **模型比较** | 将候选模型加入比较区，从能力、成本、上下文、许可和部署条件等维度辅助选型。 |
| **Agent 生态** | 单独探索 Agent 产品以及 Agent 与基础模型、开发公司的生态关系。 |
| **部署选型计算器** | 在首页估算主流开源模型的权重、KV Cache、总显存、GPU 数量、节点拓扑、并行策略和网络需求。 |
| **成本分析** | 比较私有化部署与云 API 的硬件投入、月度成本、盈亏平衡量和预计回本周期。 |
| **双语与多端体验** | 提供中文／English 切换，并针对桌面与移动设备设计响应式交互。 |
| **沉浸式体验** | 深空星云背景、持续运行的轨道动画与可控制的宇宙环境音乐，共同构成探索氛围。 |

## 宇宙的视觉规则

- **公司是恒星**：公司 Logo 位于星系中心，代表模型研发组织。
- **模型是行星**：不同模型沿各自轨道围绕公司运行，并与中心保持连接。
- **距离表达地位**：旗舰与主流模型更靠近中心，历史模型逐渐远离。
- **大小表达影响力**：更主流、使用更广的模型拥有更高视觉权重。
- **亮度表达活跃度**：当前重点模型更明亮，停止维护模型则更加克制。
- **运动表达生命力**：轨道与模型持续、不规则地运行，呈现不断演化的技术生态。

## 本地部署选型计算器

首页内置轻量的本地部署选型计算器，精选一组具有公开参数、适合进行容量估算的主流模型，覆盖 DeepSeek、Qwen、Kimi、GLM、MiniMax、GPT-OSS、Llama、Mistral、Nemotron 与 Seed-OSS 等模型家族。

### 输入条件

- 模型与参数规模
- 权重精度：BF16、FP8／INT8、INT4
- 实际上下文长度与峰值并发
- KV Cache 精度
- vLLM、TGI 等推理框架开销
- GPU 型号与单卡可用显存

### 输出结果

- 模型权重、KV Cache、框架开销与总显存需求
- 工程建议 GPU 卡数与最大并发
- 单机／多机节点拓扑与并行策略
- 节点间网络建议
- 私有化部署和云 API 月度成本比较
- 盈亏平衡调用量与预计回本周期

> 计算结果用于架构前期讨论，不替代推理框架实测、硬件兼容性验证和正式 POC。

## 数据可信度

MODELVERSE 将“厂商正式发布”和“第三方平台收录”分开处理，并尽量让每条重要信息可追溯：

- 人工整理的型号必须匹配 `data/official-model-registry.json` 中的一手证据才能进入公开星系。
- 官方 Hugging Face 组织发布的模型标记为“官方发布”。
- OpenRouter 等聚合平台记录仅标记为“第三方平台收录”，不等同于厂商正式发布。
- Preview、Deprecated、量化版本、适配器与模型合并版本分别处理，不与基础模型混为一谈。
- 无法找到官方发布页、官方 API 文档或官方模型仓库的旧记录默认不公开展示。
- 数据目录支持自动更新、规范化、去重与审计报告。

## English

MODELVERSE is a visual navigation and decision platform for the AI model ecosystem. Companies become stars, and their models become planets moving across distinct orbits. It turns fragmented release posts, model repositories, pricing pages, and technical documentation into an explorable universe for discovery, comparison, evaluation, and continuous tracking.

### Product highlights

- Interactive Canvas universe with rotation, zoom, pointer, touch, and pinch gestures
- Company-centered planetary systems with lifecycle-aware model hierarchy
- Natural-language, alias-aware, typo-tolerant, bilingual search
- Filters for model type, company, development country or region, and use case
- Structured company overviews and suitability-first model profiles
- Multi-model comparison for technical and business decisions
- Homepage deployment calculator for VRAM, GPU, topology, and cost estimates
- Dedicated Agent ecosystem navigation
- Bilingual Chinese and English experience across desktop and mobile
- Auditable catalog pipeline that distinguishes first-party evidence from third-party listings

## Run locally

Requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown in the terminal.

## Production build

```bash
pnpm build
pnpm start
```

## Catalog pipeline

Curated records must match first-party evidence in `data/official-model-registry.json` before publication. Official Hugging Face organizations are merged as verified releases, while OpenRouter entries remain explicitly labeled as third-party listings. The pipeline normalizes and deduplicates records and separates aliases, quantized copies, adapters, and model merges from base models.

```bash
pnpm catalog:update
```

The generated catalog is written to `public/models.json`, with an audit summary in `data/catalog-report.json`. Trusted organizations and source rules live in `data/source-registry.json`; first-party evidence lives in `data/official-model-registry.json`.

## Technology

- React 19 + TypeScript
- Vinext + Vite
- Canvas-based interactive visualization
- Responsive pointer, wheel, touch, and pinch interaction
- Alibaba Cloud Linux + Nginx deployment templates

## Project status

MODELVERSE is evolving from a visual model atlas into a decision platform for discovering, comparing, evaluating, and continuously tracking AI models.

Explore the live product at **[modelverse.tech](https://modelverse.tech)**.

<p align="center"><sub>上海引众 AI 事业部团队制作 · CREATED BY SHANGHAI YINZHONG AI TEAM</sub></p>
