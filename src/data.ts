import { Vessel, Movement, MaritimeZone, Alert, PlatformSettings } from './types';

// Anchor coordinate around the Strait of Malacca, Malaysia
// Center around [2.36, 101.88] off the coast of Melaka / Port Dickson, Malaysia
export const MAP_CENTER: [number, number] = [2.36, 101.88];
export const MAP_DEFAULT_ZOOM = 11;

export const mockVessels: Vessel[] = [
  {
    vessel_id: 'V-001',
    mmsi_hash: 'MMSI-437190013',
    vessel_name: 'MV KUALA LUMPUR STAR',
    vessel_type: 'Container Ship',
    latitude: 2.352,
    longitude: 101.842,
    speed: 18.4,
    heading: 265,
    last_ais_time: '2026-06-18T21:10:00Z',
    risk_score: 42,
    risk_level: 'Medium',
    status: 'In Transit',
    flag_state: 'Malaysia',
    destination: 'Port Klang',
    eta: '2026-06-19T08:00:00Z',
    length: 294,
    width: 32
  },
  {
    vessel_id: 'V-002',
    mmsi_hash: 'MMSI-244120098',
    vessel_name: 'TANKER NEPTUNE',
    vessel_type: 'Crude Oil Tanker',
    latitude: 2.285,
    longitude: 101.775,
    speed: 1.2,
    heading: 90,
    last_ais_time: '2026-06-18T21:15:00Z',
    risk_score: 88,
    risk_level: 'High',
    status: 'AIS Gap / Suspicious Slowdown',
    flag_state: 'Liberia',
    destination: 'Port Dickson Refinery Anchorage',
    eta: '2026-06-18T18:30:00Z',
    length: 330,
    width: 60
  },
  {
    vessel_id: 'V-003',
    mmsi_hash: 'MMSI-477381200',
    vessel_name: 'COSCO SHANGHAI',
    vessel_type: 'Cargo Ship',
    latitude: 2.385,
    longitude: 101.955,
    speed: 14.5,
    heading: 102,
    last_ais_time: '2026-06-18T21:20:00Z',
    risk_score: 12,
    risk_level: 'Low',
    status: 'In Transit',
    flag_state: 'Hong Kong',
    destination: 'Penang Port',
    eta: '2026-06-20T12:00:00Z',
    length: 260,
    width: 30
  },
  {
    vessel_id: 'V-004',
    mmsi_hash: 'MMSI-368142010',
    vessel_name: 'BLUEFIN V',
    vessel_type: 'Commercial Fishing Trawler',
    latitude: 2.311,
    longitude: 101.905,
    speed: 4.8,
    heading: 185,
    last_ais_time: '2026-06-18T21:05:00Z',
    risk_score: 74,
    risk_level: 'High',
    status: 'Maneuvering',
    flag_state: 'Vietnam',
    destination: 'Phu My Port',
    eta: '2026-06-20T22:00:00Z',
    length: 54,
    width: 12
  },
  {
    vessel_id: 'V-005',
    mmsi_hash: 'MMSI-235089221',
    vessel_name: 'REBANA EMAS',
    vessel_type: 'LNG Carrier',
    latitude: 2.398,
    longitude: 102.092,
    speed: 16.2,
    heading: 78,
    last_ais_time: '2026-06-18T21:18:00Z',
    risk_score: 8,
    risk_level: 'Low',
    status: 'In Transit',
    flag_state: 'Malaysia',
    destination: 'Bintulu LNG Terminal',
    eta: '2026-06-22T04:00:00Z',
    length: 288,
    width: 44
  },
  {
    vessel_id: 'V-006',
    mmsi_hash: 'MMSI-636015520',
    vessel_name: 'ALBATROSS REEFER',
    vessel_type: 'Refrigerated Cargo',
    latitude: 2.335,
    longitude: 101.811,
    speed: 21.0,
    heading: 250,
    last_ais_time: '2026-06-18T21:09:00Z',
    risk_score: 55,
    risk_level: 'Medium',
    status: 'Speed Anomaly',
    flag_state: 'Marshall Islands',
    destination: 'Port Kelang',
    eta: '2026-06-19T06:00:00Z',
    length: 145,
    width: 22
  },
  {
    vessel_id: 'V-007',
    mmsi_hash: 'MMSI-563022190',
    vessel_name: 'MV SENTINEL',
    vessel_type: 'Offshore Supply Vessel',
    latitude: 2.368,
    longitude: 101.899,
    speed: 0.1,
    heading: 12,
    last_ais_time: '2026-06-18T21:11:00Z',
    risk_score: 15,
    risk_level: 'Low',
    status: 'At Anchor',
    flag_state: 'Malaysia',
    destination: 'Malacca Anchorage Alpha',
    eta: '2026-06-17T11:00:00Z',
    length: 78,
    width: 16
  },
  {
    vessel_id: 'V-008',
    mmsi_hash: 'MMSI-538002931',
    vessel_name: 'SIERRA 9',
    vessel_type: 'General Cargo',
    latitude: 2.255,
    longitude: 101.855,
    speed: 3.2,
    heading: 310,
    last_ais_time: '2026-06-18T13:22:00Z', // Big gap
    risk_score: 92,
    risk_level: 'High',
    status: 'AIS Inactive for 8h',
    flag_state: 'Unknown',
    destination: 'Unknown',
    eta: 'Unknown',
    length: 120,
    width: 18
  },
  {
    vessel_id: 'V-009',
    mmsi_hash: 'MMSI-452109823',
    vessel_name: 'MV MALACCA INTEGRITY',
    vessel_type: 'Cargo Ship',
    latitude: 2.450,
    longitude: 101.720,
    speed: 15.2,
    heading: 285,
    last_ais_time: '2026-06-18T21:12:00Z',
    risk_score: 18,
    risk_level: 'Low',
    status: 'In Transit',
    flag_state: 'Singapore',
    destination: 'Port of Singapore',
    eta: '2026-06-19T22:00:00Z',
    length: 220,
    width: 32
  },
  {
    vessel_id: 'V-010',
    mmsi_hash: 'MMSI-503412001',
    vessel_name: 'APMM MARLIN',
    vessel_type: 'Patrol Vessel',
    latitude: 2.222,
    longitude: 101.954,
    speed: 24.5,
    heading: 120,
    last_ais_time: '2026-06-18T21:23:00Z',
    risk_score: 3,
    risk_level: 'Low',
    status: 'On Patrol',
    flag_state: 'Malaysia',
    destination: 'Malacca Marine Base',
    eta: '2026-06-18T23:50:00Z',
    length: 75,
    width: 11
  },
  {
    vessel_id: 'V-011',
    mmsi_hash: 'MMSI-391442000',
    vessel_name: 'KM AMANAH',
    vessel_type: 'Commercial Fishing Trawler',
    latitude: 2.525,
    longitude: 101.652,
    speed: 3.8,
    heading: 18,
    last_ais_time: '2026-06-18T21:04:00Z',
    risk_score: 48,
    risk_level: 'Medium',
    status: 'Fishing',
    flag_state: 'Malaysia',
    destination: 'Port Dickson Jetty',
    eta: '2026-06-19T04:00:00Z',
    length: 32,
    width: 8
  },
  {
    vessel_id: 'V-012',
    mmsi_hash: 'MMSI-562118320',
    vessel_name: 'TANKER EMERALD',
    vessel_type: 'Crude Oil Tanker',
    latitude: 2.155,
    longitude: 102.052,
    speed: 12.1,
    heading: 305,
    last_ais_time: '2026-06-18T21:19:00Z',
    risk_score: 35,
    risk_level: 'Low',
    status: 'In Transit',
    flag_state: 'Panama',
    destination: 'Port Klang Refinery',
    eta: '2026-06-19T14:30:00Z',
    length: 310,
    width: 55
  },
  {
    vessel_id: 'V-013',
    mmsi_hash: 'MMSI-582103492',
    vessel_name: 'CAPE RACHADO EXPRESS',
    vessel_type: 'Passenger/Ro-Ro Ferry',
    latitude: 2.372,
    longitude: 101.812,
    speed: 16.5,
    heading: 220,
    last_ais_time: '2026-06-18T21:21:00Z',
    risk_score: 5,
    risk_level: 'Low',
    status: 'In Transit',
    flag_state: 'Malaysia',
    destination: 'Rupat Island',
    eta: '2026-06-18T22:30:00Z',
    length: 88,
    width: 14
  }
];

export const mockMovements: Movement[] = [
  // MV KUALA LUMPUR STAR (V-001) - Container Ship (heading ~265)
  { movement_id: 'M-101', vessel_id: 'V-001', timestamp: '2026-06-18T18:00:00Z', latitude: 2.382, longitude: 101.922, speed: 18.1, heading: 265 },
  { movement_id: 'M-102', vessel_id: 'V-001', timestamp: '2026-06-18T19:00:00Z', latitude: 2.372, longitude: 101.896, speed: 18.2, heading: 265 },
  { movement_id: 'M-103', vessel_id: 'V-001', timestamp: '2026-06-18T20:00:00Z', latitude: 2.362, longitude: 101.869, speed: 18.4, heading: 265 },
  { movement_id: 'M-104', vessel_id: 'V-001', timestamp: '2026-06-18T21:10:00Z', latitude: 2.352, longitude: 101.842, speed: 18.4, heading: 265 },

  // TANKER NEPTUNE (V-002) - High Risk, Oil Tanker. Sudden stop and AIS gap near Melaka Coast
  { movement_id: 'M-201', vessel_id: 'V-002', timestamp: '2026-06-18T15:00:00Z', latitude: 2.221, longitude: 101.682, speed: 12.8, heading: 85 },
  { movement_id: 'M-202', vessel_id: 'V-002', timestamp: '2026-06-18T16:00:00Z', latitude: 2.245, longitude: 101.712, speed: 13.0, heading: 88 },
  { movement_id: 'M-203', vessel_id: 'V-002', timestamp: '2026-06-18T17:00:00Z', latitude: 2.268, longitude: 101.742, speed: 12.9, heading: 90 },
  // Gap starts here...
  { movement_id: 'M-204', vessel_id: 'V-002', timestamp: '2026-06-18T21:15:00Z', latitude: 2.285, longitude: 101.775, speed: 1.2, heading: 90 },

  // COSCO SHANGHAI (V-003) - Low Risk Cargo
  { movement_id: 'M-301', vessel_id: 'V-003', timestamp: '2026-06-18T18:00:00Z', latitude: 2.342, longitude: 101.842, speed: 14.2, heading: 102 },
  { movement_id: 'M-302', vessel_id: 'V-003', timestamp: '2026-06-18T19:00:00Z', latitude: 2.356, longitude: 101.880, speed: 14.3, heading: 102 },
  { movement_id: 'M-303', vessel_id: 'V-003', timestamp: '2026-06-18T20:00:00Z', latitude: 2.370, longitude: 101.918, speed: 14.4, heading: 102 },
  { movement_id: 'M-304', vessel_id: 'V-003', timestamp: '2026-06-18T21:20:00Z', latitude: 2.385, longitude: 101.955, speed: 14.5, heading: 102 },

  // BLUEFIN V (V-004) - High Risk, Trawler. Dodging around military zone
  { movement_id: 'M-401', vessel_id: 'V-004', timestamp: '2026-06-18T18:00:00Z', latitude: 2.338, longitude: 101.935, speed: 9.6, heading: 210 },
  { movement_id: 'M-402', vessel_id: 'V-004', timestamp: '2026-06-18T19:00:00Z', latitude: 2.329, longitude: 101.922, speed: 4.2, heading: 195 },
  { movement_id: 'M-403', vessel_id: 'V-004', timestamp: '2026-06-18T20:00:00Z', latitude: 2.318, longitude: 101.911, speed: 3.5, heading: 180 },
  { movement_id: 'M-404', vessel_id: 'V-004', timestamp: '2026-06-18T21:05:00Z', latitude: 2.311, longitude: 101.905, speed: 4.8, heading: 185 },

  // REBANA EMAS (V-005) - Carrier, normal transit
  { movement_id: 'M-501', vessel_id: 'V-005', timestamp: '2026-06-18T18:00:00Z', latitude: 2.361, longitude: 101.951, speed: 16.0, heading: 78 },
  { movement_id: 'M-502', vessel_id: 'V-005', timestamp: '2026-06-18T19:00:00Z', latitude: 2.373, longitude: 101.998, speed: 16.1, heading: 78 },
  { movement_id: 'M-503', vessel_id: 'V-005', timestamp: '2026-06-18T20:00:00Z', latitude: 2.386, longitude: 102.045, speed: 16.2, heading: 78 },
  { movement_id: 'M-504', vessel_id: 'V-005', timestamp: '2026-06-18T21:18:00Z', latitude: 2.398, longitude: 102.092, speed: 16.2, heading: 78 },

  // ALBATROSS REEFER (V-006) - Route deviation and speed anomalies
  { movement_id: 'M-601', vessel_id: 'V-006', timestamp: '2026-06-18T18:00:00Z', latitude: 2.358, longitude: 101.881, speed: 12.0, heading: 250 },
  { movement_id: 'M-602', vessel_id: 'V-006', timestamp: '2026-06-18T19:00:00Z', latitude: 2.350, longitude: 101.858, speed: 23.5, heading: 250 }, // sudden spike
  { movement_id: 'M-603', vessel_id: 'V-006', timestamp: '2026-06-18T20:00:00Z', latitude: 2.342, longitude: 101.834, speed: 22.1, heading: 250 },
  { movement_id: 'M-604', vessel_id: 'V-006', timestamp: '2026-06-18T21:09:00Z', latitude: 2.335, longitude: 101.811, speed: 21.0, heading: 250 },

  // MV SENTINEL (V-007) - At anchor
  { movement_id: 'M-701', vessel_id: 'V-007', timestamp: '2026-06-18T18:00:00Z', latitude: 2.368, longitude: 101.899, speed: 0.1, heading: 12 },
  { movement_id: 'M-702', vessel_id: 'V-007', timestamp: '2026-06-18T19:00:00Z', latitude: 2.368, longitude: 101.899, speed: 0.1, heading: 12 },
  { movement_id: 'M-703', vessel_id: 'V-007', timestamp: '2026-06-18T20:00:00Z', latitude: 2.368, longitude: 101.899, speed: 0.0, heading: 12 },
  { movement_id: 'M-704', vessel_id: 'V-007', timestamp: '2026-06-18T21:11:00Z', latitude: 2.368, longitude: 101.899, speed: 0.1, heading: 12 },

  // SIERRA 9 (V-008) - High Risk Cargo, AIS Gap
  { movement_id: 'M-801', vessel_id: 'V-008', timestamp: '2026-06-18T10:00:00Z', latitude: 2.221, longitude: 101.922, speed: 10.5, heading: 310 },
  { movement_id: 'M-802', vessel_id: 'V-008', timestamp: '2026-06-18T11:00:00Z', latitude: 2.232, longitude: 101.900, speed: 9.8, heading: 310 },
  { movement_id: 'M-803', vessel_id: 'V-008', timestamp: '2026-06-18T12:00:00Z', latitude: 2.243, longitude: 101.878, speed: 7.2, heading: 310 },
  { movement_id: 'M-804', vessel_id: 'V-008', timestamp: '2026-06-18T13:22:00Z', latitude: 2.255, longitude: 101.855, speed: 3.2, heading: 310 },

  // MV MALACCA INTEGRITY (V-009)
  { movement_id: 'M-901', vessel_id: 'V-009', timestamp: '2026-06-18T18:00:00Z', latitude: 2.480, longitude: 101.780, speed: 15.0, heading: 285 },
  { movement_id: 'M-902', vessel_id: 'V-009', timestamp: '2026-06-18T19:00:00Z', latitude: 2.470, longitude: 101.760, speed: 15.1, heading: 285 },
  { movement_id: 'M-903', vessel_id: 'V-009', timestamp: '2026-06-18T20:00:00Z', latitude: 2.460, longitude: 101.740, speed: 15.2, heading: 285 },
  { movement_id: 'M-904', vessel_id: 'V-009', timestamp: '2026-06-18T21:12:00Z', latitude: 2.450, longitude: 101.720, speed: 15.2, heading: 285 },

  // APMM MARLIN (V-010)
  { movement_id: 'M-1001', vessel_id: 'V-010', timestamp: '2026-06-18T18:00:00Z', latitude: 2.180, longitude: 101.884, speed: 24.0, heading: 120 },
  { movement_id: 'M-1002', vessel_id: 'V-010', timestamp: '2026-06-18T19:00:00Z', latitude: 2.194, longitude: 101.905, speed: 24.2, heading: 120 },
  { movement_id: 'M-1003', vessel_id: 'V-010', timestamp: '2026-06-18T20:00:00Z', latitude: 2.208, longitude: 101.930, speed: 24.4, heading: 120 },
  { movement_id: 'M-1004', vessel_id: 'V-010', timestamp: '2026-06-18T21:23:00Z', latitude: 2.222, longitude: 101.954, speed: 24.5, heading: 120 },

  // KM AMANAH (V-011)
  { movement_id: 'M-1101', vessel_id: 'V-011', timestamp: '2026-06-18T18:00:00Z', latitude: 2.502, longitude: 101.640, speed: 3.5, heading: 18 },
  { movement_id: 'M-1102', vessel_id: 'V-011', timestamp: '2026-06-18T19:00:00Z', latitude: 2.510, longitude: 101.644, speed: 3.6, heading: 18 },
  { movement_id: 'M-1103', vessel_id: 'V-011', timestamp: '2026-06-18T20:00:00Z', latitude: 2.518, longitude: 101.648, speed: 3.7, heading: 18 },
  { movement_id: 'M-1104', vessel_id: 'V-011', timestamp: '2026-06-18T21:04:00Z', latitude: 2.525, longitude: 101.652, speed: 3.8, heading: 18 },

  // TANKER EMERALD (V-012)
  { movement_id: 'M-1201', vessel_id: 'V-012', timestamp: '2026-06-18T18:00:00Z', latitude: 2.122, longitude: 102.112, speed: 12.0, heading: 305 },
  { movement_id: 'M-1202', vessel_id: 'V-012', timestamp: '2026-06-18T19:00:00Z', latitude: 2.133, longitude: 102.092, speed: 12.0, heading: 305 },
  { movement_id: 'M-1203', vessel_id: 'V-012', timestamp: '2026-06-18T20:00:00Z', latitude: 2.144, longitude: 102.072, speed: 12.1, heading: 305 },
  { movement_id: 'M-1204', vessel_id: 'V-012', timestamp: '2026-06-18T21:19:00Z', latitude: 2.155, longitude: 102.052, speed: 12.1, heading: 305 },

  // CAPE RACHADO EXPRESS (V-013)
  { movement_id: 'M-1301', vessel_id: 'V-013', timestamp: '2026-06-18T18:00:00Z', latitude: 2.342, longitude: 101.848, speed: 16.0, heading: 220 },
  { movement_id: 'M-1302', vessel_id: 'V-013', timestamp: '2026-06-18T19:00:00Z', latitude: 2.352, longitude: 101.836, speed: 16.2, heading: 220 },
  { movement_id: 'M-1303', vessel_id: 'V-013', timestamp: '2026-06-18T20:00:00Z', latitude: 2.362, longitude: 101.824, speed: 16.4, heading: 220 },
  { movement_id: 'M-1304', vessel_id: 'V-013', timestamp: '2026-06-18T21:21:00Z', latitude: 2.372, longitude: 101.812, speed: 16.5, heading: 220 }
];

export const mockZones: MaritimeZone[] = [
  {
    zone_id: 'Z-01',
    zone_name: 'Malacca Strait Security Sector Alpha',
    zone_type: 'Military Naval Range',
    risk_level: 'High',
    polygon_coordinates: [
      [2.290, 101.870],
      [2.290, 101.930],
      [2.325, 101.930],
      [2.325, 101.870]
    ]
  },
  {
    zone_id: 'Z-02',
    zone_name: 'Port Dickson Refinery Anchorage Corridor',
    zone_type: 'Regulated Transit Corridor',
    risk_level: 'Medium',
    polygon_coordinates: [
      [2.340, 101.810],
      [2.340, 101.880],
      [2.375, 101.880],
      [2.375, 101.810]
    ]
  },
  {
    zone_id: 'Z-03',
    zone_name: 'Pulau Besar Eco-Sanctuary Reserve',
    zone_type: 'No-Entry Restricted Area',
    risk_level: 'High',
    polygon_coordinates: [
      [2.260, 101.730],
      [2.260, 101.790],
      [2.295, 101.790],
      [2.295, 101.730]
    ]
  },
  {
    zone_id: 'Z-04',
    zone_name: 'Malacca Marine Traffic Separation Lane Northbound',
    zone_type: 'Regulated Transit Corridor',
    risk_level: 'Medium',
    polygon_coordinates: [
      [2.410, 101.690],
      [2.410, 101.750],
      [2.460, 101.750],
      [2.460, 101.690]
    ]
  },
  {
    zone_id: 'Z-05',
    zone_name: 'Port Dickson Southeast Coastal Guard Patrol Range',
    zone_type: 'Military Naval Range',
    risk_level: 'High',
    polygon_coordinates: [
      [2.160, 101.910],
      [2.160, 101.990],
      [2.210, 101.990],
      [2.210, 101.910]
    ]
  }
];

export const mockAlerts: Alert[] = [
  {
    alert_id: 'ALT-01',
    vessel_id: 'V-002',
    alert_type: 'AIS Gap',
    alert_time: '2026-06-18T17:15:00Z',
    severity: 'High',
    description: 'Vessel switched off AIS transmission. Cruising under 2 knots near highly restricted eco-sensitive preservation area Pulau Besar Eco-Sanctuary Reserve.',
    status: 'Active',
    recommended_action: 'Alert Malaysian Maritime Enforcement Agency (MMEA) patrol vessel KAJANG 4 to intercept and perform visual inspect. Verify satellite synthetic-aperture radar (SAR) imagery.',
    zone_id: 'Z-03'
  },
  {
    alert_id: 'ALT-02',
    vessel_id: 'V-004',
    alert_type: 'Restricted Zone Entry',
    alert_time: '2026-06-18T19:42:00Z',
    severity: 'High',
    description: 'Foreign trawler BLUEFIN V entered Malacca Strait Security Sector Alpha without valid naval declaration. Suspicious zig-zag bottom-trolling tracks flagged.',
    status: 'Active',
    recommended_action: 'Log formal Malaysian maritime infraction. Signal vessel master to halt operations via VHF Marine Channel 16. Contact KD LAKSAMANA patrol boat if non-responsive.',
    zone_id: 'Z-01'
  },
  {
    alert_id: 'ALT-03',
    vessel_id: 'V-006',
    alert_type: 'Speed Anomaly',
    alert_time: '2026-06-18T19:00:00Z',
    severity: 'Medium',
    description: 'Refrigerated Cargo vessel exceeded standard 12-knot refinery corridor lanes speed limit by surging to 23.5 knots off Melaka Coast.',
    status: 'Under Review',
    recommended_action: 'Query Melaka Port Command (VTS). Request explanation from master and query potential engine governor or mechanical failure report.',
    zone_id: 'Z-02'
  },
  {
    alert_id: 'ALT-04',
    vessel_id: 'V-008',
    alert_type: 'AIS Gap',
    alert_time: '2026-06-18T13:22:00Z',
    severity: 'High',
    description: 'Black-listed general cargo vessel SIERRA 9 vanished from Malaysian coast guard tactical radar track with no telemetry for over 8 hours.',
    status: 'Active',
    recommended_action: 'Commence radar Sector Sweep out of Tanjung Kling. Check last coordinates via Satellite L-band and update APMM maritime database.',
    zone_id: 'Z-01'
  },
  {
    alert_id: 'ALT-05',
    vessel_id: 'V-004',
    alert_type: 'Fishing-like Movement',
    alert_time: '2026-06-18T20:15:00Z',
    severity: 'Medium',
    description: 'Repeated circular looping tracks off Port Dickson matching parameters for illegal trawling in conservation waters.',
    status: 'Under Review',
    recommended_action: 'Issue digital radio warning through MMEA channels. Cross-reference vessel list against official Malaysian licensed commercial fishing registry.',
    zone_id: 'Z-01'
  },
  {
    alert_id: 'ALT-06',
    vessel_id: 'V-001',
    alert_type: 'Route Deviation',
    alert_time: '2026-06-18T19:30:00Z',
    severity: 'Medium',
    description: 'MV KUALA LUMPUR STAR deviated 4 nautical miles north from the standard international shipping lanes in the Strait of Malacca.',
    status: 'Resolved',
    recommended_action: 'Vessel master replied via VHF to avoid drifting debris/logs near Cape Rachado (Tanjung Tuan). Track re-aligned. Approved by Officer Zulkifli.',
    reviewed_by: 'Officer Zulkifli',
    resolution_notes: 'Confirmed debris avoidance maneuver near Tanjung Tuan lighthouse coordinates.'
  },
  {
    alert_id: 'ALT-07',
    vessel_id: 'V-001',
    alert_type: 'Loitering',
    alert_time: '2026-06-18T18:15:00Z',
    severity: 'Low',
    description: 'Stationary drifting behavior outside defined Port Klang shipping lane for 45 minutes.',
    status: 'Resolved',
    recommended_action: 'Verify with Selangor port pilot registry.',
    reviewed_by: 'Officer Zulkifli',
    resolution_notes: 'Awaiting container terminal berth designation at Port Klang Westports.'
  }
];

export const defaultSettings: PlatformSettings = {
  ais_gap_threshold: 1.5,
  high_risk_threshold: 75,
  medium_risk_threshold: 40,
  restricted_zone_rules: 'All unauthorized civilian vessels, fishing trawlers, and military transits without pre-clearance must flag high risk upon crossing geofenced zones within Malaysian Waters.',
  alert_notification: true,
  geofence_triggers: true,
  auto_escalation: false
};

// AI explanations used to simulate LLM responses for alerts
export const mockAIEvaluation = {
  'V-002': {
    summary: 'TANKER NEPTUNE represents a highly suspicious, critical anomaly off the coast of Melaka. AIS transmissions were terminated exactly 1.2 nautical miles prior to reaching the Pulau Besar Eco-Sanctuary coordinate boundary. Combined with a drastic speed decrease to 1.2 knots, this behavior strongly correlates with illegal ship-to-ship fuel bunkering or oily ballast discharge operations, which frequently exploit dark zones to escape ecological sensors.',
    confidence: 94,
    indicators: [
      { name: 'AIS Blackout Alignment', weight: 'High Risk Factor' },
      { name: 'Drastic Unscheduled Speed Reduction', weight: '90% deviation from average flight' },
      { name: 'Pulau Besar Sanctuary Proximity', weight: 'Eco conservation trespass' }
    ],
    recommended_actions: [
      'Task immediate MMEA rapid interceptor craft out of Port Dickson base.',
      'Request high-resolution radar satellite sweep over coordinates 2.285N, 101.775E.',
      'Notify Malaysian Marine Department and owners of TANKER NEPTUNE.'
    ]
  },
  'V-004': {
    summary: 'BLUEFIN V displays high-frequency, low-speed zig-zag maneuvers within the restricted security sector. Deep learning kinematic models confirm a fishing pattern footprint with 98% matching confidence. This vessel has failed to declare fishing manifests and is operating inside high-risk military naval patrol lanes off Tanjung Kling.',
    confidence: 88,
    indicators: [
      { name: 'Zig-zag Tracking Pattern', weight: 'Bottom Trawling Footprint' },
      { name: 'Military Range Trespass', weight: 'Malacca Sector Alpha Infringement' },
      { name: 'Missing Commercial manifest', weight: 'Illegal & Unreported commercial activity' }
    ],
    recommended_actions: [
      'VHF hailing protocol on Marine Channel 16 ordering immediate course egress.',
      'Log ship registry (Vietnam Flag) for diplomatic and maritime enforcement penalties.',
      'Deploy drone surveillance patrol from nearby Melaka airfield station.'
    ]
  },
  'V-008': {
    summary: 'SIERRA 9 is currently a GHOST Vessel off the Selangor/Negeri Sembilan border. The AIS telemetry was shut down at 13:22 UTC without any prior mechanical or emergency transmission on standard maritime safety nets. Operating under flag-of-convenience registries across international waters, this vessel has a dense history of cargo list manipulations.',
    confidence: 96,
    indicators: [
      { name: 'Prolonged Telemetry Blackout', weight: '8 Hour Offline State' },
      { name: 'Non-declared Destination', weight: 'No manifest logged with Malaysian authorities' },
      { name: 'Security Registry Flags', weight: 'Previous inspections blacklist history' }
    ],
    recommended_actions: [
      'Prioritize coordinates on state Coastal Surveillance Radar sweeps.',
      'Alert incoming port pilots at Westports/Northports Port Klang regarding silent approach risks.',
      'Request Navy radar support to detect physical hull profile.'
    ]
  },
  'V-006': {
    summary: 'ALBATROSS REEFER is demonstrating intermittent velocity spikes. Sudden surges to 23.5 knots inside heavy vessel corridors suggest either engine regulatory malfunctions, avoidance of pilot crafts, or corrupted AIS transponder calibration.',
    confidence: 65,
    indicators: [
      { name: 'Anchorage Lane Speed Crossing', weight: 'Heavy Speed Excess' },
      { name: 'Potential AIS Transponder Drift', weight: 'Irregular GPS updates' }
    ],
    recommended_actions: [
      'Contact vessel master via harbor control station.',
      'Verify water-current state near Melaka Port bounds to rule out environmental drift.'
    ]
  }
};
