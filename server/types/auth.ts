export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
}
