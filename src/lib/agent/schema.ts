import { z } from 'zod'

/**
 * Zod schema for a single mindmap operation.
 *
 * Validates the structure of each operation before it reaches applyOperations().
 * This is the data integrity gate — LLM output is untrusted.
 */
export const MindmapOperationSchema = z.object({
  type: z.enum(['add_child', 'update', 'delete_leaf', 'add_root']),
  parentId: z.string().optional(),
  nodeId: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  contentType: z.enum(['text', 'html']).optional(),
  patch: z
    .object({
      label: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      contentType: z.enum(['text', 'html']).optional(),
    })
    .optional(),
})

/**
 * Array of mindmap operations, capped at 10.
 *
 * The LLM should not attempt to batch more than 10 operations in a single call.
 * If more are needed, the ReAct loop will make multiple generateMindmapOps calls.
 */
export const OperationsArraySchema = z
  .array(MindmapOperationSchema)
  .max(10, '每次最多 10 个操作，请拆分为多次调用')

/** Inferred type of a parsed mindmap operation */
export type ValidatedMindmapOperation = z.infer<typeof MindmapOperationSchema>

/** Inferred type of a parsed operations array */
export type ValidatedOperationsArray = z.infer<typeof OperationsArraySchema>

/**
 * Validate raw operations from LLM output.
 * Returns the parsed result or a descriptive error.
 */
export function validateOperations(raw: unknown): {
  success: true
  data: ValidatedOperationsArray
} | {
  success: false
  error: string
} {
  const result = OperationsArraySchema.safeParse(raw)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues = result.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  return { success: false, error: `操作校验失败:\n${issues}` }
}
