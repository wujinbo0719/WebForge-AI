import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getDatabase } from '../database'
import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

export function registerTemplateHandlers(): void {
  ipcMain.handle('db:get-templates', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all()
  })

  ipcMain.handle('db:get-template', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) || null
  })

  ipcMain.handle(
    'db:create-template',
    (
      _event,
      data: { name: string; industry?: string; description?: string; config_json?: string }
    ) => {
      const db = getDatabase()
      const id = randomUUID()
      db.prepare(
        `INSERT INTO templates (id, name, industry, description, config_json)
       VALUES (?, ?, ?, ?, ?)`
      ).run(id, data.name, data.industry || null, data.description || null, data.config_json || null)
      return db.prepare('SELECT * FROM templates WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:delete-template', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM templates WHERE id = ?').run(id)
  })

  ipcMain.handle('template:export', async (_event, id: string) => {
    const db = getDatabase()
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<
      string,
      unknown
    > | null
    if (!template) return { success: false, error: '模板不存在' }

    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: '无法获取窗口' }

    const result = await dialog.showSaveDialog(win, {
      title: '导出模板',
      defaultPath: `${(template.name as string) || 'template'}.webforge.json`,
      filters: [{ name: 'WebForge 模板', extensions: ['webforge.json', 'json'] }]
    })

    if (result.canceled || !result.filePath) return { success: false, error: '已取消' }

    const exportData = {
      _format: 'webforge-template',
      _version: '1.0.0',
      name: template.name,
      industry: template.industry,
      description: template.description,
      config_json: template.config_json
    }
    writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return { success: true }
  })

  ipcMain.handle('template:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: '无法获取窗口' }

    const result = await dialog.showOpenDialog(win, {
      title: '导入模板',
      filters: [{ name: 'WebForge 模板', extensions: ['webforge.json', 'json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: '已取消' }
    }

    try {
      const content = readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(content)

      if (data._format !== 'webforge-template') {
        return { success: false, error: '不是有效的 WebForge 模板文件' }
      }

      const db = getDatabase()
      const id = randomUUID()
      db.prepare(
        `INSERT INTO templates (id, name, industry, description, config_json)
       VALUES (?, ?, ?, ?, ?)`
      ).run(id, data.name || '导入模板', data.industry || null, data.description || null, data.config_json || null)

      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id)
      return { success: true, template }
    } catch (err) {
      return { success: false, error: `导入失败: ${(err as Error).message}` }
    }
  })
}
