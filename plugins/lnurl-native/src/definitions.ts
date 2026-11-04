export interface NativeHttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface NativeHttpResponse {
  status: number
  statusText?: string
  headers?: Record<string, string>
  body?: string
  url?: string
}

export interface LnurlNativePlugin {
  request(options: NativeHttpRequest): Promise<NativeHttpResponse>
}
