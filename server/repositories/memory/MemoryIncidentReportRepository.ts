import { IncidentReport, IncidentReportRepository, CreateReportInput, UpdateReportInput } from '../interfaces/IncidentReportRepository';

export class MemoryIncidentReportRepository implements IncidentReportRepository {
  private reports: IncidentReport[] = [
    {
      id: 'rep-001',
      report_number: 'REP-2026-0001',
      vessel_id: 'V-001',
      primary_alert_id: 'A-001',
      created_by_user_id: 'usr-003',
      assigned_to_user_id: 'usr-003',
      report_status: 'Draft',
      officer_notes: 'Suspected illegal aggregate mining and transfer outside approved territorial waters. The vessel vessel deactivated AIS shortly after crossing the zone border.',
      ai_summary: 'AI EVALUATION SUMMARY: High risk anomaly detected during automated route-deviation monitoring. Subject vessel "Pacific Pioneer" is flagged for consistent loitering with periodic speed drops to 0.5 knots.',
      final_recommendation: 'Monitor vessel behavior near territorial borders; escalate to coastal patrol if loitering persists for more than 12 hours.',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      alert_ids: ['A-001', 'A-002']
    },
    {
      id: 'rep-002',
      report_number: 'REP-2026-0002',
      vessel_id: 'V-002',
      primary_alert_id: 'A-003',
      created_by_user_id: 'usr-003',
      finalized_by_user_id: 'usr-002',
      report_status: 'Finalized',
      officer_notes: 'Vessel observed operating inside Restricted Zone Bravo without an active marine entry permit. AIS transmission stayed active but speed logs indicate anchoring.',
      ai_summary: 'AI EVALUATION SUMMARY: Confirmed zone intrusion alarm. Vessel "Starlight Voyager" has entered high-density protected coral area at 14:24 UTC.',
      final_recommendation: 'Case finalized and logged with local authorities. Administrative review pending.',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      finalized_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      alert_ids: ['A-003']
    }
  ];

  async findById(id: string): Promise<IncidentReport | null> {
    const report = this.reports.find(r => r.id === id);
    return report ? { ...report } : null;
  }

  async findByVesselId(vesselId: string): Promise<IncidentReport[]> {
    return this.reports.filter(r => r.vessel_id === vesselId).map(r => ({ ...r }));
  }

  async listReports(): Promise<IncidentReport[]> {
    return this.reports.map(r => ({ ...r }));
  }

  async create(input: CreateReportInput): Promise<IncidentReport> {
    const newReport: IncidentReport = {
      id: `rep-${String(this.reports.length + 1).padStart(3, '0')}`,
      report_number: `REP-2026-${String(this.reports.length + 1).padStart(4, '0')}`,
      vessel_id: input.vessel_id,
      primary_alert_id: input.primary_alert_id,
      created_by_user_id: input.created_by_user_id,
      report_status: 'Draft',
      officer_notes: input.officer_notes || '',
      ai_summary: input.ai_summary || '',
      final_recommendation: input.final_recommendation || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      alert_ids: input.alert_ids || []
    };
    this.reports.push(newReport);
    return { ...newReport };
  }

  async update(id: string, input: UpdateReportInput): Promise<IncidentReport> {
    const rIndex = this.reports.findIndex(r => r.id === id);
    if (rIndex === -1) {
      throw new Error(`Incident report ${id} not found`);
    }
    const current = this.reports[rIndex];
    const updated: IncidentReport = {
      ...current,
      officer_notes: input.officer_notes !== undefined ? input.officer_notes : current.officer_notes,
      ai_summary: input.ai_summary !== undefined ? input.ai_summary : current.ai_summary,
      final_recommendation: input.final_recommendation !== undefined ? input.final_recommendation : current.final_recommendation,
      report_status: input.report_status !== undefined ? input.report_status : current.report_status,
      finalized_by_user_id: input.finalized_by_user_id !== undefined ? input.finalized_by_user_id : current.finalized_by_user_id,
      finalized_at: input.finalized_at !== undefined ? input.finalized_at : current.finalized_at,
      alert_ids: input.alert_ids !== undefined ? input.alert_ids : current.alert_ids,
      updated_at: new Date().toISOString()
    };
    this.reports[rIndex] = updated;
    return { ...updated };
  }
}
