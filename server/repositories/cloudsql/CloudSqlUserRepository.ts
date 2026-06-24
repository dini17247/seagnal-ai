import { AuthUser, UserRole, AccountStatus } from '../../../src/types';
import { UserRepository, CreateUserInput, UpdateUserInput } from '../interfaces/UserRepository';

// Extensible for pg/sequelize/drizzle once downloaded to offline workstation
export class CloudSqlUserRepository implements UserRepository {
  private db: any; // e.g. pg Pool client

  constructor(dbPool?: any) {
    this.db = dbPool;
  }

  async findByAuthUid(authUid: string): Promise<AuthUser | null> {
    const sql = `
      SELECT u.id as user_id, u.auth_uid, u.full_name, u.email, r.role_name as role, o.organization_name as organization, u.account_status, u.last_login_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.auth_uid = $1
    `;
    console.log(`[SQL Execute] [CloudSqlUserRepository.findByAuthUid]: ${sql} with args: [${authUid}]`);
    throw new Error('Cloud SQL UserRepository not initialized: Running in local Sandbox memory storage.');
  }

  async findById(userId: string): Promise<AuthUser | null> {
    const sql = `
      SELECT u.id as user_id, u.auth_uid, u.full_name, u.email, r.role_name as role, o.organization_name as organization, u.account_status, u.last_login_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `;
    console.log(`[SQL Execute] [CloudSqlUserRepository.findById]: ${sql} with args: [${userId}]`);
    throw new Error('Cloud SQL UserRepository not initialized: Running in local Sandbox memory storage.');
  }

  async listUsers(): Promise<AuthUser[]> {
    const sql = `
      SELECT u.id as user_id, u.auth_uid, u.full_name, u.email, r.role_name as role, o.organization_name as organization, u.account_status, u.last_login_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.created_at DESC
    `;
    console.log(`[SQL Execute]: ${sql}`);
    throw new Error('Cloud SQL UserRepository not initialized.');
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const sql = `
      INSERT INTO users (auth_uid, full_name, email, role_id, organization_id, account_status)
      VALUES ($1, $2, $3, (SELECT id FROM roles WHERE role_name = $4), (SELECT id FROM organizations WHERE organization_name = $5), $6)
      RETURNING id, auth_uid, full_name, email, account_status
    `;
    console.log(`[SQL Execute] [CreateUser]: ${sql}`);
    throw new Error('Cloud SQL UserRepository not initialized.');
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<AuthUser> {
    const sql = `
      UPDATE users 
      SET full_name = COALESCE($2, full_name),
          role_id = COALESCE((SELECT id FROM roles WHERE role_name = $3), role_id),
          account_status = COALESCE($4, account_status)
      WHERE id = $1
    `;
    console.log(`[SQL Execute] [UpdateUser]: ${sql}`);
    throw new Error('Cloud SQL UserRepository not initialized.');
  }

  async updateLastLogin(userId: string): Promise<void> {
    const sql = `UPDATE users SET last_login_at = NOW() WHERE id = $1`;
    console.log(`[SQL Execute] [UpdateLastLogin]: ${sql}`);
    throw new Error('Cloud SQL UserRepository not initialized.');
  }
}
