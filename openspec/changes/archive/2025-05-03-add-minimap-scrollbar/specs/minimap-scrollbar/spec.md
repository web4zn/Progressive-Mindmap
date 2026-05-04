## ADDED Requirements

### Requirement: Canvas minimap rendering
系统 SHALL 使用原生 `<canvas>` 元素在滚动容器右侧渲染一个抽象化的内容缩略图（minimap）。Canvas SHALL 遍历内容 DOM 中带有 `data-minimap-item` 属性的子元素，测量每个元素的 `offsetHeight` 后按比例绘制为色块。不同内容类型 SHALL 使用不同颜色区分。

#### Scenario: Chat minimap shows message blocks by role
- **WHEN** 聊天区有用户消息和 AI 消息混合
- **THEN** Canvas 上用户消息绘制为主色色块（`bg-primary`），AI 消息绘制为次级色块（`bg-muted`），色块高度与消息在 DOM 中的渲染高度成比例
- **AND** 可以通过色块颜色区分消息角色

#### Scenario: Mindmap minimap shows tree depth by brightness
- **WHEN** 导图树包含 3 层深度的嵌套节点
- **THEN** Canvas 上根节点（depth=0）色块最亮，子节点按 depth 递增递减亮度，缩进量与 DOM 中的 `paddingLeft` 成比例
- **AND** 叶节点使用最细的标记

#### Scenario: Minimap width is fixed
- **WHEN** minimap 渲染
- **THEN** Canvas 宽度为固定值（默认 40px），不随内容缩放而变化

#### Scenario: Minimap hidden when content fits
- **WHEN** 滚动内容的 `scrollHeight` 小于等于 `clientHeight * 1.2`
- **THEN** minimap 不渲染（隐藏），因为内容无需滚动

### Requirement: DOM measurement via data attributes
系统 SHALL 通过 `data-minimap-item` 属性标记内容中需要被 minimap 测量的 DOM 元素。Canvas SHALL 在绘制前遍历所有 `[data-minimap-item]` 元素并读取 `offsetHeight` 计算色块高度。

#### Scenario: MessageList provides data-minimap-item markers
- **WHEN** MessageList 渲染消息列表
- **THEN** 每条消息的外层 wrapper SHALL 带有 `data-minimap-item="user"` 或 `data-minimap-item="assistant"` 属性

#### Scenario: MindMapTree provides data-minimap-item markers
- **WHEN** MindMapTree 渲染树节点
- **THEN** 每个 TreeNode 的根 div SHALL 带有 `data-minimap-item="depth-N"` 属性，其中 N 为节点深度

### Requirement: Viewport overlay
系统 SHALL 在 Canvas minimap 上绘制一个半透明覆盖层，标识当前可视区域在整体内容中的位置。覆盖层 SHALL 随滚动位置实时更新。

#### Scenario: Overlay reflects scroll position
- **WHEN** 用户在滚动容器中向下滚动到 50% 的位置
- **THEN** minimap Canvas 上的覆盖层位于 Canvas 的 50% 位置，高度与可视区域占内容总高度的比例一致

#### Scenario: Overlay updates during smooth scroll
- **WHEN** 系统执行平滑滚动（如 `scrollTo({ behavior: 'smooth' })`）
- **THEN** 覆盖层在滚动动画期间持续更新位置，动画结束后定位到最终位置

### Requirement: Scroll synchronization from content to minimap
系统 SHALL 监听滚动容器的 `scroll` 事件，将滚动位置映射为 minimap 覆盖层的位置和高度。映射为线性：`overlayTop = (scrollTop / scrollHeight) × canvasHeight`。

#### Scenario: User scrolls with mouse wheel
- **WHEN** 用户在滚动容器中使用鼠标滚轮向下滚动
- **THEN** minimap 覆盖层的垂直位置同步向下移动
- **AND** 覆盖层高度始终反映可视区域比例

#### Scenario: User scrolls with keyboard
- **WHEN** 用户使用键盘（PageDown、ArrowDown 等）滚动内容
- **THEN** minimap 覆盖层位置同步更新

### Requirement: Click navigation from minimap to content
系统 SHALL 允许用户点击 Canvas minimap 上的位置来快速跳转滚动内容。点击位置 SHALL 通过线性映射计算对应的 `scrollTop` 值：`scrollTop = (clickY / canvasHeight) × scrollHeight - clientHeight / 2`。

#### Scenario: User clicks minimap to jump
- **WHEN** 用户在 minimap 上距顶部 30% 的位置点击
- **THEN** 滚动容器滚动到内容 30% 的位置
- **AND** 滚动使用 instant 行为（无动画跳转）

### Requirement: Drag navigation from minimap to content
系统 SHALL 允许用户在 Canvas minimap 上按住鼠标拖拽来连续滚动内容。拖拽映射 SHALL 为线性（与点击相同）。拖拽期间 SHALL 暂停 MessageList 的自动滚动行为（如适用），拖拽结束 2 秒后恢复。

#### Scenario: User drags minimap
- **WHEN** 用户在 Canvas minimap 上按住鼠标并向下拖拽
- **THEN** 滚动容器跟随拖拽位置连续滚动
- **AND** 拖拽期间 MessageList 的 autoScroll 被暂停

#### Scenario: Auto-scroll resumes after drag
- **WHEN** 用户在 minimap 上完成拖拽并释放鼠标
- **THEN** 2 秒后 MessageList 的 autoScroll 行为恢复检测

### Requirement: Content change detection
系统 SHALL 在滚动内容发生变化时自动重绘 Canvas minimap。内容变化包括：DOM 节点增删（新消息到达、节点展开/折叠）、内容高度变化（消息流式增长）。重绘 SHALL 通过 `ResizeObserver` 和 `MutationObserver`（debounced 200ms）触发。

#### Scenario: New message appends to chat
- **WHEN** 聊天区收到新的用户消息或 AI 回复并渲染到 DOM
- **THEN** Canvas minimap 自动重绘，新消息对应色块在 minimap 底部出现

#### Scenario: Tree node expands or collapses
- **WHEN** 用户在思维导图树中展开或折叠一个节点
- **THEN** Canvas minimap 自动重绘，展开后子节点色块在 minimap 上可见

#### Scenario: Streaming content grows
- **WHEN** AI 回复正在流式输出，内容高度持续增长
- **THEN** Canvas minimap 在合理频率下（不超过每 200ms 一次）重绘色块，避免过度绘制

### Requirement: Minimap integration in MessageList
系统 SHALL 在 `MessageList` 组件中集成 minimap。MessageList 的布局 SHALL 为 flex row（`flex absolute inset-0`），内容区占 flex-1，minimap 固定在右侧。每条消息的外层 wrapper SHALL 带有 `data-minimap-item` 属性标记角色。现有的消息自动滚动行为（autoScroll）SHALL 保持不变。

#### Scenario: MessageList layout with minimap
- **WHEN** 聊天区有任何消息且内容超出可视区域
- **THEN** 消息列表右侧显示 Canvas minimap，消息内容区正常显示

#### Scenario: Auto-scroll still works with minimap
- **WHEN** 新的 AI 回复开始流式输出且用户在消息列表底部
- **THEN** 消息列表自动滚动到底部，minimap 覆盖层同步移动到底部
- **AND** 现有"滚动到最新"按钮行为不受影响

### Requirement: Minimap integration in MindMapTree
系统 SHALL 在 `MindMapTree` 组件中集成 minimap。MindMapTree 的布局 SHALL 为 flex row（`flex flex-1 min-h-0`），树内容区占 flex-1，minimap 固定在右侧。每个 TreeNode 的根 div SHALL 带有 `data-minimap-item` 属性标记深度。

#### Scenario: Tree view with minimap
- **WHEN** 思维导图树内容超出面板可视区域
- **THEN** 树视图右侧显示 Canvas minimap，树内容区正常显示

#### Scenario: Minimap reflects tree depth
- **WHEN** 思维导图包含 3 层深度的嵌套节点
- **THEN** Canvas minimap 上不同深度的节点使用递减亮度的色块区分，缩进量与 DOM 层级一致
