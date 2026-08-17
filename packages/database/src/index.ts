import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: any | undefined;
}

function createPrismaClient(): any {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  } catch {
    return new Proxy({} as any, {
      get(_target, prop) {
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
  }
}

export const prisma: any = globalThis.globalPrisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.globalPrisma = prisma;
}

export * from "@prisma/client";
export default prisma;
