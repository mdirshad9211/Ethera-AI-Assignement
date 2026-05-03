import { AppError } from '../utils/AppError.js'

/** Blocks project/dashboard APIs until invited users finish first-time password update. */
export function blockUntilPasswordChanged(req, _res, next) {
  if (req.user.mustChangePassword) {
    return next(
      new AppError('You must change your password before continuing.', 403, {
        code: 'PASSWORD_CHANGE_REQUIRED',
      }),
    )
  }
  next()
}
