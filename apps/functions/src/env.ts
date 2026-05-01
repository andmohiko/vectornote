import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/** 環境変数のスキーマ定義（env-check.ts と共有） */
export const serverEnvSchema = {
  OPENAI_API_KEY: z.string().min(1),
}

/**
 * 型安全な環境変数アクセサ
 * @description バリデーションはビルド時に env-check.ts で実行される
 */
export const env = createEnv({
  server: serverEnvSchema,
  runtimeEnv: process.env,
  skipValidation: true,
})
