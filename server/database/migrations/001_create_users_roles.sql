-- Migration 001: Create Users, Roles and Organizations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key VARCHAR(150) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  account_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Seed Permissions and Default Roles
INSERT INTO permissions (permission_key, description) VALUES
  ('dashboard.view', 'Allows viewing dashboard summaries and statistics'),
  ('map.view', 'Allows access to interactive maritime map view and trails'),
  ('vessels.view', 'Allows reading detailed vessel specifications and histories'),
  ('alerts.view', 'Allows viewing active AIS anomaly notifications'),
  ('alerts.audit', 'Allows updating audit review status to Under Review'),
  ('alerts.resolve', 'Allows resolving alerts with non-empty resolution notes'),
  ('reports.view', 'Allows viewing analytical incident report dossiers'),
  ('reports.create', 'Allows drafting new incident reports'),
  ('reports.edit', 'Allows modifying saved report drafts and appending alerts'),
  ('reports.finalize', 'Allows finalizing intelligence reports with recommendations'),
  ('reports.export', 'Allows compiling and downloading dossier reports as PDF'),
  ('settings.view', 'Allows viewing global configuration thresholds'),
  ('settings.update', 'Allows updating platform alarm rules and scoring parameters'),
  ('users.view', 'Allows viewing platform users list'),
  ('users.manage', 'Allows administrative control over user accounts and roles'),
  ('audit_logs.view', 'Allows reading full system event logs');

-- Seed Roles
INSERT INTO roles (role_name, description) VALUES
  ('System Administrator', 'Broad-access platform administrator with complete management capabilities'),
  ('Watch Commander', 'Directs operational responses, audits alerts and signs reports'),
  ('Intelligence Analyst', 'Inspects raw trends, logs notes, drafts AI files and dossiers'),
  ('Alert Officer', 'Field officer reviewing real-time coastal alert streams'),
  ('Read Only Viewer', 'Restricted access for external audits and observers');

-- Map Role Permissions
-- 1. System Administrator gets EVERYTHING
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.role_name = 'System Administrator';

-- 2. Watch Commander permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.role_name = 'Watch Commander' 
  AND p.permission_key IN (
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
    'reports.view', 'reports.finalize', 'reports.export', 'settings.view'
  );

-- 3. Intelligence Analyst permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.role_name = 'Intelligence Analyst' 
  AND p.permission_key IN (
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view',
    'reports.view', 'reports.create', 'reports.edit', 'reports.export'
  );

-- 4. Alert Officer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.role_name = 'Alert Officer' 
  AND p.permission_key IN (
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve'
  );

-- 5. Read Only Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.role_name = 'Read Only Viewer' 
  AND p.permission_key IN ('dashboard.view', 'map.view', 'vessels.view');
