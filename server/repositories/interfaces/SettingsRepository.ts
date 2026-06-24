import { PlatformSettings } from '../../../src/types';

export interface SettingsRepository {
  getSettings(): Promise<PlatformSettings>;
  updateSettings(settings: PlatformSettings): Promise<PlatformSettings>;
}
