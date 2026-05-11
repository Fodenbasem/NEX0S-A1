import { db, pool } from "./index";
import {
  projectsTable,
  aiRequestsTable,
  deploymentsTable,
  activityLogsTable,
  userSessionsTable,
  securityReportsTable,
} from "./schema";

async function seed() {
  console.log("Seeding development database...");

  const DEV_USER = "dev-user-001";

  const existingProjects = await db.select().from(projectsTable).limit(1);
  if (existingProjects.length > 0) {
    console.log("Database already seeded — skipping.");
    await pool.end();
    return;
  }

  const [proj1, proj2, proj3] = await db
    .insert(projectsTable)
    .values([
      {
        ownerId: DEV_USER,
        name: "E-Commerce Platform",
        description: "Full-stack Next.js shop with Stripe payments",
        status: "blueprint",
        language: "en",
        stack: "Next + Postgres",
        synthesisProgress: 80,
      },
      {
        ownerId: DEV_USER,
        name: "AI Chat Assistant",
        description: "Real-time AI chat with streaming responses",
        status: "deployed",
        language: "en",
        stack: "Next + Postgres",
        synthesisProgress: 100,
      },
      {
        ownerId: DEV_USER,
        name: "Analytics Dashboard",
        description: "Business intelligence dashboard with charts",
        status: "consulting",
        language: "en",
        stack: "Next + Postgres",
        synthesisProgress: 20,
      },
    ])
    .returning();

  console.log(`Inserted ${[proj1, proj2, proj3].length} projects`);

  await db.insert(aiRequestsTable).values([
    {
      projectId: proj1.id,
      userId: DEV_USER,
      role: "user",
      content: "I need an e-commerce platform with Stripe and a product catalog.",
      model: "claude-opus-4-5",
      tokensIn: 120,
      tokensOut: 0,
      latencyMs: 0,
    },
    {
      projectId: proj1.id,
      userId: DEV_USER,
      role: "assistant",
      content: "I'll design a Next.js shop with Stripe Checkout, a Postgres product catalog, and an admin panel.",
      model: "claude-opus-4-5",
      tokensIn: 0,
      tokensOut: 340,
      latencyMs: 1820,
    },
    {
      projectId: proj2.id,
      userId: DEV_USER,
      role: "user",
      content: "Build a real-time AI chat interface with streaming.",
      model: "claude-opus-4-5",
      tokensIn: 90,
      tokensOut: 0,
      latencyMs: 0,
    },
  ]);

  console.log("Inserted AI request messages");

  const [dep1, dep2] = await db
    .insert(deploymentsTable)
    .values([
      {
        projectId: proj2.id,
        userId: DEV_USER,
        status: "success",
        liveUrl: "https://ai-chat-dev.nex0s.app",
        logs: "Build complete. Pushed 9 layers. Rollout complete.",
        durationMs: 119000,
      },
      {
        projectId: proj1.id,
        userId: DEV_USER,
        status: "success",
        liveUrl: "https://ecom-dev.nex0s.app",
        logs: "Build complete. Pushed 11 layers. Rollout complete.",
        durationMs: 98000,
      },
    ])
    .returning();

  console.log(`Inserted ${[dep1, dep2].length} deployments`);

  await db.insert(activityLogsTable).values([
    { userId: DEV_USER, projectId: proj1.id, action: "project.created", severity: "info", category: "project" },
    { userId: DEV_USER, projectId: proj2.id, action: "project.created", severity: "info", category: "project" },
    { userId: DEV_USER, projectId: proj3.id, action: "project.created", severity: "info", category: "project" },
    { userId: DEV_USER, projectId: proj2.id, action: "deployment.success", severity: "info", category: "deployment", metadata: { liveUrl: dep1.liveUrl } },
    { userId: DEV_USER, projectId: proj1.id, action: "deployment.success", severity: "info", category: "deployment", metadata: { liveUrl: dep2.liveUrl } },
    { userId: DEV_USER, action: "session.started", severity: "info", category: "session" },
  ]);

  console.log("Inserted activity logs");

  await db.insert(securityReportsTable).values([
    {
      projectId: proj2.id,
      userId: DEV_USER,
      compositeScore: 87,
      owaspScores: { A01: 95, A02: 90, A03: 85, A04: 80, A05: 88 },
      findings: [
        { id: "F001", severity: "low", title: "Missing rate limiting on chat endpoint", status: "open" },
      ],
    },
  ]);

  console.log("Inserted security reports");

  await pool.end();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
