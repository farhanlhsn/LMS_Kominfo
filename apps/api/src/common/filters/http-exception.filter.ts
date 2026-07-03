import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiErrorPayload } from "@lms/shared";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      success: false,
      error: this.toErrorPayload(exception, status)
    });
  }

  private toErrorPayload(exception: unknown, status: number): ApiErrorPayload {
    if (!(exception instanceof HttpException)) {
      return {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === "string") {
      return {
        code: this.codeFromStatus(status),
        message: exceptionResponse
      };
    }

    const responseBody = exceptionResponse as {
      error?: string;
      message?: string | string[];
      details?: unknown;
    };

    return {
      code: this.codeFromStatus(status, responseBody.error),
      message: Array.isArray(responseBody.message)
        ? "Validation failed"
        : responseBody.message ?? exception.message,
      details: Array.isArray(responseBody.message)
        ? responseBody.message
        : responseBody.details
    };
  }

  private codeFromStatus(status: number, fallback?: string): string {
    if (fallback) {
      return fallback.toUpperCase().replace(/\s+/g, "_");
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return "VALIDATION_ERROR";
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return "UNAUTHORIZED";
    }

    if (status === HttpStatus.FORBIDDEN) {
      return "FORBIDDEN";
    }

    if (status === HttpStatus.NOT_FOUND) {
      return "NOT_FOUND";
    }

    return "HTTP_ERROR";
  }
}
