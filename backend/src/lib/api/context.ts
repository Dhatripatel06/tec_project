import { z } from 'zod';
import { ApiError, ERROR_CODES } from './response';
import { createRequestClient, type Db } from '../supabase/clients';
import type { Actor, AppRole, RoleGrant } from '../domain/permissions';

/**
 * Request context: who is calling, and a Supabase client bound to their
 * session so RLS applies to everything they touch.
 *
 * Role grants are read from the database on every request rather than trusted
 * from a token claim, so revoking a curator takes effect immediately.
 */

export interface RequestContext {
  db: Db;
  actor: Actor;
  request: Request;
}

export async function loadActor(db: Db): Promise<Actor> {
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return { userId: null, grants: [] };

  const { data, error } = await db
    .from('user_roles')
    .select('role, city_id')
    .eq('user_id', user.id);

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, `Could not load role grants: ${error.message}`);
  }

  const grants: RoleGrant[] = (data ?? []).map((row) => ({
    role: row.role as AppRole,
    cityId: row.city_id,
  }));

  return { userId: user.id, grants };
}

export async function createContext(request: Request): Promise<RequestContext> {
  const db = await createRequestClient();
  const actor = await loadActor(db);
  return { db, actor, request };
}

export function requireUser(ctx: RequestContext): string {
  if (!ctx.actor.userId) throw ApiError.unauthenticated();
  return ctx.actor.userId;
}

// -- Input parsing ---------------------------------------------------------

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request body must be valid JSON');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      'Request body failed validation',
      flattenIssues(result.error),
    );
  }
  return result.data;
}

export function parseQuery<T extends z.ZodTypeAny>(request: Request, schema: T): z.infer<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      'Query parameters failed validation',
      flattenIssues(result.error),
    );
  }
  return result.data;
}

export function parseParam<T extends z.ZodTypeAny>(
  value: unknown,
  schema: T,
  name: string,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(ERROR_CODES.VALIDATION_FAILED, `Invalid ${name}`, flattenIssues(result.error));
  }
  return result.data;
}

export function flattenIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
