import mongoose from 'mongoose'
import { z } from 'zod'
import { Task, TASK_STATUSES } from '../models/Task.js'
import { ProjectMember } from '../models/ProjectMember.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

const objectIdString = z.union([
  z.string().length(24).regex(/^[a-f\d]{24}$/i),
  z.literal(null),
])

function emptyAssigneeEmail(v) {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

const createSchema = z
  .object({
    title: z.string().min(1).max(300).trim(),
    description: z.string().max(8000).optional().default(''),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    assigneeId: objectIdString.optional(),
    assigneeEmail: z.preprocess(
      emptyAssigneeEmail,
      z.string().email().max(254).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.assigneeEmail?.trim())
    const hasId =
      data.assigneeId !== undefined &&
      data.assigneeId !== null &&
      data.assigneeId !== ''
    if (hasEmail && hasId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use either assigneeId or assigneeEmail, not both',
        path: ['assigneeEmail'],
      })
    }
  })

const updateSchema = z
  .object({
    title: z.string().min(1).max(300).trim().optional(),
    description: z.string().max(8000).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    assigneeId: objectIdString.optional(),
    assigneeEmail: z.preprocess(
      emptyAssigneeEmail,
      z.string().email().max(254).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.assigneeEmail?.trim())
    const hasId =
      data.assigneeId !== undefined &&
      data.assigneeId !== null &&
      data.assigneeId !== ''
    if (hasEmail && hasId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use either assigneeId or assigneeEmail, not both',
        path: ['assigneeEmail'],
      })
    }
  })

function serializeTask(t) {
  return {
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId.toString(),
    assigneeId: t.assigneeId ? t.assigneeId.toString() : null,
    createdById: t.createdById.toString(),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

async function assigneeIsMember(projectId, assigneeId) {
  if (!assigneeId) return true
  const m = await ProjectMember.findOne({ projectId, userId: assigneeId })
  return !!m
}

/** Adds MEMBER row so directory-only accounts can receive assignments without a separate Team invite. */
async function ensureMemberForAssignment(projectId, userId) {
  const existing = await ProjectMember.findOne({ projectId, userId })
  if (existing) return
  await ProjectMember.create({
    projectId,
    userId,
    role: 'MEMBER',
  })
}

async function resolveAssigneeIdFromEmail(req, emailNorm) {
  if (req.membership.role !== 'ADMIN') {
    throw new AppError('Only project admins can assign by email', 403)
  }
  const user = await User.findOne({ email: emailNorm })
  if (!user) throw new AppError('No user with that email', 404)
  await ensureMemberForAssignment(req.project._id, user._id)
  return user._id.toString()
}

function canMutateTask(req, task) {
  if (req.membership.role === 'ADMIN') return true
  const uid = req.user.id
  const assignee = task.assigneeId?.toString()
  const creator = task.createdById?.toString()
  return assignee === uid || creator === uid
}

export async function listTasks(req, res) {
  const tasks = await Task.find({ projectId: req.project._id })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean()
  res.json({ tasks: tasks.map(serializeTask) })
}

export async function createTask(req, res, next) {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }
  const data = parsed.data

  let assigneeId = null
  const emailNorm = data.assigneeEmail?.trim().toLowerCase()

  if (emailNorm) {
    try {
      assigneeId = await resolveAssigneeIdFromEmail(req, emailNorm)
    } catch (err) {
      return next(err)
    }
  } else if (data.assigneeId !== undefined && data.assigneeId !== null) {
    assigneeId = data.assigneeId
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      return next(new AppError('Invalid assignee id', 400))
    }
    const ok = await assigneeIsMember(req.project._id, assigneeId)
    if (!ok) return next(new AppError('Assignee must be a project member', 400))
    if (
      req.membership.role !== 'ADMIN' &&
      assigneeId !== req.user.id
    ) {
      return next(
        new AppError('Only project admins can assign tasks to other members', 403),
      )
    }
  }

  const task = await Task.create({
    title: data.title,
    description: data.description ?? '',
    status: data.status ?? 'TODO',
    dueDate: data.dueDate ?? null,
    projectId: req.project._id,
    assigneeId,
    createdById: req.user.id,
  })
  res.status(201).json({ task: serializeTask(task.toObject()) })
}

export async function updateTask(req, res, next) {
  const { taskId } = req.params
  if (!taskId?.match(/^[a-f\d]{24}$/i)) {
    return next(new AppError('Invalid task id', 400))
  }
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return next(new AppError('Validation failed', 400, parsed.error.flatten()))
  }

  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  })
  if (!task) return next(new AppError('Task not found', 404))
  if (!canMutateTask(req, task)) {
    return next(new AppError('Not allowed to edit this task', 403))
  }

  const data = parsed.data
  const emailNorm = data.assigneeEmail?.trim().toLowerCase()

  if (emailNorm) {
    try {
      task.assigneeId = await resolveAssigneeIdFromEmail(req, emailNorm)
    } catch (err) {
      return next(err)
    }
  } else if (data.assigneeId !== undefined) {
    if (req.membership.role !== 'ADMIN' && data.assigneeId !== null) {
      return next(new AppError('Only admins can change assignee', 403))
    }
    if (data.assigneeId) {
      if (!mongoose.Types.ObjectId.isValid(data.assigneeId)) {
        return next(new AppError('Invalid assignee id', 400))
      }
      const ok = await assigneeIsMember(req.project._id, data.assigneeId)
      if (!ok) return next(new AppError('Assignee must be a project member', 400))
      task.assigneeId = data.assigneeId
    } else {
      task.assigneeId = null
    }
  }
  if (data.title !== undefined) task.title = data.title
  if (data.description !== undefined) task.description = data.description
  if (data.status !== undefined) task.status = data.status
  if (data.dueDate !== undefined) task.dueDate = data.dueDate

  await task.save()
  res.json({ task: serializeTask(task.toObject()) })
}

export async function deleteTask(req, res, next) {
  const { taskId } = req.params
  if (!taskId?.match(/^[a-f\d]{24}$/i)) {
    return next(new AppError('Invalid task id', 400))
  }
  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  })
  if (!task) return next(new AppError('Task not found', 404))
  if (!canMutateTask(req, task)) {
    return next(new AppError('Not allowed to delete this task', 403))
  }
  await Task.deleteOne({ _id: task._id })
  res.status(204).send()
}
