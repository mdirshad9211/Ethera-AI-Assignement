import { Project } from '../models/Project.js'
import { ProjectMember } from '../models/ProjectMember.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const loadProjectMembership = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params
  if (!projectId || !String(projectId).match(/^[a-f\d]{24}$/i)) {
    throw new AppError('Invalid project id', 400)
  }
  const project = await Project.findById(projectId)
  if (!project) throw new AppError('Project not found', 404)

  const membership = await ProjectMember.findOne({
    projectId: project._id,
    userId: req.user.id,
  })
  if (!membership) throw new AppError('Project not found or access denied', 404)

  req.project = project
  req.membership = membership
  next()
})

export function requireProjectAdmin(req, res, next) {
  if (req.membership.role !== 'ADMIN') {
    return next(new AppError('Admin role required', 403))
  }
  next()
}
