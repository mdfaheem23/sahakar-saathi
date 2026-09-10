import { Grievance, QueryLogEntry } from "./types";

const GRIEVANCE_KEY = "pacs.grievances.v1";
const QUERYLOG_KEY = "pacs.querylog.v1";
const REJECTION_KEY = "pacs.rejections.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function genTicketId(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `PACS-${stamp}${rand}`;
}

export function listGrievances(): Grievance[] {
  return read<Grievance>(GRIEVANCE_KEY).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveGrievance(g: Grievance) {
  const all = read<Grievance>(GRIEVANCE_KEY);
  all.push(g);
  write(GRIEVANCE_KEY, all);
}

export function findGrievance(ticketIdOrPhone: string): Grievance[] {
  const q = ticketIdOrPhone.trim().toLowerCase();
  if (!q) return [];
  return listGrievances().filter(
    (g) => g.ticketId.toLowerCase() === q || g.phone.toLowerCase() === q
  );
}

export function logQuery(entry: QueryLogEntry) {
  const all = read<QueryLogEntry>(QUERYLOG_KEY);
  all.push(entry);
  // Keep the local log bounded for a demo device.
  write(QUERYLOG_KEY, all.slice(-500));
}

export function listQueryLog(): QueryLogEntry[] {
  return read<QueryLogEntry>(QUERYLOG_KEY);
}


/**
 * A member reporting that what the document says did not happen at the window.
 *
 * The one signal no amount of document checking can produce. A guideline says
 * what was written; a refusal at the counter says what is being done, and a
 * rule can be quietly stopped without a single byte of its PDF changing —
 * which is precisely the failure this system is accused of missing. Nobody
 * files paperwork about it, so the only people who ever know are the ones
 * standing at the window, and they are already here.
 *
 * Stored per device, like grievances, because that is the shape this build
 * has. In production these aggregate server-side across a district with
 * per-device rate limiting, so a handful of taps on one machine cannot move a
 * national verdict; the threshold and the ranking in `assessPassage` are
 * unchanged by where the counting happens.
 */
export interface FieldRejection {
  id: string;
  /** Corpus passage the member was refused. */
  passageId: string;
  /** What they were told at the counter, if they said. */
  note?: string;
  channel: "app" | "web" | "kiosk" | "ivr";
  timestamp: number;
}

export function reportRejection(r: FieldRejection) {
  const all = read<FieldRejection>(REJECTION_KEY);
  all.push(r);
  write(REJECTION_KEY, all.slice(-500));
}

export function listRejections(): FieldRejection[] {
  return read<FieldRejection>(REJECTION_KEY);
}

/**
 * How many distinct days this passage was reported refused.
 *
 * Days rather than taps. Counting raw taps would let one frustrated member —
 * or one bored person — silence a valid scheme in five seconds, and a rule
 * that is genuinely being refused will be refused again tomorrow.
 */
export function rejectionCount(passageId: string): number {
  const days = new Set(
    listRejections()
      .filter((r) => r.passageId === passageId)
      .map((r) => new Date(r.timestamp).toISOString().slice(0, 10))
  );
  return days.size;
}

/** Rejection counts for every passage, for the officer's ledger. */
export function rejectionsByPassage(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of new Set(listRejections().map((r) => r.passageId))) {
    out[id] = rejectionCount(id);
  }
  return out;
}
