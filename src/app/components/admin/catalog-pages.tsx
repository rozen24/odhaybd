// Admin catalogue CRUD: authors, publishers, categories (with parents) and
// homepage banners (image upload, placement, CTA, active flag).

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookUser, Building2, FolderTree, ImageIcon, Pencil, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { invalidate, useQuery } from "../../../lib/query";
import { services } from "../../../services";
import type { Author, Banner, Category, Publisher } from "../../../types";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ConfirmDelete, DataTable, ErrorState, PageHeader, Pill, TableSkeleton, uploadImage } from "./kit";

function useCatalogList<T>(name: string, fn: () => Promise<T[]>) {
  const q = useQuery(["catalog", name], fn);
  // Invalidate the shared "catalog" queries so CatalogContext (menus, cards) refreshes too.
  return { ...q, refresh: () => invalidate("catalog") };
}

async function attempt(fn: () => Promise<unknown>, ok: string, done?: () => void) {
  try { await fn(); toast.success(ok); done?.(); return true; }
  catch (err) { toast.error((err as Error).message); return false; }
}

function Search({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Search ${label}…`} className="h-8 w-48" aria-label={`Search ${label}`} />;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function ReorderButtons({ index, count, onMove, label }: { index: number; count: number; onMove: (dir: -1 | 1) => void; label: string }) {
  return (
    <div className="flex gap-0.5">
      <Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}><ArrowUp size={14} /></Button>
      <Button variant="ghost" size="icon" className="size-7" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}><ArrowDown size={14} /></Button>
    </div>
  );
}

function ImagePicker({ value, onChange, label, aspect = "aspect-square w-16" }: { value: string | null; onChange: (url: string) => void; label: string; aspect?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(f)); toast.success("Image uploaded"); }
    catch (err) { toast.error(`Upload failed: ${(err as Error).message}`); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className={`${aspect} shrink-0 overflow-hidden rounded-md border border-border bg-muted`}>
          {value && <img src={value} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1 space-y-2">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => ref.current?.click()}><Upload size={14} /> {busy ? "Uploading…" : value ? "Replace" : "Upload"}</Button>
            {value && <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => onChange("")}><X size={14} /> Remove</Button>}
          </div>
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Authors                                                             */
/* ------------------------------------------------------------------ */

function AuthorDialog({ author, onSaved }: { author?: Author; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: author?.name ?? "", slug: author?.slug ?? "", bio: author?.bio ?? "", photoUrl: author?.photoUrl ?? "" });
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, slug: form.slug || undefined };
    const ok = await attempt(() => (author ? services.catalogAdmin.updateAuthor(author.id, payload) : services.catalogAdmin.createAuthor({ ...payload, bookCount: 0 })), author ? "Author updated" : "Author created", onSaved);
    setSaving(false);
    if (ok) { setOpen(false); if (!author) setForm({ name: "", slug: "", bio: "", photoUrl: "" }); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{author ? <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${author.name}`}><Pencil size={14} /></Button> : <Button size="sm" className="gap-2"><Plus size={15} /> New author</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{author ? "Edit author" : "New author"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
          <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <ImagePicker label="Photo" value={form.photoUrl} onChange={(photoUrl) => setForm((f) => ({ ...f, photoUrl }))} />
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminAuthors() {
  const list = useCatalogList("authors", () => services.catalog.authors());
  const [q, setQ] = useState("");
  const rows = (list.data ?? []).filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Authors" description={`${list.data?.length ?? 0} authors.`} actions={<><Search value={q} onChange={setQ} label="authors" /><AuthorDialog onSaved={list.refresh} /></>} />
      {list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.loading ? <TableSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={BookUser} title={q ? "No matching authors" : "No authors yet"} action={!q && <AuthorDialog onSaved={list.refresh} />} />
      ) : (
        <DataTable head={["Author", "Slug", "Books", ""]} minWidth={560}>
          {rows.map((a) => (
            <tr key={a.id}>
              <td><div className="flex items-center gap-3"><div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">{a.photoUrl && <img src={a.photoUrl} alt="" className="h-full w-full object-cover" />}</div><span className="font-medium">{a.name}</span></div></td>
              <td className="text-muted-foreground">{a.slug}</td>
              <td className="tabular-nums">{a.bookCount ?? 0}</td>
              <td><div className="flex justify-end gap-1"><AuthorDialog key={a.id + a.name} author={a} onSaved={list.refresh} /><ConfirmDelete iconOnly title={`Delete ${a.name}?`} description="Books referencing this author will no longer show the name." onConfirm={() => { attempt(() => services.catalogAdmin.removeAuthor(a.id), "Author deleted", list.refresh); }} /></div></td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publishers                                                          */
/* ------------------------------------------------------------------ */

function PublisherDialog({ publisher, onSaved }: { publisher?: Publisher; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: publisher?.name ?? "", slug: publisher?.slug ?? "" });
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, slug: form.slug || undefined };
    const ok = await attempt(() => (publisher ? services.catalogAdmin.updatePublisher(publisher.id, payload) : services.catalogAdmin.createPublisher({ ...payload, bookCount: 0 })), publisher ? "Publisher updated" : "Publisher created", onSaved);
    setSaving(false);
    if (ok) { setOpen(false); if (!publisher) setForm({ name: "", slug: "" }); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{publisher ? <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${publisher.name}`}><Pencil size={14} /></Button> : <Button size="sm" className="gap-2"><Plus size={15} /> New publisher</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{publisher ? "Edit publisher" : "New publisher"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPublishers() {
  const list = useCatalogList("publishers", () => services.catalog.publishers());
  const [q, setQ] = useState("");
  const rows = (list.data ?? []).filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Publishers" description={`${list.data?.length ?? 0} publishers.`} actions={<><Search value={q} onChange={setQ} label="publishers" /><PublisherDialog onSaved={list.refresh} /></>} />
      {list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.loading ? <TableSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={Building2} title={q ? "No matching publishers" : "No publishers yet"} action={!q && <PublisherDialog onSaved={list.refresh} />} />
      ) : (
        <DataTable head={["Publisher", "Slug", "Books", ""]} minWidth={520}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.name}</td>
              <td className="text-muted-foreground">{p.slug}</td>
              <td className="tabular-nums">{p.bookCount ?? 0}</td>
              <td><div className="flex justify-end gap-1"><PublisherDialog key={p.id + p.name} publisher={p} onSaved={list.refresh} /><ConfirmDelete iconOnly title={`Delete ${p.name}?`} onConfirm={() => { attempt(() => services.catalogAdmin.removePublisher(p.id), "Publisher deleted", list.refresh); }} /></div></td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

const NO_PARENT = "__none";

function CategoryDialog({ category, all, onSaved, defaultParent }: { category?: Category; all: Category[]; onSaved: () => void; defaultParent?: string }) {
  const [open, setOpen] = useState(false);
  const blank = { name: "", slug: "", parentId: defaultParent ?? NO_PARENT, icon: "", imageUrl: null };
  const [form, setForm] = useState(category ? { name: category.name, slug: category.slug, parentId: category.parentId ?? NO_PARENT, icon: category.icon ?? "", imageUrl: category.imageUrl ?? null } : blank);
  const [saving, setSaving] = useState(false);
  // Only top-level categories can be parents (two-level tree), never itself.
  const parents = all.filter((c) => !c.parentId && c.id !== category?.id);
  const hasChildren = !!category && all.some((c) => c.parentId === category.id);
  
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Partial<Category> = { name: form.name,
       slug: form.slug || undefined, 
       icon: form.icon || undefined, 
       imageUrl: form.imageUrl || null, // null so "Remove" actually clears it on update
       parentId: form.parentId === NO_PARENT ? null : form.parentId };
    const ok = await attempt(() => (category ? services.catalogAdmin.updateCategory(category.id, payload) : services.catalogAdmin.createCategory(payload)), category ? "Category updated" : "Category created", onSaved);
    setSaving(false);
    if (ok) { setOpen(false); if (!category) setForm(blank); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${category.name}`}><Pencil size={14} /></Button>
          : defaultParent ? <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"><Plus size={12} /> Subcategory</Button>
          : <Button size="sm" className="gap-2"><Plus size={15} /> New category</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{category ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
          <div className="space-y-1.5">
            <Label>Parent category</Label>
            <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })} disabled={hasChildren}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
                {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasChildren && <p className="text-xs text-muted-foreground">This category has subcategories, so it stays top level.</p>}
          </div>
          <div className="space-y-1.5"><Label>Icon name (optional)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. BookOpen" /></div>
          <div className="space-y-1.5"><Label>Icon name (optional)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. BookOpen" /></div>
          <ImagePicker label="Image (optional)" value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} />
          <DialogFooter>...</DialogFooter>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCategories() {
  const list = useCatalogList("categories", () => services.catalog.categories());
  const all = list.data ?? [];
  const top = all.filter((c) => !c.parentId);
  const orphans = all.filter((c) => c.parentId && !all.some((p) => p.id === c.parentId));
  const del = (c: Category) => attempt(() => services.catalogAdmin.removeCategory(c.id), "Category deleted", list.refresh).then(() => undefined);

  const row = (c: Category, child: boolean) => (
    <tr key={c.id}>
      <td className={child ? "pl-9" : "font-medium"}>
        <div className="flex items-center gap-2">
          {child && <span className="text-muted-foreground">└</span>}
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded bg-muted">
            {c.imageUrl && <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          {c.name}
        </div>
      </td>
      <td className={child ? "pl-9" : "font-medium"}>{child && <span className="mr-1.5 text-muted-foreground">└</span>}{c.name}</td>
      <td className="text-muted-foreground">{c.slug}</td>
      <td>{child ? <Pill>Subcategory</Pill> : <Pill tone="primary">Top level</Pill>}</td>
      <td>
        <div className="flex items-center justify-end gap-1">
          {!child && <CategoryDialog all={all} onSaved={list.refresh} defaultParent={c.id} />}
          <CategoryDialog key={c.id + c.name + c.parentId + c.imageUrl} category={c} all={all} onSaved={list.refresh} />
          <ConfirmDelete iconOnly title={`Delete ${c.name}?`} description={child ? undefined : "Subcategories must be deleted or moved first."} onConfirm={() => { del(c); }} />
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Categories" description={`${top.length} top-level, ${all.length - top.length} subcategories.`} actions={<CategoryDialog all={all} onSaved={list.refresh} />} />
      {list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.loading ? <TableSkeleton /> : all.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" action={<CategoryDialog all={all} onSaved={list.refresh} />} />
      ) : (
        <DataTable head={["Category", "Slug", "Level", ""]} minWidth={620}>
          {top.flatMap((c) => [row(c, false), ...all.filter((s) => s.parentId === c.id).map((s) => row(s, true))])}
          {orphans.map((c) => row(c, true))}
        </DataTable>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Banners                                                             */
/* ------------------------------------------------------------------ */

type Placement = NonNullable<Banner["placement"]>;
const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "hero", label: "Hero carousel" },
  { value: "secondary", label: "Secondary strip" },
  { value: "campaign", label: "Campaign block" },
];

function BannerDialog({ banner, onSaved }: { banner?: Banner; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const blank = { title: "", subtitle: "", ctaLabel: "Shop now", ctaHref: "/books", imageUrl: "", bg: "", placement: "hero" as Placement, active: true };
  const [form, setForm] = useState(banner ? { ...blank, ...banner, placement: banner.placement ?? "hero", active: banner.active ?? true } : blank);
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { title, subtitle, ctaLabel, ctaHref, imageUrl, bg, placement, active } = form;
    const payload = { title, subtitle, ctaLabel, ctaHref, imageUrl, bg, placement, active };
    const ok = await attempt(() => (banner ? services.catalogAdmin.updateBanner(banner.id, payload) : services.catalogAdmin.createBanner(payload)), banner ? "Banner updated" : "Banner created", onSaved);
    setSaving(false);
    if (ok) { setOpen(false); if (!banner) setForm(blank); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{banner ? <Button variant="outline" size="sm" className="gap-1.5"><Pencil size={14} /> Edit</Button> : <Button size="sm" className="gap-2"><Plus size={15} /> New banner</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{banner ? "Edit banner" : "New banner"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Subtitle</Label><Textarea rows={2} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Button label</Label><Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Button link</Label><Input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/books?flag=flash" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Placement</Label>
            <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v as Placement })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ImagePicker label="Image" aspect="aspect-[16/9] w-32" value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} />
          <label className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>Active (shown on the storefront)</span>
            <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
          </label>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminBanners() {
  const list = useCatalogList("banners", () => services.catalog.banners());
  const toggle = (b: Banner) => attempt(() => services.catalogAdmin.updateBanner(b.id, { active: !(b.active ?? true) }), (b.active ?? true) ? "Banner hidden" : "Banner activated", list.refresh);
  const reorder = (items: Banner[], index: number, dir: -1 | 1) => {
    const nextItems = move(items, index, dir);
    const current = (list.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const itemIds = new Set(items.map((item) => item.id));
    const positions = current.reduce<number[]>((result, item, position) => {
      if (itemIds.has(item.id)) result.push(position);
      return result;
    }, []);
    const next = current.slice();
    positions.forEach((position, itemIndex) => { next[position] = nextItems[itemIndex]; });
    void attempt(() => services.catalogAdmin.reorderBanners(next.map((banner) => banner.id)), "Order saved", list.refresh);
  };
  return (
    <div>
      <PageHeader eyebrow="Storefront" title="Banners" description="Homepage hero, secondary and campaign banners." actions={<BannerDialog onSaved={list.refresh} />} />
      {list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.loading ? <TableSkeleton rows={3} /> : !list.data || list.data.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No banners yet" description="Add a hero banner to feature a campaign on the homepage." action={<BannerDialog onSaved={list.refresh} />} />
      ) : (
        <div className="space-y-6">
          {PLACEMENTS.map((p) => {
            const items = list.data!.filter((b) => (b.placement ?? "hero") === p.value).sort((a, b) => a.sortOrder - b.sortOrder);
            if (items.length === 0) return null;
            return (
              <section key={p.value}>
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{p.label}</p>
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {items.map((b, index) => {
                    const active = b.active ?? true;
                    return (
                      <div key={b.id} className="flex flex-wrap items-center gap-4 p-3">
                        <div className="aspect-[16/9] w-32 shrink-0 overflow-hidden rounded-md border border-border bg-muted">{b.imageUrl && <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-semibold">{b.title}</p>
                          <p className="line-clamp-1 text-sm text-muted-foreground">{b.subtitle}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{b.ctaLabel || "—"} → <span className="font-mono">{b.ctaHref || "—"}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ReorderButtons index={index} count={items.length} onMove={(dir) => reorder(items, index, dir)} label={b.title} />
                          <Switch checked={active} onCheckedChange={() => toggle(b)} aria-label={`Toggle ${b.title}`} />
                          <Pill tone={active ? "positive" : "neutral"}>{active ? "Active" : "Hidden"}</Pill>
                          <BannerDialog key={b.id + b.title + b.imageUrl} banner={b} onSaved={list.refresh} />
                          <ConfirmDelete iconOnly title={`Delete banner "${b.title}"?`} description="The banner and its stored image will be removed." onConfirm={() => { attempt(() => services.catalogAdmin.removeBanner(b.id), "Banner deleted", list.refresh); }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
