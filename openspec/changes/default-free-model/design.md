## Decisions

### D1: 免费模型提供商选择

**选择**：预置 **OpenRouter**，包含多个免费模型。endpoint：`https://openrouter.ai/api/v1`。

**预置模型列表**：

| 模型 ID | 说明 |
|---------|------|
| `google/gemma-3-12b-it:free` | Google Gemma 3 12B，综合能力强 |
| `meta-llama/llama-3.3-70b-instruct:free` | Meta Llama 3.3 70B，推理强 |
| `mistralai/mistral-nemo:free` | Mistral Nemo，轻量高效 |
| `deepseek/deepseek-r1:free` | DeepSeek R1，中文推理强 |
| `qwen/qwen2.5-7b-instruct:free` | Qwen 2.5 7B，中文对话好 |

**替代方案**：
- SiliconFlow：中文好但模型单一（全是 Qwen 系）
- DeepSeek 直连：需单独注册
- Ollama 本地：需安装，非开箱即用

**决策依据**：OpenRouter 一个 key 通吃多厂商免费模型，用户无需针对每个厂商单独注册。模型列表覆盖 Google/Meta/Mistral/DeepSeek/Qwen 五大来源，中文和英文场景均覆盖。API 完全兼容 OpenAI 格式，零代码改动。

### D2: 预置提供商保护

**选择**：通过 `preset: true` 标记。删除操作检查此标记，弹 toast 提示「系统预置模型不可删除」。

**替代方案**：
- 硬编码 ID 判断：脆弱，ID 可被篡改
- 单独存储预设列表：增加复杂度

**决策依据**：数据标记方式简单可靠，与现有 Provider 数据模型最小侵入。用户仍可禁用模型（`enabled: false`），只是不能删除提供商。

### D3: 初始化时机

**选择**：ProviderStore 的 persist 恢复完成后，检查 `providers.length === 0`，若为空则注入预置提供商。

**替代方案**：
- 固定写在初始 state 中：如果用户删了预置，每次刷新都会重新注入
- 在组件层判断：逻辑分散，多个入口需要相同判断

**决策依据**：在 store 初始化阶段统一处理，只触发一次。已有用户（store 不空）完全不受影响。

### D4: 免费模型降级体验

**选择**：免费模型调用失败时，错误提示中引导用户切换其他免费模型或添加自有 API key。

**决策依据**：OpenRouter 免费模型各有速率限制（约 20 req/min 共享额度），比单提供商更灵活——A 模型限流了可切 B 模型继续用。同时提示用户可添加自有提供商获更稳定体验。
