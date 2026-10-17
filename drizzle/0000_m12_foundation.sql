CREATE SCHEMA "workspace";
--> statement-breakpoint
CREATE TYPE "workspace"."task_status" AS ENUM('backlog', 'specification', 'pending_review', 'ready', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TABLE "workspace"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"next_task_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_key_format" CHECK ("workspace"."projects"."key" ~ '^[A-Z][A-Z0-9]{1,9}$'),
	CONSTRAINT "project_name_length" CHECK (length(btrim("workspace"."projects"."name")) between 1 and 100),
	CONSTRAINT "project_description_length" CHECK (length("workspace"."projects"."description") <= 10000),
	CONSTRAINT "project_positive_counters" CHECK ("workspace"."projects"."revision" > 0 and "workspace"."projects"."next_task_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace"."project_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "repository_url_format" CHECK ("workspace"."project_repositories"."url" ~ '^https://github[.]com/[a-z0-9][a-z0-9-]{0,38}/[a-z0-9_.-]{1,100}$')
);
--> statement-breakpoint
CREATE TABLE "workspace"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "workspace"."task_status" DEFAULT 'backlog' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_title_length" CHECK (length(btrim("workspace"."tasks"."title")) between 1 and 200),
	CONSTRAINT "task_description_length" CHECK (length("workspace"."tasks"."description") <= 10000),
	CONSTRAINT "task_positive_counters" CHECK ("workspace"."tasks"."number">0 and "workspace"."tasks"."revision">0)
);
--> statement-breakpoint
CREATE TABLE "workspace"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_provider_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_provider_id_unique" UNIQUE("github_provider_id"),
	CONSTRAINT "github_id_format" CHECK ("workspace"."users"."github_provider_id" ~ '^[1-9][0-9]*$')
);
--> statement-breakpoint
ALTER TABLE "workspace"."projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "workspace"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "workspace"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace"."tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "workspace"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_owner_key" ON "workspace"."projects" USING btree ("owner_id","key");--> statement-breakpoint
CREATE INDEX "projects_owner_created" ON "workspace"."projects" USING btree ("owner_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_repository" ON "workspace"."project_repositories" USING btree ("project_id") WHERE "workspace"."project_repositories"."retired_at" is null;--> statement-breakpoint
CREATE INDEX "repository_project" ON "workspace"."project_repositories" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_project_number" ON "workspace"."tasks" USING btree ("project_id","number");