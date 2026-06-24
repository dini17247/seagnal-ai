import apiClient from './apiClient';
import { AuthUser, UserRole, AccountStatus } from '../types';

export interface AuditLogDto {
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

export const userService = {
  async listUsers(): Promise<AuthUser[]> {
    return apiClient.get<AuthUser[]>('/users');
  },

  async createUser(params: {
    full_name: string;
    email: string;
    role: UserRole;
    organization?: string;
    account_status: AccountStatus;
  }): Promise<AuthUser> {
    return apiClient.post<AuthUser>('/users', params);
  },

  async updateUser(userId: string, params: {
    role?: UserRole;
    account_status?: AccountStatus;
    full_name?: string;
    organization?: string;
  }): Promise<AuthUser> {
    return apiClient.put<AuthUser>(`/users/${userId}`, params);
  },

  async listAuditLogs(): Promise<AuditLogDto[]> {
    return apiClient.get<AuditLogDto[]>('/audit-logs');
  }
};
