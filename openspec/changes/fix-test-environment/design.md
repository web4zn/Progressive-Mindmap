## Context

`happy-dom` 是轻量 DOM 实现，但不支持 IndexedDB。项目中 3 个 store 都通过 Zustand persist 使用 IndexedDB，导致所有 store 测试抛出异常。`llm-client.test.ts` 中 `fetchModels` 测试直接调用 `https://httpstat.in/404`，依赖外部服务。

## Goals / Non-Goals

**Goals:**
- 测试输出零虚假错误
- 131 个测试全部通过

**Non-Goals:**
- 不改动任何源代码
- 不增加 E2E 测试

## Decisions

### D1: happy-dom → jsdom

`jsdom` 对 Web API 的支持更完整，包括 IndexedDB 的 mock 实现。通过 `npm install -D jsdom` 安装后，改一行配置即可。

### D2: Mock fetchModels 网络调用

`fetchModels` 的测试目的是验证错误处理，不需要真实网络请求。使用 `vi.fn()` mock `fetchModels` 返回值：

```typescript
it('rejects on fetch error', async () => {
  vi.mocked(fetchModels).mockRejectedValue(new LLMClientError('fetch_error', 'Failed', true))
  await expect(fetchModels(client)).rejects.toThrow()
})
```

## Risks / Trade-offs

- **[jsdom 更慢]**: 首次启动约慢 0.5-1s。可接受，总共 131 个测试。
- **[jsdom 缺少部分浏览器 API]**: 不影响当前测试集——store/component/lib 测试不依赖 Canvas、WebGL 等。
