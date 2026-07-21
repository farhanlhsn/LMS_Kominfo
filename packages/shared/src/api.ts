export type ApiMeta = Record<string, unknown>;

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  meta?: ApiMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export function createApiSuccess<TData>(
  data: TData,
  meta?: ApiMeta
): ApiSuccessResponse<TData> {
  return meta ? { success: true, data, meta } : { success: true, data };
}
