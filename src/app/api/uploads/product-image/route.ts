import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireRole } from "@/lib/guards";
import { fail, handle, ok } from "@/lib/api-route";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Empty on your PC; "/odhaybd" in the sub-folder deployment. Saved image links
// include it so <img src> points at the right place.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Identify the image from its first bytes instead of trusting the filename or
// the browser's content type. SVG is deliberately not allowed (it can carry scripts).
function sniff(b: Uint8Array): { ext: "jpg" | "png" | "gif" | "webp" } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: "gif" };
  const riff = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46;
  const webp = b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  if (riff && webp) return { ext: "webp" };
  return null;
}

export const POST = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR", "SELLER");
  if (auth.error) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Please choose an image to upload", 400);
  }
  let file: File | null = null;
  for (const [, value] of form.entries()) {
    if (value instanceof File) { file = value; break; }
  }
  if (!file || file.size === 0) return fail("Please choose an image to upload", 400);
  if (file.size > MAX_BYTES) return fail("Image is too large (max 5 MB)", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail("Only JPG, PNG, WebP or GIF images are allowed", 415);

  const name = `${randomUUID()}.${kind.ext}`;
  const dir = path.join(process.cwd(), "uploads", "products");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);

  return ok({ url: `${BASE_PATH}/api/uploads/products/${name}` }, { status: 201 });
});