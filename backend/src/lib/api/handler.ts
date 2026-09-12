import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';
import { ApiError, ERROR_CODES, fail, type ApiResponseBody } from './response';
import { createContext, type RequestContext } from './context';
import { checkRateLimit, rateLimitIdentity, type RateLimitKey } from './rate-limit';

/**
 * Route handler wrapper.
 *
 * Gives every endpoint the same shape: build context (session + roles), apply
 * an optional rate limit, run the handler, and translate anything thrown into
 * the standard error envelope. Nothing else in the codebase writes an error
 * response by hand.
 */

export type Handler<TParams = Record<string, string>> = (
  ctx: RequestContext,
  params: TParams,
) => Promise<NextResponse<ApiResponseBody<unknown>>>;

export interface HandlerOptions {
  rateLimit?: RateLimitKey;
  /** Reject anonymous callers before the handler runs. */
  requireAuth?: boolean;
}

/**
 * Next 15 passes every route handler a context whose `params` is a Promise,
 * including routes with no dynamic segments (where it resolves to `{}`). The
 * parameter is declared required so the signature satisfies Next's generated
 * `RouteContext` check, but it is read defensively below: these handlers are
 * also invoked directly from tests, with no context at all.
 */
interface RouteArgs<TParams> {
  params: Promise<TParams>;
}

export function withApi<TParams extends Record<string, string> = Record<string, string>>(
  handler: Handler<TParams>,
  options: HandlerOptions = {},
) {
  return async (
    request: Request,
    args: RouteArgs<TParams>,
  ): Promise<NextResponse<ApiResponseBody<unknown>>> => {
    try {
      const ctx = await createContext(request);

      if (options.requireAuth && !ctx.actor.userId) {
        throw ApiError.unauthenticated();
      }

      if (options.rateLimit) {
        const identity = rateLimitIdentity(request, ctx.actor.userId);
        const result = checkRateLimit(options.rateLimit, identity);
        if (!result.allowed) {
          const response = fail(
            ERROR_CODES.RATE_LIMITED,
            'Too many requests. Please try again shortly.',
            { retry_after_seconds: result.retryAfter },
          );
          response.headers.set('Retry-After', String(result.retryAfter));
          return response;
        }
      }

      const rawParams = (args as RouteArgs<TParams> | undefined)?.params;
      const params = rawParams ? await rawParams : ({} as TParams);
      return await handler(ctx, params);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Postgres/PostgREST errors mapped to the public error vocabulary. */
function fromPostgrest(error: PostgrestError): NextResponse<ApiResponseBody<never>> {
  switch (error.code) {
    case '23505': // unique_violation
      return fail(ERROR_CODES.ALREADY_EXISTS, 'That record already exists');
    case '23503': // foreign_key_violation
      return fail(ERROR_CODES.VALIDATION_FAILED, 'A referenced record does not exist');
    case '23514': // check_violation
      return fail(ERROR_CODES.VALIDATION_FAILED, `Constraint violated: ${error.message}`);
    case '42501': // insufficient_privilege — an RLS policy said no
      return fail(ERROR_CODES.FORBIDDEN, 'You do not have access to this resource');
    case 'PGRST116': // no rows when one was required
      return fail(ERROR_CODES.NOT_FOUND, 'Record not found');
    default:
      // Never leak raw database text to the client.
      console.error('[api] unexpected database error', error);
      return fail(ERROR_CODES.INTERNAL_ERROR, 'Something went wrong');
  }
}

export function toErrorResponse(error: unknown): NextResponse<ApiResponseBody<never>> {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.details);
  }
  if (isPostgrestError(error)) {
    return fromPostgrest(error);
  }
  console.error('[api] unhandled error', error);
  return fail(ERROR_CODES.INTERNAL_ERROR, 'Something went wrong');
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Unwraps a Supabase result, turning its error into the right ApiError.
 * `notFoundCode` is used when the query returned nothing.
 */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: { notFoundCode?: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]; entity?: string } = {},
): T {
  if (result.error) throw result.error;
  if (result.data === null || result.data === undefined) {
    throw new ApiError(
      context.notFoundCode ?? ERROR_CODES.NOT_FOUND,
      `${context.entity ?? 'Record'} not found`,
    );
  }
  return result.data;
}
