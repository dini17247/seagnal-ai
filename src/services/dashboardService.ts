import apiClient from './apiClient';
import { Alert } from '../types';

export interface DashboardSummary {
  monitored_vessels: number;
  high_risk_vessels: number;
  open_alerts: number;
  ais_gaps: number;
  zone_violations: number;
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>('/dashboard/summary');
  },

  async getLatestAlerts(): Promise<Alert[]> {
    return apiClient.get<Alert[]>('/dashboard/latest-alerts');
  }
};
