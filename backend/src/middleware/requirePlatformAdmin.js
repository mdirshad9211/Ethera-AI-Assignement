import { computePlatformAdmin } from '../utils/platformAdmin.js'
import { AppError } from '../utils/AppError.js'

export async function requirePlatformAdmin(req, _res, next) {
  try {
    const ok = await computePlatformAdmin(req.user.email, req.user.id)
    if (!ok) {
      return next(new AppError('Platform administrator access required', 403))
    }
    next()
  } catch (err) {
    next(err)
  }
}
