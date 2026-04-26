import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * ZhipuAI (智谱 GLM) Provider
 * Docs: https://open.bigmodel.cn/dev/api/normal-model/glm-4
 * Base URL: https://open.bigmodel.cn/api/paas/v4
 * Models: glm-4-plus, glm-4-0520, glm-4-air, glm-4-airx, glm-4-long, glm-4-flash (free)
 */
export class ZhipuProvider implements AIProvider {
  name = 'ZhipuAI (GLM)'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'glm-4-plus') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4'
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
