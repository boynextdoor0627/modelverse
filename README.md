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

The interactive catalog is stored in `public/models.json`. Update this file to refresh the models shown in the universe.
