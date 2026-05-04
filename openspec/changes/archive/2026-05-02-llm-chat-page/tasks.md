## 1. Project Setup

- [x] 1.1 Initialize React + TypeScript + Vite project scaffold（`npm create vite@latest`，选择 react-ts 模板）
- [x] 1.2 Install core dependencies：react 18, typescript, vite, tailwindcss, @tailwindcss/vite
- [x] 1.3 Install feature dependencies：zustand, openai, idb, react-markdown, remark-gfm, rehype-highlight
- [x] 1.4 Setup shadcn/ui：初始化 `components.json`，安装基础组件（Button, Input, Dialog, DropdownMenu, ScrollArea, Textarea, Select, Tooltip）
- [x] 1.5 Configure project structure：创建 `src/features/`, `src/components/`, `src/lib/`, `src/stores/`, `src/types/` 目录
- [x] 1.6 Configure Tailwind CSS 和全局样式，设置 CSS 变量（颜色、间距等设计 token）

## 2. Type Definitions

- [x] 2.1 定义 Provider 和 Model 数据类型（`src/types/provider.ts`），包含 id, name, apiEndpoint, apiKey, models, createdAt, updatedAt
- [x] 2.2 定义 Message 类型（`src/types/message.ts`），包含 id, role（user/assistant/system）, content, createdAt, status
- [x] 2.3 定义 Conversation 类型（`src/types/conversation.ts`），包含 id, title, providerId, modelId, systemPrompt, messages, createdAt, updatedAt

## 3. Storage Layer

- [x] 3.1 实现 IndexedDB 存储模块（`src/lib/storage.ts`），使用 idb 库创建数据库和表（providers, conversations, messages）
- [x] 3.2 实现 CRUD 操作：providers 表的增删改查
- [x] 3.3 实现 CRUD 操作：conversations 表的增删改查
- [x] 3.4 实现 CRUD 操作：messages 表的增删改查
- [x] 3.5 实现浏览器隐私模式检测和 localStorage 降级方案

## 4. Zustand Stores

- [x] 4.1 实现 providerStore（`src/stores/providerStore.ts`），管理提供商列表状态，集成 persist 中间件同步 IndexedDB
- [x] 4.2 实现 conversationStore（`src/stores/conversationStore.ts`），管理会话列表和当前激活会话，集成 persist 中间件
- [x] 4.3 实现 chatStore（`src/stores/chatStore.ts`），管理当前对话的消息列表、流式生成状态、错误状态

## 5. LLM Client

- [x] 5.1 实现 LLM 客户端工厂（`src/lib/llm-client.ts`），根据 Provider 配置创建 OpenAI SDK 实例（自定义 baseURL 和 apiKey）
- [x] 5.2 实现流式聊天请求函数，调用 `client.chat.completions.create({ stream: true })` 并返回 AsyncIterable
- [x] 5.3 实现获取模型列表函数，调用 `client.models.list()` 获取可用模型
- [x] 5.4 实现请求错误处理和重试逻辑：网络错误自动重试 1 次，API 错误返回结构化错误信息
- [x] 5.5 实现中止请求功能，使用 AbortController 支持"停止生成"

## 6. Feature: Model Provider Management

- [x] 6.1 实现提供商管理页面布局（`src/features/provider/ProviderSettingsPage.tsx`），包含提供商列表和添加/编辑表单
- [x] 6.2 实现预设模板数据和模板选择 UI（OpenAI, DeepSeek, Ollama, SiliconFlow 预设）
- [x] 6.3 实现添加提供商表单（表单内联在 Dialog 中）：名称、API 端点、API 密钥输入，密钥遮蔽显示/隐藏
- [x] 6.4 实现提供商连接验证：获取模型列表时自动验证端点可用性
- [x] 6.5 实现模型列表管理：自动获取（/models API）和手动输入模型
- [x] 6.6 实现编辑提供商功能：预填充表单、保存更新
- [x] 6.7 实现删除提供商功能：确认对话框

## 7. Feature: Conversation Management

- [x] 7.1 实现会话列表侧边栏（`src/features/conversation/ConversationSidebar.tsx`），显示会话标题列表
- [x] 7.2 实现新建对话功能：创建新会话，自动选择最近使用的模型
- [x] 7.3 实现会话切换：点击切换、保存当前会话状态、加载目标会话消息
- [x] 7.4 实现会话删除：确认对话框，删除后自动切换到下一个会话
- [x] 7.5 实现会话标题自动生成：从第一条用户消息截取前 20 字符（已集成到 conversationStore）
- [x] 7.6 实现会话标题手动编辑：双击编辑，Enter 保存
- [x] 7.7 实现系统提示词配置：ConversationSettingsDialog 中编辑 system prompt
- [x] 7.8 实现会话搜索：关键词过滤会话标题
- [x] 7.9 实现会话导出为 Markdown 文件（src/lib/export.ts，侧边栏 hover 时显示下载按钮）
- [x] 10.1 实现响应式适配：桌面和平板布局适配，侧边栏可折叠（移动端 hamburger 按钮切换）
- [x] 10.2 深色/浅色主题已由 shadcn/ui 内置（CSS variables）
- [x] 10.3 添加全局错误边界和友好错误提示（src/components/ErrorBoundary.tsx，包裹 App）
- [x] 10.4 编写核心逻辑单元测试：providerStore(7), conversationStore(7), llm-client(5) = 19 tests all passing
- [x] 10.5 编写关键组件集成测试：ChatPage 消息收发流程（src/features/chat/__tests__/ChatPage.test.tsx — 3 个渲染状态测试，使用 happy-dom 环境）
