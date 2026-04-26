import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * DeepSeek API Provider
 * Docs: https://platform.deepseek.com/api-docs
 * Base URL: https://api.deepseek.com
 * Models: deepseek-chat, deepseek-reasoner
 */
export class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'deepseek-chat') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
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
