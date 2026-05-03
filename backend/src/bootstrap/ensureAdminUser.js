import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { env } from '../config/env.js'

/**
 * If ADMIN_EMAIL and ADMIN_PASSWORD are set, creates that user when missing.
 * Login uses email (not a separate username). Does not reset existing passwords.
 */
export async function ensureAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return

  const email = env.ADMIN_EMAIL.toLowerCase().trim()
  const existing = await User.findOne({ email })
  if (existing) {
    if (!existing.platformAdmin) {
      existing.platformAdmin = true
      await existing.save()
      console.info(`[bootstrap] Granted platformAdmin to existing user ${email}`)
    } else {
      console.info(`[bootstrap] User already exists: ${email} (skip create)`)
    }
    return
  }

  const saltRounds = env.NODE_ENV === 'production' ? 12 : 11
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, saltRounds)
  await User.create({
    email,
    passwordHash,
    name: env.ADMIN_NAME,
    mustChangePassword: false,
    platformAdmin: true,
  })
  console.info(`[bootstrap] Created admin user — sign in with email: ${email}`)
}
