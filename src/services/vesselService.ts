import apiClient from './apiClient';

import {
  Vessel,
  Movement,
  Alert,
  MaritimeZone,
} from '../types';

export const vesselService = {
  async listVessels(params?: {
    search?: string;
    risk?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Vessel[]> {
    const searchParams =
      new URLSearchParams();

    if (params?.search) {
      searchParams.set(
        'search',
        params.search
      );
    }

    if (params?.risk) {
      searchParams.set(
        'risk',
        params.risk
      );
    }

    if (params?.type) {
      searchParams.set(
        'type',
        params.type
      );
    }

    if (
      params?.limit !== undefined
    ) {
      searchParams.set(
        'limit',
        String(params.limit)
      );
    }

    if (
      params?.offset !== undefined
    ) {
      searchParams.set(
        'offset',
        String(params.offset)
      );
    }

    const query =
      searchParams.toString();

    return apiClient.get<Vessel[]>(
      `/vessels${
        query ? `?${query}` : ''
      }`
    );
  },

  async getVesselById(
    vesselId: string
  ): Promise<Vessel> {
    return apiClient.get<Vessel>(
      `/vessels/${vesselId}`
    );
  },

  async getMovements(
    vesselId: string,
    movementLimit?: number
  ): Promise<Movement[]> {
    const query =
      movementLimit
        ? `?movementLimit=${movementLimit}`
        : '';

    return apiClient.get<Movement[]>(
      `/vessels/${vesselId}/movements${query}`
    );
  },

  async getVesselAlerts(
    vesselId: string
  ): Promise<Alert[]> {
    return apiClient.get<Alert[]>(
      `/vessels/${vesselId}/alerts`
    );
  },

  async getMapVessels():
    Promise<Vessel[]> {
    return apiClient.get<Vessel[]>(
      '/map/vessels'
    );
  },

  async getMapMovements(
    limitPerVessel = 30
  ): Promise<Movement[]> {
    return apiClient.get<Movement[]>(
      `/map/movements?limitPerVessel=${limitPerVessel}`
    );
  },

  async getMaritimeZones():
    Promise<MaritimeZone[]> {
    return apiClient.get<
      MaritimeZone[]
    >('/maritime-zones');
  },
};