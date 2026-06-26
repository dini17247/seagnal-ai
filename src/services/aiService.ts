import apiClient from './apiClient';

export type AIConfidenceLevel = 'High' | 'Moderate' | 'Low';
export type AIActionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AIThreatAssessment {
  level: 'High' | 'Medium' | 'Low';
  score: number;
  rationale: string;
}

export interface AIEvidenceRelationship {
  title: string;
  relationship: string;
  supporting_alert_ids: string[];
  confidence: AIConfidenceLevel;
}

export interface AIActionItem {
  action: string;
  reason: string;
  priority: AIActionPriority;
  timeframe: string;
  escalation_trigger: string;
}

export interface AIRecommendedActions {
  immediate: AIActionItem[];
  monitoring: AIActionItem[];
  follow_up: AIActionItem[];
}

export interface AIIncidentReport {
  executive_summary: string;
  incident_classification: string;
  confidence_level: AIConfidenceLevel;
  threat_assessment: AIThreatAssessment;
  key_findings: string[];
  evidence_relationships: AIEvidenceRelationship[];
  spatial_temporal_assessment: string;
  probable_sequence: string[];
  alternative_explanations: string[];
  recommended_actions: AIRecommendedActions;
  information_gaps: string[];
  analyst_conclusion: string;
  disclaimer: string;
}

export interface AIDerivedMetrics {
  high_severity_alerts: number;
  unresolved_alerts: number;
  minimum_speed_knots: number | null;
  maximum_speed_knots: number | null;
  maximum_speed_change_knots: number | null;
  maximum_heading_change_degrees: number | null;
  maximum_observation_gap_minutes: number | null;
  low_speed_observations: number;
  observation_window_minutes: number | null;
  latest_data_age_minutes: number | null;
  repeated_anomaly_types: string[];
}

export interface AIDataSnapshot {
  vessel_id: string;
  alert_count: number;
  movement_count: number;
  related_zone_count: number;
  latest_ais_time: string;
  derived_metrics: AIDerivedMetrics;
}

export interface AISummaryResponse {
  summary: string;
  report: AIIncidentReport;
  is_mock: boolean;
  model: string;
  provider_status: 'live' | 'fallback';
  generated_at: string;
  data_snapshot: AIDataSnapshot;
  provider_warning?: string;
}

export const aiService = {
  async generateIncidentSummary(params: {
    vessel_id: string;
    alert_ids: string[];
    officer_context?: string;
  }): Promise<AISummaryResponse> {
    return apiClient.post<AISummaryResponse>('/ai/incident-summary', params);
  },
};

export default aiService;
