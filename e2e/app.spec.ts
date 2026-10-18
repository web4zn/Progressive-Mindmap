import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'

/**
 * Boot smoke for the Electron app: the built `out/` bundle is loaded via
 * `electron .`. Requires `npm run build` beforehand.
 *
 * `ELECTRON_RUN_AS_NODE` is stripped from the child environment: when it is set
 * (some IDE/sandbox environments set it globally) Electron runs as plain Node,
 * rejects Chromium switches and cannot be driven.
 */
let app: ElectronApplication
let page: Page
const pageErrors: string[] = []

function electronEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value
  }
  env['E2E'] = '1'
  return env
}

test.beforeAll(async () => {
  // GitHub's Linux runners restrict the Chromium SUID sandbox; the app itself
  // is unaffected, so the smoke test opts out on CI only.
  const args = ['.']
  if (process.env['CI']) args.push('--no-sandbox')

  app = await electron.launch({
    args,
    cwd: process.cwd(),
    env: electronEnv(),
  })
  page = await app.firstWindow()
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app?.close()
})

test('boots the chat shell', async () => {
  await expect(page).toHaveTitle(/Progressive/i)
  await expect(page.locator('#root')).toBeVisible()
  // A fresh profile shows the "configure a provider" welcome state until the
  // seeded default provider rehydrates; both states are the chat shell.
  await expect(page.getByText(/欢迎使用 LLM Chat|开始新对话|输入消息/).first()).toBeVisible()
})

test('exposes the preload bridge', async () => {
  const apiType = await page.evaluate(() => typeof (window as unknown as { api?: unknown }).api)
  expect(apiType).toBe('object')
})

test('renders without uncaught errors', async () => {
  expect(pageErrors).toEqual([])
})
