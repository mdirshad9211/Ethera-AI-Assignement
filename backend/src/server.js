import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import mongoose from 'mongoose'

import { env, getCorsOrigins } from './config/env.js'
import { authRouter } from './routes/auth.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { projectsRouter } from './routes/projects.routes.js'
import { usersRouter } from './routes/users.routes.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js'
import { AppError } from './utils/AppError.js'
import { ensureAdminUser } from './bootstrap/ensureAdminUser.js'

const isVercel = !!process.env.VERCEL

const app = express()

/**
 * ✅ FIX 1: Trust proxy (REQUIRED for Vercel / proxies)
 */
app.set('trust proxy', 1)

/**
 * ✅ MongoDB connection cache (IMPORTANT for serverless)
 */
let isConnected = false

async function connectDb() {
  if (isConnected) return

  try {
    const db = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
    })

    isConnected = db.connections[0].readyState === 1
    console.info('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    throw err
  }
}

/**
 * ✅ FIX 2: Ensure DB connection BEFORE handling requests
 */
app.use(async (req, res, next) => {
  try {
    await connectDb()
    next()
  } catch (err) {
    next(err)
  }
})

/**
 * Middlewares
 */
app.use(helmet())
app.use(compression())
app.use(express.json({ limit: '1mb' }))

app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => req.path === '/health',
  }),
)

/**
 * CORS setup
 */
const corsOrigins = getCorsOrigins()

app.use(
  cors({
    origin:
      corsOrigins.length > 0
        ? (origin, cb) => {
            if (!origin) return cb(null, true)
            if (corsOrigins.includes(origin)) return cb(null, true)
            cb(new AppError('Not allowed by CORS', 403))
          }
        : true,
    credentials: true,
  }),
)

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  const db =
    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: db,
    env: env.NODE_ENV,
  })
})

/**
 * Routes
 */
app.use('/api', apiLimiter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api', dashboardRouter)
app.use('/api/projects', projectsRouter)

/**
 * Error handling
 */
app.use(notFoundHandler)
app.use(errorHandler)

/**
 * Export for Vercel
 */
export default app

/**
 * Local server (ONLY for non-Vercel environments)
 */
if (!isVercel) {
  const server = http.createServer(app)

  function shutdown(signal) {
    return async () => {
      console.info(`${signal}: closing HTTP server`)
      server.close(async () => {
        await mongoose.connection.close()
        console.info('MongoDB connection closed')
        process.exit(0)
      })
      setTimeout(() => process.exit(1), 15000).unref()
    }
  }

  async function main() {
    await connectDb()
    await ensureAdminUser()

    server.listen(env.PORT, () => {
      console.info(`API listening on port ${env.PORT}`)
    })
  }

  process.on('SIGINT', shutdown('SIGINT'))
  process.on('SIGTERM', shutdown('SIGTERM'))

  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}