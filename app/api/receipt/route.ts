import { NextRequest } from "next/server";
import { signReceipt } from "@/lib/receipt";
import { CORPUS } from "@/lib/rag/corpus";
import type { LangCode } from "@/lib/types";
import { SUPPORTED_LANGS } from "@/lib/i18n";

export const runtime = "nodejs";

/**
 * Issues a signed receipt for an answer the member has just been given.
 *
 * Signed here rather than on the kiosk because the key must not sit on forty
 * thousand machines in PACS lobbies. A consequence worth stating plainly: an
 * offline kiosk cannot print a verifiable receipt. That is the correct
 * behaviour — a machine that could not check the answer it just gave should
 * not be issuing paper that says the answer was checked.
 */
export async function POST(req: NextRequest) {
  let body: { passageId?: string; lang?: LangCode; kiosk?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const passageId = body.passageId?.trim();
  if (!passageId) return Response.json({ error: "passageId is required" }, { status: 400 });

  // Only real passages get receipts. Otherwise the endpoint is a way to mint
  // an official-looking QR code that resolves to a page of the caller's
  // choosing, which is a better fraud tool than the one this replaces.
  if (!CORPUS.some((c) => c.id === passageId)) {
    return Response.json({ error: "unknown passage" }, { status: 404 });
  }

  const lang: LangCode = SUPPORTED_LANGS.includes(body.lang as LangCode)
    ? (body.lang as LangCode)
    : "en";

  const token = signReceipt({
    p: passageId,
    t: Math.floor(Date.now() / 1000),
    l: lang,
    // Identifies the machine for the audit trail, never the member. A receipt
    // that carried who asked would make the printout a disclosure risk in
    // exactly the households where asking is already sensitive.
    k: (body.kiosk ?? "kiosk").slice(0, 24),
  });

  return Response.json({ token, path: `/r/${token}` });
}
