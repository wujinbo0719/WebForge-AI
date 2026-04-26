import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * KIMI (Moonshot AI) Provider
 * Docs: https://platform.moonshot.cn/docs/api/chat
 * Base URL: https://api.moonshot.cn/v1
 * Models: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k
 */
export class KimiProvider implements AIProvider {
  name = 'KIMI'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'moonshot-v1-128k') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.moonshot.cn/v1'
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
