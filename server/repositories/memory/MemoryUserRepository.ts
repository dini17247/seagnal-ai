import { AuthUser, UserRole, AccountStatus } from '../../../src/types';
import { UserRepository, CreateUserInput, UpdateUserInput } from '../interfaces/UserRepository';

export class MemoryUserRepository implements UserRepository {
  private users: AuthUser[] = [
    {
      user_id: 'usr-001',
      auth_uid: 'auth_admin',
      full_name: 'Dini Sage (Administrator)',
      email: 'dini@citysage.my',
      role: 'System Administrator',
      organization: 'Maritime HQ Command',
      account_status: 'Active',
      last_login_at: new Date().toISOString()
    },
    {
      user_id: 'usr-002',
      auth_uid: 'auth_commander',
      full_name: 'Capt. Sarah Connor (Commander)',
      email: 'sarah.connor@seagnal.ai',
      role: 'Watch Commander',
      organization: 'Pacific Patrol Force',
      account_status: 'Active',
      last_login_at: new Date().toISOString()
    },
    {
      user_id: 'usr-003',
      auth_uid: 'auth_analyst',
      full_name: 'Eliot Vance (Analyst)',
      email: 'eliot.vance@seagnal.ai',
      role: 'Intelligence Analyst',
      organization: 'Seagnal Intel Agency',
      account_status: 'Active',
      last_login_at: new Date().toISOString()
    },
    {
      user_id: 'usr-004',
      auth_uid: 'auth_officer',
      full_name: 'Officer David Kim',
      email: 'david.kim@seagnal.ai',
      role: 'Alert Officer',
      organization: 'Port of Singapore',
      account_status: 'Active',
      last_login_at: new Date().toISOString()
    },
    {
      user_id: 'usr-005',
      auth_uid: 'auth_viewer',
      full_name: 'External Observer (Viewer)',
      email: 'external@seagnal.ai',
      role: 'Read Only Viewer',
      organization: 'UN Maritime Assoc',
      account_status: 'Active',
      last_login_at: new Date().toISOString()
    },
    {
      user_id: 'usr-006',
      auth_uid: 'auth_suspended',
      full_name: 'Suspended Officer',
      email: 'suspended@seagnal.ai',
      role: 'Alert Officer',
      organization: 'Blacklisted Port',
      account_status: 'Suspended',
      last_login_at: new Date().toISOString()
    }
  ];

  async findByAuthUid(authUid: string): Promise<AuthUser | null> {
    const user = this.users.find(u => u.auth_uid === authUid);
    return user ? { ...user } : null;
  }

  async findById(userId: string): Promise<AuthUser | null> {
    const user = this.users.find(u => u.user_id === userId);
    return user ? { ...user } : null;
  }

  async listUsers(): Promise<AuthUser[]> {
    return this.users.map(u => ({ ...u }));
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const newUser: AuthUser = {
      user_id: `usr-${String(this.users.length + 1).padStart(3, '0')}`,
      auth_uid: input.auth_uid,
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      organization: input.organization,
      account_status: input.account_status,
      last_login_at: new Date().toISOString()
    };
    this.users.push(newUser);
    return { ...newUser };
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<AuthUser> {
    const userIndex = this.users.findIndex(u => u.user_id === userId);
    if (userIndex === -1) {
      throw new Error(`User with ID ${userId} not found`);
    }
    const current = this.users[userIndex];
    const updated: AuthUser = {
      ...current,
      full_name: input.full_name !== undefined ? input.full_name : current.full_name,
      role: input.role !== undefined ? input.role : current.role,
      organization: input.organization !== undefined ? input.organization : current.organization,
      account_status: input.account_status !== undefined ? input.account_status : current.account_status,
    };
    this.users[userIndex] = updated;
    return { ...updated };
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.find(u => u.user_id === userId);
    if (user) {
      user.last_login_at = new Date().toISOString();
    }
  }
}
