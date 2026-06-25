export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface Vessel {
  vessel_id: string;
  mmsi_hash: string;
  vessel_name: string;
  vessel_type: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  last_ais_time: string;
  risk_score: number;
  risk_level: RiskLevel;
  status: string;
  flag_state?: string;
  destination?: string;
  eta?: string;
  length?: number;
  width?: number;
}

export interface Movement {
  movement_id: string;
  vessel_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  location_wkt?: string;
}

export type AlertType = 
  | 'AIS Gap' 
  | 'Restricted Zone Entry' 
  | 'Speed Anomaly' 
  | 'Loitering' 
  | 'Route Deviation' 
  | 'Fishing-like Movement';

export type AlertStatus = 'Active' | 'Under Review' | 'Resolved';

export interface Alert {
  alert_id: string;
  vessel_id: string;
  alert_type: AlertType;
  alert_time: string;
  severity: RiskLevel;
  description: string;
  status: AlertStatus;
  recommended_action: string;
  zone_id?: string;
  reviewed_by?: string;
  resolution_notes?: string;
  resolved_at?: string;
  reviewed_at?: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  reviewed_by_user_id?: string;
  resolved_by_user_id?: string;
}

export interface MaritimeZone {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  risk_level: RiskLevel;
  polygon_coordinates: [number, number][]; // [lat, lng] array
}

export interface PlatformSettings {
  ais_gap_threshold: number; // in hours
  high_risk_threshold: number; // risk level score trigger
  medium_risk_threshold: number; // risk level score trigger
  restricted_zone_rules: string;
  alert_notification: boolean;
  geofence_triggers: boolean;
  auto_escalation: boolean;
}

export type UserRole =
  | 'System Administrator'
  | 'Watch Commander'
  | 'Intelligence Analyst'
  | 'Alert Officer'
  | 'Read Only Viewer';

export type AccountStatus =
  | 'Active'
  | 'Suspended'
  | 'Disabled';

export interface AuthUser {
  user_id: string;
  auth_uid: string;
  full_name: string;
  email: string;
  role: UserRole;
  organization?: string;
  account_status: AccountStatus;
  last_login_at?: string;

  permissions?: Permission[];
}

export type Permission =
  | 'dashboard.view'
  | 'map.view'
  | 'vessels.view'
  | 'alerts.view'
  | 'alerts.audit'
  | 'alerts.resolve'
  | 'reports.view'
  | 'reports.create'
  | 'reports.edit'
  | 'reports.finalize'
  | 'reports.export'
  | 'settings.view'
  | 'settings.update'
  | 'users.view'
  | 'users.manage'
  | 'audit_logs.view';

export type ViewType = 
  | 'login'
  | 'dashboard'
  | 'map'
  | 'vessels'
  | 'alerts'
  | 'incident-reports'
  | 'settings'
  | 'user-management'
  | 'audit-logs';
