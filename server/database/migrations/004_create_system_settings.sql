-- Migration 004: Create System Settings schema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(150) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial configuration
INSERT INTO system_settings (setting_key, setting_value) VALUES (
  'platform_config',
  '{
    "ais_gap_threshold": 4,
    "high_risk_threshold": 80,
    "medium_risk_threshold": 55,
    "restricted_zone_rules": "UNCLOS compliance rules actively applied. SOG < 1.0 kn inside Geofenced Marine Sanctuary Bravo auto-triggers audit cascades.",
    "alert_notification": true,
    "geofence_triggers": true,
    "auto_escalation": false
  }'
) ON CONFLICT (setting_key) DO NOTHING;
