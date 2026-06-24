-- Migration 003: Create Incident Reports schema
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_number VARCHAR(100) UNIQUE NOT NULL,
  vessel_id VARCHAR(100) NOT NULL,
  primary_alert_id VARCHAR(100),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Finalized
  officer_notes TEXT,
  ai_summary TEXT,
  final_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incident_report_alerts (
  report_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  alert_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (report_id, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_vessel_id ON incident_reports(vessel_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(report_status);
