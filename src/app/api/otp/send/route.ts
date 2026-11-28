import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fail, handle, ok, readJson, str } from "@/lib/api-route";
import {
  OTP_CHALLENGE_COOKIE,
  createOtpCode,
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
  if (!isValidOtpPhone(phone)) return fail("Enter a valid mobile number (01XXXXXXXXX)", 400);

  const jar = await cookies();
  const existing = readOtpPayload<ChallengePayload>(jar.get(OTP_CHALLENGE_COOKIE)?.value);
  const now = Date.now();
  if (existing?.phone === phone && existing.expiresAt > now) {
    const retryAfter = Math.max(0, 60 - Math.floor((now - existing.sentAt) / 1000));
    if (retryAfter > 0) {
      return NextResponse.json(
        { ok: false, message: `Please wait ${retryAfter}s before requesting another OTP`, retryAfter },
        { status: 429 },
      );
    }
  }

  const code = createOtpCode();
  const challenge = signOtpPayload({
    phone,
    codeHash: otpCodeSecret(phone, code),
    sentAt: now,
    expiresAt: now + 10 * 60 * 1000,
    attempts: 0,
  } satisfies ChallengePayload);

  jar.set(OTP_CHALLENGE_COOKIE, challenge, {
    ...otpCookieOptions,
    maxAge: 10 * 60,
  });

  // In development, expose the code for local/demo testing. Production should
  // integrate an SMS gateway before enabling OTP delivery.
  return ok({
    ok: true,
    message: process.env.NODE_ENV === "production"
      ? "OTP sent to your mobile number"
      : "OTP sent successfully",
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
  });
});
