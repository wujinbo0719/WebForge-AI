import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

export class ClaudeProvider implements AIProvider {
  name = 'Claude'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async analyze(content: string, prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n---\n\n${content}`
        }
      ]
    })
    const block = response.content[0]
    return block.type === 'text' ? block.text : ''
  }

  async generateContent(context: WebsiteContext): Promise<GeneratedContent> {
    const prompt = buildContentPrompt(context)
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
    const block = response.content[0]
    const text = block.type === 'text' ? block.text : '{}'
    return extractJSON<GeneratedContent>(text)
  }
}
