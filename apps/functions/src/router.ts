import { check } from 'express-validator'
import { authMiddleware } from '~/middleware/auth'

const cors = require('cors')({ origin: true })
const express = require('express')
const app = express()

app.use(cors)
app.use(express.json())

const router = require('express-promise-router')()

router.post(
  '/health',
  [check('message').exists()],
  require('./api/health/test').handle,
)

router.post(
  '/search/notes',
  authMiddleware,
  [
    check('query').isString().notEmpty(),
    check('limit').optional().isInt({ min: 1, max: 50 }),
    check('minSimilarity').optional().isFloat({ min: 0, max: 1 }),
  ],
  require('./api/search/searchNotes').handle,
)

app.use(router)

export default app
