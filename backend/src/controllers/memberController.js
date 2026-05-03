import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { ProjectMember } from '../models/ProjectMember.js'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'

const addSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']),
  name: z.string().min(1).max(120).trim().optional(),
})

const roleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
})

const saltRounds = env.NODE_ENV === 'production' ? 12 : 11

async function countAdmins(projectId) {
  return ProjectMember.countDocuments({ projectId, role: 'ADMIN' })
}

export async function listMembers(req, res) {
  const members = await ProjectMember.find({ projectId: req.project._id })
    .populate('userId', 'email name')
    .sort({ role: 1, createdAt: 1 })
    .lean()

  res.json({
    members: members.map((m) => ({
      userId: m.userId._id.toString(),
      email: m.userId.email,
      name: m.userId.name,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  })
}

export async function addMember(req, res, next) {
  const parsed = addSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }

  const emailNorm = parsed.data.email.toLowerCase().trim()
  const { role } = parsed.data
  const displayName =
    parsed.data.name?.trim() ||
    emailNorm.split('@')[0]?.slice(0, 120) ||
    'Member'

  const session = await mongoose.startSession()
  let payload
  try {
    await session.withTransaction(async () => {
      let user = await User.findOne({ email: emailNorm }).session(session)
      let createdNewAccount = false

      if (!user) {
        const passwordHash = await bcrypt.hash(emailNorm, saltRounds)
        const [created] = await User.create(
          [
            {
              email: emailNorm,
              passwordHash,
              name: displayName,
              mustChangePassword: true,
            },
          ],
          { session },
        )
        user = created
        createdNewAccount = true
      }

      const existingMember = await ProjectMember.findOne({
        projectId: req.project._id,
        userId: user._id,
      }).session(session)

      if (existingMember) {
        throw new AppError('User is already a member', 409)
      }

      const [doc] = await ProjectMember.create(
        [
          {
            projectId: req.project._id,
            userId: user._id,
            role,
          },
        ],
        { session },
      )

      payload = { doc, user, createdNewAccount }
    })
  } catch (err) {
    if (err instanceof AppError) return next(err)
    throw err
  } finally {
    await session.endSession()
  }

  res.status(201).json({
    member: {
      userId: payload.user._id.toString(),
      email: payload.user.email,
      name: payload.user.name,
      role: payload.doc.role,
      joinedAt: payload.doc.createdAt,
    },
    createdAccount: payload.createdNewAccount,
    ...(payload.createdNewAccount
      ? {
          onboardingNote:
            'They sign in using their email with password equal to their email until they set a new password.',
        }
      : {}),
  })
}

export async function updateMemberRole(req, res, next) {
  const parsed = roleSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const { userId } = req.params
  if (!userId?.match(/^[a-f\d]{24}$/i)) {
    return next(new AppError('Invalid user id', 400))
  }

  const member = await ProjectMember.findOne({
    projectId: req.project._id,
    userId,
  })
  if (!member) return next(new AppError('Member not found', 404))

  if (member.role === 'ADMIN' && parsed.data.role === 'MEMBER') {
    const admins = await countAdmins(req.project._id)
    if (admins <= 1) {
      return next(new AppError('Cannot demote the last admin', 400))
    }
  }

  member.role = parsed.data.role
  await member.save()

  const user = await User.findById(userId).select('email name')
  res.json({
    member: {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: member.role,
    },
  })
}

export async function removeMember(req, res, next) {
  const { userId } = req.params
  if (!userId?.match(/^[a-f\d]{24}$/i)) {
    return next(new AppError('Invalid user id', 400))
  }

  const member = await ProjectMember.findOne({
    projectId: req.project._id,
    userId,
  })
  if (!member) return next(new AppError('Member not found', 404))

  if (member.role === 'ADMIN') {
    const admins = await countAdmins(req.project._id)
    if (admins <= 1) {
      return next(new AppError('Cannot remove the last admin', 400))
    }
  }

  await ProjectMember.deleteOne({ _id: member._id })
  res.status(204).send()
}
