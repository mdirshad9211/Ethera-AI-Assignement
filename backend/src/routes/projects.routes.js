import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/memberController.js'
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { blockUntilPasswordChanged } from '../middleware/blockUntilPasswordChanged.js'
import {
  loadProjectMembership,
  requireProjectAdmin,
} from '../middleware/projectAccess.js'

export const projectsRouter = Router()

projectsRouter.use(requireAuth)
projectsRouter.use(blockUntilPasswordChanged)

projectsRouter.get('/', asyncHandler(listProjects))
projectsRouter.post('/', asyncHandler(createProject))

projectsRouter.get('/:projectId', loadProjectMembership, asyncHandler(getProject))
projectsRouter.patch(
  '/:projectId',
  loadProjectMembership,
  requireProjectAdmin,
  asyncHandler(updateProject),
)
projectsRouter.delete(
  '/:projectId',
  loadProjectMembership,
  requireProjectAdmin,
  asyncHandler(deleteProject),
)

projectsRouter.get('/:projectId/members', loadProjectMembership, asyncHandler(listMembers))
projectsRouter.post(
  '/:projectId/members',
  loadProjectMembership,
  requireProjectAdmin,
  asyncHandler(addMember),
)
projectsRouter.patch(
  '/:projectId/members/:userId',
  loadProjectMembership,
  requireProjectAdmin,
  asyncHandler(updateMemberRole),
)
projectsRouter.delete(
  '/:projectId/members/:userId',
  loadProjectMembership,
  requireProjectAdmin,
  asyncHandler(removeMember),
)

projectsRouter.get('/:projectId/tasks', loadProjectMembership, asyncHandler(listTasks))
projectsRouter.post('/:projectId/tasks', loadProjectMembership, asyncHandler(createTask))
projectsRouter.patch(
  '/:projectId/tasks/:taskId',
  loadProjectMembership,
  asyncHandler(updateTask),
)
projectsRouter.delete(
  '/:projectId/tasks/:taskId',
  loadProjectMembership,
  asyncHandler(deleteTask),
)
