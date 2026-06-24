import apiClient from './apiClient';
import { Alert } from '../types';

export const alertService = {
  async listAlerts(): Promise<Alert[]> {
    return apiClient.get<Alert[]>('/alerts');
  },

  async getAlertById(alertId: string): Promise<Alert> {
    return apiClient.get<Alert>(`/alerts/${alertId}`);
  },

  async auditAlert(alertId: string, reviewNotes?: string): Promise<any> {
    return apiClient.put<any>(`/alerts/${alertId}/audit`, { review_notes: reviewNotes });
  },

  async resolveAlert(alertId: string, resolutionNotes: string): Promise<any> {
    return apiClient.put<any>(`/alerts/${alertId}/resolve`, { resolution_notes: resolutionNotes });
  }
};
