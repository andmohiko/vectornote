import OpenAI from 'openai'
import { env } from '~/env'

let _openai: OpenAI | null = null

export const getOpenAIClient = (): OpenAI => {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  }
  return _openai
}
