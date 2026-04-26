import OpenAI from 'openai'
import type { AIProvider, WebsiteContext, GeneratedContent } from '../ai-types'
import { buildContentPrompt, extractJSON } from '../ai-provider'

/**
 * SiliconFlow (硅基流动) Provider
 * Docs: https://docs.siliconflow.cn/quickstart
 * Base URL: https://api.siliconflow.cn/v1
 * Models: Qwen/Qwen2.5-72B-Instruct, deepseek-ai/DeepSeek-V3,
 *         Pro/Qwen/Qwen2.5-Coder-32B-Instruct, THUDM/glm-4-9b-chat, etc.
 */
export class SiliconFlowProvider implements AIProvider {
  name = 'SiliconFlow'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'deepseek-ai/DeepSeek-V3') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.siliconflow.cn/v1'
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
