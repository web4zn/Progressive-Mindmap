## REMOVED Requirements

### Requirement: Select conversation messages as mindmap input
**Reason**: `materialStore` 删除。语料选择不再经过暂存区，改为直接将消息加入图谱语料库。
**Migration**: 消息旁新增「加入语料库」按钮，选中文本右键「加入语料库」。

### Requirement: Material pool panel
**Reason**: `materialStore` 删除。暂存区概念不再存在。
**Migration**: 替换为图谱语料库面板（见 `mindmap-corpus` spec）。

### Requirement: Generate mindmap from selected materials
**Reason**: 生成逻辑改为从图谱语料库读取内容。
