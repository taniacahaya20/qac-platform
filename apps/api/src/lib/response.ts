import type { ApiSuccess, ApiError } from '@qac/shared'

export function success<T>(data: T, meta?: ApiSuccess<T>['meta']): ApiSuccess<T> {
  return { data, meta }
}

export function errorResponse(code: string, message: string, details?: unknown): ApiError {
  return { error: { code, message, details } }
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
} as const
