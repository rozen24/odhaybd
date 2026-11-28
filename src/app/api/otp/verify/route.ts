import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";
import {
  OTP_CHALLENGE_COOKIE,
  OTP_VERIFIED_COOKIE,
  isValidOtpPhone,
  normalizeOtpPhone,
  otpCookieOptions,
  otpCodeSecret,
  readOtpPayload,
  signOtpPayload,
} from "@/lib/otp";

type ChallengePayload = {
  phone: string;
  codeHash: string;
  sentAt: number;
  expiresAt: number;
  attempts: number;
};

export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const phone = normalizeOtpPhone(str(body.phone, 30));
  const code = str(body.code, 6);
  if (!isValidOtpPhone(phone) || !/^\d{6}$/.test(code)) {
    return fail("Enter a valid mobile number and 6-digit OTP", 400);
  }

  const jar = await cookies();
  const challenge = readOtpPayload<ChallengePayload>(jar.get(OTP_CHALLENGE_COOKIE)?.value);
  if (!challenge || challenge.phone !== phone) return fail("Please request a new OTP", 400);
  if (challenge.expiresAt < Date.now()) {
    jar.delete({ name: OTP_CHALLENGE_COOKIE, path: otpCookieOptions.path });
    return fail("OTP has expired. Please request a new one", 400);
  }
  if (challenge.attempts >= 5) return fail("Too many incorrect attempts. Please request a new OTP", 429);

  const supplied = otpCodeSecret(phone, code);
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const storedBuffer = Buffer.from(challenge.codeHash, "hex");
  const matches = suppliedBuffer.length === storedBuffer.length && timingSafeEqual(suppliedBuffer, storedBuffer);
  if (!matches) {
    challenge.attempts += 1;
    jar.set(OTP_CHALLENGE_COOKIE, signOtpPayload(challenge), {
      ...otpCookieOptions,
      maxAge: Math.max(1, Math.floor((challenge.expiresAt - Date.now()) / 1000)),
    });
    return fail("Invalid OTP", 400);
  }

  const tokenId = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 30 * 60 * 1000;
  const token = signOtpPayload({ phone, tokenId, expiresAt });
  jar.delete({ name: OTP_CHALLENGE_COOKIE, path: otpCookieOptions.path });
  jar.set(OTP_VERIFIED_COOKIE, createHash("sha256").update(token).digest("hex"), {
    ...otpCookieOptions,
    maxAge: 30 * 60,
  });

  return ok({ ok: true, message: "Mobile number verified", token });
});
