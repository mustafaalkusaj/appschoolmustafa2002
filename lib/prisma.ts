// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Legacy Prisma stub — app uses Supabase. These routes are not active.
const handler = new Proxy({}, {
  get: () => handler,
  apply: () => Promise.resolve(null),
});
export const prisma = handler;
export default prisma;
