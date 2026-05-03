import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).trim().optional(),
})

const saltRounds = env.NODE_ENV === 'production' ? 12 : 11

export async function listDirectoryUsers(req, res) {
  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .select('email name mustChangePassword platformAdmin createdAt')
    .lean()

  res.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      mustChangePassword: u.mustChangePassword === true,
      platformAdmin: u.platformAdmin === true,
      createdAt: u.createdAt,
    })),
  })
}

export async function createDirectoryUser(req, res, next) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }

  const emailNorm = parsed.data.email.toLowerCase().trim()
  const displayName =
    parsed.data.name?.trim() ||
    emailNorm.split('@')[0]?.slice(0, 120) ||
    'Member'

  const exists = await User.findOne({ email: emailNorm })
  if (exists) return next(new AppError('A user with this email already exists', 409))

  const passwordHash = await bcrypt.hash(emailNorm, saltRounds)
  const user = await User.create({
    email: emailNorm,
    passwordHash,
    name: displayName,
    mustChangePassword: true,
    platformAdmin: false,
  })

  res.status(201).json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      mustChangePassword: true,
      platformAdmin: false,
      createdAt: user.createdAt,
    },
    onboardingNote:
      'They sign in with their email and password equal to their email until they change it.',
  })
}
