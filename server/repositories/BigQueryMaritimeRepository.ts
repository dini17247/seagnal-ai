import { Vessel, Movement, Alert, MaritimeZone, RiskLevel, AlertType, AlertStatus } from '../../src/types';
import { bigQueryService } from '../services/bigQueryService';
import * as env from '../config/env';

// Mock data is only imported for use when USE_MOCK_DATA=true
import { mockVessels, mockMovements, mockAlerts, mockZones } from '../../src/data';

export class BigQueryMaritimeRepository {

  // ── Table references (server-side config only — never from user input) ─────

  private getVesselsTable(): string {
    return `\`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.${env.BIGQUERY_VESSELS_TABLE}\``;
  }

  private getMovementsTable(): string {
    return `\`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.${env.BIGQUERY_MOVEMENTS_TABLE}\``;
  }

  private getAlertsTable(): string {
    return `\`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.${env.BIGQUERY_ALERTS_TABLE}\``;
  }

  private getZonesTable(): string {
    return `\`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.${env.BIGQUERY_ZONES_TABLE}\``;
  }

  // ── Row mappers ────────────────────────────────────────────────────────────
  // Handle BigQuery timestamp objects, numeric strings, nulls, etc.

  mapBigQueryVessel(row: any): Vessel {
    return {
      vessel_id: String(row.vessel_id ?? ''),
      mmsi_hash: String(row.mmsi_hash ?? ''),
      vessel_name: String(row.vessel_name ?? 'UNKNOWN'),
      vessel_type: String(row.vessel_type ?? 'Unknown'),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
      speed: Number(row.speed ?? 0),
      heading: Number(row.heading ?? 0),
      last_ais_time: row.last_ais_time
        ? (typeof row.last_ais_time === 'object' ? String(row.last_ais_time.value) : String(row.last_ais_time))
        : new Date().toISOString(),
      risk_score: Number(row.risk_score ?? 0),
      risk_level: this.normalizeRiskLevel(row.risk_level),
      status: String(row.status ?? 'Active'),
      flag_state: row.flag_state != null ? String(row.flag_state) : undefined,
      destination: row.destination != null ? String(row.destination) : undefined,
      eta: row.eta != null ? (typeof row.eta === 'object' ? String(row.eta.value) : String(row.eta)) : undefined,
      length: row.length != null ? Number(row.length) : undefined,
      width: row.width != null ? Number(row.width) : undefined,
    };
  }

  mapBigQueryMovement(row: any): Movement {
    return {
      movement_id: String(row.movement_id ?? row.id ?? ''),
      vessel_id: String(row.vessel_id ?? ''),
      timestamp: row.timestamp
        ? (typeof row.timestamp === 'object' ? String(row.timestamp.value) : String(row.timestamp))
        : new Date().toISOString(),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
      speed: Number(row.speed ?? 0),
      heading: Number(row.heading ?? 0),
      location_wkt: row.location_wkt != null ? String(row.location_wkt) : undefined,
    };
  }

  mapBigQueryAlert(row: any): Alert {
    return {
      alert_id: String(row.alert_id ?? row.id ?? ''),
      vessel_id: String(row.vessel_id ?? ''),
      alert_type: this.normalizeAlertType(row.alert_type),
      alert_time: row.alert_time
        ? (typeof row.alert_time === 'object' ? String(row.alert_time.value) : String(row.alert_time))
        : new Date().toISOString(),
      severity: this.normalizeRiskLevel(row.severity),
      description: String(row.description ?? ''),
      status: this.normalizeAlertStatus(row.status),
      recommended_action: String(row.recommended_action ?? ''),
      zone_id: row.zone_id != null ? String(row.zone_id) : undefined,
      reviewed_by: row.reviewed_by != null ? String(row.reviewed_by) : undefined,
      resolution_notes: row.resolution_notes != null ? String(row.resolution_notes) : undefined,
      resolved_at: row.resolved_at != null
        ? (typeof row.resolved_at === 'object' ? String(row.resolved_at.value) : String(row.resolved_at))
        : undefined,
    };
  }

  mapBigQueryZone(row: any): MaritimeZone {
    let coords: [number, number][] = [];
    if (row.polygon_coordinates) {
      try {
        if (typeof row.polygon_coordinates === 'string') {
          const parsed = JSON.parse(row.polygon_coordinates);
          coords = Array.isArray(parsed) ? parsed : [];
        } else if (Array.isArray(row.polygon_coordinates)) {
          coords = row.polygon_coordinates;
        }
      } catch (e) {
        console.error('Zone coordinate parse error for zone', row.zone_id, e);
      }
    }
    return {
      zone_id: String(row.zone_id ?? ''),
      zone_name: String(row.zone_name ?? 'Restricted Zone'),
      zone_type: String(row.zone_type ?? 'Restricted'),
      risk_level: this.normalizeRiskLevel(row.risk_level),
      polygon_coordinates: coords,
    };
  }

  // ── Normalization helpers ──────────────────────────────────────────────────

  private normalizeRiskLevel(value: any): RiskLevel {
    const v = String(value ?? '').toLowerCase();
    if (v === 'high') return 'High';
    if (v === 'medium') return 'Medium';
    return 'Low';
  }

  private normalizeAlertType(value: any): AlertType {
    const validTypes: AlertType[] = [
      'AIS Gap', 'Restricted Zone Entry', 'Speed Anomaly',
      'Loitering', 'Route Deviation', 'Fishing-like Movement',
    ];
    const s = String(value ?? '');
    return (validTypes.includes(s as AlertType) ? s : 'AIS Gap') as AlertType;
  }

  private normalizeAlertStatus(value: any): AlertStatus {
    const s = String(value ?? '');
    if (s === 'Under Review') return 'Under Review';
    if (s === 'Resolved') return 'Resolved';
    return 'Active';
  }

  // ── Mock data helpers — only used when USE_MOCK_DATA=true ─────────────────

  private getMockVessels(filters: { search?: string; risk?: string; type?: string; limit?: number; offset?: number } = {}): Vessel[] {
    let filtered = [...mockVessels] as Vessel[];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(v => v.vessel_name.toLowerCase().includes(q) || v.mmsi_hash.toLowerCase().includes(q));
    }
    if (filters.risk && filters.risk !== 'All') filtered = filtered.filter(v => v.risk_level === filters.risk);
    if (filters.type && filters.type !== 'All') filtered = filtered.filter(v => v.vessel_type === filters.type);
    const limit = filters.limit || 200;
    const offset = filters.offset || 0;
    return filtered.slice(offset, offset + limit);
  }

  private getMockVesselById(vesselId: string): Vessel | null {
    const v = mockVessels.find(vessel => vessel.vessel_id === vesselId);
    return v ? ({ ...v } as Vessel) : null;
  }

  private getMockMovements(vesselId: string, limit?: number): Movement[] {
    const list = mockMovements.filter(m => m.vessel_id === vesselId);
    const sorted = [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.slice(0, limit || 150) as Movement[];
  }

  private getMockAlerts(): Alert[] {
    return [...mockAlerts] as Alert[];
  }

  private getMockAlertById(alertId: string): Alert | null {
    const a = mockAlerts.find(al => al.alert_id === alertId);
    return a ? ({ ...a } as Alert) : null;
  }

  private getMockMaritimeZones(): MaritimeZone[] {
    return [...mockZones] as MaritimeZone[];
  }

  // ── Core repository methods ────────────────────────────────────────────────
  // When USE_MOCK_DATA=true  → return mock data
  // When USE_MOCK_DATA=false → query BigQuery; throw on failure (no silent fallback)

  async listVessels(filters: { search?: string; risk?: string; type?: string; limit?: number; offset?: number } = {}): Promise<Vessel[]> {
    if (env.USE_MOCK_DATA) {
      return this.getMockVessels(filters);
    }

    const limit = Math.min(filters.limit || 50, 200);
    const offset = filters.offset || 0;

    const queryConditions = ['1=1'];
    const params: Record<string, any> = { limit, offset };

    if (filters.search) {
      queryConditions.push('(LOWER(vessel_name) LIKE @search OR LOWER(mmsi_hash) LIKE @search)');
      params.search = `%${filters.search.toLowerCase()}%`;
    }
    if (filters.risk && filters.risk !== 'All') {
      queryConditions.push('risk_level = @risk');
      params.risk = filters.risk;
    }
    if (filters.type && filters.type !== 'All') {
      queryConditions.push('vessel_type = @type');
      params.type = filters.type;
    }

    const sql = `
      SELECT * FROM ${this.getVesselsTable()}
      WHERE ${queryConditions.join(' AND ')}
      ORDER BY risk_score DESC
      LIMIT @limit OFFSET @offset
    `;

    const rows = await bigQueryService.query<any>(sql, params);
    return rows.map(r => this.mapBigQueryVessel(r));
  }

  async findVesselById(vesselId: string): Promise<Vessel | null> {
    if (env.USE_MOCK_DATA) {
      return this.getMockVesselById(vesselId);
    }

    const sql = `SELECT * FROM ${this.getVesselsTable()} WHERE vessel_id = @vesselId LIMIT 1`;
    const rows = await bigQueryService.query<any>(sql, { vesselId });
    return rows.length > 0 ? this.mapBigQueryVessel(rows[0]) : null;
  }

  async getMovements(vesselId: string, limit?: number): Promise<Movement[]> {
    if (env.USE_MOCK_DATA) {
      return this.getMockMovements(vesselId, limit);
    }

    const maxLimit = Math.min(limit || 100, 200);
    const sql = `
      SELECT * FROM ${this.getMovementsTable()}
      WHERE vessel_id = @vesselId
      ORDER BY timestamp DESC
      LIMIT @limit
    `;
    const rows = await bigQueryService.query<any>(sql, { vesselId, limit: maxLimit });
    return rows.map(r => this.mapBigQueryMovement(r));
  }

  async listAlerts(limit?: number): Promise<Alert[]> {
    if (env.USE_MOCK_DATA) {
      return this.getMockAlerts();
    }

    const maxLimit = Math.min(limit || 100, 200);
    const sql = `
      SELECT * FROM ${this.getAlertsTable()}
      ORDER BY alert_time DESC
      LIMIT @limit
    `;
    const rows = await bigQueryService.query<any>(sql, { limit: maxLimit });
    return rows.map(r => this.mapBigQueryAlert(r));
  }

  async findAlertById(alertId: string): Promise<Alert | null> {
    if (env.USE_MOCK_DATA) {
      return this.getMockAlertById(alertId);
    }

    const sql = `SELECT * FROM ${this.getAlertsTable()} WHERE alert_id = @alertId LIMIT 1`;
    const rows = await bigQueryService.query<any>(sql, { alertId });
    return rows.length > 0 ? this.mapBigQueryAlert(rows[0]) : null;
  }

  async getMaritimeZones(): Promise<MaritimeZone[]> {
    if (env.USE_MOCK_DATA) {
      return this.getMockMaritimeZones();
    }

    const sql = `SELECT * FROM ${this.getZonesTable()} LIMIT 200`;
    const rows = await bigQueryService.query<any>(sql);
    return rows.map(r => this.mapBigQueryZone(r));
  }
}

export const bigQueryMaritimeRepository = new BigQueryMaritimeRepository();
