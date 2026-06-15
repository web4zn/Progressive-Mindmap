<p align="center">
  <h1 align="center">🧠 渐进式脑图 (Progressive Mindmap)</h1>
  <p align="center">
    <strong>从对话中提取结构化知识 — AI 驱动的渐进式思维导图</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
    <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
    <img src="https://img.shields.io/badge/tests-491%20passing-green" alt="Tests">
    <img src="https://img.shields.io/badge/build-desktop-8A2BE2" alt="Desktop Build">
  </p>
</p>

> [English README](README.md)

---

> **为什么做这个项目**：在与大模型进行了无数次对话后，我发现了一个痛点——那些精彩的回答被埋在冗长的聊天记录里，难以回溯、无法沉淀。我需要一种方式，能自动将碎片化的对话提炼成结构化的知识，随时翻阅、强化记忆。这就是渐进式脑图的由来：让散落的问答，生长为一棵会呼吸的知识树。

**渐进式脑图** 是一款本地优先的 Web 应用，能将你与 LLM 的对话自动转化为结构化的思维导图，并支持桌面端（Electron）使用。

与传统手动绘制脑图的工具不同，渐进式脑图 **从对话中自动提取知识**：与任意兼容 OpenAI 接口的大模型对话，选择想要保留的见解，AI 会生成结构化的知识图谱——并支持 **增量更新**，你的手动编辑在多次生成之间不会被覆盖。

<p align="center">
  <img src="docs/images/screenshot-chat.png" alt="聊天界面" width="800">
</p>

## ✨ 核心特色

### 🤖 AI 原生生成
- **对话 → 知识图谱** — LLM 分析对话内容，自动生成结构化思维导图
- **增量操作** — AI 输出精准编辑指令（`add_child`、`update`、`merge`、`delete_leaf`、`reparent`）而非整棵树重建，通过 `editedByUser` 标志保护手动编辑
- **流式预览** — 生成过程中实时渲染脑图，伴随 shimmer 动画效果
- **节点级 Agent 对话** — 对任意节点发起限定范围的 LLM 对话，Agent 可通过内置工具查询、重排和更新节点内容

### 📚 语料库与溯源
- **来源追溯** — 每个节点标注来自哪条对话消息
- **语料筛选** — 整条消息或文本片段级别的内容选择
- **对话监听** — 新 AI 回复自动加入脑图语料库

### 🎨 画布与交互
- **React Flow 画布** — 平滑平移/缩放，dagre 树形自动布局
- **拖拽重排** — 拖拽节点到新父节点，重新组织结构
- **右键菜单** — 添加子节点、移动、删除、重排
- **折叠/展开** — 切换分支，聚焦查看
- **下钻模式** — 进入任意子树，配合面包屑导航专注浏览特定分支
- **返回全局导航** — 查看对话关联脑图时，工具栏返回按钮一键回到全局视图
- **大纲面板** — 树形层级侧边栏，快速导航和选中节点
- **全屏模式** — 沉浸式脑图探索
- **节点形状** — 多种视觉样式（圆角矩形、菱形、六边形等）
- **MiniMap** — 鸟瞰视口，便于在大脑图中定位

<p align="center">
  <img src="docs/images/screenshot-mindmap.png" alt="脑图画布" width="800">
</p>

### 🔍 搜索与筛选
- **全文搜索** — 搜索所有节点标题和内容，匹配高亮显示
- **深度筛选** — 工具栏内联滑块控制可见树深度
- **悬停路径高亮** — 悬停节点时高亮其到根节点的祖先路径

### ⚙️ 可定制
- **可配置深度** — 3/4/5 层或"自动"模式
- **背景模式** — 切换 auto、5W1H、tech、pros-cons、空白等多种背景
- **多厂商支持** — OpenAI / DeepSeek / Ollama / SiliconFlow 等
- **独立生成模型** — 每张脑图可使用不同的生成模型
- **节点图标** — 基于内容类型和深度自动分配图标

### 📝 富文本节点
- **底部抽屉编辑器** — 可拖拽调整大小的画布内底部抽屉，编辑节点内容
- **Markdown & HTML** — 节点支持通过 `react-markdown` 渲染富文本
- **自动格式化** — HTML 内容在保存和生成时自动美化排版
- **导出** — 将脑图导出为 PNG、SVG 或 Markdown

### ⏪ 撤销 / 重做
- 完整历史栈 — 撤销和重做任意脑图变更，包含 AI 生成的操作

### 💾 本地优先 & 隐私保护
- **IndexedDB 存储** — 所有数据留在浏览器端
- **无需后端** — 直接从浏览器调用 API
- **无需账号** — 数据完全属于你

### 🖥️ 桌面应用 (Electron)
- 跨平台桌面构建（macOS / Windows / Linux）
- 安全性加固：`contextIsolation`、`sandbox`、类型化 `window.api` 桥接
- 自动更新支持（基于 `electron-updater`）

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                    UI 层 (React 18)                       │
│  ┌───────────┐ ┌────────────┐ ┌──────────────────────┐  │
│  │ 聊天界面  │ │ 侧边栏     │ │    脑图面板          │  │
│  │ 流式输出  │ │ (会话,    │ │  ┌──────────────┐   │  │
│  │ Markdown  │ │  脑图)    │ │  │ React Flow   │   │  │
│  └───────────┘ └────────────┘ │  │ 画布 + dagre │   │  │
│                                │  ├──────────────┤   │  │
│  ┌───────────┐ ┌────────────┐ │  │ 大纲 | 搜索  │   │  │
│  │ 提供商设置 │ │ 对话侧边栏 │ │  │ 筛选 | 抽屉  │   │  │
│  └───────────┘ └────────────┘ │  └──────────────┘   │  │
│  ┌──────────────────────────────────────────────────┐ │  │
│  │ Agent 活动面板 (状态 + 流式聊天)                  │ │  │
│  └──────────────────────────────────────────────────┘ │  │
├─────────────────────────────────────────────────────────┤
│                 状态层 (Zustand)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Provider │ │Conversa- │ │ MindMap  │ │ ChatStore  │ │
│  │ Store    │ │tion Store│ │ Store    │ │            │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│        └──────────── IndexedDB (idb) ────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 AI 生成管线                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ 语料收集 │→│ 提示构建 │→│ 兼容 OpenAI 的 LLM API  │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
│                                    ↓                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ 验证与应用│←│ 解析/增量│←│ JSON / Markdown 响应    │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│               Agent 子系统 (WebWorker)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ ReAct    │→│ Zod 模式 │→│ 工具执行                 │ │
│  │ Runner   │ │ 校验     │ │ (读取节点、查询、重排、  │ │
│  │ (Worker) │ │          │ │  更新节点)               │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 项目结构

```
src/
├── features/
│   ├── chat/           # 聊天界面、消息气泡、输入
│   ├── conversation/   # 会话侧边栏和管理
│   ├── mindmap/        # 脑图面板、大纲、搜索、抽屉、筛选
│   └── provider/       # API 提供商设置
├── components/
│   ├── flow-shell/     # React Flow 画布、节点、边、MiniMap、面包屑
│   └── ui/             # 共享 UI 组件 (shadcn/ui)
├── hooks/              # React Hooks: 主题、历史、快捷键、Agent、缩放
├── lib/
│   ├── agent/          # ReAct Runner、Base Agent、工具模式、Worker 协议
│   └── ...             # db、导出、脑图生成器、布局、搜索、消毒、形状
├── stores/             # Zustand 状态管理
├── types/              # TypeScript 类型定义
└── workers/            # WebWorker 入口
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- 任意兼容 OpenAI 接口的 API 密钥（OpenAI / DeepSeek / Ollama / SiliconFlow 等）

### 安装运行

```bash
git clone https://github.com/web4zn/progressive-mindmap.git
cd progressive-mindmap
npm ci
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)，在设置中添加 API 提供商，开始对话。从侧边栏创建脑图即可开始知识提取！

### 构建

```bash
npm run build       # 双重 TypeScript 检查（渲染层 + Electron）+ electron-vite 构建
npm run preview     # 预览生产构建
```

## 🧪 开发

```bash
npm test              # 运行单元和组件测试 (vitest, 491+ 项)
npm run typecheck     # 完整类型检查：渲染层 + Electron tsconfig
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化
```

### CI 流程

`.github/workflows/ci.yml` 流程：`npm ci → npx tsc --noEmit → npx eslint . → npm test`

桌面构建由 `.github/workflows/build-desktop.yml` 管理，自动编译 Windows / macOS / Linux 安装包并发布到 GitHub Release。

## 🖥️ 桌面版 (Electron)

支持跨平台桌面构建，React UI 与 Web 版完全一致，额外提供 IPC 桥接以支持原生功能。

### 开发模式

```bash
npm run dev           # electron-vite dev — 启动主进程 + 渲染进程，支持 HMR
```

Electron 窗口自动打开并附加 DevTools。

### 生产构建

```bash
npm run build                # typecheck + electron-vite build → out/{main,preload,renderer}
npm run preview              # 运行生产构建
```

### 平台安装包

```bash
npm run build:mac            # → release/${version}/*.dmg   (仅 macOS)
npm run build:win            # → release/${version}/*.exe   (NSIS 安装器 + 便携版)
npm run build:linux          # → release/${version}/*.AppImage
```

### CI/CD — 自动构建

桌面构建在每次推送/PR 到 `opencode` 分支时由 **Build Desktop** 工作流 (`.github/workflows/build-desktop.yml`) 自动编译。合并后会生成：
- macOS `.dmg`（x64 + arm64）
- Windows `.exe`（NSIS 安装器 + 便携版）
- Linux `.AppImage`

当推送 `v*` 格式的 git 标签时，会自动创建（或更新）GitHub Release，附带所有平台构建产物——无需手动上传。

### 安全性

渲染进程**永远不**直接访问 Node（`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`）。所有特权操作通过类型化的 `window.api` 表面进行——详见 `electron/preload/index.ts` 和 `src/types/electron.d.ts`。

## 🎨 主题与样式

### 主题模式

| 模式 | 描述 |
|------|------|
| **浅色** | 默认；经典中性色板 |
| **深色** | shadcn `oklch` 深色色板 + 深色 FlowShell 表面 |
| **跟随系统** | 首次加载跟随 `prefers-color-scheme`；手动切换后保持选择 |

通过脑图工具栏中的 ☀/🌙 按钮切换（`data-testid="mindmap-theme-toggle"`）。当前模式持久化在 `localStorage` 的 `progressive-mindmap:theme` 键下。

### CSS 变量系统

所有动画时长使用 CSS 变量：
- `--duration-fast` / `--duration-base` / `--duration-slow`
- `--ease-out` 统一缓动函数
- `prefers-reduced-motion: reduce` 将所有时长归零

### 背景模式

背景强调色定义在 `src/index.css` 中：`--flow-pattern-{auto|5w1h|tech|pros-cons}`，通过 `[data-pattern=...]` 规则在 `src/components/flow-shell/css/theme.css` 中消费。

## ⌨️ 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+Z` / `Cmd+Z` | 撤销 |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | 重做 |
| `Escape` | 关闭抽屉 / 取消选中节点 |

## 🗺️ 路线图

- [x] LLM 多厂商对话 & 流式输出
- [x] AI 脑图生成（全量重建）
- [x] 增量更新操作（add_child、update、merge、delete_leaf、reparent）
- [x] 流式脑图预览（生成中实时渲染）
- [x] 富文本节点（Markdown / HTML）支持自动格式化
- [x] 画布内节点编辑器（底部抽屉）
- [x] 下钻模式与面包屑导航
- [x] 节点级 Agent 对话
- [x] 大纲面板
- [x] 全文搜索与匹配高亮
- [x] 深度筛选
- [x] 悬停路径高亮 + shimmer 动画
- [x] 折叠/展开分支
- [x] 拖拽重排节点
- [x] 节点形状
- [x] MiniMap 鸟瞰图
- [x] 背景模式切换
- [x] 主题系统（浅色 / 深色 / 跟随系统）
- [x] 撤销 / 重做
- [x] PNG / SVG / Markdown 导出
- [x] 快捷键系统
- [x] Electron 桌面应用（跨平台）
- [x] IndexedDB 持久化与迁移支持
- [x] 语料库与来源追溯
- [ ] 多布局类型（组织架构图、鱼骨图、时间线）
- [ ] 插件架构
- [ ] 多用户 / 协作

## 🤝 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。项目规范详见 [AGENTS.md](AGENTS.md)。

## 📄 许可证

MIT — 详见 [LICENSE](LICENSE)。
