import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { dashboard } from '../controllers/dashboardController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { blockUntilPasswordChanged } from '../middleware/blockUntilPasswordChanged.js'

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)
dashboardRouter.use(blockUntilPasswordChanged)
dashboardRouter.get('/dashboard', asyncHandler(dashboard))
