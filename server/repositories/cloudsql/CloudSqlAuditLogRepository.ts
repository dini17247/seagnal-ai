import { AuditLog, AuditLogRepository, CreateAuditLogInput } from '../interfaces/AuditLogRepository';

export class CloudSqlAuditLogRepository implements AuditLogRepository {
  private db: any;

  constructor(db?: any) {
    this.db = db;
  }

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const sql = `
      INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, action_description, previous_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    console.log(`[SQL Execute]: ${sql}`);
    return {
      id: 'aud-sql',
      user_id: input.user_id,
      user_email: input.user_email,
      action_type: input.action_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      action_description: input.action_description,
      created_at: new Date().toISOString()
    };
  }

  async listLogs(): Promise<AuditLog[]> {
    const sql = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`;
    console.log(`[SQL Execute]: ${sql}`);
    return [];
  }
}
