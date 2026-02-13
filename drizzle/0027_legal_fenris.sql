PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`github_org` text,
	`github_repo` text,
	`github_branch` text,
	`supabase_project_id` text,
	`supabase_parent_project_id` text,
	`supabase_organization_slug` text,
	`neon_project_id` text,
	`neon_development_branch_id` text,
	`neon_preview_branch_id` text,
	`vercel_project_id` text,
	`vercel_project_name` text,
	`vercel_team_id` text,
	`vercel_deployment_url` text,
	`install_command` text,
	`start_command` text,
	`chat_context` text,
	`is_favorite` integer DEFAULT 0 NOT NULL,
	`theme_id` text,
	`runtime_provider` text,
	`stack_type` text
);
--> statement-breakpoint
INSERT INTO `__new_apps`("id", "name", "path", "created_at", "updated_at", "github_org", "github_repo", "github_branch", "supabase_project_id", "supabase_parent_project_id", "supabase_organization_slug", "neon_project_id", "neon_development_branch_id", "neon_preview_branch_id", "vercel_project_id", "vercel_project_name", "vercel_team_id", "vercel_deployment_url", "install_command", "start_command", "chat_context", "is_favorite", "theme_id", "runtime_provider", "stack_type") SELECT "id", "name", "path", "created_at", "updated_at", "github_org", "github_repo", "github_branch", "supabase_project_id", "supabase_parent_project_id", "supabase_organization_slug", "neon_project_id", "neon_development_branch_id", "neon_preview_branch_id", "vercel_project_id", "vercel_project_name", "vercel_team_id", "vercel_deployment_url", "install_command", "start_command", "chat_context", "is_favorite", "theme_id", "runtime_provider", "stack_type" FROM `apps`;--> statement-breakpoint
DROP TABLE `apps`;--> statement-breakpoint
ALTER TABLE `__new_apps` RENAME TO `apps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;