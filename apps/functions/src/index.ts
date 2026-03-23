import 'source-map-support/register'
import { onRequest } from 'firebase-functions/v2/https'
import app from './router'

const timezone = 'Asia/Tokyo'
process.env.TZ = timezone

// triggers
export { onCreateNote } from './triggers/onCreateNote'
export { onDeleteNote } from './triggers/onDeleteNote'
export { onUpdateNote } from './triggers/onUpdateNote'

// API
export const api = onRequest(
  {
    memory: '1GiB',
    // Cloud Run IAM: allUsers に invoker 権限を付与（アプリ側で認証を行う）
    invoker: 'public',
    // Cloud Run レベルでの CORS 許可（OPTIONS プリフライトを通す）
    cors: true,
  },
  app,
)
