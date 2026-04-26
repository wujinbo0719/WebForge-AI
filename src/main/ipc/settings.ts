import { ipcMain } from 'electron'
import { getDatabase } from '../database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('db:get-setting', (_event, key: string) => {
    const db = getDatabase()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  })

  ipcMain.handle('db:set-setting', (_event, key: string, value: string) => {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  })
}
