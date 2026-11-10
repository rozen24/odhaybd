// Admin dashboard sub-pages: overview, products, orders, customers, reviews
// moderation, coupon management, catalog overview and user/role management.
// Catalogue CRUD and operations pages live in ../admin/.

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, DollarSign, Package, Users, Star, Plus, Check, X, ShieldCheck, Ban, Tag, TrendingUp, Boxes } from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { useAuth } from "../../contexts/AuthContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { BookCover } from "../common/BookCover";
import { EmptyState } from "../common/EmptyState";
import { RatingStars } from "../common/RatingStars";
import { BookFormDialog, OrdersTable } from "./seller";
import { formatTk, formatDate } from "../../../lib/format";
import type { Coupon, Order, Profile, UserRole } from "../../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import {
  BlockSkeleton, CHART_COLORS, ConfirmDelete, DataTable, ErrorState, PageHeader, Panel, Pill, StatCard,
  StatGridSkeleton, TableSkeleton, chartAxis, chartTooltip, dailySeries,
} from "../admin/kit";

export function AdminDashboard() {
  const orders = useQuery(["orders", "all"], () => services.orders.listAll());
  const { topCategories } = useCatalog();

  const live = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const trend = useMemo(() => dailySeries(live, 30), [orders.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusBars = useMemo(() => {
    const map = new Map<string, number>();
    (orders.data ?? []).forEach((o) => map.set(o.status, (map.get(o.status) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [orders.data]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Overview" description="Store performance from live orders." />
      {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : (
        <>
          {orders.loading ? <StatGridSkeleton /> : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard icon={DollarSign} label="Revenue" value={formatTk(revenue)} hint="Excludes cancelled" />
              <StatCard icon={Package} label="Orders" value={orders.data?.length ?? 0} />
              <StatCard icon={Boxes} label="Top categories" value={topCategories.length} />
              <StatCard icon={TrendingUp} label="Avg. order" value={formatTk(live.length ? revenue / live.length : 0)} />
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Revenue, last 30 days">
              {orders.loading ? <BlockSkeleton /> : !trend.some((d) => d.revenue > 0) ? <p className="py-10 text-center text-sm text-muted-foreground">No sales in the last 30 days.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trend} margin={{ right: 8, top: 8 }}>
                    <defs><linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" {...chartAxis} minTickGap={24} />
                    <YAxis {...chartAxis} width={56} tickFormatter={(v: number) => `৳${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                    <Tooltip {...chartTooltip} formatter={(v: number) => [formatTk(v), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#adminRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Panel>
            <Panel title="Orders by status">
              {orders.loading ? <BlockSkeleton /> : statusBars.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} {...chartAxis} />
                    <YAxis type="category" dataKey="name" {...chartAxis} width={110} />
                    <Tooltip {...chartTooltip} formatter={(v: number) => [v, "Orders"]} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14}>
                      {statusBars.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>
          <Panel title="Latest orders">
            {orders.loading ? <TableSkeleton rows={4} /> : <OrdersTable orders={(orders.data ?? []).slice(0, 6)} onRefetch={orders.refetch} />}
          </Panel>
        </>
      )}
    </div>
  );
}

export function AdminProducts() {
  // Admins see every product, including unpublished ones.
  const products = useQuery(["books", "admin"], () => services.books.list({ sort: "order", pageSize: 200, includeUnpublished: true }));
  const { authorById } = useCatalog();
  const [q, setQ] = useState("");

  const remove = async (id: string) => {
    try { await services.books.remove(id); toast.success("Product deleted"); products.refetch(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const togglePublish = async (b: { id: string; status?: string; title: string }) => {
    const next = (b.status ?? "published") === "published" ? "unpublished" : "published";
    try { await services.books.update(b.id, { status: next } as any); toast.success(`"${b.title}" ${next}`); products.refetch(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const allItems = products.data?.items ?? [];
  const items = allItems.filter((b) => b.title.toLowerCase().includes(q.toLowerCase()));
  const moveProduct = async (index: number, dir: -1 | 1) => {
    const next = allItems.slice();
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await services.books.reorder(next.map((book) => book.id));
      toast.success("Order saved");
      products.refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Products" description={`${products.data?.total ?? 0} products across all sellers, including unpublished.`}
        actions={<><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" className="h-8 w-48" aria-label="Search products" /><BookFormDialog asAdmin onSaved={() => products.refetch()} /></>} />
      {products.error ? <ErrorState error={products.error} onRetry={products.refetch} /> : products.loading ? <TableSkeleton /> : items.length === 0 ? (
        <EmptyState icon={Boxes} title="No products" description={q ? "No titles match your search." : "Create the first product."} />
      ) : (
        <DataTable head={["Book", "Author", "Price", "Stock", "Status", "Actions"]} minWidth={860}>
          {items.map((b) => {
            const published = (b.status ?? "published") === "published";
            return (
              <tr key={b.id}>
                <td><div className="flex items-center gap-3"><div className="h-11 w-8 shrink-0 overflow-hidden rounded-[3px] border border-border"><BookCover title={b.title} coverUrl={b.coverUrl} /></div><span className="line-clamp-1 font-medium">{b.title}</span></div></td>
                <td className="text-muted-foreground">{b.authorIds.map((id) => authorById(id)?.name).filter(Boolean).join(", ") || "—"}</td>
                <td className="tabular-nums">{formatTk(b.flashSale?.price ?? b.price)}</td>
                <td className="tabular-nums">{b.stock > 0 ? b.stock : <Pill tone="negative">Out</Pill>}</td>
                <td><Pill tone={published ? "positive" : "neutral"}>{b.status ?? "published"}</Pill></td>
                <td>
                  <div className="flex justify-end gap-2">
                    {!q && <div className="flex shrink-0 gap-0.5">
                      <Button type="button" variant="outline" size="icon" className="size-8" title={`Move ${b.title} up`} disabled={items.indexOf(b) === 0} onClick={() => moveProduct(items.indexOf(b), -1)} aria-label={`Move ${b.title} up`}><ArrowUp size={14} /></Button>
                      <Button type="button" variant="outline" size="icon" className="size-8" title={`Move ${b.title} down`} disabled={items.indexOf(b) === items.length - 1} onClick={() => moveProduct(items.indexOf(b), 1)} aria-label={`Move ${b.title} down`}><ArrowDown size={14} /></Button>
                    </div>}
                    <Button variant="outline" size="sm" onClick={() => togglePublish(b)}>{published ? "Unpublish" : "Publish"}</Button>
                    <BookFormDialog book={b} asAdmin onSaved={() => products.refetch()} />
                    <ConfirmDelete title={`Delete "${b.title}"?`} onConfirm={() => remove(b.id)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}

export function AdminOrders() {
  const orders = useQuery(["orders", "all"], () => services.orders.listAll());
  const [status, setStatus] = useState<string>("all");
  const shown = (orders.data ?? []).filter((o) => status === "all" || o.status === status);
  return (
    <div>
      <PageHeader eyebrow="Commerce" title="Orders" description="Every order in the store. Change status inline."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[170px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        } />
      {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : (
        <OrdersTable orders={orders.data ? (shown as Order[]) : undefined} loading={orders.loading} onRefetch={() => orders.refetch()} allowStatus />
      )}
    </div>
  );
}

export function AdminCustomers() {
  const orders = useQuery(["orders", "all"], () => services.orders.listAll());
  // Derive unique customers from orders (shipping name + phone).
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; district: string; orders: number; spent: number; last: string }>();
    (orders.data ?? []).forEach((o) => {
      const key = o.address.fullName + o.address.phone;
      const prev = map.get(key) ?? { name: o.address.fullName, phone: o.address.phone, district: o.address.district, orders: 0, spent: 0, last: o.createdAt };
      map.set(key, { ...prev, orders: prev.orders + 1, spent: prev.spent + o.total, last: o.createdAt > prev.last ? o.createdAt : prev.last });
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [orders.data]);
  return (
    <div>
      <PageHeader eyebrow="Commerce" title="Customers" description="Derived from order shipping details, ranked by spend." />
      {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : orders.loading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Users} title="No customers yet" description="Customers appear after their first order." /> : (
        <DataTable head={["Name", "Phone", "District", "Orders", "Last order", "Total spent"]} minWidth={680}>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="font-medium">{r.name}</td>
              <td className="text-muted-foreground">{r.phone}</td>
              <td>{r.district}</td>
              <td className="tabular-nums">{r.orders}</td>
              <td className="text-muted-foreground">{formatDate(r.last)}</td>
              <td className="text-right tabular-nums font-medium">{formatTk(r.spent)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export function AdminReviews() {
  const pending = useQuery(["reviews", "pending"], () => services.reviews.pending());
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, approved: boolean) => {
    setBusy(id);
    try { await services.reviews.setApproved(id, approved); toast.success(approved ? "Review approved" : "Review rejected"); pending.refetch(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(null); }
  };
  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Review moderation" description="Approve or reject newly submitted reviews." />
      {pending.error ? <ErrorState error={pending.error} onRetry={pending.refetch} /> : pending.loading ? <TableSkeleton rows={3} /> : !pending.data || pending.data.length === 0 ? (
        <EmptyState icon={Star} title="Nothing to moderate" description="Newly submitted reviews will appear here for approval." />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {pending.data.map((r) => (
            <article key={r.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.userName} <span className="font-normal text-muted-foreground">· {formatDate(r.createdAt)}</span></span>
                <RatingStars value={r.rating} />
              </div>
              {r.title && <p className="mt-2 font-medium">{r.title}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" disabled={busy === r.id} onClick={() => act(r.id, true)}><Check size={14} /> Approve</Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={busy === r.id} onClick={() => act(r.id, false)}><X size={14} /> Reject</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function CouponsManager() {
  const coupons = useQuery(["coupons"], () => services.coupons.all());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent" as Coupon["type"], value: 10, minSpend: 0, days: 90 });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { days, ...rest } = form;
      await services.coupons.create({ ...rest, active: true, expiresAt: new Date(Date.now() + days * 86400000).toISOString() });
      toast.success("Coupon created");
      setOpen(false);
      setForm({ code: "", type: "percent", value: 10, minSpend: 0, days: 90 });
      coupons.refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const remove = async (code: string) => {
    try { await services.coupons.remove(code); toast.success(`Coupon ${code} deleted`); coupons.refetch(); }
    catch (err) { toast.error((err as Error).message); }
  };

  return (
    <Panel title="Coupons" actions={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus size={15} /> New coupon</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Create coupon</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Coupon["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="flat">Flat (৳)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Value</Label><Input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Minimum spend (৳)</Label><Input type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Valid for (days)</Label><Input type="number" min={1} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    }>
      {coupons.error ? <ErrorState error={coupons.error} onRetry={coupons.refetch} /> : coupons.loading ? <TableSkeleton rows={3} /> : !coupons.data || coupons.data.length === 0 ? (
        <EmptyState icon={Tag} title="No coupons" description="Create a code customers can apply at checkout." />
      ) : (
        <DataTable head={["Code", "Discount", "Min. spend", "Expires", "Status", ""]} minWidth={600}>
          {coupons.data.map((c) => {
            const expired = new Date(c.expiresAt).getTime() < Date.now();
            return (
              <tr key={c.code}>
                <td className="font-mono font-semibold text-primary">{c.code}</td>
                <td>{c.type === "percent" ? `${c.value}% off` : `${formatTk(c.value)} off`}</td>
                <td className="tabular-nums">{formatTk(c.minSpend)}</td>
                <td className="text-muted-foreground">{formatDate(c.expiresAt)}</td>
                <td><Pill tone={c.active && !expired ? "positive" : "neutral"}>{expired ? "Expired" : c.active ? "Active" : "Inactive"}</Pill></td>
                <td className="text-right"><ConfirmDelete iconOnly title={`Delete coupon ${c.code}?`} onConfirm={() => remove(c.code)} /></td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </Panel>
  );
}

export function AdminCoupons() {
  return (
    <div>
      <PageHeader eyebrow="Commerce" title="Coupons" description="Checkout codes. For per-book flash sales see Discounts." />
      <CouponsManager />
    </div>
  );
}

export function AdminCatalog() {
  const { topCategories, authors, publishers, childrenOf, loading } = useCatalog();
  if (loading) return <div className="space-y-4"><StatGridSkeleton count={3} /><BlockSkeleton /></div>;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catalogue" title="Catalog overview" description="Manage each list from Authors, Publishers and Categories." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Boxes} label="Top categories" value={topCategories.length} />
        <StatCard icon={Users} label="Authors" value={authors.length} />
        <StatCard icon={Package} label="Publishers" value={publishers.length} />
      </div>
      <Panel title="Categories">
        {topCategories.length === 0 ? <p className="text-sm text-muted-foreground">No categories.</p> : (
          <ul className="divide-y divide-border text-sm">
            {topCategories.map((c) => (
              <li key={c.id} className="py-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{childrenOf(c.id).map((s) => s.name).join(", ") || "No subcategories"}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const ROLE_TONE: Record<UserRole, "negative" | "primary" | "neutral"> = { admin: "negative", seller: "primary", customer: "neutral" };

// Full user & role management: list all accounts, create users/sellers/admins,
// change roles, suspend/reactivate, and delete. All actions are enforced on the
// backend (admin-only) — this UI merely surfaces them.
export function AdminUsers() {
  const { user, refresh } = useAuth();
  const users = useQuery(["admin", "users"], () => services.adminUsers.list());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" as UserRole });
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const run = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(id);
    try { await fn(); toast.success(msg); users.refetch(); if (id === user?.id) await refresh(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(null); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await services.adminUsers.create(form);
      toast.success("Account created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "customer" });
      users.refetch();
    } catch (err) { toast.error((err as Error).message); }
  };

  const shown = (users.data ?? []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Access" title="Users & roles"
        description="Role and status changes revoke the affected user's sessions, so they take effect on that user's next request."
        actions={<>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="h-8 w-48" aria-label="Search users" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus size={15} /> New account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create account</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
                <div className="space-y-1.5"><Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer (buyer)</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>} />

      {users.error ? <ErrorState error={users.error} onRetry={users.refetch} /> : users.loading ? <TableSkeleton /> : shown.length === 0 ? (
        <EmptyState icon={Users} title={q ? "No matching users" : "No users yet"} />
      ) : (
        <DataTable head={["Name", "Email", "Role", "Status", "Actions"]} minWidth={820}>
          {shown.map((u: Profile) => {
            const self = u.id === user?.id;
            const suspended = u.status === "suspended";
            return (
              <tr key={u.id}>
                <td className="font-medium">{u.name}{self && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>} <span className="ml-1 hidden sm:inline"><Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill></span></td>
                <td className="text-muted-foreground">{u.email}</td>
                <td>
                  <Select value={u.role} disabled={self || busy === u.id} onValueChange={(v) => run(u.id, () => services.adminUsers.setRole(u.id, v as UserRole), `Role changed to ${v}`)}>
                    <SelectTrigger className="h-8 w-[130px]" aria-label={`Role for ${u.email}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td><Pill tone={suspended ? "negative" : "positive"}>{u.status ?? "active"}</Pill></td>
                <td>
                  <div className="flex justify-end gap-2">
                    {!self && (suspended ? (
                      <Button variant="outline" size="sm" className="gap-1.5" disabled={busy === u.id} onClick={() => run(u.id, () => services.adminUsers.setStatus(u.id, "active"), "Reactivated")}><ShieldCheck size={14} /> Reactivate</Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1.5" disabled={busy === u.id} onClick={() => run(u.id, () => services.adminUsers.setStatus(u.id, "suspended"), "Suspended")}><Ban size={14} /> Suspend</Button>
                    ))}
                    {!self && (
                      <ConfirmDelete title={`Delete ${u.email}?`} description="The account and its sign-in will be permanently removed." onConfirm={() => run(u.id, () => services.adminUsers.remove(u.id), "Account deleted")} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
