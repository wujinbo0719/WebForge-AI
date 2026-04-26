import { execSync } from 'child_process'

// Remove ELECTRON_RUN_AS_NODE to ensure Electron runs as a proper GUI app
// (VSCode/Claude Code sets this env var which breaks Electron's main process)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

try {
  execSync('npx electron-vite dev', { stdio: 'inherit', env })
} catch {
  process.exit(1)
}
