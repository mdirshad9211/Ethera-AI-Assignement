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

if (env.TRUST_PROXY) {
  // eslint-disable-next-line no-console
  console.info('Trust proxy: enabled')
}

const app = express()
app.set('trust proxy', env.TRUST_PROXY ? 1 : false)

app.use(helmet())
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => req.path === '/health',
  }),
)

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

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

app.use('/api', apiLimiter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api', dashboardRouter)
app.use('/api/projects', projectsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const server = http.createServer(app)

async function connectDb() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10_000,
    })
  } catch (err) {
    const refused =
      err?.name === 'MongooseServerSelectionError' ||
      err?.message?.includes('ECONNREFUSED')
    if (refused) {
      console.error(
        '\n[x] MongoDB is not reachable at the URI in MONGODB_URI.\n' +
          '    Start MongoDB locally (e.g. Windows: install MongoDB Community + run mongod),\n' +
          '    or set MONGODB_URI to a MongoDB Atlas connection string in backend/.env.\n',
      )
    }
    throw err
  }
}

function shutdown(signal) {
  return async () => {
    // eslint-disable-next-line no-console
    console.info(`${signal}: closing HTTP server`)
    server.close(async () => {
      await mongoose.connection.close()
      // eslint-disable-next-line no-console
      console.info('MongoDB connection closed')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 15_000).unref()
  }
}

async function main() {
  await connectDb()
  // eslint-disable-next-line no-console
  console.info('MongoDB connected')
  await ensureAdminUser()
  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.info(`API listening on port ${env.PORT}`)
  })
}

process.on('SIGINT', shutdown('SIGINT'))
process.on('SIGTERM', shutdown('SIGTERM'))

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
