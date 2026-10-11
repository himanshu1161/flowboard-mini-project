import type { AppError, ErrorCode, Result } from './types'

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  INVALID_PARENT: 422,
  INVALID_STATUS: 422,
  NETWORK: 503,
}

export function appError(code: ErrorCode, message: string): AppError {
  return { code, message, status: STATUS_BY_CODE[code] }
}

export function fail<T = never>(code: ErrorCode, message: string): Result<T> {
  return { error: appError(code, message) }
}

export function ok<T>(data: T): Result<T> {
  return { data }
}

export const forbidden = (what = 'this resource') =>
  appError('FORBIDDEN', `You don't have access to ${what}.`)

export const notFound = (what = 'Item') => appError('NOT_FOUND', `${what} was not found.`)

/** Human-friendly title for a toast/banner, keyed by error code. */
export function errorTitle(error: AppError): string {
  switch (error.code) {
    case 'FORBIDDEN':
      return 'Permission denied'
    case 'NOT_FOUND':
      return 'Not found'
    case 'CONFLICT':
      return 'Conflict'
    case 'NETWORK':
      return 'Request failed'
    default:
      return "Couldn't save"
  }
}
