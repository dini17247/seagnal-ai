import { AuditLog, AuditLogRepository, CreateAuditLogInput } from '../interfaces/AuditLogRepository';

export class MemoryAuditLogRepository implements AuditLogRepository {
  private logs: AuditLog[] = [
    {
      id: 'aud-001',
      user_id: 'usr-001',
      user_email: 'dini@citysage.my',
      action_type: 'Login',
      resource_type: 'Authentication',
      resource_id: 'usr-001',
      action_description: 'User dini@citysage.my authenticated successfully in administrative scope.',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    },
    {
      id: 'aud-002',
      user_id: 'usr-003',
      user_email: 'eliot.vance@seagnal.ai',
      action_type: 'Report Created',
      resource_type: 'Incident Report',
      resource_id: 'rep-001',
      action_description: 'Draft incident dossier created for pacific Pioneer (V-001)',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    }
  ];

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: `aud-${String(this.logs.length + 1).padStart(3, '0')}`,
      user_id: input.user_id,
      user_email: input.user_email,
      action_type: input.action_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      action_description: input.action_description,
      previous_value: input.previous_value,
      new_value: input.new_value,
      created_at: new Date().toISOString()
    };
    this.logs.push(newLog);
    return { ...newLog };
  }

  async listLogs(): Promise<AuditLog[]> {
    return [...this.logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
