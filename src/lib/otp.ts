import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OTP_CHALLENGE_COOKIE = "bp_otp_challenge";
export const OTP_VERIFIED_COOKIE = "bp_otp_verified";

const OTP_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
};

const secret = () => process.env.OTP_SECRET || process.env.AUTH_SECRET || "pustok-development-otp-secret";

export const normalizeOtpPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
};

export const isValidOtpPhone = (phone: string) => /^01[3-9]\d{8}$/.test(normalizeOtpPhone(phone));

export function otpCodeSecret(phone: string, code: string) {
  return createHmac("sha256", secret()).update(`${normalizeOtpPhone(phone)}:${code}`).digest("hex");
}

export function signOtpPayload(payload: object) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function readOtpPayload<T extends object>(value: string | undefined): T | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expected = createHmac("sha256", secret()).update(data).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function createOtpCode() {
  if (process.env.NODE_ENV !== "production") return "123456";
  return String(100000 + randomBytes(3).readUIntBE(0, 3) % 900000);
}

export const otpCookieOptions = OTP_COOKIE_OPTIONS;
