## Context

当前 LLM 聊天应用已完成功能实现（58/58 tasks），但 UI/UX 停留在基础可用阶段。主要痛点：
- 页面级条件渲染导致布局在不同状态下跳变，用户进入时看到空白页面而非聊天窗口
- 全站使用 emoji 字符串（⚙️✏️🗑️）而非统一图标系统（lucide-react 已安装但未使用）
- 消息气泡缺乏头像、视觉层次和动画
- 内容区撑满全宽，阅读体验不佳
- 侧边栏视觉平淡，缺少 LobeHub 风格的深色/半透明质感
- 无品牌化空状态引导

## Goals / Non-Goals

**Goals:**
- 布局始终一致：侧边栏 + 聊天区 + 输入栏始终渲染，消除页面级条件切换
- 视觉接近 LobeHub 品质：深色侧边栏、居中内容区、头像、图标统一、动画
- 全站图标通过 Lucide React 组件统一，替换所有 emoji
- 品牌化空状态引导首次用户体验
- 响应式保留：移动端侧边栏折叠

**Non-Goals:**
- 不改动 Zustand stores、LLM client、storage 等逻辑层
- 不改动 ProviderSettingsPage 内部逻辑（仅入口保持一致）
- 不改动 ConversationSettingsDialog 内部逻辑
- 不引入新依赖（lucide-react 已安装）
- 不改动测试文件（现有 22 tests 应继续通过）

## Decisions

### D1: 布局架构 — 始终渲染的 App Shell

**决策**: ChatPage 去掉所有条件 return，改为单一 return 中始终渲染完整布局框架。空状态通过内容区内部组件表达，而非页面级条件分支。

```
ChatPage 渲染结构（始终）：
┌─────────────────────────────────────┐
│ TooltipProvider                      │
│ ┌─────────┬───────────────────────┐  │
│ │ Sidebar │ Header                │  │
│ │ (始终)  │ ModelSelector + 图标   │  │
│ │         ├───────────────────────┤  │
│ │         │ Content Area          │  │
│ │         │ ├─ EmptyState (条件)  │  │
│ │         │ └─ MessageList (条件) │  │
│ │         ├───────────────────────┤  │
│ │         │ Input Bar (始终)      │  │
│ └─────────┴───────────────────────┘  │
│ ConversationSettingsDialog           │
└─────────────────────────────────────┘
```

**理由**: 消除页面跳变，用户永远在同一界面框架中操作。输入栏始终可见（无提供商时禁用），传达"这是一个聊天应用"的直觉。

### D2: 图标系统 — Lucide React 全站统一

**决策**: 所有 emoji 图标替换为 lucide-react 对应组件。Icon 通过集中式映射或直接导入使用。

**映射表**:
| 当前(emoji) | 替代(Lucide) |
|---|---|
| ⚙️ | Settings |
| ✏️ | Pencil |
| 🗑️ | Trash2 |
| ⬇️ | Download |
| ☰ | PanelLeft |
| ✕ | X |
| ➤ | Send |
| 🔍 | Search |
| + | Plus |

**理由**: Lucide 图标矢量、可定制颜色/大小、视觉一致性高。已有依赖无需新增。

### D3: 内容区居中布局

**决策**: 聊天消息列表和输入栏限制 `max-w-3xl mx-auto`，在宽屏下居中显示。

**理由**: LobeHub/ChatGPT 均采用此模式。全宽消息在宽屏下阅读行过长，不利于快速扫读。居中内容区也使得侧边栏和主内容区的视觉比例更平衡。

### D4: 消息 Avatar 组件

**决策**: 新建 `Avatar.tsx` 组件，用户消息显示首字母圆形头像（蓝色系），AI 消息显示 Bot 图标（使用 Lucide `Bot` 或 `Brain` 图标）。

**视觉规格**:
- 尺寸: 28px (sm), 32px (md)
- 用户: 蓝色背景 + 白色首字母
- AI: 灰/紫背景 + Bot 图标
- 圆形 (rounded-full)

### D5: 空状态组件

**决策**: 新建 `EmptyState.tsx` 组件，可配置 icon、title、description、actions。

三种空状态用例：
- **无提供商**: 显示品牌欢迎卡片 + Lucide 大图标 + "欢迎使用 LLM Chat" + "请配置模型提供商开始对话" + CTA 按钮 + 流行模型推荐列表
- **有提供商无会话**: "开始新对话" + 新建按钮
- **搜索无结果**: "未找到匹配的对话"

### D6: 动画系统

**决策**: 基于 Tailwind 内置动画 + 自定义 keyframes。

- **消息出现**: `animate-in fade-in slide-in-from-bottom-2 duration-200` (shadcn 已有)
- **流式指示器**: 更丰富的脉冲波纹，而非简单的光标闪烁
- **侧边栏项悬停**: 背景色过渡 + 轻微缩放
- **按钮交互**: transition-all 统一

### D7: 侧边栏深色主题

**决策**: 侧边栏使用更深的背景色（`bg-sidebar` 调暗），半透明效果（如 `backdrop-blur` 可选），选中态使用强调色高亮。

**理由**: LobeHub 等现代聊天应用的侧边栏普遍采用深色/半透明风格，营造"沉浸式对话"的空间感。

## Risks / Trade-offs

- **[包体积增加]** Lucide 图标按需导入（tree-shakable），不会显著增加包体积。但如果大面积使用图标动画，可能影响渲染性能 → 使用 React.memo 包裹静态图标组件
- **[侧边栏深色 vs 系统主题]** 深色侧边栏在浅色主题下可能显得突兀 → 跟随系统主题色，light 模式下使用浅灰色而非纯深色
- **[动画过度]** 过多动画可能让用户感到眩晕或性能开销 → 所有动画控制在 200-300ms，使用 `prefers-reduced-motion` 媒体查询降级
- **[居中布局在窄屏下]** max-w-3xl 在小屏幕上自动变为全宽（Tailwind 默认行为），无需额外处理
