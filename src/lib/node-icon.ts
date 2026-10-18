/**
 * Stage A1 — node icon selection.
 *
 * Returns a Lucide icon *component name* (not the component itself) so the
 * FlowNode renderer can look it up via a static map. This keeps the data
 * layer free of React imports and lets us unit-test the selection logic
 * with plain string assertions.
 *
 * Patterns:
 * - `auto`       → null (no icon)
 * - `tech`       → Zap
 * - `pros-cons`  → Scale
 * - `5w1h`       → keyword match against the label (中文 + 英文)
 *                  Who / What / When / Where / Why / How
 */

export type NodeIconName =
  | null
  | 'User'
  | 'HelpCircle'
  | 'Lightbulb'
  | 'MapPin'
  | 'Clock'
  | 'CircleHelp'
  | 'Zap'
  | 'Scale'
  | 'Circle'

export interface NodeIconInput {
  pattern: string
  label: string
}

interface IconRule {
  icon: Exclude<NodeIconName, null>
  keywords: readonly string[]
}

const W_RULES: readonly IconRule[] = [
  // Who
  { icon: 'User', keywords: ['who', '人物', '角色', '用户', '人', '作者', '谁'] },
  // What
  { icon: 'Lightbulb', keywords: ['what', '什么', '主题', '概念', '定义', '内容'] },
  // When
  { icon: 'Clock', keywords: ['when', '时间', '日期', '何时', '年代', '年', '月', '日'] },
  // Where
  { icon: 'MapPin', keywords: ['where', '地点', '位置', '哪里', '场景', '环境'] },
  // Why
  { icon: 'HelpCircle', keywords: ['why', '原因', '理由', '动机', '为何', '因为', '所以'] },
  // How
  { icon: 'CircleHelp', keywords: ['how', '如何', '怎么', '方法', '步骤', '过程', '方式'] },
]

export function selectNodeIcon({ pattern, label }: NodeIconInput): NodeIconName {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return null

  switch (pattern) {
    case 'tech':
      return 'Zap'
    case 'pros-cons':
      return 'Scale'
    case '5w1h': {
      for (const rule of W_RULES) {
        for (const kw of rule.keywords) {
          if (normalized.includes(kw.toLowerCase())) {
            return rule.icon
          }
        }
      }
      // No keyword hit → neutral circle dot
      return 'Circle'
    }
    case 'auto':
    default:
      return null
  }
}
