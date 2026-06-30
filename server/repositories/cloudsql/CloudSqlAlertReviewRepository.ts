import {
  AlertReview,
  AlertReviewRepository,
} from '../interfaces/AlertReviewRepository';

import {
  query,
  transaction,
} from '../../database/cloudSqlPool';

type AlertReviewRow = {
  id?: number | string;
  alert_id: string;
  assigned_to_user_id?: number | string | null;
  reviewed_by_user_id?: number | string | null;
  resolved_by_user_id?: number | string | null;
  status?: string | null;
  review_notes?: string | null;
  resolution_notes?: string | null;
  reviewed_at?: Date | string | null;
  resolved_at?: Date | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
};

function toIso(
  value: unknown,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function normalizeStatus(
  value: unknown,
): AlertReview['status'] {
  if (value === 'Under Review') {
    return 'Under Review';
  }

  if (value === 'Resolved') {
    return 'Resolved';
  }

  return 'Active';
}

function toDbBigIntOrNull(
  value: unknown,
): string | null {
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? String(value)
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function mapReview(
  row: AlertReviewRow,
): AlertReview {
  return {
    alert_id: row.alert_id,

    assigned_user_id:
      row.assigned_to_user_id !== null &&
      row.assigned_to_user_id !== undefined
        ? String(row.assigned_to_user_id)
        : undefined,

    reviewed_by_user_id:
      row.reviewed_by_user_id !== null &&
      row.reviewed_by_user_id !== undefined
        ? String(row.reviewed_by_user_id)
        : undefined,

    resolved_by_user_id:
      row.resolved_by_user_id !== null &&
      row.resolved_by_user_id !== undefined
        ? String(row.resolved_by_user_id)
        : undefined,

    status: normalizeStatus(row.status),

    review_notes: row.review_notes || '',

    resolution_notes:
      row.resolution_notes || '',

    reviewed_at: toIso(row.reviewed_at),

    resolved_at: toIso(row.resolved_at),

    reviewed_by: undefined,
    assigned_user_name: undefined,
  };
}

export class CloudSqlAlertReviewRepository
  implements AlertReviewRepository
{
  async findById(
    alertId: string,
  ): Promise<AlertReview | null> {
    const result = await query<AlertReviewRow>(
      `
        SELECT
          id,
          alert_id,
          assigned_to_user_id,
          reviewed_by_user_id,
          resolved_by_user_id,
          status,
          review_notes,
          resolution_notes,
          reviewed_at,
          resolved_at,
          created_at,
          updated_at
        FROM alert_reviews
        WHERE alert_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [alertId],
    );

    return result.rows[0]
      ? mapReview(result.rows[0])
      : null;
  }

  async upsert(
    review: AlertReview,
  ): Promise<AlertReview> {
    await transaction(async (client) => {
      const assignedToUserId =
        toDbBigIntOrNull(
          review.assigned_user_id,
        );

      const reviewedByUserId =
        toDbBigIntOrNull(
          review.reviewed_by_user_id,
        );

      const resolvedByUserId =
        toDbBigIntOrNull(
          review.resolved_by_user_id,
        );

      const values = [
        review.alert_id,
        assignedToUserId,
        reviewedByUserId,
        resolvedByUserId,
        review.status || 'Active',
        review.review_notes || null,
        review.resolution_notes || null,
        review.reviewed_at || null,
        review.resolved_at || null,
      ];

      const updated = await client.query(
        `
          UPDATE alert_reviews
          SET
            assigned_to_user_id = COALESCE($2::bigint, assigned_to_user_id),
            reviewed_by_user_id = COALESCE($3::bigint, reviewed_by_user_id),
            resolved_by_user_id = COALESCE($4::bigint, resolved_by_user_id),
            status = $5,
            review_notes = $6,
            resolution_notes = $7,
            reviewed_at = $8::timestamptz,
            resolved_at = $9::timestamptz,
            updated_at = NOW()
          WHERE alert_id = $1
          RETURNING id
        `,
        values,
      );

      if (updated.rowCount && updated.rowCount > 0) {
        return;
      }

      await client.query(
        `
          INSERT INTO alert_reviews (
            alert_id,
            assigned_to_user_id,
            reviewed_by_user_id,
            resolved_by_user_id,
            status,
            review_notes,
            resolution_notes,
            reviewed_at,
            resolved_at
          )
          VALUES (
            $1,
            $2::bigint,
            $3::bigint,
            $4::bigint,
            $5,
            $6,
            $7,
            $8::timestamptz,
            $9::timestamptz
          )
        `,
        values,
      );
    });

    const updated = await this.findById(
      review.alert_id,
    );

    if (!updated) {
      throw new Error(
        `Alert review ${review.alert_id} was saved but could not be reloaded.`,
      );
    }

    return updated;
  }

  async listReviews(): Promise<AlertReview[]> {
    const result = await query<AlertReviewRow>(
      `
        SELECT
          id,
          alert_id,
          assigned_to_user_id,
          reviewed_by_user_id,
          resolved_by_user_id,
          status,
          review_notes,
          resolution_notes,
          reviewed_at,
          resolved_at,
          created_at,
          updated_at
        FROM alert_reviews
        ORDER BY updated_at DESC
        LIMIT 1000
      `,
    );

    return result.rows.map(mapReview);
  }
}