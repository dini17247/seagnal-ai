export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  action_description: string;
  previous_value?: any;
  new_value?: any;
  created_at: string;
}

export interface CreateAuditLogInput {
  user_id?: string;
  user_email?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  action_description: string;
  previous_value?: any;
  new_value?: any;
}

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  listLogs(): Promise<AuditLog[]>;
}
