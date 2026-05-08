## Context

当前 `buildFullMindmapPrompt()` 无参数，总是输出相同的结构指令。需要根据脑图的 pattern 注入不同的知识组织框架。

## Goals / Non-Goals

**Goals:**
- `buildFullMindmapPrompt(pattern)` 接受 pattern 参数
- MindMap 类型增加 `pattern` 字段
- 新建脑图时可选择 pattern
- 旧数据向后兼容（无 pattern → `"auto"`）

**Non-Goals:**
- 不支持运行时切换 pattern（创建后不改变）
- 不支持自定义 pattern（仅预置四种）

## Decisions

### Decision 1: Pattern 存储在 MindMap 而非全局设置

每个脑图独立 pattern，因为不同知识域适合不同组织方式。

### Decision 2: `buildFullMindmapPrompt` 追加而非替换

```
当前 prompt（14 行）
+
[Pattern 特定指令]（1-2 行）
```

不改变现有 prompt 结构，只在末尾追加 pattern 指令。

### Decision 3: 默认值 `"auto"`

旧脑图数据无 pattern 字段时，`pattern ?? 'auto'` 保证兼容。`auto` 模式不追加任何额外指令——行为完全等价于当前版本。

### Pattern 指令内容

```
5w1h:
"请使用 5W1H 六维度组织知识结构：
- What: 概念定义和本质
- Why: 存在原因和动机
- Who: 相关人物/角色/团队
- When: 时间节点和时机
- Where: 应用场景
- How: 实现方法和步骤"

tech:
"请使用技术概念模式组织知识结构：
- 核心定义和原理
- 使用场景和典型用例
- 与同类方案的对比
- 注意事项和常见陷阱"

pros-cons:
"请使用优缺点分析模式组织知识结构：
- 优点和优势场景
- 缺点和局限性
- 适用场景判断"

auto:
不追加任何指令
```
