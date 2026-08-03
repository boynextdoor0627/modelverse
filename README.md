# MODELVERSE

An interactive bilingual 3D atlas for exploring the world’s major language models as living planetary systems.

MODELVERSE 是一个中英双语的交互式三维语言模型图谱：公司是恒星，模型是围绕恒星规律运动的行星，用于呈现主流模型、厂商、参数、上下文与应用信息。

## Features

- High-performance Canvas rendering for stable 3D rotation and zoom
- Mouse, trackpad, touch, and pinch gestures
- Chinese and English interface with saved language preference
- Search and filtering by model, company, type, industry, and use case
- Company-centered planetary systems with close-up parameter cards
- Model detail panels sourced from the project catalog
- A reviewed catalog of 500–720 models across 60+ companies
- Weekly catalog refreshes from OpenRouter and verified Hugging Face organizations

## Local development

Requires Node.js 22.13 or newer.

```bash
pnpm install
pnpm run dev
```

Open the local URL printed by the development server.

## Build

```bash
pnpm run build
```

## Data

The original curated spreadsheet data is preserved in `data/curated-models.json`. It has the highest priority during every refresh. Public model registries are then merged, normalized, deduplicated, and screened to remove aliases, quantized copies, adapters, and model merges.

```bash
pnpm run catalog:update
```

The generated catalog is written to `public/models.json`, with an audit summary in `data/catalog-report.json`. GitHub Actions runs this refresh every Monday and commits genuine catalog changes automatically. The trusted organization mapping is maintained in `data/source-registry.json`.
