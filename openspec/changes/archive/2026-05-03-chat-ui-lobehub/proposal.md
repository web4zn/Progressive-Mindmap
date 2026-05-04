## Why

当前 LLM 聊天界面功能完整但视觉上缺乏精致感：布局在不同状态下（无提供商/无会话/有会话）发生页面级跳变，消息展示缺少头像和视觉层次，全站使用 emoji 而非统一图标，整体风格与 LobeHub 等现代 LLM 聊天应用有较大差距。同时，用户首次进入时看到空白页面而非对话窗口，体验割裂。本次变更专注于 UI/UX 全面升级，目标是让界面接近 LobeHub 的设计品质，同时确保首次进入时始终展示完整的聊天界面框架。

## What Changes

- **布局重构**：侧边栏 + 聊天区 + 输入栏始终渲染，不再根据有无提供商/会话做页面级条件切换；空状态嵌入聊天内容区内部
- **品牌化空状态**：新建 EmptyState 组件，无提供商时展示品牌欢迎卡片（图标、标题、描述、CTA、流行模型推荐）
- **图标体系统一**：全站所有 emoji 图标（⚙️✏️🗑️⬇️☰✕等）替换为 Lucide React 图标组件
- **消息气泡重构**：增加圆形头像（User/AI）、改进间距和悬停操作栏、添加消息出现动画
- **内容区居中**：聊天内容限制 max-w-3xl 居中显示，提升阅读舒适度
- **侧边栏美化**：深色/半透明背景、更好的选中态高亮、图标驱动的操作按钮
- **输入栏美化**：Lucide 图标发送按钮、更好的视觉样式
- **动画系统**：消息出现动画、流式输出指示器改进、过渡动画
- **全局样式增强**：滚动条美化、渐变工具类、微交互动画

## Capabilities

### New Capabilities
- `brand-identity`: 视觉设计系统 — 颜色、排版、间距、图标、动画规范，确保全站视觉一致性

### Modified Capabilities
- `chat-interface`: 消息气泡增加头像、布局改为居中内容区、输入栏样式升级、空状态由页面级改为内嵌卡片
- `conversation-management`: 侧边栏视觉彻底重做（深色背景、图标操作、选中态、暗色主题适配）

## Impact

- **src/features/chat/ChatPage.tsx** — 重写条件渲染逻辑，始终渲染完整布局框架
- **src/features/chat/MessageBubble.tsx** — 重构，增加 Avatar 和动画
- **src/features/chat/MessageList.tsx** — 修改，内容区居中
- **src/features/chat/MessageInput.tsx** — 修改，Lucide 图标
- **src/features/chat/ModelSelector.tsx** — 修改，Lucide 图标
- **src/features/conversation/ConversationSidebar.tsx** — 重构，深色背景 + Lucide 图标
- **src/index.css** — 追加动画 keyframes、样式工具类
- **src/components/Avatar.tsx** — 新建
- **src/components/EmptyState.tsx** — 新建
- **lucide-react** — 已安装，无需新增依赖
- **无后端/API/存储层变更**
