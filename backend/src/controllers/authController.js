import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { signToken } from '../utils/jwt.js'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'
import { computePlatformAdmin } from '../utils/platformAdmin.js'

async function toAuthUserPayload(userDoc) {
  const platformAdmin = await computePlatformAdmin(userDoc.email, userDoc._id)
  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    mustChangePassword: userDoc.mustChangePassword === true,
    platformAdmin,
  }
}

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).trim(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(254),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(254),
  newPassword: z.string().min(8).max(128),
})

const saltRounds = env.NODE_ENV === 'production' ? 12 : 11

export async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const { email, password, name } = parsed.data
  const exists = await User.findOne({ email })
  if (exists) return next(new AppError('Email already registered', 409))
  const passwordHash = await bcrypt.hash(password, saltRounds)
  const user = await User.create({
    email,
    passwordHash,
    name,
    mustChangePassword: false,
  })
  const token = signToken({ sub: user._id.toString() })
  res.status(201).json({
    token,
    user: await toAuthUserPayload(user),
  })
}

export async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const { email, password } = parsed.data
  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user) return next(new AppError('Invalid email or password', 401))
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return next(new AppError('Invalid email or password', 401))
  const token = signToken({ sub: user._id.toString() })
  res.json({
    token,
    user: await toAuthUserPayload(user),
  })
}

export async function changePassword(req, res, next) {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user) return next(new AppError('User no longer exists', 401))
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) return next(new AppError('Current password is incorrect', 401))
  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, saltRounds)
  user.mustChangePassword = false
  await user.save()
  res.json({
    ok: true,
    user: await toAuthUserPayload(user),
  })
}

export async function me(req, res) {
  const platformAdmin = await computePlatformAdmin(req.user.email, req.user.id)
  res.json({
    user: {
      ...req.user,
      platformAdmin,
    },
  })
}
