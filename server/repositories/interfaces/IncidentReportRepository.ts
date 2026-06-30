export interface IncidentReport {
  id: string;
  report_number: string;
  vessel_id: string;
  primary_alert_id?: string;
  created_by_user_id: string;
  assigned_to_user_id?: string;
  finalized_by_user_id?: string;
  report_status: 'Draft' | 'Finalized';
  officer_notes?: string;
  ai_summary?: string;
  final_recommendation?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  alert_ids?: string[];
}

export interface CreateReportInput {
  vessel_id: string;
  primary_alert_id?: string;
  created_by_user_id: string;

  created_by_auth_uid?: string;
  created_by_email?: string;
  created_by_full_name?: string;
  created_by_role?: string;
  created_by_organization?: string;

  officer_notes?: string;
  ai_summary?: string;
  final_recommendation?: string;
  alert_ids?: string[];
}

export interface UpdateReportInput {
  officer_notes?: string;
  ai_summary?: string;
  final_recommendation?: string;
  report_status?: 'Draft' | 'Finalized';
  finalized_by_user_id?: string;
  finalized_at?: string;
  alert_ids?: string[];
}

export interface IncidentReportRepository {
  findById(id: string): Promise<IncidentReport | null>;
  findByVesselId(vesselId: string): Promise<IncidentReport[]>;
  listReports(): Promise<IncidentReport[]>;
  create(input: CreateReportInput): Promise<IncidentReport>;
  update(id: string, input: UpdateReportInput): Promise<IncidentReport>;
}