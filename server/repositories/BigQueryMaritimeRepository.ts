import {
  Vessel,
  Movement,
  Alert,
  MaritimeZone,
  RiskLevel,
  AlertType,
  AlertStatus,
} from '../../src/types';

import {
  bigQueryService,
} from '../services/bigQueryService';

import * as env from '../config/env';

import {
  mockVessels,
  mockMovements,
  mockAlerts,
  mockZones,
} from '../../src/data';

type VesselFilters = {
  search?: string;
  risk?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

export class BigQueryMaritimeRepository {
  private table(tableName: string): string {
    if (!env.GCP_PROJECT_ID) {
      throw new Error(
        'GCP_PROJECT_ID is required when USE_MOCK_DATA=false.'
      );
    }

    return `\`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.${tableName}\``;
  }

  private unwrap(value: any): any {
    if (
      value &&
      typeof value === 'object' &&
      'value' in value
    ) {
      return value.value;
    }

    return value;
  }

  private text(
    value: any,
    fallback = ''
  ): string {
    const unwrapped = this.unwrap(value);

    return unwrapped == null
      ? fallback
      : String(unwrapped);
  }

  private number(
    value: any,
    fallback = 0
  ): number {
    const parsed =
      Number(this.unwrap(value));

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  private date(
    value: any,
    fallback = new Date(0).toISOString()
  ): string {
    const unwrapped = this.unwrap(value);

    if (
      unwrapped == null ||
      unwrapped === ''
    ) {
      return fallback;
    }

    const parsed =
      new Date(String(unwrapped));

    return Number.isNaN(
      parsed.getTime()
    )
      ? String(unwrapped)
      : parsed.toISOString();
  }

  private riskLevel(
    value: any,
    score?: any
  ): RiskLevel {
    const normalized = this.text(value)
      .trim()
      .toLowerCase();

    if (
      normalized === 'high' ||
      normalized === 'critical' ||
      normalized === 'severe'
    ) {
      return 'High';
    }

    if (
      normalized === 'medium' ||
      normalized === 'moderate'
    ) {
      return 'Medium';
    }

    if (normalized === 'low') {
      return 'Low';
    }

    const numericScore =
      this.number(score, -1);

    if (numericScore >= 70) {
      return 'High';
    }

    if (numericScore >= 40) {
      return 'Medium';
    }

    return 'Low';
  }

  private alertType(
    value: any
  ): AlertType {
    const normalized = this.text(value)
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ');

    const aliases:
      Record<string, AlertType> = {
        'ais gap': 'AIS Gap',
        'ais signal gap': 'AIS Gap',

        'restricted zone entry':
          'Restricted Zone Entry',

        'zone violation':
          'Restricted Zone Entry',

        'speed anomaly':
          'Speed Anomaly',

        'sudden speed change':
          'Speed Anomaly',

        loitering: 'Loitering',

        'route deviation':
          'Route Deviation',

        'fishing like movement':
          'Fishing-like Movement',

        'fishing movement':
          'Fishing-like Movement',
      };

    return aliases[normalized] ??
      'AIS Gap';
  }

  private alertStatus(
    row: any
  ): AlertStatus {
    const normalized =
      this.text(row.status)
        .trim()
        .toLowerCase();

    if (
      normalized === 'under review' ||
      normalized === 'reviewing'
    ) {
      return 'Under Review';
    }

    const resolved =
      this.text(
        row.resolved ??
          row.is_resolved
      )
        .trim()
        .toLowerCase();

    if (
      normalized === 'resolved' ||
      normalized === 'closed' ||
      resolved === 'true' ||
      resolved === '1' ||
      resolved === 'yes'
    ) {
      return 'Resolved';
    }

    return 'Active';
  }

  private movementTime(
    row: any
  ): string {
    return this.date(
      row.timestamp ??
        row.ts ??
        row.movement_time ??
        row.recorded_at
    );
  }

  private mapMovement(
    row: any,
    index = 0
  ): Movement {
    const vesselId =
      this.text(row.vessel_id);

    const timestamp =
      this.movementTime(row);

    return {
      movement_id: this.text(
        row.movement_id ??
          row.id,
        `${vesselId}-${timestamp}-${index}`
      ),

      vessel_id: vesselId,

      timestamp,

      latitude: this.number(
        row.latitude ??
          row.lat
      ),

      longitude: this.number(
        row.longitude ??
          row.lon ??
          row.lng
      ),

      speed: this.number(
        row.speed ??
          row.sog
      ),

      heading: this.number(
        row.heading ??
          row.course ??
          row.cog
      ),

      location_wkt:
        row.location_wkt ??
        row.location ??
        row.geography
          ? this.text(
              row.location_wkt ??
                row.location ??
                row.geography
            )
          : undefined,
    };
  }

  private mapVessel(
    row: any,
    latestMovement?: Movement
  ): Vessel {
    const riskScore =
      this.number(
        row.risk_score ??
          row.risk_base ??
          row.base_risk_score
      );

    return {
      vessel_id: this.text(
        row.vessel_id ??
          row.id
      ),

      mmsi_hash: this.text(
        row.mmsi_hash ??
          row.mmsi
      ),

      vessel_name: this.text(
        row.vessel_name ??
          row.name,
        'UNKNOWN'
      ),

      vessel_type: this.text(
        row.vessel_type ??
          row.type,
        'Unknown'
      ),

      latitude: this.number(
        row.latitude ??
          row.lat ??
          row.current_lat ??
          latestMovement?.latitude
      ),

      longitude: this.number(
        row.longitude ??
          row.lon ??
          row.lng ??
          row.current_lon ??
          row.current_lng ??
          latestMovement?.longitude
      ),

      speed: this.number(
        row.speed ??
          row.sog ??
          latestMovement?.speed
      ),

      heading: this.number(
        row.heading ??
          row.course ??
          row.cog ??
          latestMovement?.heading
      ),

      last_ais_time: this.date(
        row.last_ais_time ??
          row.last_update ??
          row.timestamp ??
          row.ts ??
          latestMovement?.timestamp
      ),

      risk_score: riskScore,

      risk_level:
        this.riskLevel(
          row.risk_level,
          riskScore
        ),

      status: this.text(
        row.status ??
          row.navigation_status ??
          row.nav_status,
        'Active'
      ),

      flag_state:
        row.flag_state ??
        row.flag ??
        row.country
          ? this.text(
              row.flag_state ??
                row.flag ??
                row.country
            )
          : undefined,

      destination:
        row.destination != null
          ? this.text(
              row.destination
            )
          : undefined,

      eta:
        row.eta != null
          ? this.date(
              row.eta,
              this.text(row.eta)
            )
          : undefined,

      length:
        row.length != null ||
        row.length_m != null
          ? this.number(
              row.length ??
                row.length_m
            )
          : undefined,

      width:
        row.width != null ||
        row.width_m != null
          ? this.number(
              row.width ??
                row.width_m
            )
          : undefined,

      source_dataset:
        row.source_dataset != null ||
        row.data_source != null ||
        row.source != null
          ? this.text(
              row.source_dataset ??
                row.data_source ??
                row.source
            )
          : undefined,
    };
  }

  private mapAlert(
    row: any
  ): Alert {
    return {
      alert_id: this.text(
        row.alert_id ??
          row.id
      ),

      vessel_id:
        this.text(row.vessel_id),

      alert_type:
        this.alertType(
          row.alert_type ??
            row.type
        ),

      alert_time: this.date(
        row.alert_time ??
          row.timestamp ??
          row.ts ??
          row.created_at
      ),

      severity:
        this.riskLevel(
          row.severity ??
            row.risk_level
        ),

      description: this.text(
        row.description ??
          row.details ??
          row.message
      ),

      status:
        this.alertStatus(row),

      recommended_action:
        this.text(
          row.recommended_action ??
            row.action ??
            row.sop
        ),

      zone_id:
        row.zone_id != null
          ? this.text(
              row.zone_id
            )
          : undefined,

      reviewed_by:
        row.reviewed_by != null ||
        row.resolved_by != null
          ? this.text(
              row.reviewed_by ??
                row.resolved_by
            )
          : undefined,

      resolution_notes:
        row.resolution_notes != null ||
        row.notes != null
          ? this.text(
              row.resolution_notes ??
                row.notes
            )
          : undefined,

      resolved_at:
        row.resolved_at != null
          ? this.date(
              row.resolved_at,
              this.text(
                row.resolved_at
              )
            )
          : undefined,
    };
  }

  private coordinatePair(
    pair: any
  ): [number, number] | null {
    if (
      !Array.isArray(pair) ||
      pair.length < 2
    ) {
      return null;
    }

    const first =
      Number(pair[0]);

    const second =
      Number(pair[1]);

    if (
      !Number.isFinite(first) ||
      !Number.isFinite(second)
    ) {
      return null;
    }

    /*
      GeoJSON usually stores:
      [longitude, latitude]

      Leaflet expects:
      [latitude, longitude]
    */
    if (
      Math.abs(first) > 90 &&
      Math.abs(second) <= 90
    ) {
      return [second, first];
    }

    return [first, second];
  }

  private parseWktPolygon(
    value: string
  ): [number, number][] {
    const match =
      value.match(
        /POLYGON\s*\(\((.+?)\)\)/i
      );

    if (!match) {
      return [];
    }

    return match[1]
      .split(',')
      .map((segment) =>
        segment
          .trim()
          .split(/\s+/)
          .map(Number)
      )
      .map((pair) =>
        this.coordinatePair(pair)
      )
      .filter(
        (
          pair
        ): pair is [
          number,
          number
        ] => pair !== null
      );
  }

  private parsePolygon(
    raw: any
  ): [number, number][] {
    let value =
      this.unwrap(raw);

    if (
      value == null ||
      value === ''
    ) {
      return [];
    }

    if (
      typeof value === 'string'
    ) {
      const trimmed =
        value.trim();

      if (
        /^POLYGON/i.test(trimmed)
      ) {
        return this.parseWktPolygon(
          trimmed
        );
      }

      try {
        value =
          JSON.parse(trimmed);
      } catch {
        return [];
      }
    }

    if (
      value &&
      !Array.isArray(value) &&
      typeof value === 'object'
    ) {
      if (
        value.type === 'Feature'
      ) {
        value = value.geometry;
      }

      if (
        value?.type === 'Polygon'
      ) {
        value =
          value.coordinates?.[0] ??
          [];
      }

      if (
        value?.type ===
        'MultiPolygon'
      ) {
        value =
          value.coordinates?.[0]?.[0] ??
          [];
      }
    }

    while (
      Array.isArray(value) &&
      value.length > 0 &&
      Array.isArray(value[0]) &&
      Array.isArray(value[0][0])
    ) {
      value = value[0];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((pair) =>
        this.coordinatePair(pair)
      )
      .filter(
        (
          pair
        ): pair is [
          number,
          number
        ] => pair !== null
      );
  }

  private mapZone(
    row: any
  ): MaritimeZone {
    return {
      zone_id: this.text(
        row.zone_id ??
          row.id
      ),

      zone_name: this.text(
        row.zone_name ??
          row.name,
        'Restricted Zone'
      ),

      zone_type: this.text(
        row.zone_type ??
          row.type,
        'Restricted'
      ),

      risk_level:
        this.riskLevel(
          row.risk_level ??
            row.severity ??
            'High'
        ),

      polygon_coordinates:
        this.parsePolygon(
          row.polygon_coordinates ??
            row.polygon_geojson ??
            row.geojson ??
            row.polygon ??
            row.geometry ??
            row.geography
        ),

      source_dataset:
        row.source_dataset != null ||
        row.data_source != null ||
        row.source != null
          ? this.text(
              row.source_dataset ??
                row.data_source ??
                row.source
            )
          : undefined,
    };
  }

  private async allMovementRows(
    maxRows = 5000
  ): Promise<any[]> {
    const safeLimit =
      Math.min(
        Math.max(maxRows, 1),
        10000
      );

    const sql = `
      SELECT *
      FROM ${this.table(
        env.BIGQUERY_MOVEMENTS_TABLE
      )}
      LIMIT ${safeLimit}
    `;

    return bigQueryService.query<any>(
      sql
    );
  }

  private async latestMovementMap():
    Promise<
      Map<string, Movement>
    > {
    const rows =
      await this.allMovementRows();

    const movements =
      rows.map(
        (row, index) =>
          this.mapMovement(
            row,
            index
          )
      );

    const latest =
      new Map<
        string,
        Movement
      >();

    for (
      const movement of movements
    ) {
      const current =
        latest.get(
          movement.vessel_id
        );

      if (
        !current ||
        new Date(
          movement.timestamp
        ).getTime() >
          new Date(
            current.timestamp
          ).getTime()
      ) {
        latest.set(
          movement.vessel_id,
          movement
        );
      }
    }

    return latest;
  }

  async listVessels(
    filters: VesselFilters = {}
  ): Promise<Vessel[]> {
    if (env.USE_MOCK_DATA) {
      let data =
        [...mockVessels] as Vessel[];

      const query =
        filters.search
          ?.trim()
          .toLowerCase();

      if (query) {
        data = data.filter(
          (vessel) =>
            vessel.vessel_name
              .toLowerCase()
              .includes(query) ||
            vessel.mmsi_hash
              .toLowerCase()
              .includes(query)
        );
      }

      if (
        filters.risk &&
        filters.risk !== 'All'
      ) {
        data = data.filter(
          (vessel) =>
            vessel.risk_level ===
            filters.risk
        );
      }

      if (
        filters.type &&
        filters.type !== 'All'
      ) {
        data = data.filter(
          (vessel) =>
            vessel.vessel_type ===
            filters.type
        );
      }

      const offset =
        Math.max(
          filters.offset ?? 0,
          0
        );

      const limit =
        Math.min(
          Math.max(
            filters.limit ?? 200,
            1
          ),
          1000
        );

      return data.slice(
        offset,
        offset + limit
      );
    }

    const [
      rows,
      latestMovements,
    ] = await Promise.all([
      bigQueryService.query<any>(`
        SELECT *
        FROM ${this.table(
          env.BIGQUERY_VESSELS_TABLE
        )}
        LIMIT 1000
      `),

      this.latestMovementMap(),
    ]);

    let data =
      rows.map((row) => {
        const vesselId =
          this.text(
            row.vessel_id ??
              row.id
          );

        return this.mapVessel(
          row,
          latestMovements.get(
            vesselId
          )
        );
      });

    const query =
      filters.search
        ?.trim()
        .toLowerCase();

    if (query) {
      data = data.filter(
        (vessel) =>
          vessel.vessel_name
            .toLowerCase()
            .includes(query) ||
          vessel.mmsi_hash
            .toLowerCase()
            .includes(query)
      );
    }

    if (
      filters.risk &&
      filters.risk !== 'All'
    ) {
      data = data.filter(
        (vessel) =>
          vessel.risk_level ===
          filters.risk
      );
    }

    if (
      filters.type &&
      filters.type !== 'All'
    ) {
      data = data.filter(
        (vessel) =>
          vessel.vessel_type ===
          filters.type
      );
    }

    data.sort(
      (first, second) =>
        second.risk_score -
          first.risk_score ||
        first.vessel_name.localeCompare(
          second.vessel_name
        )
    );

    const offset =
      Math.max(
        filters.offset ?? 0,
        0
      );

    const limit =
      Math.min(
        Math.max(
          filters.limit ?? 200,
          1
        ),
        1000
      );

    return data.slice(
      offset,
      offset + limit
    );
  }

  async findVesselById(
    vesselId: string
  ): Promise<Vessel | null> {
    const vessels =
      await this.listVessels({
        limit: 1000,
      });

    return (
      vessels.find(
        (vessel) =>
          vessel.vessel_id ===
          vesselId
      ) ?? null
    );
  }

  async getMovements(
    vesselId: string,
    limit = 100
  ): Promise<Movement[]> {
    if (env.USE_MOCK_DATA) {
      return mockMovements
        .filter(
          (movement) =>
            movement.vessel_id ===
            vesselId
        )
        .sort(
          (first, second) =>
            new Date(
              second.timestamp
            ).getTime() -
            new Date(
              first.timestamp
            ).getTime()
        )
        .slice(
          0,
          Math.min(
            Math.max(limit, 1),
            500
          )
        );
    }

    const rows =
      await this.allMovementRows();

    return rows
      .map((row, index) =>
        this.mapMovement(
          row,
          index
        )
      )
      .filter(
        (movement) =>
          movement.vessel_id ===
          vesselId
      )
      .sort(
        (first, second) =>
          new Date(
            second.timestamp
          ).getTime() -
          new Date(
            first.timestamp
          ).getTime()
      )
      .slice(
        0,
        Math.min(
          Math.max(limit, 1),
          500
        )
      );
  }

  async listRecentMovements(
    limitPerVessel = 30
  ): Promise<Movement[]> {
    const source =
      env.USE_MOCK_DATA
        ? ([...mockMovements] as Movement[])
        : (
            await this.allMovementRows()
          ).map(
            (row, index) =>
              this.mapMovement(
                row,
                index
              )
          );

    const groups =
      new Map<
        string,
        Movement[]
      >();

    for (
      const movement of source
    ) {
      const group =
        groups.get(
          movement.vessel_id
        ) ?? [];

      group.push(movement);

      groups.set(
        movement.vessel_id,
        group
      );
    }

    const safeLimit =
      Math.min(
        Math.max(
          limitPerVessel,
          1
        ),
        100
      );

    return Array.from(
      groups.values()
    ).flatMap((group) =>
      group
        .sort(
          (first, second) =>
            new Date(
              second.timestamp
            ).getTime() -
            new Date(
              first.timestamp
            ).getTime()
        )
        .slice(0, safeLimit)
        .sort(
          (first, second) =>
            new Date(
              first.timestamp
            ).getTime() -
            new Date(
              second.timestamp
            ).getTime()
        )
    );
  }

  async listAlerts(
    limit = 200
  ): Promise<Alert[]> {
    if (env.USE_MOCK_DATA) {
      return [
        ...mockAlerts,
      ] as Alert[];
    }

    const safeLimit =
      Math.min(
        Math.max(limit, 1),
        1000
      );

    const rows =
      await bigQueryService.query<any>(`
        SELECT *
        FROM ${this.table(
          env.BIGQUERY_ALERTS_TABLE
        )}
        LIMIT ${safeLimit}
      `);

    return rows
      .map((row) =>
        this.mapAlert(row)
      )
      .sort(
        (first, second) =>
          new Date(
            second.alert_time
          ).getTime() -
          new Date(
            first.alert_time
          ).getTime()
      );
  }

  async findAlertById(
    alertId: string
  ): Promise<Alert | null> {
    const alerts =
      await this.listAlerts(
        1000
      );

    return (
      alerts.find(
        (alert) =>
          alert.alert_id ===
          alertId
      ) ?? null
    );
  }

  async getMaritimeZones():
    Promise<MaritimeZone[]> {
    if (env.USE_MOCK_DATA) {
      return [
        ...mockZones,
      ] as MaritimeZone[];
    }

    const rows =
      await bigQueryService.query<any>(`
        SELECT *
        FROM ${this.table(
          env.BIGQUERY_ZONES_TABLE
        )}
        LIMIT 500
      `);

    return rows.map((row) =>
      this.mapZone(row)
    );
  }
}

export const bigQueryMaritimeRepository =
  new BigQueryMaritimeRepository();