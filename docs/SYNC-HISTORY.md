# 向上游同步记录

记录每次向上游（CuteLeaf/Firefly）同步的准确信息，便于下一次同步时对齐。

---

## 同步策略

**当前快照基点（baseline）**：本仓库的初始快照 `7ab77d88`（"Initial commit"）基于上游的 Firefly **6.13.5** 版本，没有真正的 git 血缘关系，因此同步时不能用 rebase/merge，而使用「snapshot-diff 覆盖」策略：

1. `git diff <last_baseline_commit> <local_head>` 生成 patch
2. `git reset --hard upstream/master` 将工作树对齐上游最新 tip
3. `git apply --3way <patch>` 覆盖 patch
4. 处理 patch 中失败的文件（主要是：我们删了 upstream 还有的文件、我们新增的 A 状态文件）
5. 校验关键自定义文件未被上游覆盖，修复恢复
6. 一次性 commit，命名 `feat: 同步上游 Firefly 至 x.y.z`

## 需要人工保留的自定义项清单（每次同步后必须检查）

| 文件 | 自定义内容 |
| --- | --- |
| `src/config/siteConfig.ts` | 站点标题 `Olinl Blog`、subtitle、`site_url: https://blog.olinl.com`、`hue: 250` |
| `src/config/profileConfig.ts` | 个人 profile（社交链接、名字等） |
| `src/config/friendsConfig.ts` | 友链配置 |
| `src/config/redirectsConfig.ts` | **本地独有**的短链接/重定向配置，上游没有此文件；每次同步时要注意是否被上游阻挡 |
| `src/config/index.ts` | 包含 `redirects` 导出，上游没有这一行；检查 mermaidConfig 等其他导出也加全没有 |
| `src/config/analyticsConfig.ts` | Umami 配置（`shareId`、`shareApiBase` 等、shareId 设为可选） |
| `src/config/announcementConfig.ts` | 公告配置（可选） |
| `src/config/backgroundWallpaper.ts` | 壁纸配置 |
| `src/config/commentConfig.ts` | 评论配置 |
| `src/config/coverImageConfig.ts` | 封面图配置 |
| `src/config/fontConfig.ts` | 字体配置 |
| `src/config/footerConfig.ts` | 页脚配置（含 ICP 备案、网安备案、服务器状态） |
| `src/config/musicConfig.ts` | 音乐播放器配置 |
| `src/config/navBarConfig.ts` | 导航栏配置 |
| `src/config/sidebarConfig.ts` | 侧边栏布局配置 |
| `src/config/sponsorConfig.ts` | 打赏配置 |
| `astro.config.mjs` | 有 `redirects` 导入/配置；上游没有 |
| `src/components/layout/Footer.astro` | ICP/Police/Status 代码 |
| `src/components/layout/PostMeta.astro` | Umami 浏览量显示 |
| `src/components/layout/PostCard.astro` | 传 `postUrl={url}` |
| `src/components/layout/SideBar.astro` | 引用 `GitHubHeatmap` / `TimeGreeting` |
| `src/components/widget/GitHubHeatmap.astro` | **本地独有** widget，上游没有 |
| `src/components/widget/TimeGreeting.astro` | **本地独有** widget，上游没有 |
| `src/components/widget/WelcomeToast.astro` | **本地独有** widget，上游没有 |
| `src/components/widget/Profile.astro` | 社交链接过滤 RSS、rss 单独展示等修改 |
| `src/pages/friends.astro` | Umami 浏览量 |
| `src/pages/posts/[...slug].astro` | 传 `postUrl={getPostPostUrlBySlug(entry.id)}` |
| `src/pages/archive.astro` | 自定义归档页（可选） |
| `src/pages/guestbook.astro` | 自定义留言页（可选） |
| `src/pages/assets/images/logo.webp` | 自定义 logo |
| `src/pages/public/favicon/*` | 自定义 favicon（4 个尺寸 × 2 套 + ico） |
| `public/assets/images/qrcode.webp` | 二维码图片 |
| `README.md` | 覆盖为个人 fork 说明 |
| `CLAUDE.md` | 覆盖为本地开发规则 |
| `docs/UPSTREAM.md` | 上 forks 关系说明 |
| `wrangler.jsonc` | Cloudflare Workers 自定义配置 |
| `biome.json` | 忽略 `src/content/.obsidian` |
| 文章 `src/content/posts/*` | 我们的文章、图片（cf-fastip, firefly-first, less-blog, qq-group, 测试文章） |
| `src/content/spec/about.md` | 关于页面 |
| `src/content/spec/friends.mdx` | 友链页面（可选） |

## 需要还原的上游默认文件（我们删过的）

| 文件 | 删除理由 |
| --- | --- |
| `README.en.md` | 不需要英文版 README |
| `docs/README.ja.md`、`docs/README.ru.md`、`docs/README.zh-TW.md` | 不需要多语言 README |
| `docs/images/` 全部 | 上游截图等，我们用不上 |
| `src/assets/images/avatar.avif` | 默认头像，已替换 |
| `src/assets/images/firefly.png` | 默认 firefly logo，已替换 |
| `.github/ISSUE_TEMPLATE/`、`.github/FUNDING.yml`、`.github/dependabot.yml`、`.github/pull_request_template.md` | 个人 fork 不需要 issue template 与 funding |
| `.github/workflows/biome.yml` | 个人 fork 不需要 |
| `AGENTS.md` | 上游 agent 规则，我们自有 CLAUDE.md |
| 上游示例文章（`markdown-tutorial.md`、`katex-math-example.md` 等） | 不需要示例文章 |

## 同步记录

### 2026-07-14 — 同步至 6.13.9

| 项目 | 值 |
| --- | --- |
| 起始上游基点 | `6d1b4c5e` (6.13.5) |
| 新上游 tip | `41348476` (6.13.9) |
| 本地发布 commit | 暂无（尚未正式提交同步 commit） |
| 本地备份分支 | `backup/my-custom`（保持同步前的 25 个原始提交） |
| 本地二开保留验证 | siteConfig, redirects, umami, ICP 页脚, GitHubHeatmap/TimeGreeting/WelcomeToast — 全部确认保留 |
| 同步方式 | snapshot-diff 覆盖策略 |

#### 这次同步带来的上游变更（关键摘要）

- Mermaid 重构 → Merman，移动端手势支持，样式最大高度限制
- Tailwind v4 语法迁移
- 服务端渲染优化 (TOC/归档页/分类栏)
- 加密文章解密后图表 pan-zoom 修复
- 标签添加 `#` 号前缀
- 标签/分类按钮 → MD3 Chip 风格
- 文章列表卡片和元数据重新设计（高度可自定义）
- 许可证图标自动匹配功能
- 示例文章补齐 slug 字段
- `commentConfig` 改可选（`shareId`/`shareApiBase`）
- 韩语翻译 (ko)
- 依赖更新
- 版本号 6.13.5 → 6.13.6 → 6.13.7 → 6.13.8 → **6.13.9**
