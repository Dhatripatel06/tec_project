/**
 * Postgres connection settings for the migration and seed scripts.
 *
 * Why this exists instead of handing the URI straight to `pg`:
 * Supabase generates database passwords containing characters that are
 * reserved in a URL — `#`, `%`, `?`, `/`, `@`. A standard URL parser treats
 * `#` as the start of a fragment and silently truncates everything after it,
 * so a perfectly valid connection string fails with "Invalid URL".
 *
 * So the URI is split by hand and the password is taken LITERALLY, exactly as
 * it appears between the first `:` of the userinfo and the last `@`. No
 * percent-decoding: the value pasted from the Supabase dashboard is the value
 * the server expects.
 *
 * `SUPABASE_DB_PASSWORD`, when set, overrides the password from the URI. That
 * is the unambiguous route for a password with awkward characters.
 */

export interface PgConnection {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: { rejectUnauthorized: boolean } | undefined;
}

export class ConnectionStringError extends Error {}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);

export function parsePostgresUrl(
  url: string,
  passwordOverride?: string | undefined,
): PgConnection {
  const trimmed = url.trim().replace(/^["']|["']$/g, '');

  const schemeMatch = /^(postgres(?:ql)?):\/\//i.exec(trimmed);
  if (!schemeMatch) {
    throw new ConnectionStringError(
      'SUPABASE_DB_URL must start with postgresql:// or postgres://',
    );
  }

  const rest = trimmed.slice(schemeMatch[0].length);

  // The password may itself contain '@', so split on the LAST one.
  const at = rest.lastIndexOf('@');
  if (at === -1) {
    throw new ConnectionStringError('SUPABASE_DB_URL is missing credentials (user:password@host)');
  }

  const userinfo = rest.slice(0, at);
  let hostPart = rest.slice(at + 1);

  const colon = userinfo.indexOf(':');
  const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const urlPassword = colon === -1 ? '' : userinfo.slice(colon + 1);

  // Query parameters (?sslmode=require&...) are not needed; ssl is set below.
  const queryAt = hostPart.indexOf('?');
  if (queryAt !== -1) hostPart = hostPart.slice(0, queryAt);

  const slash = hostPart.indexOf('/');
  const authority = slash === -1 ? hostPart : hostPart.slice(0, slash);
  const database = slash === -1 ? 'postgres' : hostPart.slice(slash + 1) || 'postgres';

  // IPv6 literals arrive as [::1]:5432.
  let host: string;
  let portText: string | undefined;
  if (authority.startsWith('[')) {
    const close = authority.indexOf(']');
    host = authority.slice(1, close);
    portText = authority.slice(close + 1).replace(/^:/, '') || undefined;
  } else {
    const portColon = authority.lastIndexOf(':');
    if (portColon === -1) {
      host = authority;
    } else {
      host = authority.slice(0, portColon);
      portText = authority.slice(portColon + 1);
    }
  }

  if (!host) throw new ConnectionStringError('SUPABASE_DB_URL is missing a host');

  const port = portText ? Number(portText) : 5432;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new ConnectionStringError(`SUPABASE_DB_URL has an invalid port: ${portText}`);
  }

  const password = passwordOverride?.trim() || urlPassword;
  if (!password) {
    throw new ConnectionStringError(
      'No database password. Put it in SUPABASE_DB_URL or set SUPABASE_DB_PASSWORD.',
    );
  }

  return {
    host,
    port,
    user: user || 'postgres',
    password,
    database,
    // Supabase requires TLS but serves a certificate Node does not ship a CA
    // for. Local databases need no TLS at all.
    ssl: LOCAL_HOSTS.has(host) ? undefined : { rejectUnauthorized: false },
  };
}

/** Safe to log: host, port and database only — never user or password. */
export function describeConnection(conn: PgConnection): string {
  return `${conn.host}:${conn.port}/${conn.database}`;
}

export function connectionFromEnv(): PgConnection {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new ConnectionStringError(
      'SUPABASE_DB_URL is not set.\n' +
        'Supabase → Project Settings → Database → Connection string → URI.\n' +
        'Use the session-mode string (port 5432), not the 6543 transaction pooler.',
    );
  }
  return parsePostgresUrl(url, process.env.SUPABASE_DB_PASSWORD);
}
