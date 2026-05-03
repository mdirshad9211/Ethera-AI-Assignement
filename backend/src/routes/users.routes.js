import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  listDirectoryUsers,
  createDirectoryUser,
} from '../controllers/usersController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { blockUntilPasswordChanged } from '../middleware/blockUntilPasswordChanged.js'
import { requirePlatformAdmin } from '../middleware/requirePlatformAdmin.js'

export const usersRouter = Router()

usersRouter.use(requireAuth)
usersRouter.use(blockUntilPasswordChanged)
usersRouter.use(requirePlatformAdmin)

usersRouter.get('/', asyncHandler(listDirectoryUsers))
usersRouter.post('/', asyncHandler(createDirectoryUser))
