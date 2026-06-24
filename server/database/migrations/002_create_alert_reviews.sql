-- Migration 002: Create Alert Reviews table
CREATE TABLE IF NOT EXISTS alert_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id VARCHAR(100) UNIQUE NOT NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active', -- Active, Under Review, Resolved
  review_notes TEXT,
  resolution_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_reviews_status ON alert_reviews(status);
CREATE INDEX IF NOT EXISTS idx_alert_reviews_alert_id ON alert_reviews(alert_id);
