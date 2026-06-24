import apiClient from './apiClient';
import { Vessel, Movement, Alert } from '../types';

export const vesselService = {
  async listVessels(params?: { search?: string; risk?: string; type?: string; limit?: number; offset?: number }): Promise<Vessel[]> {
    let query = '';
    if (params) {
      const parts: string[] = [];
      if (params.search) parts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.risk) parts.push(`risk=${encodeURIComponent(params.risk)}`);
      if (params.type) parts.push(`type=${encodeURIComponent(params.type)}`);
      if (params.limit) parts.push(`limit=${params.limit}`);
      if (params.offset) parts.push(`offset=${params.offset}`);
      if (parts.length > 0) query = `?${parts.join('&')}`;
    }
    return apiClient.get<Vessel[]>(`/vessels${query}`);
  },

  async getVesselById(vesselId: string): Promise<Vessel> {
    return apiClient.get<Vessel>(`/vessels/${vesselId}`);
  },

  async getMovements(vesselId: string, movementLimit?: number): Promise<Movement[]> {
    const query = movementLimit ? `?movementLimit=${movementLimit}` : '';
    return apiClient.get<Movement[]>(`/vessels/${vesselId}/movements${query}`);
  },

  async getVesselAlerts(vesselId: string): Promise<Alert[]> {
    return apiClient.get<Alert[]>(`/vessels/${vesselId}/alerts`);
  },

  async getMapVessels(): Promise<Vessel[]> {
    return apiClient.get<Vessel[]>('/map/vessels');
  },

  async getMaritimeZones(): Promise<any[]> {
    return apiClient.get<any[]>('/maritime-zones');
  }
};
