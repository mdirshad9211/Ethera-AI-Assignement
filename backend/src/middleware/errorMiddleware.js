import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export function notFoundHandler(req, res, next) {
  next(new AppError(`Not found: ${req.method} ${req.originalUrl}`, 404))
}

export function errorHandler(err, req, res, _next) {
  if (err.code === 11000) {
    return res.status(409).json({
      error: { message: 'A record with that value already exists' },
    })
  }

  const statusCode = err.statusCode || err.status || 500
  const isOperational = err.isOperational === true

  if (statusCode >= 500) {
    console.error(err)
  }

  const body = {
    error: {
      message:
        statusCode >= 500 && env.NODE_ENV === 'production' && !isOperational
          ? 'Internal server error'
          : err.message || 'Something went wrong',
      ...(err.details != null ? { details: err.details } : {}),
    },
  }

  if (env.NODE_ENV === 'development') {
    body.error.stack = err.stack
  }

  res.status(statusCode).json(body)
}
