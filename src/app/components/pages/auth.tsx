// Auth pages: login, register, forgot password, reset password, and the
// one-time admin bootstrap. Backed by the app's Prisma session auth.

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/navigation";
import { BookMarked, Heart, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../../services/api/client";
import { SITE_NAME, SITE_TAGLINE } from "../../../lib/constants";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";

function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-10rem)] w-full max-w-[1320px] lg:grid-cols-2 lg:gap-6 lg:px-6 lg:py-10">
      {/* Editorial panel */}
      <aside className="hidden flex-col justify-between rounded-lg bg-accent p-12 text-accent-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-current/20"><BookMarked size={20} /></span>
          <span className="font-display text-2xl font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">{SITE_TAGLINE}</p>
          <blockquote className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight">
            “A room without books is like a body without a soul.”
          </blockquote>
          <p className="mt-3 text-sm opacity-70">— Marcus Tullius Cicero</p>
        </div>
        <ul className="grid grid-cols-3 gap-4 border-t border-current/15 pt-6 text-xs opacity-80">
          <li className="flex items-center gap-2"><Truck size={15} /> Nationwide delivery</li>
          <li className="flex items-center gap-2"><ShieldCheck size={15} /> Authentic books</li>
          <li className="flex items-center gap-2"><Heart size={15} /> Wishlists & reviews</li>
        </ul>
      </aside>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-16">
        <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookMarked size={18} /></span>
          <span className="font-display text-xl font-semibold">{SITE_NAME}</span>
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-8 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({ id, label, children, aside }: { id: string; label: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label>{aside}</div>
      {children}
    </div>
  );
}

function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2 bg-card"
      onClick={() => signInWithGoogle().catch((e) => toast.error(`Google sign-in failed: ${e.message}. The provider is not configured.`))}
    >
      <span aria-hidden className="font-display text-base font-semibold">G</span> Continue with Google
    </Button>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate(params.get("redirect") || "/account");
    } catch (err) {
      toast.error(`Sign-in failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" subtitle="Access your account, orders and wishlist">
      <GoogleButton />
      <OrDivider />
      <form onSubmit={submit} className="space-y-4">
        <Field id="login-email" label="Email"><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field id="login-password" label="Password" aside={<Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>}>
          <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">New to {SITE_NAME}? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" as "customer" | "seller" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(form);
      toast.success("Account created!");
      navigate("/account");
    } catch (err) {
      toast.error(`Sign-up failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Join the shop" title="Create account" subtitle="Join Boierpata to start shopping">
      <GoogleButton />
      <OrDivider />
      <form onSubmit={submit} className="space-y-4">
        <Field id="reg-name" label="Full name"><Input id="reg-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field id="reg-email" label="Email"><Input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field id="reg-password" label="Password"><Input id="reg-password" type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
        <div className="space-y-1.5">
          <Label>Account type</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
            {([["customer", "Buy books"], ["seller", "Sell on Boierpata"]] as const).map(([r, hint]) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={form.role === r}
                onClick={() => setForm({ ...form, role: r })}
                className={cn("rounded-md border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40", form.role === r ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/30")}
              >
                <span className="block font-medium capitalize">{r}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      toast.error(`Could not send reset email: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Account help" title="Reset password" subtitle="We'll email you a reset link">
      {sent ? (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 text-sm">
          <p>If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/login">Back to sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field id="fp-email" label="Email"><Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
          <p className="text-center text-sm text-muted-foreground"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      await api.post("/auth/reset-password", { token, password });
      // success: same handling you had after a successful update
      toast.success("Password updated. Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(`Could not update password: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Account help" title="Set new password" subtitle="Choose a new password for your account">
      <form onSubmit={submit} className="space-y-4">
        <Field id="rp-password" label="New password"><Input id="rp-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
      </form>
    </AuthShell>
  );
}

// One-time initial-admin bootstrap. Self-signup can never grant the admin role
// (privilege-escalation guard), so the very first admin is minted here: create a
// normal account, then promote it with the server-side ADMIN_BOOTSTRAP_SECRET.
// The secret is verified by the edge function; it is never stored in the client.
export function BootstrapAdminPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("rozencs73@gmail.com");
  const [password, setPassword] = useState("Rx025896");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // One call: creates the account if it doesn't exist, then promotes to admin.
      await api.post("/admin/bootstrap", { email, password, secret });
      toast.success("Admin account ready. Signing you in…");
      // Sign in with the credentials so the new admin session activates immediately.
      await signIn(email, password);
      navigate("/admin");
    } catch (err) {
      toast.error(`Bootstrap failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="One-time setup" title="Create initial admin" subtitle="Create & promote the first admin account">
      <p className="mb-5 rounded-md bg-secondary p-3 text-sm text-muted-foreground">
        Enter your <strong className="text-foreground">admin bootstrap secret</strong> (the value you set for
        <code className="mx-1 rounded bg-muted px-1">ADMIN_BOOTSTRAP_SECRET</code>) and submit.
        The account below is created (if needed) and promoted to admin in one step.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Field id="ba-email" label="Admin email"><Input id="ba-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field id="ba-password" label="Password"><Input id="ba-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <Field id="ba-secret" label="Admin bootstrap secret"><Input id="ba-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Your ADMIN_BOOTSTRAP_SECRET" required /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Creating admin…" : "Create admin & sign in"}</Button>
      </form>
    </AuthShell>
  );
}
