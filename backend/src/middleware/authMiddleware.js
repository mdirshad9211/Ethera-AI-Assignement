import { verifyToken } from '../utils/jwt.js'
import { AppError } from '../utils/AppError.js'
import { User } from '../models/User.js'

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) {
    return next(new AppError('Authentication required', 401))
  }
  try {
    const decoded = verifyToken(token)
    if (!decoded?.sub) throw new Error('Invalid token')
    const user = await User.findById(decoded.sub).select(
      '_id email name mustChangePassword',
    )
    if (!user) return next(new AppError('User no longer exists', 401))
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      mustChangePassword: user.mustChangePassword === true,
    }
    next()
  } catch {
    return next(new AppError('Invalid or expired token', 401))
  }
}
