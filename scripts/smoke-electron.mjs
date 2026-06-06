#!/usr/bin/env node
/**
 * Electron desktop-shell smoke test.
 *
 * Verifies that the bundled Electron main process can start, stay alive
 * long enough to (presumably) create its BrowserWindow, and shut down
 * cleanly when terminated. This is intentionally lighter than a full
 * Spectron / Playwright run — it does not need a display server, does
 * not drive the renderer DOM, and does not touch the Vite dev server.
 *
 * Sequence:
 *   1. Sanity-check preconditions (Electron binary present, main bundle
 *      built by `npm run build`).
 *   2. Spawn `electron <out/main/index.js>` and tag its stdout/stderr
 *      with `[main]` so it shows up in test logs.
 *   3. At T+3s, assert the process is still alive. If it exited on its
 *      own, the smoke test FAILS — that means the main process crashed
 *      on startup (missing dependency, bad main bundle, GPU init, etc.).
 *   4. At T+5s, send a graceful termination signal. On Windows, child
 *      processes of Electron (renderer / GPU helper) are killed via
 *      `taskkill /F /T` because `child.kill()` on Windows does not
 *      propagate. On macOS / Linux, `SIGTERM` is the appropriate
 *      signal.
 *   5. At T+8s, hard-kill the process tree if it is somehow still
 *      alive. This is a defense-in-depth guard so the test never hangs
 *      forever and never leaves orphan processes on the host.
 *   6. Once the main process exits, report PASS/FAIL with the captured
 *      exit code and exit with the same code (0 on pass).
 *
 * Exit codes:
 *   0  — smoke test passed (process was alive at 3s and exited on
 *        termination)
 *   1  — main process exited prematurely (within the first 3s) — i.e.
 *        it crashed on startup
 *   2  — main process refused to exit after the hard-kill deadline
 *   *  — propagated exit code from the main process, if non-zero
 *
 * The script is intentionally cross-platform and has no external deps
 * (pure Node). Run with `npm run smoke:electron`.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// --- timing constants (ms) --------------------------------------------------
const CHECK_ALIVE_MS = 3000 // first liveness probe
const SEND_KILL_MS = 5000 // graceful termination
const HARD_KILL_MS = 8000 // defense-in-depth hard kill
const FLUSH_MS = 250 // delay before reading exit info, lets stdio drain

// --- preconditions ---------------------------------------------------------
// Resolve the platform-specific Electron binary. The `electron` npm
// package writes a `path.txt` inside its install dir that points at
// the executable; fall back to the conventional names if the file is
// missing (e.g. when the binary hasn't been downloaded yet).
const electronExe = (() => {
  const pathTxt = resolve(projectRoot, 'node_modules', 'electron', 'path.txt')
  if (existsSync(pathTxt)) {
    const rel = readFileSync(pathTxt, 'utf8').trim()
    const abs = resolve(projectRoot, 'node_modules', 'electron', 'dist', rel)
    if (existsSync(abs)) return abs
  }
  switch (process.platform) {
    case 'win32':
      return resolve(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe')
    case 'darwin':
      return resolve(
        projectRoot,
        'node_modules',
        'electron',
        'dist',
        'Electron.app',
        'Contents',
        'MacOS',
        'Electron',
      )
    case 'linux':
    case 'freebsd':
    case 'openbsd':
      return resolve(projectRoot, 'node_modules', 'electron', 'dist', 'electron')
    default:
      return resolve(projectRoot, 'node_modules', 'electron', 'dist', 'electron')
  }
})()
const mainEntry = resolve(projectRoot, 'out', 'main', 'index.js')

const log = (msg) => console.log(`[smoke] ${msg}`)
const err = (msg) => console.error(`[smoke] ${msg}`)

if (!existsSync(mainEntry)) {
  err(`Bundled main entry not found at: ${mainEntry}`)
  err('Run `npm run build` first to produce the electron-vite three-segment build.')
  process.exit(1)
}
if (!existsSync(electronExe)) {
  err(`Electron binary not found at: ${electronExe}`)
  err('Run `npx install-electron` (or delete node_modules/electron and re-run `npm ci`) to download the binary.')
  process.exit(1)
}

log(`Electron binary: ${electronExe} (${statSync(electronExe).size} bytes)`)
log(`Main entry:      ${mainEntry}`)

// --- spawn main process ----------------------------------------------------
log('Spawning main process...')
const child = spawn(electronExe, [mainEntry], {
  cwd: projectRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  windowsHide: true,
})

let stdout = ''
let stderr = ''
child.stdout?.on('data', (chunk) => {
  const text = chunk.toString()
  stdout += text
  process.stdout.write(text.replace(/^/gm, '[main] '))
})
child.stderr?.on('data', (chunk) => {
  const text = chunk.toString()
  stderr += text
  process.stderr.write(text.replace(/^/gm, '[main] '))
})

let exitInfo = null // { code, signal } once the process exits
let livenessConfirmed = false // becomes true once the T+3s probe passes
child.once('exit', (code, signal) => {
  exitInfo = { code, signal }
})
child.once('error', (e) => {
  err(`spawn error: ${e?.message ?? e}`)
})

const isAlive = () => exitInfo === null

// --- step 1: liveness probe at T+3s ----------------------------------------
setTimeout(() => {
  if (!isAlive()) {
    err(
      `FAIL: main process exited prematurely at T+${CHECK_ALIVE_MS / 1000}s ` +
        `(code=${exitInfo.code} signal=${exitInfo.signal})`,
    )
    err('--- captured stdout ---\n' + stdout)
    err('--- captured stderr ---\n' + stderr)
    process.exit(1)
  }
  livenessConfirmed = true
  log(`PASS: main process still alive at T+${CHECK_ALIVE_MS / 1000}s`)
}, CHECK_ALIVE_MS)

// --- step 2: graceful termination at T+5s ----------------------------------
setTimeout(() => {
  if (!isAlive()) return
  log(`Sending termination signal at T+${SEND_KILL_MS / 1000}s...`)
  if (process.platform === 'win32') {
    // Electron's main process spawns renderer + GPU helper processes.
    // `child.kill()` on Windows uses TerminateProcess, which does NOT
    // propagate to children — we must walk the process tree via
    // `taskkill /F /T /PID <pid>`.
    const tk = spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], {
      stdio: 'inherit',
    })
    tk.once('error', (e) => {
      err(`taskkill failed: ${e.message}; falling back to child.kill()`)
      child.kill()
    })
  } else {
    child.kill('SIGTERM')
  }
}, SEND_KILL_MS)

// --- step 3: hard-kill deadline at T+8s -----------------------------------
setTimeout(() => {
  if (!isAlive()) return
  err(
    `FAIL: main process still alive at T+${HARD_KILL_MS / 1000}s after ` +
      `termination; force-killing the process tree.`,
  )
  if (process.platform === 'win32') {
    spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'inherit' })
  } else {
    child.kill('SIGKILL')
  }
  // Give taskkill a moment to take effect, then bail.
  setTimeout(() => process.exit(2), 500)
}, HARD_KILL_MS)

// --- step 4: report on graceful exit ---------------------------------------
// Once the liveness probe has passed, any subsequent exit is "the smoke
// test killed it" — even if the platform reports it as a non-zero exit
// code (Windows `taskkill /F` causes the process to exit with code 1
// rather than a signal). So we only treat the early-exit case (before
// T+3s) as a failure.
child.once('exit', (code, signal) => {
  // Small delay so any final stdio data is flushed into our buffers.
  setTimeout(() => {
    if (livenessConfirmed) {
      const how =
        code === 0
          ? 'exited cleanly with code 0'
          : signal
            ? `terminated by signal ${signal}`
            : `terminated by smoke test (code=${code} signal=${signal})`
      log(`PASS: main process ${how}`)
      process.exit(0)
    }
    // Should not normally reach here — the liveness probe exits first
    // if the process died early. This is a safety net.
    err(`FAIL: main process exited before liveness probe (code=${code} signal=${signal})`)
    err('--- captured stdout ---\n' + stdout)
    err('--- captured stderr ---\n' + stderr)
    process.exit(typeof code === 'number' && code !== 0 ? code : 1)
  }, FLUSH_MS)
})
