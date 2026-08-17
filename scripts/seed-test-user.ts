import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@ai-social/database";

dotenv.config();

const TEST_USER = {
  email: process.env.DEV_TEST_USER_EMAIL || "test@example.com",
  password: process.env.DEV_TEST_USER_PASSWORD || "Test@12345",
  name: process.env.DEV_TEST_USER_NAME || "Test User",
  workspaceId: process.env.DEV_TEST_WORKSPACE_ID || "demo-workspace-1",
};

async function seedTestUser() {
  console.log("==================================================");
  console.log("     AI SOCIAL MEDIA STUDIO — DEV USER SEEDER     ");
  console.log("==================================================");
  console.log(`[Seed] Target Email: ${TEST_USER.email}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder") || supabaseUrl.includes("your-project")) {
    console.error("\n❌ [Config Error] Missing valid NEXT_PUBLIC_SUPABASE_URL environment variable.");
    console.error("Please set NEXT_PUBLIC_SUPABASE_URL in your local .env file.");
    console.error("Example: NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 (local Supabase) or https://<your-id>.supabase.co");
    process.exit(1);
  }

  if (!serviceRoleKey || serviceRoleKey.includes("placeholder") || serviceRoleKey.includes("your-supabase")) {
    console.error("\n❌ [Config Error] Missing valid SUPABASE_SERVICE_ROLE_KEY environment variable.");
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY in your local .env file.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`\n❌ [Supabase API Error] Failed to list users: ${listError.message}`);
      process.exit(1);
    }

    const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === TEST_USER.email.toLowerCase());

    let userId: string;

    if (existingUser) {
      console.log(`\nℹ️ User ${TEST_USER.email} already exists (ID: ${existingUser.id}). Updating credentials...`);
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: TEST_USER.password,
        user_metadata: {
          fullName: TEST_USER.name,
          workspaceId: TEST_USER.workspaceId,
        },
      });

      if (updateError) {
        console.error(`\n❌ Failed to update test user: ${updateError.message}`);
        process.exit(1);
      }

      userId = updated.user.id;
      console.log(`✓ [Idempotent] Test user updated successfully.`);
    } else {
      console.log(`\n🚀 Creating new test user ${TEST_USER.email}...`);
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: {
          fullName: TEST_USER.name,
          workspaceId: TEST_USER.workspaceId,
        },
      });

      if (createError || !created.user) {
        console.error(`\n❌ Failed to create test user in Supabase: ${createError?.message || "Unknown error"}`);
        process.exit(1);
      }

      userId = created.user.id;
      console.log(`✓ [Created] Test user created successfully (ID: ${userId}).`);
    }

    // Sync PostgreSQL User Record via Prisma (If DB connected)
    try {
      await prisma.user.upsert({
        where: { email: TEST_USER.email },
        update: {
          fullName: TEST_USER.name,
          supabaseUid: userId,
        },
        create: {
          email: TEST_USER.email,
          fullName: TEST_USER.name,
          supabaseUid: userId,
        },
      });
      console.log(`✓ [Database] Synced User record in PostgreSQL DB.`);
    } catch {
      console.log(`ℹ️ [Database] PostgreSQL Prisma sync skipped (Offline/Mock mode active).`);
    }

    console.log("\n==================================================");
    console.log("✅ DEVELOPMENT TEST USER READY FOR LOGIN:");
    console.log("--------------------------------------------------");
    console.log(`   Email:    ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log("==================================================");
    console.log("⚠️ REMINDER: Remove this user / seed script before deploying to production!");
    console.log("==================================================\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ [Error] Failed to seed test user: ${msg}`);
    process.exit(1);
  }
}

seedTestUser();
