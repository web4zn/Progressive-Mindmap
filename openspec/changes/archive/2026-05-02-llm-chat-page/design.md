## Context

本项目为全新项目（greenfield），当前无任何前端代码。用户需要一个与大语言模型交互的问答页面，核心需求是支持自定义模型提供商，避免供应商锁定。项目无后端依赖，所有数据存储在浏览器本地。

当前状态：
- 无前端框架选型
- 无现有组件或设计系统
- 无后端服务，LLM API 调用由前端直连

## Goals / Non-Goals

**Goals:**
- 提供流畅的多轮对话体验，支持流式输出
- 用户可自由配置任意 OpenAI 兼容 API 的模型提供商
- 会话和配置数据持久化在浏览器本地
- 现代化 SPA 架构，响应式设计适配桌面和平板

**Non-Goals:**
- 不做多用户认证/授权（单用户本地应用）
- 不做后端代理/中转服务（前端直连 LLM API）
- 不支持非 OpenAI 兼容协议的提供商（如原生 Anthropic API）
- 不做插件/工具调用（function calling）系统
- 不做模型微调或训练相关功能

## Decisions

### D1: 前端框架选型 — React + TypeScript + Vite

**选择**: React 18 + TypeScript + Vite

**理由**: React 生态最成熟，LLM 聊天相关组件库（如 ai-sdk、react-markdown）均首选支持 React。TypeScript 提供类型安全。Vite 开发体验优秀，HMR 快速。

**备选**:
- Vue 3: 同样成熟，但 LLM 生态支持稍弱
- Svelte: 包体积小，但生态和组件库不够丰富
- Next.js: SSR/SSG 不适用于纯前端本地应用，增加不必要的复杂度

### D2: LLM API 通信 — OpenAI SDK + 自定义 base URL

**选择**: 使用 `openai` npm 包作为客户端，通过 `baseURL` 参数适配任何 OpenAI 兼容端点

**理由**: OpenAI 的 Chat Completions API 已成为事实标准（通义千问、DeepSeek、Ollama、vLLM 等均兼容）。使用官方 SDK 可获得类型安全和流式支持，无需自行封装 SSE 解析。

**备选**:
- 自定义 fetch 封装: 更灵活但需自行处理 SSE、错误重试、类型定义
- LangChain: 过度抽象，对简单聊天场景太重

### D3: 状态管理 — Zustand

**选择**: Zustand 作为全局状态管理

**理由**: 轻量（~1KB API surface），无 boilerplate，原生支持持久化中间件（zustand/middleware 的 persist），完美适配对话历史和提供商配置的持久化需求。

**备选**:
- Redux Toolkit: 成熟但 boilerplate 较多，对此规模项目过重
- Jotai: 原子化状态，但在对话历史等关联数据管理上不如 Zustand 直观
- React Context: 无法高效处理频繁的流式更新，会导致不必要的重渲染

### D4: 样式方案 — Tailwind CSS

**选择**: Tailwind CSS + shadcn/ui 组件库

**理由**: Tailwind 的 utility-first 方式开发速度快，与 shadcn/ui 配合可快速构建专业 UI。shadcn/ui 提供 Dialog、DropdownMenu、ScrollArea 等聊天场景常用组件。

**备选**:
- CSS Modules: 需要更多自定义样式工作，缺少预构建组件
- Ant Design: 组件丰富但定制性差，聊天场景需要大量样式覆盖
- Radix UI (无 shadcn): 需要自行设计样式系统

### E5: 数据持久化 — IndexedDB via idb + Zustand persist

**选择**: 使用 `idb` 库操作 IndexedDB，通过 Zustand persist 中间件自动持久化状态

**理由**: localStorage 有 5MB 限制，对话历史很容易超限。IndexedDB 容量几乎无限制，且支持结构化数据存储。`idb` 提供简洁的 Promise API。Zustand persist 中间件可直接适配 IndexedDB storage。

**备选**:
- 纯 localStorage: 5MB 限制不可接受
- Dexie.js: 功能更全但对简单 CRUD 场景偏重
- OPFS: 浏览器支持尚不完善

### D6: Markdown 渲染 — react-markdown + remark-gfm + rehype-highlight

**选择**: react-markdown 作为渲染核心，配合 remark-gfm 支持 GFM 扩展，rehype-highlight 支持代码高亮

**理由**: react-markdown 是 React 生态标准 Markdown 渲染方案，插件生态丰富，SSR 友好（虽然本项目不需要），轻量且可定制。

### D7: 代码架构 — Feature-based 目录结构

**选择**: 按功能模块组织代码，而非按技术角色

```
src/
  features/
    chat/          # 对话界面
    provider/      # 提供商管理
    conversation/  # 会话管理
  components/      # 共享 UI 组件
  lib/             # 工具函数、SDK 客户端
  stores/          # Zustand stores
  types/           # 全局类型定义
```

**理由**: Feature-based 结构让每个功能模块内聚，易于独立开发和维护。避免按技术角色（components/hooks/utils）组织导致的跨目录跳转。

## Risks / Trade-offs

- **[API 密钥安全]** API 密钥存储在浏览器 IndexedDB 中，存在 XSS 攻击风险 → 采用 Content-Security-Policy 头，不在密钥输入框使用 autocomplete，存储时考虑使用加密（如 Web Crypto API）
- **[CORS 限制]** 部分提供商 API 可能不支持浏览器直连（CORS） → 文档说明需使用支持 CORS 的端点，或提供代理配置指引；优先支持已知 CORS 友好的提供商
- **[流式输出中断]** 网络不稳定时 SSE 连接可能中断 → 实现自动重试机制，保留已接收的 partial 内容，提供"重新生成"选项
- **[IndexedDB 兼容性]** 隐私模式下部分浏览器限制 IndexedDB → 检测可用性，降级到 localStorage（限制对话历史条数）
- **[包体积]** shadcn/ui + react-markdown + openai SDK 可能导致初始包较大 → 使用代码分割，提供商管理页面懒加载，Markdown 渲染组件动态 import
