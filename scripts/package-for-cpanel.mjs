// Packages the Next.js standalone build for cPanel (Namecheap shared hosting),
// to run at https://amardokan-e.com/odhaybd  (a SUBFOLDER, basePath "/odhaybd").
//
// Save as scripts/package-for-cpanel.mjs, then:
//   1. next.config.ts: add  output: "standalone"  and  basePath: "/odhaybd"
//   2. npx prisma7 generate
//   3. set NEXT_PUBLIC_BASE_PATH=/odhaybd and run  npm run build
//        PowerShell:   $env:NEXT_PUBLIC_BASE_PATH="/odhaybd"; npm run build
//        macOS/Linux:  NEXT_PUBLIC_BASE_PATH=/odhaybd npm run build
//   4. node scripts/package-for-cpanel.mjs
//
// Result: odhaybd-deploy.zip, ready to upload and extract in the cPanel
// application folder.

import { access, cp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const BASE_PATH = "/odhaybd";
const zipName = "odhaybd-deploy.zip";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const out = path.join(root, "deploy");

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

// ---- 1. Make sure the build is the right one ------------------------------
if (!(await exists(path.join(standalone, "server.js")))) {
  console.error(
    '\n.next/standalone/server.js not found.\n' +
    'Add  output: "standalone"  to next.config.ts and run  npm run build  first.\n' +
    "If your project sits inside a larger workspace, server.js may be in a\n" +
    "subfolder of .next/standalone: set outputFileTracingRoot and rebuild.\n",
  );
  process.exit(1);
}

try {
  const req = JSON.parse(
    await readFile(path.join(root, ".next", "required-server-files.json"), "utf8"),
  );
  const built = req?.config?.basePath ?? "";
  if (built !== BASE_PATH) {
    console.error(
      `\nThis build has basePath "${built}", but the site needs "${BASE_PATH}".\n` +
      `Set  basePath: "${BASE_PATH}"  in next.config.ts and run  npm run build  again.\n`,
    );
    process.exit(1);
  }
  console.log(`basePath OK (${BASE_PATH})`);
} catch (err) {
  console.warn("Could not verify basePath from the build output:", err.message);
}

// ---- 2. Assemble ./deploy -------------------------------------------------
console.log("Cleaning deploy/ ...");
await rm(out, { recursive: true, force: true });

console.log("Copying standalone server ...");
await cp(standalone, out, { recursive: true });

// The standalone output does not include these two on its own.
console.log("Copying .next/static and public/ ...");
await cp(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (await exists(path.join(root, "public"))) {
  await cp(path.join(root, "public"), path.join(out, "public"), { recursive: true });
}

// ---- 3. Prisma: make sure the generated client + Linux engine are included --
console.log("Copying Prisma client and engines ...");
for (const rel of ["node_modules/.prisma", "node_modules/@prisma/client"]) {
  const src = path.join(root, rel);
  if (!(await exists(src))) {
    console.log("  skipped (not found):", rel);
    continue;
  }
  await rm(path.join(out, rel), { recursive: true, force: true });
  await cp(src, path.join(out, rel), { recursive: true });
}

const clientDir = path.join(out, "node_modules", ".prisma", "client");
if (await exists(clientDir)) {
  const files = await readdir(clientDir);

  // Windows / macOS engines are useless on the server and waste file allowance.
  for (const f of files) {
    if (/query_engine.*(windows|darwin)/i.test(f)) {
      await rm(path.join(clientDir, f), { force: true });
      console.log("  removed", f);
    }
  }

  const engines = files.filter((f) => /query_engine/.test(f) && !/windows|darwin/i.test(f));
  console.log("  engines kept:", engines.join(", ") || "(none)");
  if (!engines.some((f) => /rhel|debian|linux/.test(f))) {
    console.warn(
      '\n  WARNING: no Linux query engine in the package.\n' +
      '  If you use Prisma 6 or earlier, add\n' +
      '    binaryTargets = ["native", "rhel-openssl-3.0.x"]\n' +
      "  to the generator in prisma/schema.prisma (use the target that matches your\n" +
      "  server), run  npx prisma7 generate, then build and package again.\n",
    );
  }
}

// ---- 4. Secrets must never travel inside the zip ---------------------------
for (const f of await readdir(out)) {
  if (f.startsWith(".env")) {
    await rm(path.join(out, f), { force: true });
    console.log("  removed", f);
  }
}

// ---- 5. Passenger wrapper --------------------------------------------------
// cPanel's startup file is server.js. Keep Next's generated server as
// next-server.js and start it from a tiny wrapper.
await rename(path.join(out, "server.js"), path.join(out, "next-server.js"));
await writeFile(
  path.join(out, "server.js"),
  'process.env.HOSTNAME = "0.0.0.0";\nrequire("./next-server.js");\n',
);

// ---- 6. Zip ----------------------------------------------------------------
console.log(`Creating ${zipName} ...`);
await rm(path.join(root, zipName), { force: true });
if (process.platform === "win32") {
  // Windows' own tar.exe writes proper zip paths. (Compress-Archive in older
  // PowerShell versions writes backslashes, which break on Linux.)
  const tar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
  execFileSync(tar, ["-a", "-c", "-f", zipName, "-C", "deploy", "."], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-qr", path.join(root, zipName), "."], { cwd: out, stdio: "inherit" });
}

console.log(`\nDone: ${path.join(root, zipName)}`);
console.log("Upload it to the application folder in cPanel and extract it there.");
if (existsSync(path.join(out, "node_modules"))) {
  console.log("It contains its own node_modules, so do NOT press 'Run NPM Install' on the server.");
}
