import { AuthUser, UserRole, AccountStatus } from '../../../src/types';

export interface CreateUserInput {
  auth_uid: string;
  full_name: string;
  email: string;
  role: UserRole;
  organization?: string;
  account_status: AccountStatus;
}

export interface UpdateUserInput {
  full_name?: string;
  role?: UserRole;
  organization?: string;
  account_status?: AccountStatus;
}

export interface UserRepository {
  findByAuthUid(authUid: string): Promise<AuthUser | null>;
  findById(userId: string): Promise<AuthUser | null>;
  listUsers(): Promise<AuthUser[]>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  updateUser(userId: string, input: UpdateUserInput): Promise<AuthUser>;
  updateLastLogin(userId: string): Promise<void>;
}
