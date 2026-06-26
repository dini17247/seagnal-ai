import { Router, Response } from 'express';
import * as env from '../config/env';
import { 
  authMiddleware, 
  requirePermission, 
  AuthenticatedRequest 
} from '../middleware/authMiddleware';
import { bigQueryMaritimeRepository } from '../repositories/BigQueryMaritimeRepository';
import { generateGeminiIncidentReport } from '../services/geminiIncidentService';

// Import in-memory repos
import { MemoryUserRepository } from '../repositories/memory/MemoryUserRepository';
import { MemoryAlertReviewRepository } from '../repositories/memory/MemoryAlertReviewRepository';
import { MemoryIncidentReportRepository } from '../repositories/memory/MemoryIncidentReportRepository';
import { MemorySettingsRepository } from '../repositories/memory/MemorySettingsRepository';
import { MemoryAuditLogRepository } from '../repositories/memory/MemoryAuditLogRepository';

// Import SQL repos
import { CloudSqlUserRepository } from '../repositories/cloudsql/CloudSqlUserRepository';
import { CloudSqlAlertReviewRepository } from '../repositories/cloudsql/CloudSqlAlertReviewRepository';
import { CloudSqlIncidentReportRepository } from '../repositories/cloudsql/CloudSqlIncidentReportRepository';
import { CloudSqlSettingsRepository } from '../repositories/cloudsql/CloudSqlSettingsRepository';
import { CloudSqlAuditLogRepository } from '../repositories/cloudsql/CloudSqlAuditLogRepository';

import { Alert, UserRole, AccountStatus, Permission } from '../../src/types';

const router = Router();

// Instantiate operational repositories based on engine settings
const userRepo = env.CLOUD_SQL_ENABLED ? new CloudSqlUserRepository() : new MemoryUserRepository();
const alertReviewRepo = env.CLOUD_SQL_ENABLED ? new CloudSqlAlertReviewRepository() : new MemoryAlertReviewRepository();
const reportRepo = env.CLOUD_SQL_ENABLED ? new CloudSqlIncidentReportRepository() : new MemoryIncidentReportRepository();
const settingsRepo = env.CLOUD_SQL_ENABLED ? new CloudSqlSettingsRepository() : new MemorySettingsRepository();
const auditLogRepo = env.CLOUD_SQL_ENABLED ? new CloudSqlAuditLogRepository() : new MemoryAuditLogRepository();

// --- 1. HEALTH ENDPOINTS ---

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      use_mock_data: env.USE_MOCK_DATA,
      auth_required: env.AUTH_REQUIRED,
      cloud_sql_enabled: env.CLOUD_SQL_ENABLED,
    },
  });
});

router.get(
  '/health/bigquery',
  async (_req, res) => {
    if (env.USE_MOCK_DATA) {
      return res.json({
        success: true,
        status: 'mock',
        message:
          'USE_MOCK_DATA=true — BigQuery not queried.',
      });
    }

    try {
      const {
        bigQueryService,
      } = await import(
        '../services/bigQueryService'
      );

      if (
        !bigQueryService.isAvailable()
      ) {
        return res.status(503).json({
          success: false,
          status: 'unavailable',
          error:
            'BigQuery client did not initialize. Check Google Cloud credentials.',
        });
      }

      await bigQueryService.query(
        'SELECT 1 AS connected'
      );

      const configuredTables = [
        env.BIGQUERY_VESSELS_TABLE,
        env.BIGQUERY_MOVEMENTS_TABLE,
        env.BIGQUERY_ALERTS_TABLE,
        env.BIGQUERY_ZONES_TABLE,
      ];

      const schemas =
        await Promise.all(
          configuredTables.map(
            (tableName) =>
              bigQueryService.inspectTable(
                tableName,
                true
              )
          )
        );

      const missingTables =
        schemas
          .filter(
            (schema) =>
              !schema.exists
          )
          .map(
            (schema) =>
              schema.tableName
          );

      return res
        .status(
          missingTables.length > 0
            ? 503
            : 200
        )
        .json({
          success:
            missingTables.length === 0,

          status:
            missingTables.length === 0
              ? 'connected'
              : 'schema_error',

          details: {
            projectId:
              env.GCP_PROJECT_ID,

            datasetId:
              env.BIGQUERY_DATASET_ID,

            location:
              env.BIGQUERY_LOCATION ||
              'auto',

            tables: schemas,

            missingTables,
          },
        });
    } catch (error: any) {
      console.error(
        '❌ BigQuery health check failed:',
        error.message
      );

      return res
        .status(503)
        .json({
          success: false,
          status: 'error',
          error: error.message,
        });
    }
  }
);


// --- 2. AUTHENTICATION (Apply Middleware globally below this point if AUTH_REQUIRED is true) ---
router.use(authMiddleware);


// --- 3. DASHBOARD ENDPOINTS ---

router.get('/dashboard/summary', requirePermission('dashboard.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Read raw alerts to compute high risk trends
    const alerts = await bigQueryMaritimeRepository.listAlerts();
    const vessels = await bigQueryMaritimeRepository.listVessels();
    
    // Load active alert reviews from operational database
    const reviews = await alertReviewRepo.listReviews();
    const resolvedIds = new Set(reviews.filter(r => r.status === 'Resolved').map(r => r.alert_id));
    const underReviewIds = new Set(reviews.filter(r => r.status === 'Under Review').map(r => r.alert_id));

    // Calculate dynamic dashboard counters
    const monitored_vessels = vessels.length;
    const high_risk_vessels = vessels.filter(v => v.risk_level === 'High').length;
    
    // Open Alerts excludes 'Resolved' review operational states
    const openAlertsList = alerts.filter(a => !resolvedIds.has(a.alert_id));
    const open_alerts = openAlertsList.length;

    const ais_gaps = openAlertsList.filter(a => a.alert_type === 'AIS Gap').length;
    const zone_violations = openAlertsList.filter(a => a.alert_type === 'Restricted Zone Entry').length;

    res.json({
      success: true,
      data: {
        monitored_vessels,
        high_risk_vessels,
        open_alerts,
        ais_gaps,
        zone_violations
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/latest-alerts', requirePermission('dashboard.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawAlerts = await bigQueryMaritimeRepository.listAlerts();
    const reviews = await alertReviewRepo.listReviews();
    
    const reviewMap = new Map(reviews.map(r => [r.alert_id, r]));

    // Join & Merge Operational Status
    const mergedAlerts: Alert[] = rawAlerts.map(alert => {
      const rev = reviewMap.get(alert.alert_id);
      if (rev) {
        return {
          ...alert,
          status: rev.status,
          reviewed_by: rev.reviewed_by,
          resolution_notes: rev.resolution_notes,
          resolved_at: rev.resolved_at,
          reviewed_at: rev.reviewed_at,
          assigned_user_id: rev.assigned_user_id,
          assigned_user_name: rev.assigned_user_name,
          reviewed_by_user_id: rev.reviewed_by_user_id,
          resolved_by_user_id: rev.resolved_by_user_id
        };
      }
      return alert;
    });

    // Sort newest alert first, filter out operational 'Resolved' states from live feeds
    const openAlerts = mergedAlerts
      .filter(a => a.status !== 'Resolved')
      .sort((a, b) => new Date(b.alert_time).getTime() - new Date(a.alert_time).getTime());

    res.json({
      success: true,
      data: openAlerts.slice(0, 15)
    });
  } catch (error) {
    next(error);
  }
});


// --- 4. VESSELS ENDPOINTS ---

router.get('/vessels', requirePermission('vessels.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = req.query.search as string;
    const risk = req.query.risk as string;
    const type = req.query.type as string;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const vessels = await bigQueryMaritimeRepository.listVessels({ search, risk, type, limit, offset });
    res.json({ success: true, data: vessels });
  } catch (error) {
    next(error);
  }
});

router.get('/vessels/:vesselId', requirePermission('vessels.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const vessel = await bigQueryMaritimeRepository.findVesselById(req.params.vesselId);
    if (!vessel) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vessel record not found.' } });
    }
    res.json({ success: true, data: vessel });
  } catch (error) {
    next(error);
  }
});

router.get('/vessels/:vesselId/movements', requirePermission('vessels.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = req.query.movementLimit ? Number(req.query.movementLimit) : undefined;
    const movements = await bigQueryMaritimeRepository.getMovements(req.params.vesselId, limit);
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
});

router.get('/vessels/:vesselId/alerts', requirePermission('alerts.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawAlerts = await bigQueryMaritimeRepository.listAlerts();
    const reviews = await alertReviewRepo.listReviews();
    const reviewMap = new Map(reviews.map(r => [r.alert_id, r]));

    const vesselAlerts = rawAlerts
      .filter(a => a.vessel_id === req.params.vesselId)
      .map(alert => {
        const rev = reviewMap.get(alert.alert_id);
        if (rev) {
          return {
            ...alert,
            status: rev.status,
            reviewed_by: rev.reviewed_by,
            resolution_notes: rev.resolution_notes,
            resolved_at: rev.resolved_at,
            reviewed_at: rev.reviewed_at,
            assigned_user_id: rev.assigned_user_id,
            assigned_user_name: rev.assigned_user_name,
          };
        }
        return alert;
      });

    res.json({ success: true, data: vesselAlerts });
  } catch (error) {
    next(error);
  }
});


// --- 5. MAP ENDPOINTS ---

router.get('/map/vessels', requirePermission('map.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const vessels = await bigQueryMaritimeRepository.listVessels({ limit: 100 });
    // Keep payloads minimal for high latency leaflet redraws
    const mapFields = vessels.map(v => ({
      vessel_id: v.vessel_id,
      vessel_name: v.vessel_name,
      vessel_type: v.vessel_type,
      latitude: v.latitude,
      longitude: v.longitude,
      speed: v.speed,
      heading: v.heading,
      risk_level: v.risk_level,
      risk_score: v.risk_score,
      status: v.status
    }));
    res.json({ success: true, data: mapFields });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/map/movements',
  requirePermission('map.view'),
  async (
    req: AuthenticatedRequest,
    res,
    next
  ) => {
    try {
      const requestedLimit =
        req.query.limitPerVessel
          ? Number(
              req.query
                .limitPerVessel
            )
          : 30;

      const limitPerVessel =
        Number.isFinite(
          requestedLimit
        )
          ? requestedLimit
          : 30;

      const movements =
        await bigQueryMaritimeRepository
          .listRecentMovements(
            limitPerVessel
          );

      res.json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/maritime-zones', requirePermission('map.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const zones = await bigQueryMaritimeRepository.getMaritimeZones();
    res.json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
});


// --- 6. ALERTS ENDPOINTS ---

router.get('/alerts', requirePermission('alerts.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawAlerts = await bigQueryMaritimeRepository.listAlerts();
    const reviews = await alertReviewRepo.listReviews();
    const reviewMap = new Map(reviews.map(r => [r.alert_id, r]));

    const mergedAlerts = rawAlerts.map(alert => {
      const rev = reviewMap.get(alert.alert_id);
      if (rev) {
        return {
          ...alert,
          status: rev.status,
          reviewed_by: rev.reviewed_by,
          resolution_notes: rev.resolution_notes,
          resolved_at: rev.resolved_at,
          reviewed_at: rev.reviewed_at,
          assigned_user_id: rev.assigned_user_id,
          assigned_user_name: rev.assigned_user_name,
          reviewed_by_user_id: rev.reviewed_by_user_id,
          resolved_by_user_id: rev.resolved_by_user_id
        };
      }
      return alert;
    });

    res.json({ success: true, data: mergedAlerts });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts/:alertId', requirePermission('alerts.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawAlert = await bigQueryMaritimeRepository.findAlertById(req.params.alertId);
    if (!rawAlert) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Raw Alert record not found.' } });
    }
    const rev = await alertReviewRepo.findById(req.params.alertId);
    if (rev) {
      return res.json({
        success: true,
        data: {
          ...rawAlert,
          status: rev.status,
          reviewed_by: rev.reviewed_by,
          resolution_notes: rev.resolution_notes,
          resolved_at: rev.resolved_at,
          reviewed_at: rev.reviewed_at,
          assigned_user_id: rev.assigned_user_id,
          assigned_user_name: rev.assigned_user_name,
        }
      });
    }
    res.json({ success: true, data: rawAlert });
  } catch (error) {
    next(error);
  }
});

// Audit Alert Endpoint: updates state to Under Review
const auditHandler = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const alertId = req.params.alertId;
    const author = req.user;

    const alert = await bigQueryMaritimeRepository.findAlertById(alertId);
    if (!alert) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert to audit was not found in systems.' } });
    }

    const currentReview = await alertReviewRepo.findById(alertId);
    const updatedReview = await alertReviewRepo.upsert({
      alert_id: alertId,
      assigned_user_id: author?.user_id,
      assigned_user_name: author?.full_name,
      reviewed_by_user_id: author?.user_id,
      status: 'Under Review',
      review_notes: req.body.review_notes || 'Officer initiated audit investigation.',
      reviewed_at: new Date().toISOString(),
      reviewed_by: author?.full_name
    });

    // Log Action inside Audit Trail
    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Alert Audited',
      resource_type: 'Alert',
      resource_id: alertId,
      action_description: `Alert ${alertId} flagged as Under Review by ${author?.full_name}.`,
      previous_value: currentReview,
      new_value: updatedReview
    });

    res.json({ success: true, data: updatedReview });
  } catch (error) {
    next(error);
  }
};
router.put('/alerts/:alertId/audit', requirePermission('alerts.audit'), auditHandler);
router.patch('/alerts/:alertId/audit', requirePermission('alerts.audit'), auditHandler);

// Resolve Alert Endpoint: requires non-empty resolution notes
const resolveHandler = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const alertId = req.params.alertId;
    const { resolution_notes } = req.body;
    const author = req.user;

    if (!resolution_notes || resolution_notes.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOTES_REQUIRED', message: 'Officer resolution notes must be provided to close an alert.' }
      });
    }

    const alert = await bigQueryMaritimeRepository.findAlertById(alertId);
    if (!alert) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target alert not found.' } });
    }

    const currentReview = await alertReviewRepo.findById(alertId);
    const updatedReview = await alertReviewRepo.upsert({
      alert_id: alertId,
      assigned_user_id: currentReview?.assigned_user_id || author?.user_id,
      assigned_user_name: currentReview?.assigned_user_name || author?.full_name,
      reviewed_by_user_id: currentReview?.reviewed_by_user_id || author?.user_id,
      resolved_by_user_id: author?.user_id,
      status: 'Resolved',
      review_notes: currentReview?.review_notes || 'Investigations complete.',
      resolution_notes,
      reviewed_at: currentReview?.reviewed_at || new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      reviewed_by: currentReview?.reviewed_by || author?.full_name
    });

    // Create entry in global Admin Audit Logs
    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Alert Resolved',
      resource_type: 'Alert',
      resource_id: alertId,
      action_description: `Alert closed. Resolution: "${resolution_notes}". Resolver: ${author?.full_name}`,
      previous_value: currentReview,
      new_value: updatedReview
    });

    res.json({ success: true, data: updatedReview });
  } catch (error) {
    next(error);
  }
};
router.put('/alerts/:alertId/resolve', requirePermission('alerts.resolve'), resolveHandler);
router.patch('/alerts/:alertId/resolve', requirePermission('alerts.resolve'), resolveHandler);


// --- 7. INCIDENT REPORTS ENDPOINTS ---

router.get('/reports', requirePermission('reports.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const list = await reportRepo.listReports();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/:reportId', requirePermission('reports.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await reportRepo.findById(req.params.reportId);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident report not found.' } });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.post('/reports', requirePermission('reports.create'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const { vessel_id, primary_alert_id, officer_notes, ai_summary, final_recommendation, alert_ids } = req.body;

    if (!vessel_id) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Vessel ID is required.' } });
    }

    const report = await reportRepo.create({
      vessel_id,
      primary_alert_id,
      created_by_user_id: author?.user_id || 'usr-003',
      officer_notes,
      ai_summary,
      final_recommendation,
      alert_ids
    });

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Report Created',
      resource_type: 'Incident Report',
      resource_id: report.id,
      action_description: `Incident Report dossier draft ${report.report_number} initialized for Vessel ${vessel_id}.`
    });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.put('/reports/:reportId', requirePermission('reports.edit'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const { officer_notes, ai_summary, final_recommendation, report_status, alert_ids } = req.body;

    const current = await reportRepo.findById(req.params.reportId);
    if (!current) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident Report not found.' } });
    }

    if (current.report_status === 'Finalized') {
      return res.status(400).json({ success: false, error: { code: 'REPORT_FINALIZED', message: 'Cannot edit an already finalized analytical dossier.' } });
    }

    const updated = await reportRepo.update(req.params.reportId, {
      officer_notes,
      ai_summary,
      final_recommendation,
      report_status,
      alert_ids
    });

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Report Updated',
      resource_type: 'Incident Report',
      resource_id: updated.id,
      action_description: `Incident dossier ${updated.report_number} modified by analyst.`
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/reports/:reportId/finalize', requirePermission('reports.finalize'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const current = await reportRepo.findById(req.params.reportId);
    if (!current) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident dossier not found.' } });
    }

    const updated = await reportRepo.update(req.params.reportId, {
      report_status: 'Finalized',
      finalized_by_user_id: author?.user_id,
      finalized_at: new Date().toISOString()
    });

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Report Finalized',
      resource_type: 'Incident Report',
      resource_id: updated.id,
      action_description: `Incident report ${updated.report_number} signed and closed.`
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/reports/:reportId/export', requirePermission('reports.export'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const current = await reportRepo.findById(req.params.reportId);
    if (!current) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dossier not found for export.' } });
    }

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Report Exported',
      resource_type: 'Incident Report',
      resource_id: current.id,
      action_description: `Dossier compilation package ${current.report_number} compiled and exported.`
    });

    res.json({ 
      success: true, 
      data: { 
        export_time: new Date().toISOString(),
        download_url: `/api/reports/${current.id}/download-pdf`,
        formatted_filename: `${current.report_number}_SEAGNAL_DOSSIER.pdf` 
      } 
    });
  } catch (error) {
    next(error);
  }
});


// --- 8. SYSTEM CONFIGURATION ENDPOINTS ---

router.get('/settings', requirePermission('settings.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const config = await settingsRepo.getSettings();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', requirePermission('settings.update'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const current = await settingsRepo.getSettings();
    const updated = await settingsRepo.updateSettings(req.body);

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Settings Updated',
      resource_type: 'System Settings',
      action_description: `Platform alarm thresholds altered. Medium limit: ${updated.medium_risk_threshold}, High limit: ${updated.high_risk_threshold}`,
      previous_value: current,
      new_value: updated
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/reset', requirePermission('settings.update'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const defaults = {
      ais_gap_threshold: 4,
      high_risk_threshold: 80,
      medium_risk_threshold: 55,
      restricted_zone_rules: 'Default sanctuary and borders rule set.',
      alert_notification: true,
      geofence_triggers: true,
      auto_escalation: false
    };
    const updated = await settingsRepo.updateSettings(defaults);

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'Settings Reset',
      resource_type: 'System Settings',
      action_description: 'System threshold alarms reverted to default standard settings.'
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});


// --- 9. GEMINI INCIDENT ANALYSIS ENDPOINT (Task 19) ---

router.get('/ai/status', requirePermission('reports.view'), (_req, res) => {
  res.json({
    success: true,
    data: {
      configured: Boolean(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL,
      transport: 'server-side',
      output_format: 'structured-json',
    },
  });
});

router.post('/ai/incident-summary', requirePermission('reports.create'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { vessel_id, alert_ids, officer_context } = req.body ?? {};

    if (typeof vessel_id !== 'string' || !vessel_id.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Vessel ID parameter is required.' },
      });
    }

    if (officer_context !== undefined && typeof officer_context !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Officer context must be text.' },
      });
    }

    const requestedAlertIds = Array.isArray(alert_ids)
      ? alert_ids.filter((value): value is string => typeof value === 'string').slice(0, 20)
      : [];

    const [vessel, rawAlerts, movements, zones] = await Promise.all([
      bigQueryMaritimeRepository.findVesselById(vessel_id.trim()),
      bigQueryMaritimeRepository.listAlerts(1000),
      bigQueryMaritimeRepository.getMovements(vessel_id.trim(), 30),
      bigQueryMaritimeRepository.getMaritimeZones(),
    ]);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vessel record not found.' },
      });
    }

    const vesselAlerts = rawAlerts.filter((alert) => alert.vessel_id === vessel.vessel_id);
    const targetAlerts = requestedAlertIds.length
      ? vesselAlerts.filter((alert) => requestedAlertIds.includes(alert.alert_id))
      : vesselAlerts.slice(0, 12);

    const result = await generateGeminiIncidentReport({
      vessel,
      alerts: targetAlerts,
      movements,
      zones,
      officerContext: officer_context?.trim().slice(0, 4000),
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});


// --- 10. SYSTEM ADIMINISTRATOR USER MANAGEMENT ENDPOINTS (Task 17) ---

router.get('/users', requirePermission('users.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const list = await userRepo.listUsers();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.post('/users', requirePermission('users.manage'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const { full_name, email, role, organization, account_status, auth_uid } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Name, email and role are mandatory.' } });
    }

    const newUser = await userRepo.createUser({
      auth_uid: auth_uid || `auth_gen_${Date.now()}`,
      full_name,
      email,
      role: role as UserRole,
      organization,
      account_status: (account_status as AccountStatus) || 'Active'
    });

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type: 'User Created',
      resource_type: 'Auth User',
      resource_id: newUser.user_id,
      action_description: `New user profile created: ${email} with assigned role '${role}' by ${author?.full_name}`
    });

    res.json({ success: true, data: newUser });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:userId', requirePermission('users.manage'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const author = req.user;
    const userId = req.params.userId;
    const { role, account_status, full_name, organization } = req.body;

    const current = await userRepo.findById(userId);
    if (!current) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found in system storage.' } });
    }

    const updated = await userRepo.updateUser(userId, {
      role,
      account_status,
      full_name,
      organization
    });

    let action_msg = `Admin updated profile for ${current.email}.`;
    let action_type = 'User Profile Updated';
    
    if (role && role !== current.role) {
      action_type = 'Role Changed';
      action_msg = `Role for ${current.email} changed from '${current.role}' to '${role}' by ${author?.full_name}`;
    } else if (account_status && account_status !== current.account_status) {
      action_type = account_status === 'Suspended' ? 'Account Suspended' : 'Account Reactivated';
      action_msg = `User ${current.email} account status marked as '${account_status}' by Admin ${author?.full_name}`;
    }

    await auditLogRepo.create({
      user_id: author?.user_id,
      user_email: author?.email,
      action_type,
      resource_type: 'Auth User',
      resource_id: userId,
      action_description: action_msg,
      previous_value: current,
      new_value: updated
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});


// --- 11. ADMINISTRATIVE AUDIT LOGS ENDPOINT (Task 18) ---

router.get('/audit-logs', requirePermission('audit_logs.view'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const list = await auditLogRepo.listLogs();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

export default router;
