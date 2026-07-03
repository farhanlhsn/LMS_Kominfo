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

@Injectable()
export class ResponseInterceptor<TData>
  implements NestInterceptor<TData, ApiSuccessResponse<TData>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>
  ): Observable<ApiSuccessResponse<TData>> {
    return next.handle().pipe(
      map((body) => {
        if (this.isAlreadyWrapped(body)) {
          return body;
        }

        if (this.hasMeta(body)) {
          return createApiSuccess(body.data, body.meta);
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

  private hasMeta(body: unknown): body is DataWithMeta<TData> {
    return (
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      "meta" in body
    );
  }
}
