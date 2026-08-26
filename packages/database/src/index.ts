import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: any | undefined;
  // eslint-disable-next-line no-var
  var realPrismaInstance: any | undefined;
}

function getOrCreateRealClient(): any {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (globalThis.realPrismaInstance) {
    return globalThis.realPrismaInstance;
  }

  try {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });
    globalThis.realPrismaInstance = client;
    return client;
  } catch {
    return null;
  }
}

export const prisma: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getOrCreateRealClient();
    if (client) {
      return (client as any)[prop];
    }
    if (prop === "then") return undefined;
    if (prop === "$connect" || prop === "$disconnect") return () => Promise.resolve();
    return new Proxy({} as any, {
      get(_t, _p) {
        if (_p === "then") return undefined;
        return () => Promise.resolve(null);
      },
    });
  },
});

export * from "@prisma/client";
export default prisma;



