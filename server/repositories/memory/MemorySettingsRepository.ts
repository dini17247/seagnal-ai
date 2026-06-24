import { PlatformSettings } from '../../../src/types';
import { SettingsRepository } from '../interfaces/SettingsRepository';

export class MemorySettingsRepository implements SettingsRepository {
  private settings: PlatformSettings = {
    ais_gap_threshold: 4,
    high_risk_threshold: 80,
    medium_risk_threshold: 55,
    restricted_zone_rules: 'UNCLOS compliance rules actively applied. SOG < 1.0 kn inside Geofenced Marine Sanctuary Bravo auto-triggers audit cascades.',
    alert_notification: true,
    geofence_triggers: true,
    auto_escalation: false
  };

  async getSettings(): Promise<PlatformSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: PlatformSettings): Promise<PlatformSettings> {
    this.settings = { ...settings };
    return { ...this.settings };
  }
}
