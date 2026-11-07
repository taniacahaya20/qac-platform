export interface ApiSuccess<T = unknown> {
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

export interface PaginationQuery {
  page?: number
  limit?: number
  sort?: string
}

export interface CaseStep {
  content: string
  expected: string
}

export interface CiInfo {
  branch?: string
  commit?: string
  buildNo?: string
  pipelineUrl?: string
  environment?: string
}
