// Admin operations: inventory, discounts (coupons + flash sales), reports and
// store settings.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Boxes, DollarSign, Mail, Package, Plus, Trash2, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { useCatalog } from "../../contexts/CatalogContext";
import { formatDate, formatTk } from "../../../lib/format";
import type { Book, HomeSection, StoreSettings } from "../../../types";
import { EmptyState } from "../common/EmptyState";
import { BookCover } from "../common/BookCover";
import { InventoryView } from "../pages/seller";
import { CouponsManager } from "../pages/admin";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import {
  BlockSkeleton, CHART_COLORS, ConfirmDelete, DataTable, ErrorState, PageHeader, Panel, Pill, StatCard,
  StatGridSkeleton, TableSkeleton, chartAxis, chartTooltip,
} from "./kit";

function useAllBooks() {
  return useQuery(["books", "admin"], () => services.books.list({ sort: "newest", pageSize: 200, includeUnpublished: true }));
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export function AdminInventory() {
  const books = useAllBooks();
  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Inventory" description="Stock across every seller. Edit levels inline." />
      <InventoryView books={books.data?.items} loading={books.loading} error={books.error} refetch={books.refetch} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Discounts                                                           */
/* ------------------------------------------------------------------ */

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function FlashSaleDialog({ books, book, onSaved }: { books: Book[]; book?: Book; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [bookId, setBookId] = useState(book?.id ?? "");
  const initialPaperback = book?.variants?.find((variant) => variant.name.toLowerCase().includes("paperback"));
  const initialHardcover = book?.variants?.find((variant) => variant.name.toLowerCase().includes("hardcover"));
  const [paperbackPrice, setPaperbackPrice] = useState(initialPaperback?.flashPrice ?? 0);
  const [hardcoverPrice, setHardcoverPrice] = useState(initialHardcover?.flashPrice ?? 0);
  const [endsAt, setEndsAt] = useState(toLocalInput(book?.flashSale?.endsAt ?? new Date(Date.now() + 3 * 86400000).toISOString()));
  const [saving, setSaving] = useState(false);
  const target = books.find((b) => b.id === bookId);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) { toast.error("Choose a book"); return; }
    const variants = target.variants ?? [];
    const paperback = variants.find((variant) => variant.name.toLowerCase().includes("paperback"));
    const hardcover = variants.find((variant) => variant.name.toLowerCase().includes("hardcover"));
    if (!paperback || !hardcover) { toast.error("This product needs paperback and hardcover prices first"); return; }
    if (paperbackPrice <= 0 || paperbackPrice >= paperback.price || hardcoverPrice <= 0 || hardcoverPrice >= hardcover.price) {
      toast.error("Each flash sale price must be below its regular price"); return;
    }
    if (!endsAt || new Date(endsAt).getTime() <= Date.now()) { toast.error("End time must be in the future"); return; }
    setSaving(true);
    try {
      await services.books.update(target.id, {
        variants: variants.map((variant) => ({
          name: variant.name,
          price: variant.price,
          oldPrice: variant.oldPrice,
          stock: variant.stock,
          flashPrice: variant.name.toLowerCase().includes("paperback") ? paperbackPrice : variant.name.toLowerCase().includes("hardcover") ? hardcoverPrice : 0,
        })),
        flashSale: { price: paperbackPrice, endsAt: new Date(endsAt).toISOString() },
      });
      toast.success(`Flash sale set on "${target.title}"`);
      setOpen(false);
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{book ? <Button variant="outline" size="sm">Edit</Button> : <Button size="sm" className="gap-2"><Zap size={15} /> Set flash sale</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{book ? "Edit flash sale" : "New flash sale"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Book</Label>
            <Select value={bookId} onValueChange={(v) => { setBookId(v); }} disabled={!!book}>
              <SelectTrigger><SelectValue placeholder="Choose a book" /></SelectTrigger>
              <SelectContent className="max-h-72">{books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} · {formatTk(b.price)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Paperback flash price (৳)</Label><Input type="number" min={1} value={paperbackPrice} onChange={(e) => setPaperbackPrice(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Hardcover flash price (৳)</Label><Input type="number" min={1} value={hardcoverPrice} onChange={(e) => setHardcoverPrice(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Ends at</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminDiscounts() {
  const books = useAllBooks();
  const all = books.data?.items ?? [];
  const onSale = all.filter((b) => b.flashSale);
  const clear = async (b: Book) => {
    try { await services.books.update(b.id, { flashSale: null } as unknown as Partial<Book>); toast.success(`Flash sale cleared on "${b.title}"`); books.refetch(); }
    catch (err) { toast.error((err as Error).message); }
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Commerce" title="Discounts" description="Checkout coupons and per-book flash sales." />
      <CouponsManager />
      <Panel title="Flash sales" actions={books.data && <FlashSaleDialog books={all.filter((b) => !b.flashSale)} onSaved={books.refetch} />}>
        {books.error ? <ErrorState error={books.error} onRetry={books.refetch} /> : books.loading ? <TableSkeleton rows={3} /> : onSale.length === 0 ? (
          <EmptyState icon={Zap} title="No flash sales running" description="Put a book on a time-limited sale price." />
        ) : (
          <DataTable head={["Book", "Regular", "Sale", "Discount", "Ends", "Actions"]} minWidth={720}>
            {onSale.map((b) => {
              const fs = b.flashSale!;
              const ended = new Date(fs.endsAt).getTime() < Date.now();
              return (
                <tr key={b.id}>
                  <td><div className="flex items-center gap-3"><div className="h-10 w-7 shrink-0 overflow-hidden rounded-[3px] border border-border"><BookCover title={b.title} coverUrl={b.coverUrl} /></div><span className="line-clamp-1 font-medium">{b.title}</span></div></td>
                  <td className="tabular-nums text-muted-foreground line-through">{formatTk(b.price)}</td>
                  <td className="tabular-nums font-semibold text-primary">{formatTk(fs.price)}</td>
                  <td><Pill tone="primary">-{Math.max(0, Math.round((1 - fs.price / b.price) * 100))}%</Pill></td>
                  <td>{ended ? <Pill>Ended</Pill> : <span className="text-muted-foreground">{formatDate(fs.endsAt)}</span>}</td>
                  <td><div className="flex justify-end gap-2"><FlashSaleDialog key={b.id + fs.endsAt + fs.price} books={all} book={b} onSaved={books.refetch} /><ConfirmDelete label="Clear" title={`Clear the flash sale on "${b.title}"?`} description="The book returns to its regular price." onConfirm={() => clear(b)} /></div></td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function AdminReports() {
  const report = useQuery(["admin", "reports"], () => services.store.reports());
  const r = report.data;
  const daily = useMemo(() => (r?.daily ?? []).map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) })), [r]);
  const status = useMemo(() => Object.entries(r?.byStatus ?? {}).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value), [r]);

  if (report.error) return <ErrorState error={report.error} onRetry={report.refetch} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title="Reports" description="Revenue, fulfilment and catalogue health, computed on the server." actions={<Button variant="outline" size="sm" onClick={report.refetch}>Refresh</Button>} />
      {report.loading || !r ? <><StatGridSkeleton /><BlockSkeleton /></> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={DollarSign} label="Revenue" value={formatTk(r.totals.revenue)} />
            <StatCard icon={Package} label="Orders" value={r.totals.orders} hint={`Avg. ${formatTk(r.totals.avgOrder)}`} />
            <StatCard icon={Boxes} label="Books" value={r.totals.books} hint={`${r.totals.lowStock} low · ${r.totals.outOfStock} out`} />
            <StatCard icon={Mail} label="Subscribers" value={r.totals.subscribers} />
          </div>

          <Panel title="Daily revenue">
            {!daily.some((d) => d.revenue > 0) ? <p className="py-10 text-center text-sm text-muted-foreground">No revenue in this period.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={daily} margin={{ right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" {...chartAxis} minTickGap={24} />
                  <YAxis {...chartAxis} width={56} tickFormatter={(v: number) => `৳${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip {...chartTooltip} cursor={{ stroke: "var(--border)" }} formatter={(v: number, n: string) => (n === "revenue" ? [formatTk(v), "Revenue"] : [v, "Orders"])} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Orders by status">
              {status.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p> : (
                <ResponsiveContainer width="100%" height={Math.max(180, status.length * 34)}>
                  <BarChart data={status} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} {...chartAxis} />
                    <YAxis type="category" dataKey="name" {...chartAxis} width={110} />
                    <Tooltip {...chartTooltip} formatter={(v: number) => [v, "Orders"]} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14}>{status.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
            <Panel title="Top sellers by revenue">
              {r.topSellers.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No seller sales yet.</p> : (
                <ResponsiveContainer width="100%" height={Math.max(180, r.topSellers.length * 34)}>
                  <BarChart data={r.topSellers} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" {...chartAxis} tickFormatter={(v: number) => `৳${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                    <YAxis type="category" dataKey="name" {...chartAxis} width={120} />
                    <Tooltip {...chartTooltip} formatter={(v: number) => [formatTk(v), "Revenue"]} />
                    <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 3, 3, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <Panel title="Top books">
            {r.topBooks.length === 0 ? <EmptyState icon={TrendingUp} title="No books sold yet" /> : (
              <DataTable head={["#", "Book", "Units", "Revenue"]} minWidth={480}>
                {r.topBooks.map((b, i) => (
                  <tr key={b.bookId}>
                    <td className="w-10 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="font-medium">{b.title}</td>
                    <td className="tabular-nums">{b.units}</td>
                    <td className="text-right tabular-nums font-medium">{formatTk(b.revenue)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>

          <Panel title={`Newsletter subscribers (${r.totals.subscribers})`}>
            {r.subscribers.length === 0 ? <EmptyState icon={Mail} title="No subscribers yet" description="Sign-ups from the storefront footer appear here." /> : (
              <ul className="grid max-h-72 gap-x-6 overflow-y-auto text-sm sm:grid-cols-2 lg:grid-cols-3">
                {r.subscribers.map((e) => <li key={e} className="truncate border-b border-border py-1.5 font-mono text-xs">{e}</li>)}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function AdminSettings() {
  const settings = useQuery(["settings"], () => services.store.settings());
  const { categories } = useCatalog();
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data && !form) setForm({ popularSearches: [], homeSections: [], ...settings.data });
  }, [settings.data, form]);

  if (settings.error) return <ErrorState error={settings.error} onRetry={settings.refetch} />;
  if (settings.loading || !form) return <div className="space-y-4"><PageHeader eyebrow="Storefront" title="Settings" /><BlockSkeleton /><BlockSkeleton className="h-40" /></div>;

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setForm((f) => ({ ...f!, [k]: v }));
  const searches = form.popularSearches ?? [];
  const sections = form.homeSections ?? [];
  const setSection = (i: number, patch: Partial<HomeSection>) => set("homeSections", sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...sections];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("homeSections", next);
  };
  const addTerm = () => {
    const t = term.trim();
    if (!t || searches.includes(t)) { setTerm(""); return; }
    set("popularSearches", [...searches, t]);
    setTerm("");
  };

    const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSections = sections.map((s) => ({ ...s, title: s.title.trim() }));
    if (cleanSections.some((s) => !s.title || !s.categorySlug)) {
      toast.error("Each homepage section needs a title and category");
      return;
    }

    const shippingFee = Number(form.shippingFee ?? 0);
    const freeShippingThreshold = Number(form.freeShippingThreshold ?? 0);
    if (
      !Number.isFinite(shippingFee) || shippingFee < 0 ||
      !Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0
    ) {
      toast.error("Shipping values must be 0 or more");
      return;
    }

    setSaving(true);
    try {
      // Send only the fields this form edits (no id / updatedAt / unknown keys).
      const saved = await services.store.saveSettings({
        storeName: form.storeName?.trim() ?? "",
        supportPhone: form.supportPhone?.trim() ?? "",
        supportEmail: form.supportEmail?.trim() ?? "",
        announcement: form.announcement?.trim() ?? "",
        deliveryEstimate: form.deliveryEstimate?.trim() ?? "",
        shippingFee,
        freeShippingThreshold,
        popularSearches: searches.map((t) => t.trim()).filter(Boolean),
        homeSections: cleanSections,
      });
      setForm({ popularSearches: [], homeSections: [], ...saved });
      settings.refetch();
      toast.success("Settings saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader eyebrow="Storefront" title="Settings" description="Store details, shipping and homepage content."
        actions={<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>} />

      <Panel title="Store">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5"><Label>Store name</Label><Input value={form.storeName ?? ""} onChange={(e) => set("storeName", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Support phone</Label><Input value={form.supportPhone ?? ""} onChange={(e) => set("supportPhone", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Support email</Label><Input type="email" value={form.supportEmail ?? ""} onChange={(e) => set("supportEmail", e.target.value)} /></div>
        </div>
        <div className="mt-4 space-y-1.5"><Label>Announcement bar</Label><Textarea rows={2} value={form.announcement ?? ""} onChange={(e) => set("announcement", e.target.value)} placeholder="Leave empty to hide" /></div>
      </Panel>

      <Panel title="Shipping">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5"><Label>Shipping fee (৳)</Label><Input type="number" min={0} value={form.shippingFee ?? 0} onChange={(e) => set("shippingFee", Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Free shipping over (৳)</Label><Input type="number" min={0} value={form.freeShippingThreshold ?? 0} onChange={(e) => set("freeShippingThreshold", Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Delivery estimate</Label><Input value={form.deliveryEstimate ?? ""} onChange={(e) => set("deliveryEstimate", e.target.value)} placeholder="2–4 days in Dhaka" /></div>
        </div>
      </Panel>

      <Panel title="Popular searches">
        <div className="flex flex-wrap gap-2">
          {searches.length === 0 && <p className="text-sm text-muted-foreground">No terms yet.</p>}
          {searches.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
              {t}
              <button type="button" aria-label={`Remove ${t}`} className="rounded-full text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => set("popularSearches", searches.filter((x) => x !== t))}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex max-w-md gap-2">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Add a search term" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTerm(); } }} />
          <Button type="button" variant="outline" onClick={addTerm}>Add</Button>
        </div>
      </Panel>

      <Panel title="Homepage sections" actions={<Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => set("homeSections", [...sections, { title: "", categorySlug: "", layout: "rail" }])}><Plus size={14} /> Add section</Button>}>
        {sections.length === 0 ? <EmptyState icon={BarChart3} title="No custom sections" description="Add category rails or tile grids to the homepage." /> : (
          <ol className="divide-y divide-border">
            {sections.map((s, i) => (
              <li key={i} className="grid items-end gap-3 py-3 md:grid-cols-[2rem_1fr_1fr_140px_auto]">
                <span className="pb-2 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="space-y-1.5"><Label>Title</Label><Input value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={s.categorySlug || undefined} onValueChange={(v) => setSection(i, { categorySlug: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                    <SelectContent className="max-h-72">{categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.parentId ? "— " : ""}{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Layout</Label>
                  <Select value={s.layout ?? "rail"} onValueChange={(v) => setSection(i, { layout: v as HomeSection["layout"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="rail">Rail</SelectItem><SelectItem value="tiles">Tiles</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Remove section" onClick={() => set("homeSections", sections.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></div>
    </form>
  );
}
