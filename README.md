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

> **Why I built this**: After countless conversations with LLMs, I found myself drowning in insights — brilliant answers buried in long chat histories, impossible to review or recall. I needed a way to automatically distill conversations into structured knowledge I could revisit at a glance. That's why Progressive Mindmap exists: it turns scattered Q&A into a living mindmap that grows with every conversation.

Progressive Mindmap is a **local-first web application** that transforms your LLM conversations into structured, editable mindmaps. Unlike traditional mindmap tools where you draw nodes manually, Progressive Mindmap **extracts knowledge automatically**: chat with any OpenAI-compatible LLM, select the insights you want to keep, and let the AI build a mindmap — with **incremental updates** that preserve your edits across regenerations.

<p align="center">
  <img src="docs/images/screenshot-chat.png" alt="Chat Interface" width="800">
</p>

## ✨ Features

### 🤖 AI-Native Mindmap Generation
- **Conversation to Knowledge Graph** — LLM analyzes your chats and produces structured trees
- **Incremental Operations** — AI outputs surgical edits (`add_child`, `update`, `merge`, `delete_leaf`) instead of full regeneration
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

## 🖥️ Desktop Edition (Electron)

> **Status:** Phase 0 — desktop shell only. The React UI is identical to the
> web build; no desktop-only features are exposed yet. Phase 1 will add
> native dialogs, system notifications, file persistence, auto-update, and
> tray controls on top of the IPC surface wired in Phase 0.

### Dev mode (windowed)

```bash
npm run dev           # electron-vite dev — starts main + renderer with HMR
```

The Electron window opens automatically with DevTools attached. The
React renderer is served by Vite at `http://localhost:5173` and
reloaded on save.

### Production build

```bash
npm run build                # typecheck + electron-vite build → out/{main,preload,renderer}
npm run preview              # run the production build locally
```

### Platform installers

```bash
npm run build:mac            # → release/${version}/*.dmg   (macOS only)
npm run build:win            # → release/${version}/*.exe   (NSIS installer)
npm run build:linux          # → release/${version}/*.AppImage
```

`electron-builder` reads its config from the `build` field in
`package.json`. The `buildResources` directory (`build/`) holds the
application icon and macOS entitlements.

### Platform requirements

- **macOS** — building a `.dmg` requires macOS 10.15+ with Xcode CLT
  installed. Code signing and notarisation are **not yet configured**
  (Phase 1). For local development the unsigned builds run fine after
  the first-launch "right-click → Open" gatekeeper dance.
- **Windows** — building the NSIS installer needs Windows 10+ with
  PowerShell 5.x. Code signing is **not yet configured** (Phase 1).
- **Linux** — the AppImage target runs on most modern distros. On
  Ubuntu you may need `libnss3`, `libasound2`, and a few X libraries;
  the `build-desktop.yml` CI installs them automatically.

### Architecture overview

```
electron-vite  ──► out/main/index.js          (main process, ESM)
              ──► out/preload/index.js         (preload, CJS, sandboxed)
              ──► out/renderer/index.html      (React app, identical to web build)

main  ── ipcMain.handle ──┐
                          ├──► preload ──► contextBridge ──► window.api
preload ── ipcRenderer ───┘
```

The renderer **never** has direct Node access (`nodeIntegration: false`,
`contextIsolation: true`, `sandbox: true`, `webSecurity: true`). All
privileged operations go through the typed `window.api` surface —
see `electron/preload/index.ts` and `src/types/electron.d.ts` for the
full contract.

## 🗺️ Roadmap

- [x] LLM chat with multi-provider & streaming
- [x] AI mindmap generation (full rebuild)
- [x] Incremental update operations
- [x] Corpus curation & source tracking
- [x] React Flow canvas with dagre layout
- [x] IndexedDB persistence
- [x] Real-time streaming mindmap preview during generation
- [x] PNG / SVG / Markdown export
- [x] Keyboard shortcuts
- [x] Undo / Redo
- [x] Rich content in nodes (markdown, html)
- [x] Theme system (light / dark / system)
- [ ] Multiple layout types (org chart, fishbone, timeline)
- [ ] Plugin architecture

## 🎨 Theme

The app supports three theme modes:

- **light** — default; classic neutral palette
- **dark** — uses the shadcn `oklch` dark palette + a darker FlowShell
  surface (see `[data-theme='dark']` in
  `src/components/flow-shell/css/theme.css`)
- **system** — follows `prefers-color-scheme` on first load; once
  the user toggles manually, their choice wins

The active mode persists in `localStorage` under
`progressive-mindmap:theme`. Toggle the theme from the brain-panel
toolbar (the ☀ / 🌙 button next to the background switcher; data-testid
`mindmap-theme-toggle`).

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
