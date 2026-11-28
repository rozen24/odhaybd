// services/otp.ts
export const otp = {
  send: (phone: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/otp/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })
      .then((r) => r.json()) as Promise<{ ok: boolean; message: string; retryAfter?: number; devCode?: string }>,
  verify: (phone: string, code: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/otp/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) })
      .then((r) => r.json()) as Promise<{ ok: boolean; message: string; token?: string }>,
};