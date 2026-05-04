# Contributing to Progressive Mindmap

Welcome! 🎉 Thanks for your interest in contributing. Progressive Mindmap combines LLM chat with AI-powered mindmap generation, and we'd love your help making it better.

## Getting Started

```bash
git clone https://github.com/web4zn/progressive-mindmap.git
cd progressive-mindmap
npm install
npm run dev        # → http://localhost:5173
```

## Development Workflow

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm test` | Run Vitest unit/component tests |
| `npx tsc --noEmit` | Check types without emitting files |

## Project Structure

```
src/
├── components/     # Shared UI components (Avatar, ErrorBoundary, shadcn/ui)
├── features/       # Feature modules (chat/, mindmap/, conversation/, provider/)
├── lib/            # Pure logic (llm-client, mindmap-generator, storage, export)
├── stores/         # Zustand stores (provider, conversation, mindmap, chat)
└── types/          # TypeScript type definitions
```

## Code Style

- TypeScript strict mode — no `as any`, no `// @ts-ignore`
- Follow existing patterns in similar files
- Run `npx tsc --noEmit` before committing — must be clean

## Testing

Tests live in `__tests__/` directories next to the code they test:

```bash
npm test            # Run all tests
npx vitest --watch  # Watch mode during development
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

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Run `npm test` and `npx tsc --noEmit` — both must pass
4. Open a PR to `main` — link any related issues
5. A maintainer will review within a few days

First time? Look for issues tagged `good first issue` — we're happy to help!
