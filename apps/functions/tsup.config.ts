import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  target: 'node18',
  format: ['cjs'],
  sourcemap: true,
  dts: false, // Firebase deploy では型定義は不要
  external: ['firebase-functions', 'firebase-admin'], // Cloud Functions が持つ依存
  clean: true,
  shims: true, // Node.js のグローバルAPI shimを使う場合
  onSuccess:
    'tsup src/env-check.ts --outDir lib/env-check --format cjs --no-config --silent && node --env-file=.env lib/env-check/env-check.js && rm -rf lib/env-check',
  esbuildOptions(options) {
    options.alias = {
      '@vectornote/common': '../../packages/common/src',
    }
  },
})
