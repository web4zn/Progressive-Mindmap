<p align="center">
  <h1 align="center">🧠 Progressive Mindmap</h1>
  <p align="center">
    <strong>AI-powered knowledge extraction from conversations — visualized as mindmaps</strong>
  </p>
  <p align="center">
    <a href="README.zh-CN.md">中文文档</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
    <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React">
    <img src="https://img.shields.io/badge/tests-131%20passing-green" alt="Tests">
  </p>
</p>

---

Progressive Mindmap is a **local-first web application** that transforms your LLM conversations into structured, editable mindmaps. Unlike traditional mindmap tools where you draw nodes manually, Progressive Mindmap **extracts knowledge automatically**: chat with any OpenAI-compatible LLM, select the insights you want to keep, and let the AI build a mindmap — with **incremental updates** that preserve your edits across regenerations.

<p align="center">
  <img src="docs/images/screenshot-chat.png" alt="Chat Interface" width="800">
</p>

## ✨ Features

### 🤖 AI-Native Mindmap Generation
- **Conversation to Knowledge Graph** — LLM analyzes your chats and produces structured trees
- **Incremental Operations** — AI outputs surgical edits (`add_child`, `update`, `merge`, `delete_leaf`) instead of full regeneration
- **Streaming Preview** — watch the mindmap grow in real-time as the model generates
- **Editable Nodes** — double-click to edit; AI respects your edits (protected by `editedByUser` flag)

### 📚 Corpus & Provenance
- **Source Tracking** — every node shows which conversation messages informed it
- **Material Curation** — select entire messages or text fragments as source material
- **Conversation Monitoring** — auto-capture new AI responses into the mindmap corpus

### 🎨 Canvas & Interaction
- **React Flow Canvas** — smooth pan/zoom with `@xyflow/react` + dagre layout
- **Drag-to-Reparent** — restructure your mindmap by dragging nodes
- **Right-Click Menu** — add child, move, delete with context menu
- **Collapse/Expand** — toggle branches for focused viewing
- **Full-Screen Mode** — immersive mindmap exploration

<p align="center">
  <img src="docs/images/screenshot-mindmap.png" alt="Mindmap Canvas" width="800">
</p>

### ⚙️ Customizable
- **Configurable Depth** — 3/4/5 levels or "Auto" (AI decides)
- **Multi-Provider** — works with OpenAI, DeepSeek, Ollama, SiliconFlow, and any OpenAI-compatible API
- **Per-Mindmap Model** — different mindmaps can use different models for generation

<p align="center">
  <img src="docs/images/screenshot-mindmap-setting.png" alt="Mindmap Settings" width="400">
</p>

### 💾 Local-First & Private
- **IndexedDB Storage** — all data stays in your browser
- **No Backend** — direct API calls from your browser
- **No Account Required** — you own your data

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Chat Interface                      │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Sidebar  │  │ Messages  │  │   Mindmap Panel    │  │
│  │          │  │           │  │  ┌──────────────┐   │  │
│  │ Sessions │  │ User/AI   │  │  │ React Flow   │   │  │
│  │ Mindmaps │  │ Markdown  │  │  │ Canvas       │   │  │
│  │          │  │ Selection │  │  │ dagre Layout │   │  │
│  └──────────┘  └───────────┘  │  └──────────────┘   │  │
│                                │  ┌──────────────┐   │  │
│                                │  │ Corpus Panel │   │  │
│                                │  └──────────────┘   │  │
│                                └────────────────────┘  │
├────────────────────────────────────────────────────────┤
│                    Data Layer                           │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Provider │  │Conversation│  │     MindMap        │  │
│  │  Store   │  │   Store    │  │      Store         │  │
│  │ (IDB)    │  │  (IDB)     │  │     (IDB)          │  │
│  └──────────┘  └───────────┘  └────────────────────┘  │
├────────────────────────────────────────────────────────┤
│               AI Generation Pipeline                   │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Corpus   │→ │ Prompt    │→ │ OpenAI-compatible  │  │
│  │ Collector│  │ Builder   │  │ LLM API            │  │
│  └──────────┘  └───────────┘  └────────────────────┘  │
│                                     ↓                  │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Validate │← │ Parse /   │← │ JSON / Markdown    │  │
│  │ & Apply  │  │ Increment │  │ Response           │  │
│  └──────────┘  └───────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- An API key from any OpenAI-compatible provider (OpenAI, DeepSeek, Ollama, etc.)

### Install & Run

```bash
git clone https://github.com/web4zn/progressive-mindmap.git
cd progressive-mindmap
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), add your API provider in Settings, and start chatting. Create a mindmap from the sidebar to begin extracting knowledge!

### Build

```bash
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

## 🧪 Development

```bash
npm test              # Run unit & component tests (131 tests)
npx tsc --noEmit      # Type check
npx vitest --watch    # Watch mode
```

## 🗺️ Roadmap

- [x] LLM chat with multi-provider & streaming
- [x] AI mindmap generation (full rebuild)
- [x] Streaming mindmap preview
- [x] Incremental update operations
- [x] Corpus curation & source tracking
- [x] React Flow canvas with dagre layout
- [x] IndexedDB persistence
- [ ] PNG / SVG / Markdown export
- [ ] Keyboard shortcuts
- [ ] Undo / Redo
- [ ] Rich content in nodes (images, links, notes)
- [ ] Plugin architecture
- [ ] Multiple layout types (org chart, fishbone, timeline)
- [ ] Theme system

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 中文简介

**渐进式脑图** 是一款本地优先的 Web 应用，能将你与 LLM 的对话自动转化为结构化的思维导图。

与传统手动绘制脑图的工具不同，渐进式脑图 **从对话中自动提取知识**：与任意兼容 OpenAI 接口的大模型对话，选择想要保留的见解，AI 会生成结构化的知识图谱——并支持 **增量更新**，你的手动编辑在多次生成之间不会被覆盖。

<p align="center">
  <img src="docs/images/screenshot-chat.png" alt="聊天界面" width="800">
</p>

### 核心特色
- **AI 原生生成** — 对话 → 知识图谱，全自动提取
- **增量操作** — LLM 输出精准编辑指令而非整棵树重建
- **来源追溯** — 每个节点标注来自哪条对话消息
- **语料库系统** — 消息级/文本片段级内容筛选
- **React Flow 画布** — 拖拽重排、右键菜单、折叠展开

<p align="center">
  <img src="docs/images/screenshot-mindmap.png" alt="脑图画布" width="800">
</p>

- **可配置深度** — 3/4/5 层或自动
- **本地存储** — IndexedDB，数据完全在浏览器端
- **多厂商支持** — OpenAI / DeepSeek / Ollama / SiliconFlow 等

<p align="center">
  <img src="docs/images/screenshot-mindmap-setting.png" alt="脑图设置" width="400">
</p>

### 技术栈
React 18 · TypeScript 5.6 · Vite 6 · Tailwind v4 · shadcn/ui · Zustand 5 · @xyflow/react 12 · dagre · IndexedDB · OpenAI SDK
