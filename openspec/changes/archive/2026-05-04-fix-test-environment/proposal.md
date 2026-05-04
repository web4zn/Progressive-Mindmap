## Why

测试运行输出 128 条 IndexedDB 错误（happy-dom 不支持）+ 5 条 `httpstat.in` 网络错误（测试真连公网）。131 个测试全部通过，但错误输出淹没有用信息，无法判断是否有真正的失败。

同时安装 `jsdom` 和 `vitest` 的 DOM 环境依赖。

## What Changes

- `vitest.config.ts`: `environment: 'happy-dom'` → `environment: 'jsdom'`
- `src/lib/__tests__/llm-client.test.ts`: `fetchModels` 的 404 测试改为 mock，不再真连 `httpstat.in`
- `package.json`: 新增 `devDependencies` → `jsdom`

## Capabilities

### New Capabilities
<!-- 无新增 -->

### Modified Capabilities
<!-- 测试环境变更，不影响功能 specification -->

## Impact

- 修改 `vitest.config.ts`（1 行）
- 修改 `src/lib/__tests__/llm-client.test.ts`（~5 行）
- 修改 `package.json`（+1 devDep）
- 所有现有测试应继续通过，且不再产生虚假错误输出
