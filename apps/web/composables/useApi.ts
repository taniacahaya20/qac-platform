export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export interface ApiResult<T> {
  data: T | null
  error: string | null
  status: number
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiUrl as string || 'http://localhost:3001'
  const { method = 'GET', body, headers = {} } = options
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : {}

  try {
    const res = await $fetch.raw(`${baseUrl}${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...requestHeaders,
        ...headers,
      },
      credentials: 'include',
    })

    const json = res._data as { data?: T; error?: { code: string; message: string } }

    if (json.error) {
      return { data: null, error: json.error.message, status: res.status }
    }

    return { data: (json.data ?? json) as T, error: null, status: res.status }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const fetchErr = err as { data?: { error?: { message?: string } }; status?: number }
      const msg = fetchErr.data?.error?.message ?? 'Terjadi kesalahan'
      return { data: null, error: msg, status: fetchErr.status ?? 500 }
    }
    return { data: null, error: 'Gagal terhubung ke server', status: 0 }
  }
}

export function useApi() {
  return { fetch: apiFetch }
}
