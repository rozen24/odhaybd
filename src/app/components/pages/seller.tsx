// Seller dashboard sub-pages: overview, sales analytics, product CRUD,
// inventory, orders, reviews and seller profile. Reads live data through the
// service layer.

import { useMemo, useRef, useState } from "react";
import {
  Boxes, DollarSign, Package, TrendingUp, Plus, Pencil, Upload, X, Star, Store, AlertTriangle, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { useAuth } from "../../contexts/AuthContext";
import { BookCover } from "../common/BookCover";
import { EmptyState } from "../common/EmptyState";
import { RatingStars } from "../common/RatingStars";
import { formatTk, formatDate } from "../../../lib/format";
import type { Book, Order, OrderStatus } from "../../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import {
  BlockSkeleton, ComingSoon, ConfirmDelete, DataTable, ErrorState, PageHeader, Panel, Pill, StatCard,
  StatGridSkeleton, TableSkeleton, chartAxis, chartTooltip, dailySeries, orderTone, uploadImage,
} from "../admin/kit";
import { BookRelationsFields } from "../admin/BookRelationsFields";

/* ------------------------------------------------------------------ */
/* Shared hooks                                                        */
/* ------------------------------------------------------------------ */

function useSellerBooks() {
  const { user } = useAuth();
  return useQuery(["books", "seller", user?.sellerId ?? "all"], () =>
    services.books.list({ sellerId: user?.sellerId, sort: "newest", pageSize: 200, includeUnpublished: true }),
  );
}

function useSellerOrders() {
  return useQuery(["orders", "seller"], () => services.orders.listForSeller());
}

// Revenue attributable to this seller: sum of line items for their books when
// the seller's catalogue is known; otherwise the order total.
function sellerOrderValue(o: Order, ids: Set<string> | null) {
  if (!ids || ids.size === 0) return o.total;
  return o.items.filter((i) => ids.has(i.bookId)).reduce((s, i) => s + i.price * i.quantity, 0);
}

function SalesChart({ orders, ids }: { orders: Order[]; ids: Set<string> | null }) {
  const data = useMemo(
    () => dailySeries(orders.filter((o) => o.status !== "cancelled").map((o) => ({ createdAt: o.createdAt, total: sellerOrderValue(o, ids) })), 30),
    [orders, ids],
  );
  if (!data.some((d) => d.revenue > 0)) return <p className="py-10 text-center text-sm text-muted-foreground">No sales in the last 30 days.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sellerRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...chartAxis} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...chartAxis} width={56} tickFormatter={(v: number) => `৳${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
        <Tooltip {...chartTooltip} formatter={(v: number) => [formatTk(v), "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#sellerRev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function SellerDashboard() {
  const orders = useSellerOrders();
  const products = useSellerBooks();
  const { user } = useAuth();
  const ids = useMemo(() => (user?.sellerId && products.data ? new Set(products.data.items.map((b) => b.id)) : null), [products.data, user?.sellerId]);

  if (orders.error || products.error) return <ErrorState error={orders.error ?? products.error} onRetry={() => { orders.refetch(); products.refetch(); }} />;

  const list = (orders.data ?? []).filter((o) => o.status !== "cancelled");
  const revenue = list.reduce((s, o) => s + sellerOrderValue(o, ids), 0);
  const books = products.data?.items ?? [];
  const low = books.filter((b) => b.stock <= 5);
  const open = (orders.data ?? []).filter((o) => !["delivered", "cancelled"].includes(o.status));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seller" title="Overview" description="Your shop at a glance, from live orders and products." actions={<BookFormDialog onSaved={() => products.refetch()} />} />
      {orders.loading || products.loading ? <StatGridSkeleton /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={DollarSign} label="Revenue" value={formatTk(revenue)} hint="Excludes cancelled" />
          <StatCard icon={Package} label="Orders" value={orders.data?.length ?? 0} hint={`${open.length} open`} />
          <StatCard icon={Boxes} label="Products" value={products.data?.total ?? 0} hint={`${low.length} low on stock`} />
          <StatCard icon={TrendingUp} label="Avg. order" value={formatTk(list.length ? revenue / list.length : 0)} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Sales, last 30 days">{orders.loading ? <BlockSkeleton /> : <SalesChart orders={orders.data ?? []} ids={ids} />}</Panel>
        <Panel title="Needs attention">
          {products.loading ? <BlockSkeleton className="h-40" /> : low.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {low.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="line-clamp-1">{b.title}</span>
                  <Pill tone={b.stock === 0 ? "negative" : "primary"}>{b.stock === 0 ? "Out of stock" : `${b.stock} left`}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent orders">
        {orders.loading ? <TableSkeleton rows={4} /> : <OrdersTable orders={(orders.data ?? []).slice(0, 5)} onRefetch={() => orders.refetch()} />}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product form                                                        */
/* ------------------------------------------------------------------ */

// Everything the form edits. Declared explicitly (rather than inferred) so the
// publisher / author / category fields are part of the state.
type BookForm = {
  title: string;
  price: number;
  oldPrice: number;
  stock: number;
  description: string;
  pages: number;
  coverUrl: string;
  status: "published" | "unpublished";
  publisherId: string;
  authorIds: string[];
  categoryIds: string[];
  variants: { name: "Paperback (Premium)" | "Hardcover (Regular)"; price: number; oldPrice: number; flashPrice: number; stock: number }[];
};

const emptyBookForm = (): BookForm => ({
  title: "", price: 0, oldPrice: 0, stock: 0, description: "", pages: 0,
  coverUrl: "", status: "published", publisherId: "", authorIds: [], categoryIds: [],
  variants: [
    { name: "Paperback (Premium)", price: 0, oldPrice: 0, flashPrice: 0, stock: 0 },
    { name: "Hardcover (Regular)", price: 0, oldPrice: 0, flashPrice: 0, stock: 0 },
  ],
});

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Product create/edit dialog. Used by sellers (own products) and admins (any
// product). The server sets the seller, SKU and a unique slug, so the client
// only sends the content fields below.
export function BookFormDialog({ book, onSaved, asAdmin }: { book?: Book; onSaved: () => void; asAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookForm>(
    book
      ? {
          title: book.title,
          price: book.price,
          oldPrice: book.oldPrice,
          stock: book.stock,
          description: book.description,
          pages: book.pages,
          coverUrl: book.coverUrl ?? "",
          status: book.status ?? "published",
          publisherId: book.publisherId ?? "",
          authorIds: book.authorIds ?? [],
          categoryIds: book.categoryIds ?? [],
          variants: (book.variants?.length ? book.variants : [
            { name: "Paperback (Premium)", price: book.price, oldPrice: book.oldPrice, flashPrice: book.variants?.[0]?.flashPrice ?? 0, stock: book.stock },
            { name: "Hardcover (Regular)", price: book.price, oldPrice: book.oldPrice, flashPrice: book.variants?.[1]?.flashPrice ?? 0, stock: book.stock },
          ]).map((variant) => ({ ...variant, flashPrice: variant.flashPrice ?? 0, name: variant.name as "Paperback (Premium)" | "Hardcover (Regular)" })),
        }
      : emptyBookForm(),
  );
  const [flashEndsAt, setFlashEndsAt] = useState("");
  const [flashOn, setFlashOn] = useState(!!book?.variants?.some((variant) => variant.flashPrice));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // The server stores the image and returns a URL for it.
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, coverUrl: url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.categoryIds.length === 0) { toast.error("Please choose at least one category"); return; }
    if (flashOn) {
      if (!form.variants.every((variant) => variant.flashPrice > 0) || !flashEndsAt) { toast.error("Enter both flash sale prices and an end time"); return; }
    }
    setSaving(true);
    try {
      const variants = form.variants.map((variant) => ({ ...variant, flashPrice: flashOn ? variant.flashPrice : 0 }));
      if (book) {
        await services.books.update(book.id, {
          ...form,
          variants,
          price: variants[0].price,
          oldPrice: variants[0].oldPrice,
          stock: variants[0].stock,
          ...(flashOn ? { flashSale: { price: variants[0].flashPrice, endsAt: new Date(flashEndsAt).toISOString() } } : { flashSale: null }),
        } as unknown as Partial<Book>);
      } else {
        await services.books.create({
          ...form,
          variants,
          price: variants[0].price,
          oldPrice: variants[0].oldPrice,
          stock: variants[0].stock,
          ...(flashOn ? { flashSale: { price: variants[0].flashPrice, endsAt: new Date(flashEndsAt).toISOString() } } : {}),
          images: form.coverUrl ? [form.coverUrl] : [],
        });
      }
      toast.success(book ? "Product updated" : "Product created");
      if (!book) {
        // Start the next "Add product" with an empty form.
        setForm(emptyBookForm());
        setFlashEndsAt("");
        setFlashOn(false);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const trigger = book
    ? <Button variant="outline" size="sm" className="gap-1.5"><Pencil size={14} /> Edit</Button>
    : <Button size="sm" className="gap-2"><Plus size={15} /> Add product</Button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{book ? "Edit product" : "New product"}{asAdmin && " (admin)"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-2">
            <Label>Prices and stock</Label>
            {form.variants.map((variant, index) => (
              <div key={variant.name} className="rounded-md border border-border p-3">
                <p className="mb-2 text-sm font-medium">{variant.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Price</Label><Input type="number" min={0} value={variant.price} onChange={(e) => setForm({ ...form, variants: form.variants.map((v, i) => i === index ? { ...v, price: Number(e.target.value) } : v) })} required /></div>
                  <div className="space-y-1.5"><Label>Old price</Label><Input type="number" min={0} value={variant.oldPrice} onChange={(e) => setForm({ ...form, variants: form.variants.map((v, i) => i === index ? { ...v, oldPrice: Number(e.target.value) } : v) })} /></div>
                  <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min={0} value={variant.stock} onChange={(e) => setForm({ ...form, variants: form.variants.map((v, i) => i === index ? { ...v, stock: Number(e.target.value) } : v) })} /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5"><Label>Pages</Label><Input type="number" min={0} value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} /></div>
          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <div className="flex items-start gap-3">
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-[3px] border border-border bg-muted">
                <BookCover title={form.title || "Cover"} coverUrl={form.coverUrl} />
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload size={14} /> {uploading ? "Uploading…" : form.coverUrl ? "Replace image" : "Upload from computer"}
                  </Button>
                  {form.coverUrl && (
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setForm({ ...form, coverUrl: "" })}>
                      <X size={14} /> Remove
                    </Button>
                  )}
                </div>
                <Input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="…or paste an image URL" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <BookRelationsFields
            value={{ publisherId: form.publisherId, authorIds: form.authorIds, categoryIds: form.categoryIds }}
            onChange={(r) => setForm((f) => ({ ...f, ...r }))}
          />

          <fieldset className="rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={flashOn} onChange={(e) => setFlashOn(e.target.checked)} />
              Flash sale
            </label>
            {flashOn && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {form.variants.map((variant, index) => (
                    <div key={variant.name} className="space-y-1.5">
                      <Label>{variant.name} flash price (৳)</Label>
                      <Input type="number" min={1} value={variant.flashPrice} onChange={(e) => setForm({ ...form, variants: form.variants.map((v, i) => i === index ? { ...v, flashPrice: Number(e.target.value) } : v) })} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5"><Label>Ends at</Label><Input type="datetime-local" value={flashEndsAt} onChange={(e) => setFlashEndsAt(e.target.value)} /></div>
              </div>
            )}
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.status === "published"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "unpublished" })} />
            Published (visible in the storefront)
          </label>
          <DialogFooter><Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export function SellerProducts() {
  const products = useSellerBooks();
  const [q, setQ] = useState("");

  const remove = async (b: Book) => {
    try { await services.books.remove(b.id); toast.success("Product deleted"); products.refetch(); } catch (err) { toast.error((err as Error).message); }
  };
  const items = (products.data?.items ?? []).filter((b) => b.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Products" description={`${products.data?.total ?? 0} products in your shop.`}
        actions={<><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" className="h-8 w-48" aria-label="Search products" /><BookFormDialog onSaved={() => products.refetch()} /></>} />
      {products.error ? <ErrorState error={products.error} onRetry={products.refetch} /> : (
        <ProductTable books={products.data ? items : undefined} loading={products.loading} onRefetch={() => products.refetch()} onDelete={remove}
          empty={<EmptyState icon={Boxes} title="No products yet" description="Add your first product to start selling." action={<BookFormDialog onSaved={() => products.refetch()} />} />} />
      )}
    </div>
  );
}

export function ProductTable({ books, loading, onRefetch, onDelete, empty, asAdmin }: { books?: Book[]; loading?: boolean; onRefetch: () => void; onDelete: (b: Book) => Promise<void>; empty?: React.ReactNode; asAdmin?: boolean }) {
  if (loading) return <TableSkeleton />;
  if (!books || books.length === 0) return <>{empty ?? <EmptyState icon={Boxes} title="No products" />}</>;
  return (
    <DataTable head={["Book", "Price", "Stock", "Status", "Actions"]} minWidth={680}>
      {books.map((b) => (
        <tr key={b.id}>
          <td>
            <div className="flex items-center gap-3">
              <div className="h-11 w-8 shrink-0 overflow-hidden rounded-[3px] border border-border"><BookCover title={b.title} coverUrl={b.coverUrl} /></div>
              <span className="line-clamp-1 font-medium">{b.title}</span>
            </div>
          </td>
          <td className="tabular-nums">
            {b.flashSale ? <><span className="font-semibold text-primary">{formatTk(b.flashSale.price)}</span> <span className="text-xs text-muted-foreground line-through">{formatTk(b.price)}</span></> : formatTk(b.price)}
          </td>
          <td className="tabular-nums">{b.stock > 0 ? b.stock : <Pill tone="negative">Out</Pill>}</td>
          <td><Pill tone={(b.status ?? "published") === "published" ? "positive" : "neutral"}>{b.status ?? "published"}</Pill></td>
          <td>
            <div className="flex justify-end gap-2">
              <BookFormDialog book={b} onSaved={onRefetch} asAdmin={asAdmin} />
              <ConfirmDelete title={`Delete "${b.title}"?`} description="The product will be removed. A book that already has orders is unpublished instead, so past orders keep working." onConfirm={() => onDelete(b)} />
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function SellerOrders() {
  const orders = useSellerOrders();
  return (
    <div>
      <PageHeader eyebrow="Fulfilment" title="Orders" description="Orders containing your books. Update status as you fulfil them." />
      {orders.error ? <ErrorState error={orders.error} onRetry={orders.refetch} /> : (
        <OrdersTable orders={orders.data} loading={orders.loading} onRefetch={() => orders.refetch()} allowStatus />
      )}
    </div>
  );
}

const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];

export function OrdersTable({ orders, loading, onRefetch, allowStatus }: { orders?: Order[]; loading?: boolean; onRefetch: () => void; allowStatus?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const setStatus = async (o: Order, next: OrderStatus) => {
    if (next === o.status) return;
    setBusy(o.id);
    try { await services.orders.updateStatus(o.id, next); toast.success(`Order ${o.id} marked ${next.replace(/_/g, " ")}`); onRefetch(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(null); }
  };
  if (loading) return <TableSkeleton />;
  if (!orders || orders.length === 0) return <EmptyState icon={Package} title="No orders yet" description="New orders will show up here." />;
  return (
    <DataTable head={["Order", "Date", "Customer", "Items", "Total", allowStatus ? "Status" : "Status"]} minWidth={720}>
      {orders.map((o) => {
        const final = o.status === "delivered" || o.status === "cancelled";
        return (
          <tr key={o.id}>
            <td className="font-mono text-xs font-medium">{o.id}</td>
            <td className="text-muted-foreground">{formatDate(o.createdAt)}</td>
            <td>{o.address?.fullName ?? "—"}</td>
            <td className="tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
            <td className="tabular-nums font-medium">{formatTk(o.total)}</td>
            <td className="text-right">
              {allowStatus && !final ? (
                <Select value={o.status} disabled={busy === o.id} onValueChange={(v) => setStatus(o, v as OrderStatus)}>
                  <SelectTrigger className="ml-auto h-8 w-[160px] capitalize" aria-label={`Status for ${o.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLOW.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Pill tone={orderTone(o.status)}>{o.status.replace(/_/g, " ")}</Pill>}
            </td>
          </tr>
        );
      })}
    </DataTable>
  );
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export function StockEditor({ book, onSaved }: { book: Book; onSaved: () => void }) {
  const [value, setValue] = useState(String(book.stock));
  const [saving, setSaving] = useState(false);
  const dirty = Number(value) !== book.stock;
  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) { toast.error("Stock must be 0 or more"); return; }
    setSaving(true);
    try { await services.books.update(book.id, { stock: Math.floor(n) }); toast.success(`Stock updated for "${book.title}"`); onSaved(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <form className="flex items-center justify-end gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-20 tabular-nums" aria-label={`Stock for ${book.title}`} />
      <Button type="submit" size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || saving}>{saving ? "…" : "Save"}</Button>
    </form>
  );
}

export function InventoryView({ books, loading, error, refetch }: { books?: Book[]; loading: boolean; error: Error | null; refetch: () => void }) {
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const all = books ?? [];
  const out = all.filter((b) => b.stock === 0);
  const low = all.filter((b) => b.stock > 0 && b.stock <= 5);
  const shown = filter === "out" ? out : filter === "low" ? low : all;
  return (
    <div className="space-y-4">
      {loading ? <StatGridSkeleton count={3} /> : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Boxes} label="Products" value={all.length} />
          <StatCard icon={AlertTriangle} label="Low stock (≤5)" value={low.length} />
          <StatCard icon={Package} label="Out of stock" value={out.length} />
        </div>
      )}
      <div className="flex gap-1" role="tablist">
        {(["all", "low", "out"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
            {f === "all" ? "All" : f === "low" ? "Low stock" : "Out of stock"}
          </Button>
        ))}
      </div>
      {loading ? <TableSkeleton /> : shown.length === 0 ? (
        <EmptyState icon={Boxes} title={filter === "all" ? "No products" : "Nothing here"} description={filter === "all" ? undefined : "Every product in this view is well stocked."} />
      ) : (
        <DataTable head={["Book", "Price", "Level", "Stock"]} minWidth={600}>
          {[...shown].sort((a, b) => a.stock - b.stock).map((b) => (
            <tr key={b.id}>
              <td><div className="flex items-center gap-3"><div className="h-10 w-7 shrink-0 overflow-hidden rounded-[3px] border border-border"><BookCover title={b.title} coverUrl={b.coverUrl} /></div><span className="line-clamp-1">{b.title}</span></div></td>
              <td className="tabular-nums">{formatTk(b.price)}</td>
              <td>{b.stock === 0 ? <Pill tone="negative">Out of stock</Pill> : b.stock <= 5 ? <Pill tone="primary">Low</Pill> : <Pill tone="positive">In stock</Pill>}</td>
              <td><StockEditor key={`${b.id}-${b.stock}`} book={b} onSaved={refetch} /></td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

export function SellerInventory() {
  const products = useSellerBooks();
  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Inventory" description="Track stock levels and update them inline." />
      <InventoryView books={products.data?.items} loading={products.loading} error={products.error} refetch={products.refetch} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sales & analytics                                                   */
/* ------------------------------------------------------------------ */

export function SellerSales() {
  const orders = useSellerOrders();
  const products = useSellerBooks();
  const { user } = useAuth();
  const ids = useMemo(() => (user?.sellerId && products.data ? new Set(products.data.items.map((b) => b.id)) : null), [products.data, user?.sellerId]);

  const top = useMemo(() => {
    const map = new Map<string, { title: string; units: number; revenue: number }>();
    (orders.data ?? []).filter((o) => o.status !== "cancelled").forEach((o) => o.items.forEach((i) => {
      if (ids && ids.size && !ids.has(i.bookId)) return;
      const p = map.get(i.bookId) ?? { title: i.title, units: 0, revenue: 0 };
      map.set(i.bookId, { title: i.title, units: p.units + i.quantity, revenue: p.revenue + i.price * i.quantity });
    }));
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders.data, ids]);

  if (orders.error) return <ErrorState error={orders.error} onRetry={orders.refetch} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Shop" title="Sales & analytics" description="Computed from your real orders." />
      <Panel title="Daily revenue, last 30 days">{orders.loading ? <BlockSkeleton /> : <SalesChart orders={orders.data ?? []} ids={ids} />}</Panel>
      <Panel title="Top books by revenue">
        {orders.loading ? <BlockSkeleton /> : top.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No sales yet.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(180, top.length * 36)}>
            <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" {...chartAxis} tickFormatter={(v: number) => `৳${v}`} />
              <YAxis type="category" dataKey="title" {...chartAxis} width={140} tickFormatter={(t: string) => (t.length > 20 ? `${t.slice(0, 19)}…` : t)} />
              <Tooltip {...chartTooltip} formatter={(v: number, n: string) => (n === "revenue" ? [formatTk(v), "Revenue"] : [v, "Units"])} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 3, 3, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

// Back-compat alias for the old route name.
export const SellerAnalytics = SellerSales;

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export function SellerReviews() {
  const products = useSellerBooks();
  const books = (products.data?.items ?? []).slice(0, 60);
  const reviews = useQuery(
    ["reviews", "seller", books.map((b) => b.id).join(",")],
    async () => {
      const lists = await Promise.all(books.map((b) => services.reviews.forBook(b.id).then((rs) => rs.map((r) => ({ ...r, bookTitle: b.title })))));
      return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    { enabled: !!products.data },
  );
  const err = products.error ?? reviews.error;
  const loading = products.loading || reviews.loading || (!!products.data && !reviews.data && !reviews.error);
  const avg = reviews.data?.length ? reviews.data.reduce((s, r) => s + r.rating, 0) / reviews.data.length : 0;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Fulfilment" title="Reviews" description="Published reviews on your books." />
      {err ? <ErrorState error={err} onRetry={() => { products.refetch(); reviews.refetch(); }} /> : loading ? <TableSkeleton rows={4} /> : !reviews.data || reviews.data.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews from readers will appear here once approved." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={MessageSquare} label="Reviews" value={reviews.data.length} />
            <StatCard icon={Star} label="Average rating" value={avg.toFixed(1)} />
          </div>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {reviews.data.map((r) => (
              <article key={r.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm"><span className="font-medium">{r.userName}</span> <span className="text-muted-foreground">on</span> <span className="font-display">{r.bookTitle}</span></p>
                  <div className="flex items-center gap-2"><RatingStars value={r.rating} /><span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span></div>
                </div>
                {r.title && <p className="mt-1.5 font-medium">{r.title}</p>}
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seller profile                                                      */
/* ------------------------------------------------------------------ */

export function SellerProfile() {
  const { user } = useAuth();
  const sellers = useQuery(["catalog", "sellers"], () => services.catalog.sellers());
  const seller = sellers.data?.find((s) => s.id === user?.sellerId);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Settings" title="Seller profile" description="How your shop appears to readers." actions={<span className="flex items-center gap-2"><Button size="sm" variant="outline" disabled>Edit profile</Button><ComingSoon /></span>} />
      {sellers.error ? <ErrorState error={sellers.error} onRetry={sellers.refetch} /> : sellers.loading ? <BlockSkeleton className="h-40" /> : !seller ? (
        <EmptyState icon={Store} title="No seller record linked" description={user?.role === "admin" ? "Admin accounts aren't linked to a seller shop." : "Your account isn't linked to a seller shop yet. Contact an admin."} />
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {seller.logoUrl ? <img src={seller.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={24} className="text-muted-foreground" />}
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">{seller.name}</h3>
              <p className="text-sm text-muted-foreground">/{seller.slug}</p>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div><dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rating</dt><dd className="mt-1 flex items-center gap-2"><RatingStars value={seller.rating} /> <span className="tabular-nums">{seller.rating.toFixed(1)}</span></dd></div>
            <div><dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Selling since</dt><dd className="mt-1">{seller.since || "—"}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Account email</dt><dd className="mt-1">{user?.email}</dd></div>
          </dl>
        </Panel>
      )}
    </div>
  );
}