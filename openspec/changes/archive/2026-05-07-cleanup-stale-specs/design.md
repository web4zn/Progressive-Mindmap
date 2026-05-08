## Context

此 change 仅涉及 `openspec/specs/` 目录的文件操作（删除过时 spec，修改 spec 文本），不涉及任何 `src/` 代码变更。无架构决策、无依赖变更、无迁移风险。

## Goals / Non-Goals

**Goals:** 使 spec 目录与 `src/` 实际代码行为一致。

**Non-Goals:** 不修改任何应用代码。

## Decisions

无需设计决策。直接执行文件删除和 spec 文本编辑。

## Risks / Trade-offs

无。删除的 spec 不对应任何实际代码功能，保留它们会产生误导。
