# Contributing to Progressive Mindmap

Welcome! 🎉 Thanks for your interest in contributing. Progressive Mindmap is an Electron desktop app that combines LLM chat with AI-powered mindmap generation, and we'd love your help making it better.

## Getting Started

```bash
git clone https://github.com/web4zn/progressive-mindmap.git
cd progressive-mindmap
npm ci
npm run dev        # starts the Electron app
```

`npm run dev` opens the Electron window directly (main + preload + renderer). The renderer is served by Vite with HMR at `http://localhost:5173`, but the window is the application entry point.

## Development Workflow

| Command                                           | What it does                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                     | Start the Electron app via `electron-vite dev` (main + preload + renderer with HMR) |
| `npm run build`                                   | `npm run typecheck` + `electron-vite build` → `out/{main,preload,renderer}`         |
| `npm run build:win` / `build:mac` / `build:linux` | Package platform installers into `release/${version}`                               |
| `npm run typecheck`                               | Dual `tsc` check: renderer (`tsc --noEmit`) + `electron/tsconfig.json`              |
| `npm test`                                        | Run Vitest unit/component tests                                                     |
| `npm run lint`                                    | ESLint over the repository                                                          |
| `npm run format`                                  | Prettier                                                                            |
| `npm run smoke:electron`                          | Main-process smoke test                                                             |

## Project Structure

```
electron/
├── main/           # Main process: window, menu, IPC, updater stub
├── preload/        # `window.api` bridge (Phase-0 scaffolding)
└── shared/         # IPC types shared by main + preload
src/
├── components/     # Shared UI components (Avatar, EmptyState, ErrorBoundary, shadcn/ui)
├── features/       # Feature modules (chat/, mindmap/, conversation/, provider/)
├── lib/            # Pure logic (llm-client, agent tools, storage, export, layout)
├── stores/         # Zustand stores (provider, conversation, mindmap, chat)
├── types/          # TypeScript type definitions
└── workers/        # WebWorker entry points (agent)
```

## Code Style

- TypeScript strict mode — no `as any`, no `// @ts-ignore`
- Follow existing patterns in similar files
- Run `npm run typecheck` before committing — must be clean (it checks both the renderer and Electron tsconfigs)
- Run `npm run lint` before committing

## Testing

Tests live in `__tests__/` directories next to the code they test:

```bash
npm test               # Run all tests
npx vitest --watch     # Watch mode during development
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add PNG export for mindmap canvas
fix: resolve IndexedDB upgrade conflict
refactor: extract layout logic to mindmap-layout.ts
docs: update README with new features
chore: update dependencies
```

## Pull Request Process

1. Fork the repo and create a feature branch off `opencode`
2. Make your changes with clear commit messages
3. Run `npm run lint`, `npm run typecheck`, and `npm test` — all must pass
4. Open a PR against `opencode` (not `main`) — link any related issues
5. A maintainer will review within a few days

First time? Look for issues tagged `good first issue` — we're happy to help!
