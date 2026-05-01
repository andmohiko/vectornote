/**
 * ビルド時の環境変数バリデーション
 * @description tsup.config.ts の onSuccess フックで実行される
 */
import { createEnv } from '@t3-oss/env-core'
import { serverEnvSchema } from './env'

createEnv({
  server: serverEnvSchema,
  runtimeEnv: process.env,
  onValidationError: (issues) => {
    console.error('❌ 環境変数のバリデーションに失敗しました:')
    for (const issue of issues) {
      console.error(`  - ${issue.path?.join('.')}: ${issue.message}`)
    }
    throw new Error('環境変数のバリデーションに失敗しました')
  },
})

console.log('✅ 環境変数のバリデーションに成功しました')
