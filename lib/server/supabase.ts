/**
 * The one door to the database.
 *
 * Every table has row-level security on and no policies, so the publishable
 * key can do nothing but call the functions granted to it. Member-facing
 * functions (file a grievance, track one, log a query) need nothing else;
 * officer functions also take SUPABASE_ADMIN_SECRET, which is checked inside
 * the database against a stored hash. Neither key is ever sent to a browser.
 *
 * Every caller must cope with `null`: a kiosk that has lost its uplink still
 * answers questions, and the parts that need the database say so rather than
 * failing the whole request.
 */

export function hasDatabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

export function adminSecret(): string {
  const s = process.env.SUPABASE_ADMIN_SECRET;
  if (!s) throw new Error("SUPABASE_ADMIN_SECRET is not configured");
  return s;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Calls a database function. Throws DatabaseError on a refusal or outage. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, timeoutMs = 8000): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new DatabaseError("database is not configured", 503);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new DatabaseError(body.message ?? `database returned ${res.status}`, res.status);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(`database unreachable: ${String(err)}`, 503);
  } finally {
    clearTimeout(timer);
  }
}
