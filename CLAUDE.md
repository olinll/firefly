# CLAUDE.md

# AI Agent 开发规则

## 核心原则
- **效率至上**：快速单元式开发
- **不写文档**：只写代码，不创建 README、GUIDE 等文档文件
- **改完即退**：完成代码修改后立即退出，用户会手动测试
- **单元提交**：每个功能/修改单独提交到 Git
- **闭嘴**：非用户要求不输出任何内容，静默更改代码完毕后直接退出

## 工作流程
1. 理解需求
2. 编写/修改代码
3. 询问是否创建 Git 提交
4. 退出（不等待测试结果）

## 开发工具
- 编辑文件：仅使用 Read 和 Edit 工具。不使用 Python、PowerShell、Bash cat 等工具修改文件。

## 搬文章规则
- 编辑文件：仅使用 Read 和 Edit 工具
- 不使用 Python、PowerShell、Bash cat 等工具修改文件
- 保持原始文件的路径结构和命名规范

### frontmatter 规范
严格按照以下顺序填写，缺失字段注释掉：

```yaml
title: ''
slug: ''
published: 2026-06-18 18:45:13
updated: 2026-06-12 15:46:00
description: ''
image: ''              # 有则用原值，无则填 api
category: ''
tags: []
draft: false
# pinned: false        # 置顶（无则注释）
```

### 时间年份调整
- `published` 与 `updated` 的年份统一修改为 **2025**
- 月、日、时分秒保持不变

### image 字段处理
- 原文有 image，保留原值
- 原文无 image，补充 `image: api`
- 引号包裹的路径如 `"./cover.avif"` 去除引号
- `image: api` 字面量保留不动，不转换为路径
- `image: ""` 空字符串 → 补充为 `image: api`

### 自定义组件语法
- `::github{repo="xxx"}` GitHub 仓库卡片 → 需转换为链接或注册对应组件

### 特殊语法迁移
| 语法 | 处理方式 |
|---|---|
| `[grid]...[/grid]` 图片画廊 | 实现网格组件或降级为普通图片排列 |
| `:spoiler[文本]` 剧透 | 需注册对应组件 |
| `:::tip` / `:::note` 等容器 | 转 GitHub `> [!TYPE]` 风格 |
| `> [!NOTE]` 等 callout | 已兼容，直接保留 |
| Expressive Code 代码块属性（`collapse`、`del/ins`、`wrap`、`title=`、`frame=`） | 按需简化或保留 |
| ` ```mermaid ` | 需 mermaid 支持 |
| ` ```plantuml ` | 需 PlantUML 服务端 |
| `$$...$$` / `$...$` KaTeX | 需 KaTeX/MathJax 支持 |
| `<iframe>` 视频嵌入 | 直接保留 |

### 加密文章处理
含 `password` / `passwordHint` 字段时，需 AES-256-GCM 构建时加密 + 前端 Web Crypto 解密

### 文章目录结构
```
posts/
  <slug>/
    images/
      0001.webp
      0002.webp
      ...
    index.md
```

### 预处理警告
迁移前必须扫描原文中的 `::` / `:::xxx` 用法，列出所有不符合迁移规范的内容（如非标准类型、嵌套异常、语法错误等）。必须将问题完整列出并征求用户同意，获得明确许可后才可执行后续操作。

### VitePress 提示迁移
将所有 VitePress `:::note` / `:::tip` 等提示语法全部转换为 GitHub 风格备注：

| VitePress | GitHub |
|---|---|
| `:::note` | `> [!NOTE]` |
| `:::tip` | `> [!TIP]` |
| `:::warning` | `> [!WARNING]` |
| `:::danger` | `> [!DANGER]` |
| `:::caution` | `> [!CAUTION]` |
| `:::important` | `> [!IMPORTANT]` |

- 开头 `:::xxx` 替换为 `> [!XXX]`
- 结尾单独一行的 `:::` 移除
- 提示后面的标题行（如 `:::note title`）合并到备注首行
- 内容中的子级引用 `>` 保持不变，仅向前缩进一层

示例：
```markdown
:::tip 小贴士
内容
:::

↓

> [!TIP]
> 小贴士：内容
```

### 图片处理规则
- 图片命名从 `0001.webp` 开始顺序递增
- PNG 图片需无损转换为 WebP 格式
- 文章中引用的图片路径需同步修改为 `![原有说明](./images/0001.webp)` 格式

## 提交规范
- `feat:` - 新功能
- `fix:` - 修复 bug
- `refactor:` - 代码重构
- `style:` - 样式调整
- `perf:` - 性能优化
- `chore:` - 构建/工具/配置更新

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefly is a feature-rich static blog theme built on **Astro 6** with **Svelte 5** for interactive components. It's a fork of [Fuwari](https://github.com/saicaca/fuwari) extended with extensive features. Primary language is Chinese (Simplified) with i18n for en, zh_TW, ja, ru.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build (icons → LQIPs → Astro build → Pagefind indexing) |
| `pnpm preview` | Preview production build |
| `pnpm check` | `astro check` for type/error checking |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm lint` | Biome lint + auto-fix |
| `pnpm format` | Biome format |
| `pnpm new-post <filename>` | Scaffold a new blog post |

Package manager is **pnpm** (enforced). Node.js >= 22 required.

## Architecture

### Astro + Svelte Hybrid

- `.astro` components for static content and layouts
- `.svelte` components for interactive UI (search, settings, pagination, archive) — mounted with `client:load` or `client:visible`
- Swup.js handles SPA-like page transitions with multiple container targets

### Configuration-Driven

All features are toggled/configured via TypeScript files in `src/config/`, exported through the barrel at `src/config/index.ts`. Key configs:

- `siteConfig.ts` — core site settings, theme, pagination
- `sidebarConfig.ts` — sidebar layout (left/right/both, widget ordering)
- `commentConfig.ts`, `analyticsConfig.ts`, `fontConfig.ts`, etc.

### Layout System

- `Layout.astro` — base HTML shell (head, body, theme init, analytics, Swup hooks)
- `MainGridLayout.astro` — full page grid with sidebar(s), navbar, wallpaper, footer

### Content Collections

Defined in `src/content.config.ts`:
- `posts` — blog posts (`.md`/`.mdx`) with frontmatter: title, published, tags, category, draft, pinned, password, comment, etc.
- `spec` — special pages (about, guestbook)

### Key Directories

- `src/components/` — organized by domain: `analytics/`, `comment/`, `common/`, `controls/`, `features/`, `layout/`, `misc/`, `pages/`, `widget/`
- `src/plugins/` — 15 custom remark/rehype plugins (Mermaid, PlantUML, KaTeX, GitHub cards, reading time, etc.)
- `src/i18n/` — translation keys in `i18nKey.ts`, language files in `languages/*.ts`, lookup via `translation.ts`
- `src/utils/` — content sorting, crypto (encrypted posts), date formatting, image processing/LQIP, TOC generation
- `src/pages/` — Astro file-based routing
- `scripts/` — build-time utilities (`generate-icons.js`, `generate-lqips.ts`, `new-post.js`)

### Path Aliases (tsconfig.json)

`@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*` → `./src/<dir>/*`; `@/*` → `./src/*`

## Code Style

- **Biome** enforces: tab indentation, double quotes, recommended lint rules
- Relaxed rules for `.svelte`/`.astro` files (useConst off, noUnusedVariables off)

## Commit Convention

**Conventional Commits** in Chinese. Format:

```
type: 简短中文描述

- 要点一
- 要点二
```

Rules:
- Type: `feat:` / `fix:` / `chore:` / `docs:` / `refactor:` — imperative, lowercase
- Subject: Chinese, concise, no trailing period
- Body: bullet list (`- `) with key changes, one-line each
- **Do NOT** add `Co-Authored-By` or any sign-off trailer

## Build Pipeline

Multi-step: `scripts/generate-icons.js` → `scripts/generate-lqips.ts` → `astro build` → `pagefind --site dist`

Icons/LQIP data are generated into `src/constants/` and committed. Regenerate with `pnpm icons` or `pnpm lqips`.

## Deployment

- **Vercel** (default, `vercel.json`)
- **Cloudflare Workers** (`wrangler.jsonc`, set `CF_WORKERS` env var)
- Static output to `dist/`

