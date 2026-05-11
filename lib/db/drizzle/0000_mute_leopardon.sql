CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'consulting' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"stack" text,
	"blueprint" jsonb,
	"synthesis_progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"composite_score" integer DEFAULT 0 NOT NULL,
	"owasp_scores" jsonb,
	"findings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"live_url" text,
	"steps" jsonb,
	"logs" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"action" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token" text NOT NULL,
	"user_agent" text,
	"browser" text,
	"os" text,
	"device" text,
	"ip_address" text,
	"location" text,
	"mfa_verified" boolean DEFAULT false NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
