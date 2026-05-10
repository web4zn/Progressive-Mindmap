## ADDED Requirements

### Requirement: Operations are validated before application

The system SHALL validate all mindmap operations using Zod schema BEFORE calling `applyOperations()`.

```typescript
import { z } from 'zod'

export const MindmapOperationSchema = z.object({
  type: z.enum(['add_child', 'update', 'delete_leaf', 'add_root']),
  parentId: z.string().optional(),
  nodeId: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  summary: z.string().optional(),
  patch: z.object({
    label: z.string().optional(),
    summary: z.string().optional(),
  }).optional(),
})

export const OperationsArraySchema = z
  .array(MindmapOperationSchema)
  .max(10, '每次最多 10 个操作')
```

The validation SHALL be performed in the `generateMindmapOps` tool handler in `agent-tools.ts`.

#### Scenario: Valid operations pass validation
- **WHEN** `generateMindmapOps` receives `{ operations: [{ type: 'add_child', parentId: 'n1a2b3c', label: 'TypeScript' }] }`
- **THEN** `OperationsArraySchema.safeParse()` SHALL return `success: true`
- **THEN** the operations SHALL be applied to the mindmap

#### Scenario: Invalid type is rejected
- **WHEN** `generateMindmapOps` receives `{ operations: [{ type: 'invalid_type' }] }`
- **THEN** `safeParse()` SHALL return `success: false`
- **THEN** the tool SHALL return `{ error: '操作校验失败: ...', success: false }`
- **THEN** the mindmap SHALL NOT be modified

#### Scenario: Missing required label on add_child is rejected
- **WHEN** `generateMindmapOps` receives `{ operations: [{ type: 'add_child', parentId: 'n1a2b3c' }] }` (no label)
- **THEN** validation SHALL succeed (label is optional in schema, the apply engine handles default)
- **THEN** the node SHALL be created with default label

#### Scenario: Numeric IDs are rejected
- **WHEN** `generateMindmapOps` receives `{ operations: [{ type: 'add_child', id: '1', label: 'X' }] }`
- **THEN** validation SHALL succeed (Zod doesn't check semantics — the apply engine rejects id='1')
- **THEN** the operation SHALL be applied with the ID as-is (id validation is a future enhancement)

#### Scenario: Operations exceed maximum
- **WHEN** `generateMindmapOps` receives 15 operations in one call
- **THEN** `OperationsArraySchema.safeParse()` SHALL return `success: false`
- **THEN** the error message SHALL indicate the operations count exceeded 10

### Requirement: Validation errors are surfaced to the Agent

When Zod validation fails, the error SHALL be returned to the Worker so the ReAct loop can retry with corrected input.

#### Scenario: Agent retries after validation error
- **WHEN** the ReActRunner receives a validation error from `generateMindmapOps`
- **THEN** the error SHALL be injected into the LLM conversation as a tool result
- **THEN** the LLM SHALL have the opportunity to correct its output in the next ReAct step
