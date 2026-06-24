import { IncidentReport, IncidentReportRepository, CreateReportInput, UpdateReportInput } from '../interfaces/IncidentReportRepository';

export class CloudSqlIncidentReportRepository implements IncidentReportRepository {
  private db: any;

  constructor(db?: any) {
    this.db = db;
  }

  async findById(id: string): Promise<IncidentReport | null> {
    const sql = `SELECT * FROM incident_reports WHERE id = $1`;
    console.log(`[SQL Execute] [IncidentReport.findById]: ${sql} with [${id}]`);
    return null;
  }

  async findByVesselId(vesselId: string): Promise<IncidentReport[]> {
    const sql = `SELECT * FROM incident_reports WHERE vessel_id = $1`;
    console.log(`[SQL Execute]: ${sql}`);
    return [];
  }

  async listReports(): Promise<IncidentReport[]> {
    const sql = `SELECT * FROM incident_reports ORDER BY created_at DESC`;
    console.log(`[SQL Execute]: ${sql}`);
    return [];
  }

  async create(input: CreateReportInput): Promise<IncidentReport> {
    const sql = `INSERT INTO incident_reports (vessel_id, primary_alert_id, created_by_user_id, officer_notes, ai_summary, final_recommendation) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    console.log(`[SQL Execute]: ${sql}`);
    throw new Error('Cloud SQL repository not configured.');
  }

  async update(id: string, input: UpdateReportInput): Promise<IncidentReport> {
    const sql = `UPDATE incident_reports SET officer_notes = $1, ai_summary = $2, report_status = $3 WHERE id = $4 RETURNING *`;
    console.log(`[SQL Execute]: ${sql}`);
    throw new Error('Cloud SQL repository not configured.');
  }
}
