// Admin management for homepage blocks: Quick Deal campaigns (with their deal
// products) and the Category Collection slider sections (with curated books).

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, LayoutGrid, Pencil, Plus, Search as SearchIcon, Upload, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { invalidate, useQuery } from "../../../lib/query";
import { services } from "../../../services";
import { formatDateTime, formatTk, slugify } from "../../../lib/format";
import type { Book, DealCampaign, DealProduct, DealType, HomeCategoryItem, HomeCategorySection } from "../../../types";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { ConfirmDelete, DataTable, ErrorState, PageHeader, Panel, Pill, TableSkeleton, uploadImage } from "./kit";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: "TODAYS_DEAL", label: "Today's Deal" },
  { value: "BUY_ONE_GET_ONE", label: "Buy 1 Get 1" },
  { value: "FREE_SHIPPING", label: "Free Shipping" },
  { value: "BEST_PRICE", label: "Best Price" },
  { value: "CLEARANCE_SALE", label: "Clearance Sale" },
];
const typeLabel = (t: DealType) => DEAL_TYPES.find((d) => d.value === t)?.label ?? t;

async function attempt(fn: () => Promise<unknown>, ok: string, done?: () => void) {
  try { await fn(); toast.success(ok); done?.(); return true; }
  catch (err) { toast.error((err as Error).message); return false; }
}

/** ISO -> value for <input type="datetime-local"> (local time). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function campaignStatus(c: DealCampaign): { tone: "positive" | "neutral" | "negative" | "primary"; label: string } {
  const now = Date.now();
  if (!c.is_active) return { tone: "neutral", label: "Inactive" };
  if (new Date(c.start_at).getTime() > now) return { tone: "primary", label: "Scheduled" };
  if (c.end_at && new Date(c.end_at).getTime() <= now) return { tone: "negative", label: "Ended" };
  return { tone: "positive", label: "Live" };
}

function ReorderButtons({ index, count, onMove, label }: { index: number; count: number; onMove: (dir: -1 | 1) => void; label: string }) {
  return (
    <div className="flex gap-0.5">
      <Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}><ArrowUp size={14} /></Button>
      <Button variant="ghost" size="icon" className="size-7" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}><ArrowDown size={14} /></Button>
    </div>
  );
}

function Thumb({ book }: { book?: Book }) {
  return (
    <div className="h-10 w-7 shrink-0 overflow-hidden rounded-[3px] bg-muted ring-1 ring-border">
      {book?.coverUrl && <img src={book.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
    </div>
  );
}

/** Debounced book search (optionally scoped to a category). */
function BookPicker({ categoryId, excludeIds = [], onPick, disabled }: { categoryId?: string; excludeIds?: string[]; onPick: (b: Book) => void; disabled?: boolean }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(term.trim()), 300); return () => clearTimeout(t); }, [term]);
  const q = useQuery(
    ["books", "admin-picker", categoryId ?? "", debounced],
    () => services.books.list({ search: debounced || undefined, categoryId, pageSize: 10, includeUnpublished: false }),
  );
  const rows = (q.data?.items ?? []).filter((b) => !excludeIds.includes(b.id));
  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search books by title…" className="pl-8" aria-label="Search books" disabled={disabled} />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-border">
        {q.loading ? (
          <p className="p-3 text-sm text-muted-foreground">Searching…</p>
        ) : q.error ? (
          <p className="p-3 text-sm text-destructive">{q.error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No books found.</p>
        ) : rows.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(b)}
            className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/40 disabled:opacity-50"
          >
            <Thumb book={b} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-sm font-medium leading-snug">{b.title}</span>
              <span className="block text-xs tabular-nums text-muted-foreground">{formatTk(b.price)} · stock {b.stock}</span>
            </span>
            <Plus size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick Deals                                                         */
/* ------------------------------------------------------------------ */

const refreshDeals = () => invalidate("deals");

function CampaignDialog({ campaign, nextOrder }: { campaign?: DealCampaign; nextOrder: number }) {
  const blank = () => ({
    name: campaign?.name ?? "",
    slug: campaign?.slug ?? "",
    type: (campaign?.type ?? "TODAYS_DEAL") as DealType,
    description: campaign?.description ?? "",
    banner: campaign?.banner ?? "",
    start_at: toLocalInput(campaign?.start_at ?? new Date().toISOString()),
    end_at: toLocalInput(campaign?.end_at),
    is_active: campaign?.is_active ?? true,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onOpenChange = (o: boolean) => { setOpen(o); if (o) setForm(blank()); };

  const pickBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { const url = await uploadImage(f); setForm((s) => ({ ...s, banner: url })); toast.success("Banner uploaded"); }
    catch (err) { toast.error(`Upload failed: ${(err as Error).message}`); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = fromLocalInput(form.start_at);
    const end = fromLocalInput(form.end_at);
    if (!start) { toast.error("Start date is required"); return; }
    if (end && new Date(end) <= new Date(start)) { toast.error("End must be after start"); return; }
    setSaving(true);
    const payload: Partial<DealCampaign> = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      type: form.type,
      description: form.description,
      banner: form.banner,
      start_at: start,
      end_at: end,
      is_active: form.is_active,
    };
    const ok = await attempt(
      () => (campaign ? services.deals.updateCampaign(campaign.id, payload) : services.deals.createCampaign({ ...payload, display_order: nextOrder })),
      campaign ? "Campaign updated" : "Campaign created",
      refreshDeals,
    );
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {campaign
          ? <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${campaign.name}`}><Pencil size={14} /></Button>
          : <Button size="sm" className="gap-2"><Plus size={15} /> New campaign</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{campaign ? "Edit campaign" : "New campaign"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="dc-name">Name</Label><Input id="dc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="dc-slug">Slug</Label><Input id="dc-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as DealType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="dc-desc">Description</Label><Textarea id="dc-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Banner</Label>
            <div className="flex items-start gap-3">
              <div className="aspect-[3/1] w-32 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                {form.banner && <img src={form.banner} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickBanner} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload size={14} /> {uploading ? "Uploading…" : form.banner ? "Replace" : "Upload"}</Button>
                {form.banner && <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setForm({ ...form, banner: "" })}><X size={14} /> Remove</Button>}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="dc-start">Starts</Label><Input id="dc-start" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label htmlFor="dc-end">Ends (optional)</Label><Input id="dc-end" type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
          <DialogFooter><Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DealRow({ row, index, count, onMove, campaign }: {
  row: { deal: DealProduct; book?: Book }; index: number; count: number; onMove: (dir: -1 | 1) => void; campaign: DealCampaign;
}) {
  const { deal, book } = row;
  const [price, setPrice] = useState(String(deal.deal_price));
  const [limit, setLimit] = useState(deal.stock_limit != null ? String(deal.stock_limit) : "");
  const usesDealPrice = campaign.type !== "FREE_SHIPPING" && campaign.type !== "BUY_ONE_GET_ONE";
  useEffect(() => { setPrice(String(deal.deal_price)); setLimit(deal.stock_limit != null ? String(deal.stock_limit) : ""); }, [deal.deal_price, deal.stock_limit]);

  const update = (p: Partial<DealProduct>, ok = "Deal updated") => attempt(() => services.deals.updateProduct(campaign.id, deal.id, p), ok, refreshDeals);
  const commitPrice = () => {
    if (!usesDealPrice) return;
    const n = Number(price);
    if (!(n > 0)) { toast.error("Deal price must be greater than 0"); setPrice(String(deal.deal_price)); return; }
    if (n !== deal.deal_price) update({ deal_price: n });
  };
  const commitLimit = () => {
    const n = limit === "" ? null : Math.floor(Number(limit));
    if (n !== null && !(n >= 0)) { toast.error("Stock limit must be 0 or more"); return; }
    if (n !== (deal.stock_limit ?? null)) update({ stock_limit: n });
  };

  return (
    <tr>
      <td>
        <div className="flex min-w-0 items-center gap-3">
          <Thumb book={book} />
          <div className="min-w-0">
            <p className="truncate font-sans font-medium leading-snug">{book?.title ?? <span className="text-muted-foreground">Missing book</span>}</p>
            <p className="text-xs text-muted-foreground">Stock {book?.stock ?? 0}</p>
          </div>
        </div>
      </td>
      <td className="tabular-nums text-muted-foreground">{formatTk(deal.original_price)}</td>
      {usesDealPrice ? <td><Input type="number" min={1} step="1" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={commitPrice} className="h-8 w-24" aria-label="Deal price" /></td> : <td className="text-muted-foreground">—</td>}
      <td className="tabular-nums">{deal.discount_percentage > 0 ? <Pill tone="primary">-{deal.discount_percentage}%</Pill> : "—"}</td>
      <td><Input type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} onBlur={commitLimit} placeholder="∞" className="h-8 w-20" aria-label="Stock limit" /></td>
      <td className="tabular-nums">{deal.sold_count}</td>
      <td><Switch checked={deal.is_active} onCheckedChange={(v) => update({ is_active: v }, v ? "Deal activated" : "Deal paused")} aria-label="Active" /></td>
      <td>
        <div className="flex items-center justify-end gap-1">
          <ReorderButtons index={index} count={count} onMove={onMove} label={book?.title ?? "deal"} />
          <ConfirmDelete iconOnly title={`Remove ${book?.title ?? "this deal"}?`} label="Remove" onConfirm={async () => { await attempt(() => services.deals.removeProduct(campaign.id, deal.id), "Deal removed", refreshDeals); }} />
        </div>
      </td>
    </tr>
  );
}

function DealProductsSheet({ campaign }: { campaign: DealCampaign }) {
  const [open, setOpen] = useState(false);
  const q = useQuery(["deals", "admin", "products", campaign.id], () => services.deals.products(campaign.id), { enabled: open });
  const rows = useMemo(() => (q.data ?? []).slice().sort((a, b) => a.deal.display_order - b.deal.display_order), [q.data]);
  const [picked, setPicked] = useState<Book | null>(null);
  const [price, setPrice] = useState("");
  const [limit, setLimit] = useState("");
  const [adding, setAdding] = useState(false);
  const usesDealPrice = campaign.type !== "FREE_SHIPPING" && campaign.type !== "BUY_ONE_GET_ONE";

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    const n = Number(price);
    if (usesDealPrice && !(n > 0)) { toast.error("Deal price must be greater than 0"); return; }
    setAdding(true);
    const ok = await attempt(
      () => services.deals.addProduct({
        campaign_id: campaign.id,
        product_id: picked.id,
        ...(usesDealPrice ? { deal_price: n } : {}),
        stock_limit: limit === "" ? null : Math.max(0, Math.floor(Number(limit))),
        display_order: rows.length,
        is_active: true,
      }),
      "Book added to campaign",
      refreshDeals,
    );
    setAdding(false);
    if (ok) { setPicked(null); setPrice(""); setLimit(""); }
  };

  const onMove = async (i: number, dir: -1 | 1) => {
    const next = move(rows, i, dir);
    try {
      await Promise.all(next.map((r, idx) => (r.deal.display_order !== idx ? services.deals.updateProduct(campaign.id, r.deal.id, { display_order: idx }) : null)));
      refreshDeals();
    } catch (err) { toast.error((err as Error).message); refreshDeals(); }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm">Products</Button></SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="font-display">{campaign.name}</SheetTitle>
          <SheetDescription>{typeLabel(campaign.type)} · {rows.length} books. Sold counts update automatically from orders.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <Panel title="Add a book">
            {picked ? (
              <form onSubmit={add} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Thumb book={picked} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans font-medium leading-snug">{picked.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">Current price {formatTk(picked.flashSale?.price ?? picked.price)} · stock {picked.stock}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>Change</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {usesDealPrice && <div className="space-y-1.5"><Label htmlFor="dp-price">Deal price (৳)</Label><Input id="dp-price" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>}
                  <div className="space-y-1.5"><Label htmlFor="dp-limit">Stock limit (optional)</Label><Input id="dp-limit" type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit" /></div>
                </div>
                <Button type="submit" size="sm" disabled={adding}>{adding ? "Adding…" : "Add to campaign"}</Button>
              </form>
            ) : (
              <BookPicker excludeIds={rows.map((r) => r.deal.product_id)} onPick={(b) => { setPicked(b); setPrice(usesDealPrice ? String(b.price) : ""); }} />
            )}
          </Panel>

          {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? (
            <EmptyState compact icon={Zap} title="No books in this campaign yet" description="Search above to add the first deal." />
          ) : (
            <DataTable head={["Book", "Original", ...(usesDealPrice ? ["Deal price"] : []), "Off", "Limit", "Sold", "Active", ""]} minWidth={760}>
              {rows.map((r, i) => <DealRow key={r.deal.id} row={r} index={i} count={rows.length} onMove={(d) => onMove(i, d)} campaign={campaign} />)}
            </DataTable>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminQuickDeals() {
  const q = useQuery(["deals", "admin", "campaigns"], () => services.deals.campaigns());
  const rows = useMemo(() => (q.data ?? []).slice().sort((a, b) => a.display_order - b.display_order), [q.data]);

  const reorder = async (i: number, dir: -1 | 1) => {
    await attempt(() => services.deals.reorderCampaigns(move(rows, i, dir).map((c) => c.id)), "Order saved", refreshDeals);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Storefront"
        title="Quick Deals"
        description="Campaign tabs shown in the homepage Quick Deal ⚡ block. Only active campaigns inside their schedule are shown, one per type."
        actions={<CampaignDialog nextOrder={rows.length} />}
      />
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.loading ? <TableSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={Zap} title="No deal campaigns yet" description="Create a campaign, then add books with deal prices." action={<CampaignDialog nextOrder={0} />} />
      ) : (
        <DataTable head={["Campaign", "Type", "Schedule", "Status", "Active", ""]} minWidth={820}>
          {rows.map((c, i) => {
            const st = campaignStatus(c);
            return (
              <tr key={c.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-14 shrink-0 overflow-hidden rounded bg-muted">{c.banner && <img src={c.banner} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.slug}</p></div>
                  </div>
                </td>
                <td>{typeLabel(c.type)}</td>
                <td className="text-xs text-muted-foreground">
                  <div>{formatDateTime(c.start_at)}</div>
                  <div>{c.end_at ? `→ ${formatDateTime(c.end_at)}` : "No end date"}</div>
                </td>
                <td><Pill tone={st.tone}>{st.label}</Pill></td>
                <td><Switch checked={c.is_active} onCheckedChange={(v) => { attempt(() => services.deals.updateCampaign(c.id, { is_active: v }), v ? "Campaign activated" : "Campaign deactivated", refreshDeals); }} aria-label={`Active: ${c.name}`} /></td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <ReorderButtons index={i} count={rows.length} onMove={(d) => reorder(i, d)} label={c.name} />
                    <DealProductsSheet campaign={c} />
                    <CampaignDialog key={c.id + c.updated_at} campaign={c} nextOrder={rows.length} />
                    <ConfirmDelete iconOnly title={`Delete ${c.name}?`} description="All deal products in this campaign are deleted too." onConfirm={async () => { await attempt(() => services.deals.removeCampaign(c.id), "Campaign deleted", refreshDeals); }} />
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

/* ------------------------------------------------------------------ */
/* Home category collections                                           */
/* ------------------------------------------------------------------ */

const MAX_ITEMS = 8;
const refreshSections = () => invalidate("homeSections");
type SectionWithItems = HomeCategorySection & { items: HomeCategoryItem[] };

function useCategories() {
  return useQuery(["catalog", "categories"], () => services.catalog.categories());
}

function SectionDialog({ section, nextOrder }: { section?: SectionWithItems; nextOrder: number }) {
  const cats = useCategories();
  const blank = () => ({ title: section?.title ?? "", subtitle: section?.subtitle ?? "", category_id: section?.category_id ?? "", is_active: section?.is_active ?? true });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id) { toast.error("Choose a category"); return; }
    setSaving(true);
    const payload: Partial<HomeCategorySection> = { ...form, title: form.title.trim(), subtitle: form.subtitle.trim() };
    const ok = await attempt(
      () => (section ? services.homeSections.update(section.id, payload) : services.homeSections.create({ ...payload, display_order: nextOrder })),
      section ? "Section updated" : "Section created",
      refreshSections,
    );
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm(blank()); }}>
      <DialogTrigger asChild>
        {section
          ? <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${section.title}`}><Pencil size={14} /></Button>
          : <Button size="sm" className="gap-2"><Plus size={15} /> New section</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{section ? "Edit section" : "New section"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="hs-title">Title</Label><Input id="hs-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="hs-sub">Subtitle (optional)</Label><Input id="hs-sub" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder={cats.loading ? "Loading…" : "Choose a category"} /></SelectTrigger>
              <SelectContent>{(cats.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {section && form.category_id !== section.category_id && section.items.length > 0 && (
              <p className="text-xs text-muted-foreground">Curated books from the old category stay until you edit the product list.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionItemsSheet({ section }: { section: SectionWithItems }) {
  const [open, setOpen] = useState(false);
  const initialIds = useMemo(() => section.items.slice().sort((a, b) => a.display_order - b.display_order).map((i) => i.product_id), [section.items]);
  const [ids, setIds] = useState<string[]>(initialIds);
  const [known, setKnown] = useState<Record<string, Book>>({});
  const [saving, setSaving] = useState(false);

  const booksQ = useQuery(["books", "admin-many", ...initialIds], () => services.books.getMany(initialIds), { enabled: open && initialIds.length > 0 });
  useEffect(() => {
    if (booksQ.data) setKnown((k) => ({ ...k, ...Object.fromEntries(booksQ.data!.map((b) => [b.id, b])) }));
  }, [booksQ.data]);

  const onOpenChange = (o: boolean) => { setOpen(o); if (o) setIds(initialIds); };
  const dirty = ids.join() !== initialIds.join();

  const save = async () => {
    setSaving(true);
    const ok = await attempt(() => services.homeSections.setItems(section.id, ids), "Products saved", refreshSections);
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild><Button variant="outline" size="sm">Products ({section.items.length})</Button></SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display">{section.title}</SheetTitle>
          <SheetDescription>Pick up to {MAX_ITEMS} books. The first four appear on the card. Leave empty to auto-fill from the category's top books.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <Panel title={`Selected (${ids.length}/${MAX_ITEMS})`} actions={<Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>}>
            {ids.length === 0 ? (
              <p className="text-sm text-muted-foreground">No curated books — the section auto-fills.</p>
            ) : (
              <ol className="divide-y divide-border">
                {ids.map((id, i) => {
                  const b = known[id];
                  return (
                    <li key={id} className="flex items-center gap-3 py-2">
                      <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <Thumb book={b} />
                      <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium leading-snug">{b?.title ?? (booksQ.loading ? "Loading…" : "Unknown book")}</span>
                      <ReorderButtons index={i} count={ids.length} onMove={(d) => setIds((cur) => move(cur, i, d))} label={b?.title ?? "book"} />
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Remove ${b?.title ?? "book"}`} onClick={() => setIds((cur) => cur.filter((x) => x !== id))}><X size={14} /></Button>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
          <Panel title="Add books from this category">
            {ids.length >= MAX_ITEMS && <p className="mb-2 text-xs text-muted-foreground">Limit reached — remove a book to add another.</p>}
            <BookPicker
              categoryId={section.category_id}
              excludeIds={ids}
              disabled={ids.length >= MAX_ITEMS}
              onPick={(b) => {
                setKnown((k) => ({ ...k, [b.id]: b }));
                setIds((cur) => (cur.length >= MAX_ITEMS || cur.includes(b.id) ? cur : [...cur, b.id]));
              }}
            />
          </Panel>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminHomeCollections() {
  const q = useQuery(["homeSections", "admin"], () => services.homeSections.list());
  const cats = useCategories();
  const rows = useMemo(() => (q.data ?? []).slice().sort((a, b) => a.display_order - b.display_order), [q.data]);
  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? "—";

  const reorder = async (i: number, dir: -1 | 1) => {
    await attempt(() => services.homeSections.reorder(move(rows, i, dir).map((s) => s.id)), "Order saved", refreshSections);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Storefront"
        title="Home collections"
        description="Cards in the homepage Category Collection slider. Each shows four books and links to its category."
        actions={<SectionDialog nextOrder={rows.length} />}
      />
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.loading ? <TableSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No collection sections yet" description="Create a section for a category to show it on the homepage." action={<SectionDialog nextOrder={0} />} />
      ) : (
        <DataTable head={["Section", "Category", "Books", "Active", ""]} minWidth={720}>
          {rows.map((s, i) => (
            <tr key={s.id}>
              <td><p className="font-medium">{s.title}</p>{s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}</td>
              <td>{catName(s.category_id)}</td>
              <td>{s.items.length > 0 ? <Pill tone="primary">{s.items.length} curated</Pill> : <Pill>Auto-fill</Pill>}</td>
              <td><Switch checked={s.is_active} onCheckedChange={(v) => { attempt(() => services.homeSections.update(s.id, { is_active: v }), v ? "Section activated" : "Section hidden", refreshSections); }} aria-label={`Active: ${s.title}`} /></td>
              <td>
                <div className="flex items-center justify-end gap-1">
                  <ReorderButtons index={i} count={rows.length} onMove={(d) => reorder(i, d)} label={s.title} />
                  <SectionItemsSheet section={s} />
                  <SectionDialog key={s.id + s.title + s.category_id} section={s} nextOrder={rows.length} />
                  <ConfirmDelete iconOnly title={`Delete ${s.title}?`} description="The section and its curated product list are removed." onConfirm={async () => { await attempt(() => services.homeSections.remove(s.id), "Section deleted", refreshSections); }} />
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
