## Why

用户需要一个与大语言模型（LLM）进行交互问答的界面。当前项目缺乏任何前端页面和 LLM 集成能力，无法让用户直接体验 AI 对话。同时，不同用户对模型提供商有不同偏好（OpenAI、Anthropic、本地模型等），因此必须支持自定义模型提供商，避免被单一供应商锁定。

## What Changes

- 新增 LLM 问答页面，支持多轮对话、流式输出、Markdown 渲染
- 新增模型提供商管理功能，用户可添加、编辑、删除自定义提供商配置（API 端点、密钥、模型列表）
- 新增对话历史管理，支持创建多个会话、切换会话、删除会话
- 新增系统提示词配置，用户可为每个会话设定系统角色
- 提供商配置持久化存储（localStorage / IndexedDB），无需后端

## Capabilities

### New Capabilities
- `chat-interface`: 对话界面 — 消息输入、多轮对话展示、流式输出渲染、Markdown 支持
- `model-provider`: 模型提供商管理 — 添加/编辑/删除自定义提供商、API 密钥管理、模型选择、OpenAI 兼容协议适配
- `conversation-management`: 会话管理 — 创建/切换/删除会话、对话历史持久化、系统提示词配置

### Modified Capabilities
<!-- 无既有能力需要修改 -->

## Impact

- 前端：新增 3 个核心页面/组件模块（聊天界面、提供商设置、会话列表）
- 依赖：需引入 LLM API 客户端库（如 openai SDK 或自定义 fetch 封装）、Markdown 渲染库、可能需要状态管理方案
- API：前端直连用户配置的 LLM API 端点（OpenAI 兼容格式），无需自建后端
- 存储：使用浏览器本地存储保存提供商配置和对话历史
