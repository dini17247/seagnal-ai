import {
  Permission,
  UserRole,
} from '../../src/types';

import {
  workos,
} from './workosClient';

import * as env from '../config/env';

/**
 * Exact role slugs configured in WorkOS.
 */
export const WORKOS_ROLE_SLUGS = {
  ADMIN: 'system_admin',
  VIEWER: 'viewer',
} as const;

const ADMIN_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'map.view',
  'vessels.view',

  'alerts.view',
  'alerts.audit',
  'alerts.resolve',

  'reports.view',
  'reports.create',
  'reports.edit',
  'reports.finalize',
  'reports.export',

  'settings.view',
  'settings.update',

  'users.view',
  'users.manage',

  'audit_logs.view',
];

const VIEWER_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'map.view',
  'vessels.view',
  'alerts.view',
  'reports.view',
];

/**
 * Existing project roles are retained so this Record
 * remains compatible with the UserRole type.
 *
 * WorkOS currently uses only:
 * - system_admin
 * - viewer
 */
export const ROLE_PERMISSIONS:
  Record<UserRole, Permission[]> = {
  'System Administrator':
    ADMIN_PERMISSIONS,

  'Read Only Viewer':
    VIEWER_PERMISSIONS,

  'Watch Commander':
    VIEWER_PERMISSIONS,

  'Intelligence Analyst':
    VIEWER_PERMISSIONS,

  'Alert Officer':
    VIEWER_PERMISSIONS,
};

export interface ResolvedAuthorization {
  role: UserRole;
  roleSlug: string;
  permissions: Permission[];
  organizationId?: string;
}

type MembershipLike = {
  id: string;

  status?: string;

  organizationId?: string;

  role?: {
    slug?: string;
  } | null;

  roles?: Array<{
    slug?: string;
  }>;
};

function normalizeValue(
  value: unknown
): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function extractRoleSlugs(
  membership: MembershipLike
): string[] {
  const roleValues: unknown[] = [
    membership.role?.slug,

    ...(Array.isArray(
      membership.roles
    )
      ? membership.roles.map(
          (role) =>
            role?.slug
        )
      : []),
  ];

  return roleValues
    .map(normalizeValue)
    .filter(Boolean);
}

/**
 * Return only an ACTIVE membership belonging to the
 * configured Seagnal AI organization.
 *
 * Pending, inactive and revoked memberships are ignored.
 * This function never reactivates or modifies memberships.
 */
async function findActiveOrganizationMembership(
  userId: string
): Promise<MembershipLike | null> {
  if (
    !workos ||
    !env.WORKOS_ORGANIZATION_ID
  ) {
    return null;
  }

  try {
    const response =
      await workos.userManagement
        .listOrganizationMemberships({
          userId,

          organizationId:
            env.WORKOS_ORGANIZATION_ID,

          limit: 100,
        });

    const memberships =
      response.data as MembershipLike[];

    const activeMembership =
      memberships.find(
        (membership) => {
          const status =
            normalizeValue(
              membership.status
            );

          const correctOrganization =
            !membership.organizationId ||
            membership.organizationId ===
              env.WORKOS_ORGANIZATION_ID;

          return (
            correctOrganization &&
            status === 'active'
          );
        }
      );

    return activeMembership ?? null;
  } catch (error) {
    /*
     * Fail safely as Viewer when the membership lookup
     * cannot be completed.
     */
    console.error(
      '[Authorization] Could not read WorkOS membership:',
      error
    );

    return null;
  }
}

/**
 * Kept only for compatibility with existing imports.
 *
 * It intentionally performs no WorkOS membership creation,
 * invitation, deletion, activation or reactivation.
 *
 * Every unaffiliated authenticated user is treated as an
 * application Viewer.
 */
export async function ensureViewerMembership(
  _userId: string
): Promise<void> {
  return;
}

/**
 * Resolve application authorization.
 *
 * Rules:
 * 1. Active system_admin membership = Administrator.
 * 2. Everyone else = Viewer.
 *
 * Session roles alone are not trusted for administrator
 * access. The current active organization membership is
 * treated as the source of truth.
 */
export async function resolveWorkOSAuthorization(
  options: {
    userId: string;
    sessionRole?: string;
    sessionRoles?: string[];
    createViewerMembership?: boolean;
  }
): Promise<ResolvedAuthorization> {
  const membership =
    await findActiveOrganizationMembership(
      options.userId
    );

  const roleSlugs =
    membership
      ? extractRoleSlugs(
          membership
        )
      : [];

  const isAdministrator =
    roleSlugs.includes(
      WORKOS_ROLE_SLUGS.ADMIN
    );

  const role:
    UserRole =
    isAdministrator
      ? 'System Administrator'
      : 'Read Only Viewer';

  const roleSlug =
    isAdministrator
      ? WORKOS_ROLE_SLUGS.ADMIN
      : WORKOS_ROLE_SLUGS.VIEWER;

  return {
    role,

    roleSlug,

    permissions: [
      ...ROLE_PERMISSIONS[role],
    ],

    organizationId:
      env.WORKOS_ORGANIZATION_ID,
  };
}

/**
 * Used only when authentication is disabled or mock
 * authentication is explicitly enabled.
 */
export function getDevelopmentAuthorization(
  requestedRoleSlug: string =
    WORKOS_ROLE_SLUGS.ADMIN
): ResolvedAuthorization {
  const normalizedRole =
    normalizeValue(
      requestedRoleSlug
    );

  const isAdministrator =
    normalizedRole ===
    WORKOS_ROLE_SLUGS.ADMIN;

  const role:
    UserRole =
    isAdministrator
      ? 'System Administrator'
      : 'Read Only Viewer';

  const roleSlug =
    isAdministrator
      ? WORKOS_ROLE_SLUGS.ADMIN
      : WORKOS_ROLE_SLUGS.VIEWER;

  return {
    role,

    roleSlug,

    permissions: [
      ...ROLE_PERMISSIONS[role],
    ],

    organizationId:
      env.WORKOS_ORGANIZATION_ID,
  };
}