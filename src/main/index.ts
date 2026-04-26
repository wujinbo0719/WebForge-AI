import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { getDatabase, closeDatabase } from './database'
import { registerProjectHandlers } from './ipc/project'
import { registerSettingsHandlers } from './ipc/settings'
import { registerAIHandlers } from './ipc/ai'
import { registerDeployHandlers } from './ipc/deploy'
import { registerTemplateHandlers } from './ipc/template'

const isDev = !app.isPackaged

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'WebForge AI',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    const loadWithRetry = async (): Promise<void> => {
      for (let i = 0; i < 30; i++) {
        try {
          await mainWindow.loadURL(devUrl)
          return
        } catch {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
      console.error('Failed to connect to dev server after 15s')
    }
    loadWithRetry()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev ? process.execPath : 'com.webforge.ai')
  }

  getDatabase()

  registerProjectHandlers()
  registerSettingsHandlers()
  registerAIHandlers()
  registerDeployHandlers()
  registerTemplateHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
