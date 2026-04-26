import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * Custom provider that uses any OpenAI-compatible API endpoint.
 */
export class CustomProvider implements AIProvider {
  name = 'Custom'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, baseURL: string, model = 'default') {
    this.client = new OpenAI({ apiKey, baseURL })
    this.model = model
  }

  async analyze(content: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n---\n\n${content}`
        }
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
        {
          role: 'user',
          content: prompt
        }
      ]
    })
    const text = response.choices[0]?.message?.content ?? '{}'
    return extractJSON<GeneratedContent>(text)
  }
}
