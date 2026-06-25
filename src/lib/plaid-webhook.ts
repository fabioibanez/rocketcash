import crypto from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { plaidClient } from "@/lib/plaid";

// Small in-memory cache of Plaid verification keys, keyed by `kid`.
const keyCache = new Map<string, JsonWebKey>();

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

async function getVerificationKey(kid: string): Promise<JsonWebKey | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;

  const res = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  const key = res.data.key as unknown as JsonWebKey;
  keyCache.set(kid, key);
  return key;
}

/**
 * Verify a Plaid webhook by validating the `Plaid-Verification` JWT (ES256)
 * and confirming the SHA-256 of the raw request body matches the JWT claim.
 * Returns true only when fully verified.
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  verificationHeader: string | null,
): Promise<boolean> {
  if (!verificationHeader) return false;

  const parts = verificationHeader.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
  } catch {
    return false;
  }
  if (header.alg !== "ES256" || !header.kid) return false;

  const jwk = await getVerificationKey(header.kid);
  if (!jwk) return false;

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    return false;
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64UrlDecode(signatureB64);
  const verified = crypto.verify(
    "sha256",
    Buffer.from(signingInput),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    signature,
  );
  if (!verified) return false;

  let payload: { request_body_sha256?: string; iat?: number };
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return false;
  }

  // Reject tokens older than 5 minutes to prevent replay.
  if (payload.iat && Date.now() / 1000 - payload.iat > 5 * 60) {
    return false;
  }

  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  if (!payload.request_body_sha256) return false;

  // Constant-time comparison.
  const a = Buffer.from(bodyHash);
  const b = Buffer.from(payload.request_body_sha256);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
