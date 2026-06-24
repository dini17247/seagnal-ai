import apiClient from './apiClient';

export interface AISummaryResponse {
  summary: string;
  is_mock: boolean;
  model: string;
}

export const aiService = {
  async generateIncidentSummary(params: {
    vessel_id: string;
    alert_ids: string[];
    officer_context?: string;
  }): Promise<AISummaryResponse> {
    return apiClient.post<AISummaryResponse>('/ai/incident-summary', params);
  }
};
export default aiService;
