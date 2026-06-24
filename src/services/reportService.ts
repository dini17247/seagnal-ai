import apiClient from './apiClient';

export interface IncidentReportDto {
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

export const reportService = {
  async listReports(): Promise<IncidentReportDto[]> {
    return apiClient.get<IncidentReportDto[]>('/reports');
  },

  async getReportById(reportId: string): Promise<IncidentReportDto> {
    return apiClient.get<IncidentReportDto>(`/reports/${reportId}`);
  },

  async createReport(params: {
    vessel_id: string;
    primary_alert_id?: string;
    officer_notes?: string;
    ai_summary?: string;
    final_recommendation?: string;
    alert_ids?: string[];
  }): Promise<IncidentReportDto> {
    return apiClient.post<IncidentReportDto>('/reports', params);
  },

  async updateReport(reportId: string, params: {
    officer_notes?: string;
    ai_summary?: string;
    final_recommendation?: string;
    alert_ids?: string[];
  }): Promise<IncidentReportDto> {
    return apiClient.put<IncidentReportDto>(`/reports/${reportId}`, params);
  },

  async finalizeReport(reportId: string): Promise<IncidentReportDto> {
    return apiClient.post<IncidentReportDto>(`/reports/${reportId}/finalize`);
  },

  async exportReport(reportId: string): Promise<{ export_time: string; download_url: string; formatted_filename: string }> {
    return apiClient.post<{ export_time: string; download_url: string; formatted_filename: string }>(`/reports/${reportId}/export`);
  }
};
