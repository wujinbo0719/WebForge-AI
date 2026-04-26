import { readFile } from 'fs/promises'
import { extname } from 'path'

/**
 * Parse documents (PDF, Word, TXT) and extract text content.
 */
export async function parseDocument(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase()

  switch (ext) {
    case '.pdf':
      return parsePDF(filePath)
    case '.doc':
    case '.docx':
      return parseWord(filePath)
    case '.txt':
    case '.md':
      return parsePlainText(filePath)
    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }
}

async function parsePDF(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const buffer = await readFile(filePath)
  const result = await pdfParse(buffer)
  return result.text
}

async function parseWord(filePath: string): Promise<string> {
  const mammoth = await import('mammoth')
  const buffer = await readFile(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function parsePlainText(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8')
}

/**
 * Parse multiple documents and combine their text.
 */
export async function parseDocuments(filePaths: string[]): Promise<string> {
  const results: string[] = []
  for (const filePath of filePaths) {
    try {
      const text = await parseDocument(filePath)
      if (text.trim()) {
        results.push(`--- ${filePath} ---\n${text.trim()}`)
      }
    } catch (err) {
      console.error(`Failed to parse ${filePath}:`, err)
    }
  }
  return results.join('\n\n')
}
