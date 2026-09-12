import { NextResponse } from 'next/server';

/**
 * One response envelope for every endpoint:
 *   success → { data, error: null, meta }
 *   failure → { data: null, error: { code, message, details? } }
 */

export interface ApiMeta {
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseBody<T> {
  data: T | null;
  error: ApiErrorBody | null;
  meta?: ApiMeta;
}

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  VENUE_NOT_FOUND: 'VENUE_NOT_FOUND',
  ORGANISER_NOT_FOUND: 'ORGANISER_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  OCCURRENCE_NOT_FOUND: 'OCCURRENCE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  ALREADY_SAVED: 'ALREADY_SAVED',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INVALID_RECURRENCE: 'INVALID_RECURRENCE',
  RATE_LIMITED: 'RATE_LIMITED',
  UPLOAD_REJECTED: 'UPLOAD_REJECTED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const STATUS_FOR: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LISTING_NOT_FOUND: 404,
  CITY_NOT_FOUND: 404,
  VENUE_NOT_FOUND: 404,
  ORGANISER_NOT_FOUND: 404,
  SUBMISSION_NOT_FOUND: 404,
  OCCURRENCE_NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  ALREADY_SAVED: 409,
  INVALID_TRANSITION: 409,
  INVALID_RECURRENCE: 422,
  RATE_LIMITED: 429,
  UPLOAD_REJECTED: 400,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export function statusForCode(code: ErrorCode): number {
  return STATUS_FOR[code] ?? 500;
}

export function ok<T>(data: T, meta?: ApiMeta, status = 200): NextResponse<ApiResponseBody<T>> {
  return NextResponse.json({ data, error: null, ...(meta ? { meta } : {}) }, { status });
}

export function created<T>(data: T, meta?: ApiMeta): NextResponse<ApiResponseBody<T>> {
  return ok(data, meta, 201);
}

export function noContent(): NextResponse<ApiResponseBody<null>> {
  return NextResponse.json({ data: null, error: null }, { status: 200 });
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
  statusOverride?: number,
): NextResponse<ApiResponseBody<never>> {
  return NextResponse.json(
    { data: null, error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status: statusOverride ?? statusForCode(code) },
  );
}

/** Thrown anywhere in a handler; `withApi` turns it into the envelope above. */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static notFound(what: string, code: ErrorCode = ERROR_CODES.NOT_FOUND): ApiError {
    return new ApiError(code, `${what} not found`);
  }

  static forbidden(message = 'You do not have access to this resource'): ApiError {
    return new ApiError(ERROR_CODES.FORBIDDEN, message);
  }

  static unauthenticated(message = 'Authentication required'): ApiError {
    return new ApiError(ERROR_CODES.UNAUTHENTICATED, message);
  }
}
