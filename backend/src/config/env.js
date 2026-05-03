import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const booleanFromEnv = z.preprocess((v) => {
  if (v === true || v === false) return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    if (s === 'true' || s === '1' || s === 'yes') return true
    if (s === 'false' || s === '0' || s === 'no') return false
  }
  return v
}, z.boolean())

function emptyToUndefined(v) {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGINS: z.string().optional(),
    TRUST_PROXY: booleanFromEnv.default(false),
    ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
    ADMIN_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8).max(128).optional(),
    ),
    ADMIN_NAME: z.preprocess(
      emptyToUndefined,
      z.string().min(1).max(120).trim().optional(),
    ),
    PLATFORM_ADMIN_EMAILS: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.ADMIN_EMAIL)
    const hasPassword = Boolean(data.ADMIN_PASSWORD)
    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin user, or leave both unset',
        path: ['ADMIN_EMAIL'],
      })
    }
  })

const parsed = schema.parse(process.env)

export const env = {
  ...parsed,
  ADMIN_NAME: parsed.ADMIN_NAME ?? 'Administrator',
}

if (env.NODE_ENV === 'production' && !env.CORS_ORIGINS?.trim()) {
  throw new Error(
    'CORS_ORIGINS is required in production (comma-separated allowed origins)',
  )
}

export function getCorsOrigins() {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (env.NODE_ENV === 'development') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173']
  }
  return []
}
