## 1. Visual Foundation

- [x] 1.1 创建 Avatar 组件（`src/components/Avatar.tsx`）：用户首字母蓝色背景，AI Bot 图标灰色背景，圆形 32px
- [x] 1.2 创建 EmptyState 组件（`src/components/EmptyState.tsx`）：icon/title/description/actions/footer 插槽，居中展示
- [x] 1.3 追加全局 CSS 动画（`src/index.css`）：slide-up、streaming-pulse keyframes，message-enter 工具类，滚动条美化
- [x] 1.4 全站点检索并替换 emoji 图标为 Lucide 组件（搜索 ⚙️✏️🗑️⬇️☰✕➤🔍+ 等），建立图标映射表

## 2. Layout Restructure — Always-show Shell

- [x] 2.1 重构 ChatPage 布局：去掉三个条件 return 分支，改为单一 return 中始终渲染「侧边栏 + 顶栏 + 内容区 + 输入栏」完整框架
- [x] 2.2 内容区实现条件渲染逻辑：无提供商时渲染 EmptyState 欢迎卡片 → 有提供商无会话时渲染"开始新对话"空状态 → 有会话时渲染 MessageList + MessageInput
- [x] 2.3 内容区消息列表和输入栏添加 max-w-3xl mx-auto 居中容器
- [x] 2.4 无提供商时输入栏禁用（disabled），显示引导文字"请先配置模型提供商"
- [x] 2.5 有提供商无会话时输入栏启用，placeholder 为"输入消息开始新对话..."

## 3. Empty State — Welcome Card

- [x] 3.1 实现无提供商欢迎卡片：Lucide MessageSquare 大图标、标题"欢迎使用 LLM Chat"、描述"请配置模型提供商开始 AI 对话"、CTA 按钮"配置模型提供商"
- [x] 3.2 在欢迎卡片底部添加"流行模型推荐"区域：OpenAI / DeepSeek / Ollama / SiliconFlow 四个标签（Badge 组件）
- [x] 3.3 CTA 按钮点击后跳转到提供商设置页面（setView('providers')）
- [x] 3.4 实现"开始新对话"空状态（有提供商无会话时）：Plus 图标 + "开始新对话" + 点击创建会话

## 4. Message Display Redesign

- [x] 4.1 MessageBubble 增加 Avatar 组件：用户消息右侧显示蓝色首字母头像，AI 消息左侧显示 Bot 图标灰色头像
- [x] 4.2 消息操作栏使用 Lucide 图标替换文字按钮：Copy（复制）、RefreshCw（重新生成），hover 时显示/淡出
- [x] 4.3 消息出现动画：新消息从下方 8px 滑入 + 淡入（fade-in slide-in-from-bottom-2 duration-200）
- [x] 4.4 流式输出指示器增强：从纯光标闪烁升级为脉冲波纹 + 光标组合
- [x] 4.5 减小消息气泡最大宽度（max-w-[75%] lg:max-w-[60%]），优化阅读体验

## 5. Sidebar Redesign

- [x] 5.1 侧边栏背景改为深色（light: bg-neutral-900/90 text-white, dark: bg-black/70），包括搜索区、列表区和底部按钮区
- [x] 5.2 会话操作按钮替换为 Lucide 图标：下载(Download)、重命名(Pencil)、删除(Trash2)
- [x] 5.3 新建对话按钮改用 Plus 图标 + 文字标签布局
- [x] 5.4 搜索框使用 Search 图标前缀
- [x] 5.5 激活会话项增加左侧强调条（border-l-2 border-primary）或更明显的高亮色
- [x] 5.6 底部"提供商设置"按钮改用 Settings 图标 + 文字

## 6. Input Area Refinement

- [x] 6.1 发送按钮改用 Lucide Send 图标，禁用状态和 loading 状态使用不同样式
- [x] 6.2 输入栏区域增加微妙的顶部阴影/边框分隔线，与消息列表形成视觉边界
- [x] 6.3 输入框 focus 状态增加 ring 高亮

## 7. Polish & Verification

- [x] 7.1 验证无提供商状态：布局完整、空状态正确、输入栏禁用
- [x] 7.2 验证有提供商无会话状态：空状态正确、输入栏启用
- [x] 7.3 验证有会话状态：消息正常渲染、头像显示、动画生效
- [x] 7.4 验证移动端响应式：侧边栏折叠、内容区全宽
- [x] 7.5 验证现有单元测试全部通过（npm test）
- [x] 7.6 验证 build 无报错
