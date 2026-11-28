// components/checkout/OtpVerifier.tsx
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { services } from "../../../services";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export const normalizePhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.startsWith("880") ? `0${d.slice(3)}` : d; // → 01XXXXXXXXX
};
export const isValidBdPhone = (p: string) => /^01[3-9]\d{8}$/.test(normalizePhone(p));

export function OtpVerifier({ phone, verified, onVerified }: {
  phone: string; verified: boolean; onVerified: (token: string) => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Phone changed → go back to the initial state
  useEffect(() => {
    setSent(false);
    setCode("");
    setCooldown(0);
  }, [phone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!isValidBdPhone(phone)) { toast.error("Enter a valid mobile number (01XXXXXXXXX)."); return; }
    setSending(true);
    try {
      const res = await services.otp.send(normalizePhone(phone));
      if (res.ok) {
        setSent(true);
        setCooldown(60);
        toast.success(res.devCode ? `${res.message}. Test code: ${res.devCode}` : res.message);
      }
      else { if (res.retryAfter) setCooldown(res.retryAfter); toast.error(res.message); }
    } catch { toast.error("Could not send OTP. Please try again."); }
    finally { setSending(false); }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const res = await services.otp.verify(normalizePhone(phone), code);
      if (res.ok && res.token) { onVerified(res.token); toast.success("Mobile number verified"); }
      else toast.error(res.message);
    } catch { toast.error("Verification failed. Please try again."); }
    finally { setVerifying(false); }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
        <BadgeCheck size={16} /> {normalizePhone(phone)} is verified
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Verify your mobile number</p>
      <div className="flex gap-2">
        <Input value={phone} readOnly aria-label="Mobile number" className="bg-muted/40" />
        <Button type="button" onClick={send} disabled={sending || cooldown > 0}>
          {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : sent ? "Resend OTP" : "Send OTP"}
        </Button>
      </div>
      {sent && (
        <div className="flex gap-2">
          <Input
            type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" aria-label="OTP code"
            autoComplete="one-time-code" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verify(); } }}
          />
          <Button type="button" variant="outline" onClick={verify} disabled={verifying || code.length !== 6}>
            {verifying ? "Checking…" : "Verify"}
          </Button>
        </div>
      )}
    </div>
  );
}