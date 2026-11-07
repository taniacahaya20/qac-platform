import { Elysia } from 'elysia'
import { errorResponse } from '../lib/response'

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set }) => {
    const errorMsg = 'message' in error ? String(error.message) : String(error)
    console.error(`[ERROR] ${code}:`, errorMsg)

    if (code === 'VALIDATION') {
      set.status = 422
      return errorResponse('VALIDATION_ERROR', 'Input tidak valid', errorMsg)
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return errorResponse('NOT_FOUND', 'Resource tidak ditemukan')
    }
    if (code === 'PARSE') {
      set.status = 400
      return errorResponse('PARSE_ERROR', 'Request body tidak valid')
    }

    set.status = 500
    return errorResponse('INTERNAL_ERROR', 'Terjadi kesalahan internal server')
  }
)
