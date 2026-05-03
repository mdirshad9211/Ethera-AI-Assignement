import { env } from '../config/env.js'
import { User } from '../models/User.js'

export function platformAdminEmailsFromEnv() {
  const set = new Set()
  if (env.ADMIN_EMAIL) set.add(env.ADMIN_EMAIL.toLowerCase().trim())
  if (env.PLATFORM_ADMIN_EMAILS) {
    for (const part of env.PLATFORM_ADMIN_EMAILS.split(',')) {
      const e = part.trim().toLowerCase()
      if (e) set.add(e)
    }
  }
  return set
}

export function isPlatformAdminEmail(email) {
  return platformAdminEmailsFromEnv().has(email.toLowerCase().trim())
}

/** True if env lists this email or the user document has platformAdmin set in MongoDB. */
export async function computePlatformAdmin(email, userId) {
  if (isPlatformAdminEmail(email)) return true
  const user = await User.findById(userId).select('platformAdmin')
  return user?.platformAdmin === true
}
