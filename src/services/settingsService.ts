import apiClient from './apiClient';
import { PlatformSettings } from '../types';

export const settingsService = {
  async getSettings(): Promise<PlatformSettings> {
    return apiClient.get<PlatformSettings>('/settings');
  },

  async updateSettings(settings: PlatformSettings): Promise<PlatformSettings> {
    return apiClient.put<PlatformSettings>('/settings', settings);
  },

  async resetSettings(): Promise<PlatformSettings> {
    return apiClient.post<PlatformSettings>('/settings/reset');
  }
};
