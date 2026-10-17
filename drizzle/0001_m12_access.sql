-- Dedicated server role; credentials are provisioned separately, never in migrations.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workspace_app') THEN
    CREATE ROLE workspace_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON SCHEMA workspace FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA workspace FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA workspace TO workspace_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON workspace.users, workspace.projects, workspace.project_repositories, workspace.tasks TO workspace_app;
--> statement-breakpoint
GRANT UPDATE (name, description, revision, updated_at, next_task_number) ON workspace.projects TO workspace_app;
--> statement-breakpoint
GRANT UPDATE (title, description, revision, updated_at) ON workspace.tasks TO workspace_app;
--> statement-breakpoint
GRANT UPDATE (retired_at) ON workspace.project_repositories TO workspace_app;
--> statement-breakpoint
ALTER TABLE workspace.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace.users FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace.project_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace.project_repositories FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace.tasks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_identity ON workspace.users TO workspace_app
  USING (github_provider_id = current_setting('workspace.owner_github_id', true))
  WITH CHECK (github_provider_id = current_setting('workspace.owner_github_id', true));
--> statement-breakpoint
CREATE POLICY owned_projects ON workspace.projects TO workspace_app
  USING (owner_id IN (SELECT id FROM workspace.users))
  WITH CHECK (owner_id IN (SELECT id FROM workspace.users));
--> statement-breakpoint
CREATE POLICY owned_repositories ON workspace.project_repositories TO workspace_app
  USING (project_id IN (SELECT id FROM workspace.projects))
  WITH CHECK (project_id IN (SELECT id FROM workspace.projects));
--> statement-breakpoint
CREATE POLICY owned_tasks ON workspace.tasks TO workspace_app
  USING (project_id IN (SELECT id FROM workspace.projects))
  WITH CHECK (project_id IN (SELECT id FROM workspace.projects));
--> statement-breakpoint
-- In M1.2 tasks can only enter Backlog; runtime UPDATE grants exclude status.
CREATE FUNCTION workspace.initial_task_status() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status <> 'backlog' THEN
    RAISE EXCEPTION 'New tasks must enter Backlog' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION workspace.initial_task_status() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER initial_task_status BEFORE INSERT ON workspace.tasks
  FOR EACH ROW EXECUTE FUNCTION workspace.initial_task_status();
