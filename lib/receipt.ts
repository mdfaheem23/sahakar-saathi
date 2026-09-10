import { createHmac, timingSafeEqual } from "node:crypto";
import type { LangCode } from "./types";

/**
 * The paper a member walks out of the kiosk holding.
 *
 * A printout is the one artefact of this service that outlives its own
 * accuracy. It is read weeks later, by someone who was not at the kiosk, in a
 * room where nobody can check anything — which is exactly the setting the
 * fraud needs, and exactly why a printed answer with a government logo on it
 * is a more dangerous object than the screen that produced it.
 *
 * So the receipt carries no verdict. It carries a pointer: which passage was
 * shown, when, by which machine. The status is resolved when the QR code is
 * scanned, against that day's corpus and that day's source alerts. A scheme
 * that has since lapsed reads LAPSED on the phone of the person being shown
 * the paper, no matter what the paper says. The paper cannot lie, because the
 * paper does not carry the claim.
 *
 * The signature is what makes it evidence rather than decoration. An
 * unsigned or altered token is reported as not issued by a kiosk, so a
 * forged printout fails in the member's hand instead of persuading them.
 */
export interface ReceiptPayload {
  /** Corpus passage the answer rested on. */
  p: string;
  /** Issue time, epoch seconds. */
  t: number;
  /** Language the answer was given in. */
  l: LangCode;
  /** Which kiosk or channel issued it, for the audit trail. */
  k: string;
}

/**
 * Signing key.
 *
 * A deployment without one still issues receipts, because a kiosk that stops
 * printing is a kiosk that stops being useful — but it says so in the logs
 * rather than pretending the signature means something. In production this is
 * set per state, so a receipt can be traced to the fleet that issued it.
 */
function secret(): string {
  const configured = process.env.RECEIPT_SECRET;
  if (configured?.trim()) return configured;
  console.warn(
    "[receipt] RECEIPT_SECRET is not set — receipts are signed with a default " +
      "key and cannot be trusted as proof of issue. Set it before any pilot."
  );
  return "pacs-sahayak-development-key";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function mac(body: string): string {
  return b64url(createHmac("sha256", secret()).update(body).digest()).slice(0, 22);
}

export function signReceipt(payload: ReceiptPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${mac(body)}`;
}

export type ReceiptCheck =
  | { ok: true; payload: ReceiptPayload }
  | { ok: false; reason: "malformed" | "bad-signature" };

export function verifyReceipt(token: string): ReceiptCheck {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, reason: "malformed" };

  const expected = mac(body);
  // Constant-time, so the failure mode of a forged receipt is not a way to
  // discover the key one byte at a time.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  try {
    const payload = JSON.parse(unb64url(body).toString("utf8")) as ReceiptPayload;
    if (!payload?.p || typeof payload.t !== "number") {
      return { ok: false, reason: "malformed" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
