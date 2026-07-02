import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (!data || typeof data !== 'object') {
          return { success: true, message: 'Success', data };
        }

        const d = data as Record<string, unknown>;

        // Already wrapped: { success, data }
        if ('success' in d && 'data' in d) {
          return d;
        }

        // Paginated: { data: items, meta: {...} }
        if ('data' in d && 'meta' in d) {
          return {
            success: true,
            message: (d['message'] as string) || 'Success',
            data: d['data'],
            meta: d['meta'],
          };
        }

        // Plain data
        return { success: true, message: 'Success', data };
      }),
    );
  }
}
