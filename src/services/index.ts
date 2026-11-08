// Single wiring point for the data layer. Components and contexts import
// `services` from here and never touch a concrete backend directly.
//
// In the browser, `services` talks to this app's own API routes
// (src/app/api/**/route.ts) through ./api/client. Those routes use Prisma
// (see ./prisma-repositories.ts) to read and write PostgreSQL on the server.

import { httpRepositories } from "./http-repositories";

export const services = httpRepositories;

// Kept so existing callers (e.g. providers) keep compiling. Seeding now happens
// on the server with `npm run prisma:seed`, not from the browser.
export function seedIfNeeded(): Promise<void> {
  return Promise.resolve();
}