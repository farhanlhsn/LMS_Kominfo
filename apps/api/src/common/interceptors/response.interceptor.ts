import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { createApiSuccess, type ApiSuccessResponse } from "@lms/shared";

interface DataWithMeta<TData> {
  data: TData;
  meta?: Record<string, unknown>;
}

interface DataWrapper<TData> {
  data: TData;
}

interface ErrorEnvelope {
  success: false;
  error: unknown;
}

type InterceptorResult<TData> = ApiSuccessResponse<TData> | ErrorEnvelope;

@Injectable()
export class ResponseInterceptor<TData>
  implements NestInterceptor<TData, InterceptorResult<TData>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>
  ): Observable<InterceptorResult<TData>> {
    return next.handle().pipe(
      map((body) => {
        if (this.isAlreadyWrapped(body)) {
          return body;
        }

        if (this.isErrorEnvelope(body)) {
          return body;
        }

        // Paginated payload: { data, meta } → unwrap inner data but keep meta
        if (this.hasMeta(body)) {
          return createApiSuccess(body.data, body.meta);
        }

        // Data-only wrapper: { data: T } → unwrap so consumers get T directly.
        // Many list endpoints in the codebase still return { data: [...] } from
        // the controller (legacy of an older convention). Without this branch
        // the interceptor would double-wrap to { success: true, data: { data: [...] } }
        // which then breaks `apiRequest<T>()` on the frontend.
        if (this.hasDataWrapper(body)) {
          return createApiSuccess(body.data);
        }

        return createApiSuccess(body);
      })
    );
  }

  private isAlreadyWrapped(
    body: unknown
  ): body is ApiSuccessResponse<TData> {
    return (
      typeof body === "object" &&
      body !== null &&
      "success" in body &&
      (body as { success?: unknown }).success === true
    );
  }

  private isErrorEnvelope(body: unknown): body is ErrorEnvelope {
    return (
      typeof body === "object" &&
      body !== null &&
      "success" in body &&
      (body as { success?: unknown }).success === false
    );
  }

  private hasMeta(body: unknown): body is DataWithMeta<TData> {
    return (
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      "meta" in body
    );
  }

  private hasDataWrapper(body: unknown): body is DataWrapper<TData> {
    return (
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      !("meta" in body) &&
      !("success" in body)
    );
  }
}
