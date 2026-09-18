-- Portulan schema (Neon Postgres)
-- Applied on first boot when DATABASE_URL is configured.
-- Tables live in the dedicated "portulan" schema to avoid collisions with other apps in public.

CREATE SCHEMA IF NOT EXISTS portulan;

CREATE TABLE IF NOT EXISTS portulan.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE,
  login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  email TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.users ALTER COLUMN github_id DROP NOT NULL;
ALTER TABLE portulan.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE portulan.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_uidx ON portulan.users (LOWER(login));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON portulan.users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS portulan.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  theme_paper TEXT NOT NULL DEFAULT 'carta',
  theme_mode TEXT NOT NULL DEFAULT 'light',
  theme_ink TEXT NOT NULL DEFAULT '#1a2847',
  is_personal BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON portulan.workspaces (created_by);

CREATE TABLE IF NOT EXISTS portulan.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON portulan.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON portulan.workspace_members (user_id);

CREATE TABLE IF NOT EXISTS portulan.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON portulan.workspace_invites (workspace_id);

-- Porto inicial de cada conta: um workspace pessoal com o dono como capitão.
INSERT INTO portulan.workspaces (slug, name, is_personal, created_by)
SELECT
  'porto-' || SUBSTRING(u.id::text FROM 1 FOR 8),
  'Porto de ' || SPLIT_PART(COALESCE(NULLIF(TRIM(u.name), ''), u.login), ' ', 1),
  TRUE,
  u.id
FROM portulan.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM portulan.workspaces AS w WHERE w.created_by = u.id AND w.is_personal
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portulan.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.created_by, 'owner'
FROM portulan.workspaces AS w
WHERE w.created_by IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS portulan.templates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  draft_version INTEGER NOT NULL DEFAULT 0,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.templates ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE portulan.templates ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portulan.templates ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE CASCADE;

UPDATE portulan.templates AS t
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE t.workspace_id IS NULL
  AND t.user_id IS NOT NULL
  AND w.created_by = t.user_id
  AND w.is_personal;

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON portulan.templates (user_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON portulan.templates (workspace_id);

CREATE TABLE IF NOT EXISTS portulan.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Token MCP',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE SET NULL;

UPDATE portulan.mcp_tokens AS t
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE t.workspace_id IS NULL
  AND w.created_by = t.user_id
  AND w.is_personal;

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON portulan.mcp_tokens (user_id);

CREATE TABLE IF NOT EXISTS portulan.documents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL REFERENCES portulan.templates(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')),
  author TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  draft_version INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE
);

-- Migrations for databases created before template-based documents (must run before template_id indexes)
INSERT INTO portulan.templates (id, user_id, name, primary_color, secondary_color, content, is_builtin)
VALUES (
  'portulan-default',
  NULL,
  'Default',
  '#1a2847',
  '#8b2735',
  E'## Visão geral\n\nDescreva o contexto, objetivo e público deste documento.\n\n## Conteúdo principal\n\nDesenvolva o assunto com clareza e evidências.\n\n:::callout{title="Destaque"}\nInformação relevante para o leitor.\n:::\n\n## Próximos passos\n\n- Ação ou decisão pendente\n- Responsável e prazo',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS template_id TEXT;
UPDATE portulan.documents SET template_id = 'portulan-default' WHERE template_id IS NULL;
DROP INDEX IF EXISTS portulan.idx_documents_type;
ALTER TABLE portulan.documents DROP COLUMN IF EXISTS type;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE SET NULL;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0;

UPDATE portulan.documents AS d
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE d.workspace_id IS NULL
  AND d.user_id IS NOT NULL
  AND w.created_by = d.user_id
  AND w.is_personal;

UPDATE portulan.documents SET visibility = 'public' WHERE is_public AND visibility <> 'public';
ALTER TABLE portulan.documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE portulan.documents ADD CONSTRAINT documents_visibility_check CHECK (visibility IN ('private', 'workspace', 'public'));

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON portulan.documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON portulan.documents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON portulan.documents (template_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON portulan.documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON portulan.documents (user_id);

CREATE TABLE IF NOT EXISTS portulan.document_releases (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  author TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (document_id, version)
);

ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS secondary_color TEXT;

UPDATE portulan.document_releases AS r
SET
  template_id = COALESCE(r.template_id, 'portulan-default'),
  template_name = COALESCE(r.template_name, 'Default'),
  primary_color = COALESCE(r.primary_color, '#1a2847'),
  secondary_color = COALESCE(r.secondary_color, '#8b2735')
WHERE r.template_id IS NULL OR r.template_name IS NULL OR r.primary_color IS NULL OR r.secondary_color IS NULL;

ALTER TABLE portulan.document_releases DROP COLUMN IF EXISTS type;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS published_by_user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_releases_document ON portulan.document_releases (document_id, version DESC);

CREATE TABLE IF NOT EXISTS portulan.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  invited_by UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, email)
);

CREATE TABLE IF NOT EXISTS portulan.document_slug_aliases (
  slug TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_slug_aliases_document_id ON portulan.document_slug_aliases (document_id);

CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON portulan.document_shares (document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON portulan.document_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_email ON portulan.document_shares (email);

CREATE TABLE IF NOT EXISTS portulan.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  section_anchor TEXT,
  quoted_text TEXT,
  parent_id UUID REFERENCES portulan.document_comments(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON portulan.document_comments (document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON portulan.document_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON portulan.document_comments (created_at);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON portulan.document_comments (parent_id);

CREATE TABLE IF NOT EXISTS portulan.agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  work_mode TEXT NOT NULL CHECK (work_mode IN ('context_and_coordination', 'local_implementation', 'review')),
  allowed_mcp_tools TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_identities_workspace_id ON portulan.agent_identities (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_identities_owner_user_id ON portulan.agent_identities (owner_user_id);

ALTER TABLE portulan.agent_identities ADD COLUMN IF NOT EXISTS allowed_mcp_tools TEXT NOT NULL DEFAULT '[]';
ALTER TABLE portulan.agent_identities ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE portulan.agent_identities ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL;
ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS scopes TEXT NOT NULL DEFAULT '[]';
ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS last_client_info TEXT;
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_agent_identity_id ON portulan.mcp_tokens (agent_identity_id);

CREATE TABLE IF NOT EXISTS portulan.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON portulan.projects (workspace_id);

CREATE TABLE IF NOT EXISTS portulan.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'git' CHECK (kind IN ('git', 'local', 'both')),
  remote_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_workspace_id ON portulan.repositories (workspace_id);

CREATE TABLE IF NOT EXISTS portulan.project_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES portulan.projects(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES portulan.repositories(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'dependency', 'consumer', 'infrastructure')),
  path_scopes TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, repository_id)
);

CREATE INDEX IF NOT EXISTS idx_project_repositories_project_id ON portulan.project_repositories (project_id);
CREATE INDEX IF NOT EXISTS idx_project_repositories_repository_id ON portulan.project_repositories (repository_id);

CREATE TABLE IF NOT EXISTS portulan.context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES portulan.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  expected_outcome TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  out_of_scope TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'superseded')),
  validity TEXT NOT NULL DEFAULT 'current' CHECK (validity IN ('current', 'needs_review', 'expired')),
  owner_user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  current_revision_id UUID,
  board_number INTEGER NOT NULL DEFAULT 0,
  draft_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.context_packs ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_context_packs_workspace_id ON portulan.context_packs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_context_packs_project_id ON portulan.context_packs (project_id);

CREATE TABLE IF NOT EXISTS portulan.context_pack_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  snapshot TEXT NOT NULL DEFAULT '{}',
  approved_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_context_pack_revisions_pack_id ON portulan.context_pack_revisions (pack_id);

CREATE TABLE IF NOT EXISTS portulan.context_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('decision', 'rule', 'contract', 'risk', 'assumption', 'question')),
  strength TEXT NOT NULL DEFAULT 'required' CHECK (strength IN ('required', 'recommended', 'reference')),
  body TEXT NOT NULL,
  blocking BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_pack_items_pack_id ON portulan.context_pack_items (pack_id);
CREATE INDEX IF NOT EXISTS idx_context_pack_items_revision_id ON portulan.context_pack_items (revision_id);

CREATE TABLE IF NOT EXISTS portulan.context_pack_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  release_id TEXT REFERENCES portulan.document_releases(id) ON DELETE SET NULL,
  source_role TEXT NOT NULL DEFAULT 'spec',
  section TEXT,
  reason TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_pack_sources_pack_id ON portulan.context_pack_sources (pack_id);
CREATE INDEX IF NOT EXISTS idx_context_pack_sources_document_id ON portulan.context_pack_sources (document_id);

CREATE TABLE IF NOT EXISTS portulan.acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_pack_id ON portulan.acceptance_criteria (pack_id);

CREATE TABLE IF NOT EXISTS portulan.implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  draft_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.implementation_plans ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_implementation_plans_pack_id ON portulan.implementation_plans (pack_id);

CREATE TABLE IF NOT EXISTS portulan.implementation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES portulan.context_packs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES portulan.implementation_plans(id) ON DELETE SET NULL,
  pack_revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES portulan.implementation_tasks(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  repository_id UUID REFERENCES portulan.repositories(id) ON DELETE SET NULL,
  path_scopes TEXT NOT NULL DEFAULT '[]',
  required_item_ids TEXT NOT NULL DEFAULT '[]',
  criterion_ids TEXT NOT NULL DEFAULT '[]',
  depends_on_task_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'in_progress', 'blocked', 'reported', 'accepted')),
  assignee_user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  assignee_agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  lease_holder_token_id UUID REFERENCES portulan.mcp_tokens(id) ON DELETE SET NULL,
  lease_holder_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  lease_holder_user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  lease_expires_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_implementation_tasks_pack_id ON portulan.implementation_tasks (pack_id);
CREATE INDEX IF NOT EXISTS idx_implementation_tasks_status ON portulan.implementation_tasks (status);
CREATE INDEX IF NOT EXISTS idx_implementation_tasks_parent_task_id ON portulan.implementation_tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS portulan.implementation_task_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES portulan.implementation_tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  release_id TEXT REFERENCES portulan.document_releases(id) ON DELETE SET NULL,
  source_role TEXT NOT NULL DEFAULT 'spec',
  section TEXT,
  reason TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_implementation_task_sources_task_id ON portulan.implementation_task_sources (task_id);
CREATE INDEX IF NOT EXISTS idx_implementation_task_sources_document_id ON portulan.implementation_task_sources (document_id);

CREATE TABLE IF NOT EXISTS portulan.progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES portulan.implementation_tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  pack_revision_id UUID REFERENCES portulan.context_pack_revisions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'progress',
  summary TEXT NOT NULL,
  changed_scopes TEXT NOT NULL DEFAULT '[]',
  evidence TEXT NOT NULL DEFAULT '',
  commit_ref TEXT,
  pull_request_ref TEXT,
  covered_criterion_ids TEXT NOT NULL DEFAULT '[]',
  gaps TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_reports_task_id ON portulan.progress_reports (task_id);

CREATE TABLE IF NOT EXISTS portulan.coordination_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('pack', 'task', 'item', 'criterion')),
  subject_id TEXT NOT NULL,
  is_blocker BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coordination_threads_workspace_id ON portulan.coordination_threads (workspace_id);
CREATE INDEX IF NOT EXISTS idx_coordination_threads_subject ON portulan.coordination_threads (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS portulan.coordination_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES portulan.coordination_threads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES portulan.coordination_messages(id) ON DELETE CASCADE,
  mentioned_user_ids TEXT NOT NULL DEFAULT '[]',
  mentioned_agent_identity_ids TEXT NOT NULL DEFAULT '[]',
  board_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coordination_messages_thread_id ON portulan.coordination_messages (thread_id);

CREATE TABLE IF NOT EXISTS portulan.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  mcp_token_id UUID REFERENCES portulan.mcp_tokens(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  correlation_id TEXT,
  client_info TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_id ON portulan.audit_events (workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON portulan.audit_events (created_at);

CREATE TABLE IF NOT EXISTS portulan.collab_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('document', 'template', 'context_pack', 'implementation_plan', 'implementation_task', 'project', 'repository')),
  subject_id TEXT NOT NULL,
  policy_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_rooms_workspace_id ON portulan.collab_rooms (workspace_id);
CREATE INDEX IF NOT EXISTS idx_collab_rooms_subject ON portulan.collab_rooms (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS portulan.collab_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES portulan.collab_rooms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  mcp_token_id UUID REFERENCES portulan.mcp_tokens(id) ON DELETE SET NULL,
  intention TEXT,
  base_version INTEGER,
  payload TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, seq),
  UNIQUE (room_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_collab_events_room_seq ON portulan.collab_events (room_id, seq);
CREATE INDEX IF NOT EXISTS idx_collab_events_workspace_id ON portulan.collab_events (workspace_id);

CREATE TABLE IF NOT EXISTS portulan.presence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES portulan.collab_rooms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  agent_identity_id UUID REFERENCES portulan.agent_identities(id) ON DELETE SET NULL,
  mcp_token_id UUID REFERENCES portulan.mcp_tokens(id) ON DELETE SET NULL,
  intention TEXT NOT NULL DEFAULT 'viewing' CHECK (intention IN ('viewing', 'editing', 'reviewing', 'automating', 'waiting')),
  client_info TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_room_id ON portulan.presence_sessions (room_id);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_last_seen_at ON portulan.presence_sessions (last_seen_at);

CREATE TABLE IF NOT EXISTS portulan.workspace_board_counters (
  workspace_id UUID PRIMARY KEY REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  next_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS portulan.workspace_board_refs (
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  board_number INTEGER NOT NULL,
  kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  UNIQUE (workspace_id, board_number)
);

CREATE INDEX IF NOT EXISTS idx_workspace_board_refs_target ON portulan.workspace_board_refs (workspace_id, kind, target_id);
