import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private client: OpenAI

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {})
    })
  }

  async analyze(content: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
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
      model: 'gpt-4o',
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
