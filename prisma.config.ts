import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: "apps/api/.env", override: true });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

