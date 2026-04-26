import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * MiniMax Provider
 * Docs: https://platform.minimaxi.com/document/ChatCompletion%20v2
 * Base URL: https://api.minimax.chat/v1
 * Models: MiniMax-Text-01, MiniMax-Text-01-128k, abab6.5s-chat, abab6.5t-chat
 */
export class MiniMaxProvider implements AIProvider {
  name = 'MiniMax'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'MiniMax-Text-01') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.minimax.chat/v1'
    })
    this.model = model
  }

  async analyze(content: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content }
      ]
    })
    return response.choices[0]?.message?.content ?? ''
  }

  async generateContent(context: WebsiteContext): Promise<GeneratedContent> {
    const prompt = buildContentPrompt(context)
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 16384,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    const text = response.choices[0]?.message?.content ?? '{}'
    return extractJSON<GeneratedContent>(text)
  }
}
