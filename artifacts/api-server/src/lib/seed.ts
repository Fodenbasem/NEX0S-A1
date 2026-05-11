import { db, whitelistedUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SEED_EMAILS = ["fady.basem347@gmail.com", "nexus.admin@gmail.com"];

export async function seedWhitelist(): Promise<void> {
  try {
    for (const email of SEED_EMAILS) {
      const [existing] = await db
        .select()
        .from(whitelistedUsersTable)
        .where(eq(whitelistedUsersTable.email, email))
        .limit(1);
      if (!existing) {
        await db.insert(whitelistedUsersTable).values({
          email,
          addedBy: "system",
          note: "Master admin — auto-seeded",
        });
        console.info(`[whitelist] ✓ Seeded: ${email}`);
      }
    }
    console.info("[whitelist] Seed complete");
  } catch (err) {
    console.warn("[whitelist] Seed error:", err instanceof Error ? err.message : err);
  }
}
