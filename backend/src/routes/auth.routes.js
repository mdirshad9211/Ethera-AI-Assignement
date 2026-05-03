import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  register,
  login,
  me,
  changePassword,
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { authLimiter } from '../middleware/rateLimit.js'

export const authRouter = Router()

authRouter.post('/register', authLimiter, asyncHandler(register))
authRouter.post('/login', authLimiter, asyncHandler(login))
authRouter.post('/change-password', requireAuth, asyncHandler(changePassword))
authRouter.get('/me', requireAuth, asyncHandler(me))
