import mongoose from 'mongoose'
import { z } from 'zod'
import { Project } from '../models/Project.js'
import { ProjectMember } from '../models/ProjectMember.js'
import { Task } from '../models/Task.js'
import { AppError } from '../utils/AppError.js'

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional().default(''),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
})

export async function listProjects(req, res) {
  const memberships = await ProjectMember.find({ userId: req.user.id })
    .populate('projectId')
    .sort({ updatedAt: -1 })
    .lean()

  const items = memberships
    .filter((m) => m.projectId)
    .map((m) => ({
      id: m.projectId._id.toString(),
      name: m.projectId.name,
      description: m.projectId.description,
      ownerId: m.projectId.ownerId.toString(),
      role: m.role,
      createdAt: m.projectId.createdAt,
      updatedAt: m.projectId.updatedAt,
    }))

  res.json({ projects: items })
}

export async function createProject(req, res, next) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const { name, description } = parsed.data
  const session = await mongoose.startSession()
  let created
  try {
    await session.withTransaction(async () => {
      const [project] = await Project.create(
        [
          {
            name,
            description: description ?? '',
            ownerId: req.user.id,
          },
        ],
        { session },
      )
      await ProjectMember.create(
        [
          {
            projectId: project._id,
            userId: req.user.id,
            role: 'ADMIN',
          },
        ],
        { session },
      )
      created = project
    })
  } finally {
    await session.endSession()
  }
  res.status(201).json({
    project: {
      id: created._id.toString(),
      name: created.name,
      description: created.description,
      ownerId: created.ownerId.toString(),
      role: 'ADMIN',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
  })
}

export async function getProject(req, res) {
  const p = req.project
  res.json({
    project: {
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      ownerId: p.ownerId.toString(),
      role: req.membership.role,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
  })
}

export async function updateProject(req, res, next) {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const data = parsed.data
  if (data.name === undefined && data.description === undefined) {
    return next(new AppError('No fields to update', 400))
  }
  const p = req.project
  if (data.name !== undefined) p.name = data.name
  if (data.description !== undefined) p.description = data.description
  await p.save()
  res.json({
    project: {
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      ownerId: p.ownerId.toString(),
      role: req.membership.role,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
  })
}

export async function deleteProject(req, res) {
  const pid = req.project._id
  await Task.deleteMany({ projectId: pid })
  await ProjectMember.deleteMany({ projectId: pid })
  await Project.deleteOne({ _id: pid })
  res.status(204).send()
}
