import { ipcMain, app } from 'electron'
import { getDatabase } from '../database'
import { randomUUID } from 'crypto'
import { rmSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { exportProjectAsZip, exportProjectFullSource } from '../services/exporter'
import { getProjectOutputDir } from '../services/site-generator'

export function registerProjectHandlers(): void {
  ipcMain.handle('db:get-projects', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all()
  })

  ipcMain.handle('db:get-project', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) || null
  })

  ipcMain.handle(
    'db:create-project',
    (
      _event,
      data: { name: string; industry: string; domain?: string; websiteType?: string }
    ) => {
      const db = getDatabase()
      const id = randomUUID()
      db.prepare(
        `INSERT INTO projects (id, name, industry, domain, website_type, status)
       VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, data.name, data.industry, data.domain || null, data.websiteType || 'multi-page', 'draft')
      return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:update-project', (_event, id: string, data: Record<string, unknown>) => {
    const db = getDatabase()
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ')
    const values = Object.values(data)
    db.prepare(`UPDATE projects SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(
      ...values,
      id
    )
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })

  ipcMain.handle('db:delete-project', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    try {
      const outputDir = getProjectOutputDir(id)
      const projectDir = outputDir.replace(/[\\/]dist$/, '')
      rmSync(projectDir, { recursive: true, force: true })
    } catch { /* ignore */ }

    // Also clean up orphaned clone temp directories (clone_xxx)
    try {
      const projectsRoot = join(app.getPath('userData'), 'projects')
      if (existsSync(projectsRoot)) {
        for (const dir of readdirSync(projectsRoot)) {
          if (dir.startsWith('clone_')) {
            try { rmSync(join(projectsRoot, dir), { recursive: true, force: true }) } catch { /* skip */ }
          }
        }
      }
    } catch { /* ignore */ }
  })

  ipcMain.handle('project:export-zip', (_event, id: string) => {
    return exportProjectAsZip(id)
  })

  ipcMain.handle('project:export-full-source', (_event, id: string) => {
    return exportProjectFullSource(id)
  })
}
