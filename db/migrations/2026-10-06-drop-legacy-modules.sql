-- Applied manually after the docs-only deploy is live.
-- Touches only schema portulan. Does not use CASCADE.
-- The application bootstrap no longer creates or alters these tables.
-- Children first so foreign keys inside this set can drop without CASCADE.

BEGIN;

DROP TABLE IF EXISTS portulan.coordination_messages;
DROP TABLE IF EXISTS portulan.coordination_threads;
DROP TABLE IF EXISTS portulan.progress_reports;
DROP TABLE IF EXISTS portulan.implementation_task_sources;
DROP TABLE IF EXISTS portulan.implementation_tasks;
DROP TABLE IF EXISTS portulan.implementation_plans;
DROP TABLE IF EXISTS portulan.acceptance_criteria;
DROP TABLE IF EXISTS portulan.context_pack_sources;
DROP TABLE IF EXISTS portulan.context_pack_items;
DROP TABLE IF EXISTS portulan.context_pack_revisions;
DROP TABLE IF EXISTS portulan.context_packs;
DROP TABLE IF EXISTS portulan.project_repositories;
DROP TABLE IF EXISTS portulan.repositories;
DROP TABLE IF EXISTS portulan.projects;
DROP TABLE IF EXISTS portulan.workspace_board_refs;
DROP TABLE IF EXISTS portulan.workspace_board_counters;

COMMIT;
