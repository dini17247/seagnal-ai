import type { PoolClient } from 'pg';

export interface AppUserSource {
  user_id?: string;
  auth_uid?: string;
  full_name?: string;
  email?: string;
  role?: string;
  organization?: string;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function normalizeEmail(value: unknown): string | undefined {
  const trimmed = normalizeText(value);

  if (!trimmed || !trimmed.includes('@')) {
    return undefined;
  }

  return trimmed.toLowerCase();
}

function buildFallbackEmail(workosUserId: string): string {
  const safeName =
    workosUserId
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '_')
      .slice(0, 50) || 'system';

  return `${safeName}@seagnal.local`;
}

export async function resolveAppUserId(
  client: PoolClient,
  source: AppUserSource,
): Promise<string> {
  const workosUserId =
    normalizeText(source.auth_uid) ||
    normalizeText(source.user_id) ||
    normalizeEmail(source.email) ||
    'system-user';

  const email =
    normalizeEmail(source.email) ||
    buildFallbackEmail(workosUserId);

  const fullName =
    normalizeText(source.full_name) ||
    'Seagnal Officer';

  const workosOrganizationId =
    normalizeText(source.organization) || null;

  const result = await client.query<{ id: string }>(
    `
      WITH existing_user AS (
        SELECT id
        FROM app_users
        WHERE workos_user_id = $1
           OR LOWER(email) = LOWER($2)
        ORDER BY id ASC
        LIMIT 1
      ),
      updated_user AS (
        UPDATE app_users
        SET
          workos_user_id = $1,
          workos_organization_id = $3,
          email = $2,
          full_name = $4,
          account_status = 'Active',
          updated_at = NOW(),
          last_login_at = NOW()
        WHERE id IN (
          SELECT id
          FROM existing_user
        )
        RETURNING id
      ),
      inserted_user AS (
        INSERT INTO app_users (
          workos_user_id,
          workos_organization_id,
          email,
          full_name,
          account_status,
          last_login_at
        )
        SELECT
          $1,
          $3,
          $2,
          $4,
          'Active',
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM updated_user
        )
        RETURNING id
      )
      SELECT id
      FROM updated_user

      UNION ALL

      SELECT id
      FROM inserted_user

      LIMIT 1
    `,
    [
      workosUserId,
      email,
      workosOrganizationId,
      fullName,
    ],
  );

  const userId = result.rows[0]?.id;

  if (!userId) {
    throw new Error(
      'Unable to resolve app user for incident report save.',
    );
  }

  return String(userId);
}