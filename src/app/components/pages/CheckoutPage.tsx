// Checkout stepper: address → payment → review. Supports guest and signed-in
// checkout (saved address pick or new address), coupon validation, payment
// method selection, and order placement via the API.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { Check, ChevronLeft, CreditCard, MapPin, Plus, ShieldCheck, ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../contexts/StoreContext";
import { useAuth } from "../../contexts/AuthContext";
import { services } from "../../../services";
import { EmptyState } from "../common/EmptyState";
import { BookCover } from "../common/BookCover";
import { CONTAINER, Breadcrumbs, PanelSkeleton } from "../catalog/states";
import { useStoreSettings } from "../product/useStoreSettings";
import { COUPON_KEY, Row } from "./commerce";
import { formatTk } from "../../../lib/format";
import { DISTRICTS, PAYMENT_METHODS, OUTSIDE_SHIPPING } from "../../../lib/constants";
import type { Address, Book, OrderItem, PaymentMethod } from "../../../types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../ui/utils";

const STEPS = [
  { id: "address", label: "Delivery", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Check },
] as const;

const variantOf = (b: Book, variantId?: string) => b.variants?.find((variant) => variant.id === variantId) ?? b.variants?.[0];
const priceOf = (b: Book, variantId?: string) => variantOf(b, variantId)?.flashPrice ?? variantOf(b, variantId)?.price ?? b.flashSale?.price ?? b.price;
const NEW = "__new";

export default function CheckoutPage() {
  const { cart, bookCache, clearCart } = useStore();
  const { user, saveAddress } = useAuth();
  const settings = useStoreSettings();
  const navigate = useNavigate();

  const saved = user?.addresses ?? [];
  const def = saved.find((a) => a.isDefault) ?? saved[0];
  const [step, setStep] = useState(0);
  const [addrChoice, setAddrChoice] = useState<string>(def?.id ?? NEW);
  const [form, setForm] = useState({
    fullName: def?.fullName ?? user?.name ?? "",
    phone: def?.phone ?? user?.phone ?? "",
    district: def?.district ?? "Dhaka",
    area: def?.area ?? "",
    street: def?.street ?? "",
  });
  const [saveNew, setSaveNew] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [placing, setPlacing] = useState(false);

  // Coupon (pre-filled from cart, re-validated here against the live subtotal).
  // sessionStorage only exists in the browser, so it is read in an effect (not
  // in a useState initializer) to keep server prerendering from crashing.
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setCouponInput(sessionStorage.getItem(COUPON_KEY) ?? "");
  }, []);

  // When the user profile loads after mount, adopt the default address.
  useEffect(() => {
    if (def && addrChoice === NEW && !form.area && !form.street) setAddrChoice(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.id]);

  const lines = cart.map((c) => ({ item: c, book: bookCache[c.bookId] })).filter((l): l is { item: typeof l.item; book: Book } => !!l.book);
  const resolving = cart.length > 0 && lines.length < cart.length;
  const subtotal = lines.reduce((s, l) => s + priceOf(l.book, l.item.variantId) * l.item.qty, 0);

  const address: Omit<Address, "id" | "label" | "isDefault"> = useMemo(() => {
    if (addrChoice !== NEW) {
      const a = saved.find((x) => x.id === addrChoice);
      if (a) return { fullName: a.fullName, phone: a.phone, district: a.district, area: a.area, street: a.street };
    }
    return form;
  }, [addrChoice, saved, form]);

  const shipping = useMemo(() => {
    if (subtotal >= settings.freeShippingThreshold || subtotal === 0) return 0;
    return address.district === "Dhaka" ? settings.shippingFee : OUTSIDE_SHIPPING;
  }, [subtotal, address.district, settings.freeShippingThreshold, settings.shippingFee]);
  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const validateCoupon = async (code: string, silent = false) => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await services.coupons.validate(code.trim(), subtotal);
      if (res.ok) {
        const c = code.trim().toUpperCase();
        setApplied({ code: c, discount: res.discount });
        sessionStorage.setItem(COUPON_KEY, c);
        if (!silent) toast.success(res.message);
      } else {
        setApplied(null);
        sessionStorage.removeItem(COUPON_KEY);
        if (!silent) toast.error(res.message); else toast.message(`Coupon not applied: ${res.message}`);
      }
    } catch (err) {
      if (!silent) toast.error(`Coupon check failed: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  // Re-validate the carried-over coupon once the cart is resolved, and again
  // whenever the subtotal changes so the discount always matches the server.
  const lastValidated = useRef<number | null>(null);
  useEffect(() => {
    const code = applied?.code ?? sessionStorage.getItem(COUPON_KEY);
    if (!code || resolving || subtotal === 0 || lastValidated.current === subtotal) return;
    lastValidated.current = subtotal;
    validateCoupon(code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, resolving]);

  if (cart.length === 0) {
    return (
      <div className={cn(CONTAINER, "py-16")}>
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Add books before checking out." action={<Button asChild><Link to="/books">Shop books</Link></Button>} />
      </div>
    );
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const addressValid = !!(address.fullName && address.phone && address.area && address.street);

  const next = () => {
    if (step === 0 && !addressValid) { toast.error("Please fill in all delivery details."); return; }
    setStep((s) => Math.min(2, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) { next(); return; }
    if (!addressValid) {
      toast.error("Please fill in all delivery details.");
      setStep(0);
      return;
    }
    setPlacing(true);
    const orderAddress: Address = { id: "addr", label: "Shipping", isDefault: true, ...address };
    const items: OrderItem[] = lines.map((l) => ({
      bookId: l.book.id, variantId: l.item.variantId, variantName: variantOf(l.book, l.item.variantId)?.name,
      title: l.book.title, coverUrl: l.book.coverUrl,
      price: priceOf(l.book, l.item.variantId), quantity: l.item.qty,
    }));
    try {
      if (user && addrChoice === NEW && saveNew) {
        await saveAddress({ id: `addr_${Date.now()}`, label: "Home", isDefault: saved.length === 0, ...form }).catch((err) => console.error("Save address failed:", err));
      }
      const order = await services.orders.create({
        userId: user?.id ?? null, items, subtotal, shipping, discount, total,
        ...(applied ? { couponCode: applied.code } : {}),
        paymentMethod: payment, address: orderAddress,
      });
      clearCart();
      sessionStorage.removeItem(COUPON_KEY);
      toast.success("Order placed successfully!");
      navigate(`/order/${order.id}`);
    } catch (err) {
      toast.error(`Could not place order: ${(err as Error).message}`);
    } finally {
      setPlacing(false);
    }
  };

  const payLabel = PAYMENT_METHODS.find((m) => m.id === payment)?.label ?? payment;

  return (
    <form onSubmit={placeOrder} className={cn(CONTAINER, "py-8")}>
      <Breadcrumbs items={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]} className="mb-4" />
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>

      {/* Stepper */}
      <ol className="mb-8 mt-6 flex items-center gap-2 sm:gap-4" aria-label="Checkout steps">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 sm:gap-4 last:flex-none">
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-2 disabled:cursor-default"
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors", done ? "border-accent bg-accent text-accent-foreground" : active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
                  {done ? <Check size={15} /> : i + 1}
                </span>
                <span className={cn("hidden text-sm sm:inline", active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-accent" : "bg-border")} />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {step === 0 && (
            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-1 font-display text-xl font-semibold">Delivery address</h2>
              {!user && <p className="mb-4 text-sm text-muted-foreground">Checking out as a guest. <Link to="/login?redirect=/checkout" className="text-primary hover:underline">Sign in</Link> to use saved addresses.</p>}
              {saved.length > 0 && (
                <div className="mb-5 mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                  {saved.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={addrChoice === a.id}
                      onClick={() => setAddrChoice(a.id)}
                      className={cn("rounded-lg border p-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40", addrChoice === a.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30")}
                    >
                      <span className="flex items-center justify-between font-medium">{a.label}{a.isDefault && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Default</span>}</span>
                      <span className="mt-1 block">{a.fullName} · {a.phone}</span>
                      <span className="block text-muted-foreground">{a.street}, {a.area}, {a.district}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={addrChoice === NEW}
                    onClick={() => setAddrChoice(NEW)}
                    className={cn("flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm transition-colors", addrChoice === NEW ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                  >
                    <Plus size={15} /> Use a new address
                  </button>
                </div>
              )}
              {addrChoice === NEW && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" id="co-name"><Input id="co-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required autoComplete="name" /></Field>
                  <Field label="Phone" id="co-phone"><Input id="co-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required autoComplete="tel" /></Field>
                  <Field label="District" id="co-district">
                    <Select value={form.district} onValueChange={(v) => set("district", v)}>
                      <SelectTrigger id="co-district"><SelectValue /></SelectTrigger>
                      <SelectContent>{DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Area / Thana" id="co-area"><Input id="co-area" value={form.area} onChange={(e) => set("area", e.target.value)} required /></Field>
                  <div className="sm:col-span-2"><Field label="Street address" id="co-street"><Input id="co-street" value={form.street} onChange={(e) => set("street", e.target.value)} required autoComplete="street-address" /></Field></div>
                  {user && (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <Checkbox checked={saveNew} onCheckedChange={(v) => setSaveNew(!!v)} /> Save this address to my account
                    </label>
                  )}
                </div>
              )}
              <p className="mt-5 text-xs text-muted-foreground">{settings.deliveryEstimate}. Delivery inside Dhaka {formatTk(settings.shippingFee)}, outside Dhaka {formatTk(OUTSIDE_SHIPPING)}; free over {formatTk(settings.freeShippingThreshold)}.</p>
            </section>
          )}

          {step === 1 && (
            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Payment method</h2>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={payment === m.id}
                    onClick={() => setPayment(m.id)}
                    className={cn("flex items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40", payment === m.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30")}
                  >
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", payment === m.id ? "border-primary" : "border-muted-foreground/40")}>
                      {payment === m.id && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              {payment !== "cod" && (
                <p className="mt-4 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
                  This is a demonstration store — online payments are simulated and no real transaction or card data is processed.
                </p>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-lg font-semibold">Deliver to</h2>
                  <button type="button" onClick={() => setStep(0)} className="text-sm text-primary hover:underline">Change</button>
                </div>
                <p className="mt-2 text-sm">{address.fullName} · {address.phone}</p>
                <p className="text-sm text-muted-foreground">{address.street}, {address.area}, {address.district}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-lg font-semibold">Payment</h2>
                  <button type="button" onClick={() => setStep(1)} className="text-sm text-primary hover:underline">Change</button>
                </div>
                <p className="mt-2 text-sm">{payLabel}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 font-display text-lg font-semibold">Items ({lines.length})</h2>
                <ul className="divide-y divide-border">
                  {lines.map(({ item, book }) => (
                    <li key={item.bookId} className="flex items-center gap-3 py-3">
                      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[3px] shadow-sm"><BookCover title={book.title} coverUrl={book.coverUrl} /></div>
                      <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-medium">{book.title}</p><p className="text-xs tabular-nums text-muted-foreground">{item.qty} × {formatTk(priceOf(book))}</p></div>
                      <span className="text-sm tabular-nums">{formatTk(priceOf(book) * item.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <Button type="button" variant="ghost" className="gap-1" onClick={() => setStep((s) => s - 1)}><ChevronLeft size={16} /> Back</Button>
            ) : <Button asChild variant="ghost" className="gap-1"><Link to="/cart"><ChevronLeft size={16} /> Back to cart</Link></Button>}
            {step < 2 && <Button type="button" size="lg" onClick={next}>Continue to {STEPS[step + 1].label.toLowerCase()}</Button>}
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Your order</h2>
            {resolving && lines.length === 0 ? <PanelSkeleton rows={2} className="mt-4" /> : (
              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {lines.map(({ item, book }) => (
                  <li key={item.bookId} className="flex items-center gap-3">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-[3px] shadow-sm"><BookCover title={book.title} coverUrl={book.coverUrl} /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{book.title}</p><p className="text-xs text-muted-foreground">{variantOf(book, item.variantId)?.name ?? "Paperback (Premium)"} · Qty {item.qty}</p></div>
                    <span className="text-sm tabular-nums">{formatTk(priceOf(book, item.variantId) * item.qty)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-border pt-4">
              {applied ? (
                <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-accent"><Tag size={14} /> {applied.code}</span>
                  <button type="button" onClick={() => { setApplied(null); setCouponInput(""); sessionStorage.removeItem(COUPON_KEY); }} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Coupon code" aria-label="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validateCoupon(couponInput); } }} />
                  <Button type="button" variant="outline" disabled={checking} onClick={() => validateCoupon(couponInput)}>{checking ? "…" : "Apply"}</Button>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatTk(subtotal)} />
              {applied && <Row label={`Coupon (${applied.code})`} value={`- ${formatTk(discount)}`} tone="primary" />}
              <Row label={`Delivery (${address.district})`} value={shipping === 0 ? "Free" : formatTk(shipping)} />
              <div className="border-t border-border pt-3"><Row label="Total" value={formatTk(total)} bold /></div>
            </dl>
            {step === 2 ? (
              <Button type="submit" size="lg" className="mt-5 w-full" disabled={placing || resolving}>{placing ? "Placing order…" : `Place order · ${formatTk(total)}`}</Button>
            ) : (
              <Button type="button" size="lg" className="mt-5 w-full" onClick={next}>Continue</Button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck size={13} className="text-accent" /> Your details are sent securely</p>
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}