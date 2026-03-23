import 'source-map-support/register'
import { onRequest } from 'firebase-functions/v2/https'
import app from './router'

const timezone = 'Asia/Tokyo'
process.env.TZ = timezone

// triggers
export { onCreateNote } from './triggers/onCreateNote'
export { onUpdateNote } from './triggers/onUpdateNote'

// API
export const api = onRequest(
  {
    memory: '1GiB',
  },
  app,
)
