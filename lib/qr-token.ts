import crypto from 'node:crypto'

/**
 * Short-lived, HMAC-signed identifier encoded in a customer's QR code.
 *
 * The QR rotates every minute. Because the expiry is baked into the signed
 * payload, a screenshot of an old QR is rejected by the cashier once its window
 * passes. Verification is stateless — recompute the HMAC and check the expiry —
 * so there is no token table to store or clean up.
 *
 * The signing secret lives ONLY on the server (`QR_SIGNING_SECRET`). If it is
 * missing we throw rather than fall back to something guessable (fail-closed).
 */

export const QR_TOKEN_TTL_MS = 60_000 // QR valid for 60 seconds
// Tolerance so a token that just rotated on the customer's screen (or minor
// clock skew) still verifies for a short moment past its stated expiry.
export const QR_TOKEN_GRACE_MS = 15_000

const VERSION = 'v1'

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET is not set — cannot sign/verify QR tokens')
  }
  return secret
}

function hmac(payload: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(payload).digest()
}

export function signQrToken(customerId: string): { token: string; expiresAt: number } {
  const secret = getSecret()
  const expiresAt = Date.now() + QR_TOKEN_TTL_MS
  // customerId is a UUID (no dots) and expiresAt is numeric, so '.' is a safe
  // separator for both the payload and the token itself (base64url has no '.').
  const payload = `${VERSION}.${customerId}.${expiresAt}`
  const sig = Buffer.from(hmac(payload, secret)).toString('base64url')
  const token = `${Buffer.from(payload).toString('base64url')}.${sig}`
  return { token, expiresAt }
}

export type VerifyResult =
  | { valid: true; customerId: string }
  | { valid: false; reason: 'invalid' | 'expired' }

export function verifyQrToken(token: string): VerifyResult {
  const secret = getSecret()
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'invalid' }
  }

  const [encodedPayload, encodedSig] = token.split('.')
  if (!encodedPayload || !encodedSig) return { valid: false, reason: 'invalid' }

  const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
  const expectedSig = hmac(payload, secret)
  const providedSig = Buffer.from(encodedSig, 'base64url')

  // Constant-time compare; mismatched lengths would throw timingSafeEqual.
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    return { valid: false, reason: 'invalid' }
  }

  const parts = payload.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { valid: false, reason: 'invalid' }
  }

  const customerId = parts[1]
  const expiresAt = Number(parts[2])
  if (!customerId || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: 'invalid' }
  }

  if (Date.now() > expiresAt + QR_TOKEN_GRACE_MS) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, customerId }
}
