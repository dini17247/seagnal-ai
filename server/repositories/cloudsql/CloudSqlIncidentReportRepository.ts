import {
  CreateReportInput,
  IncidentReport,
  IncidentReportRepository,
  UpdateReportInput,
} from '../interfaces/IncidentReportRepository';

import {
  query,
  transaction,
} from '../../database/cloudSqlPool';

import {
  resolveAppUserId,
} from './cloudSqlUserResolver';

type IncidentReportRow = Record<string, unknown>;

function toIso(value: unknown): string | undefined {
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

function toDbBigInt(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? String(value)
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return /^\d+$/.test(trimmed)
    ? trimmed
    : null;
}

function normalizeStatus(
  value: unknown,
): 'Draft' | 'Finalized' {
  return value === 'Finalized'
    ? 'Finalized'
    : 'Draft';
}

function mapReport(
  row: IncidentReportRow,
): IncidentReport {
  return {
    id: String(row.id),
    report_number: String(row.report_number || ''),
    vessel_id: String(row.vessel_id || ''),
    primary_alert_id:
      row.primary_alert_id
        ? String(row.primary_alert_id)
        : undefined,
    created_by_user_id: String(row.created_by_user_id),
    assigned_to_user_id:
      row.assigned_to_user_id
        ? String(row.assigned_to_user_id)
        : undefined,
    finalized_by_user_id:
      row.finalized_by_user_id
        ? String(row.finalized_by_user_id)
        : undefined,
    report_status: normalizeStatus(row.report_status),
    officer_notes: String(row.officer_notes || ''),
    ai_summary: String(row.ai_summary || ''),
    final_recommendation: String(
      row.final_recommendation || '',
    ),
    created_at:
      toIso(row.created_at) ||
      new Date().toISOString(),
    updated_at:
      toIso(row.updated_at) ||
      new Date().toISOString(),
    finalized_at: toIso(row.finalized_at),
    alert_ids: Array.isArray(row.alert_ids)
      ? row.alert_ids.map(String).filter(Boolean)
      : [],
  };
}

function generateReportNumber(): string {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `REP-${datePart}-${randomPart}`;
}

export class CloudSqlIncidentReportRepository
  implements IncidentReportRepository
{
  private readonly selectSql = `
    SELECT
      ir.id,
      ir.report_number,
      ir.vessel_id,
      ir.primary_alert_id,
      ir.created_by_user_id,
      ir.assigned_to_user_id,
      ir.finalized_by_user_id,
      ir.report_status,
      ir.officer_notes,
      ir.ai_summary,
      ir.final_recommendation,
      ir.created_at,
      ir.updated_at,
      ir.finalized_at,
      COALESCE(linked.alert_ids, '{}') AS alert_ids
    FROM incident_reports ir
    LEFT JOIN (
      SELECT
        report_id,
        ARRAY_AGG(alert_id ORDER BY alert_id) AS alert_ids
      FROM incident_report_alerts
      GROUP BY report_id
    ) linked
      ON linked.report_id = ir.id
  `;

  async findById(
    id: string,
  ): Promise<IncidentReport | null> {
    const reportId = toDbBigInt(id);

    if (!reportId) {
      return null;
    }

    const result = await query(
      `
        ${this.selectSql}
        WHERE ir.id = $1::bigint
        LIMIT 1
      `,
      [reportId],
    );

    return result.rows[0]
      ? mapReport(result.rows[0])
      : null;
  }

  async findByVesselId(
    vesselId: string,
  ): Promise<IncidentReport[]> {
    const result = await query(
      `
        ${this.selectSql}
        WHERE ir.vessel_id = $1
        ORDER BY ir.created_at DESC
      `,
      [vesselId],
    );

    return result.rows.map(mapReport);
  }

  async listReports(): Promise<IncidentReport[]> {
    const result = await query(
      `
        ${this.selectSql}
        ORDER BY ir.created_at DESC
        LIMIT 500
      `,
    );

    return result.rows.map(mapReport);
  }

  async create(
    input: CreateReportInput,
  ): Promise<IncidentReport> {
    const createdId = await transaction(
      async (client) => {
        const createdByUserId =
          await resolveAppUserId(client, {
            user_id: input.created_by_user_id,
            auth_uid:
              input.created_by_auth_uid ||
              input.created_by_user_id,
            email: input.created_by_email,
            full_name:
              input.created_by_full_name,
            role: input.created_by_role,
            organization:
              input.created_by_organization,
          });

        const result = await client.query(
          `
            INSERT INTO incident_reports (
              report_number,
              vessel_id,
              primary_alert_id,
              created_by_user_id,
              officer_notes,
              ai_summary,
              final_recommendation,
              report_status
            )
            VALUES (
              $1,
              $2,
              $3,
              $4::bigint,
              $5,
              $6,
              $7,
              'Draft'
            )
            RETURNING id
          `,
          [
            generateReportNumber(),
            input.vessel_id,
            input.primary_alert_id || null,
            createdByUserId,
            input.officer_notes || '',
            input.ai_summary || '',
            input.final_recommendation || '',
          ],
        );

        const reportId = String(result.rows[0].id);

        if (input.alert_ids?.length) {
          await client.query(
            `
              INSERT INTO incident_report_alerts (
                report_id,
                alert_id
              )
              SELECT
                $1::bigint,
                unnest($2::text[])
              ON CONFLICT DO NOTHING
            `,
            [reportId, input.alert_ids],
          );
        }

        return reportId;
      },
    );

    const created = await this.findById(createdId);

    if (!created) {
      throw new Error(
        'Incident report was created but could not be reloaded.',
      );
    }

    return created;
  }

  async update(
    id: string,
    input: UpdateReportInput,
  ): Promise<IncidentReport> {
    const reportId = toDbBigInt(id);

    if (!reportId) {
      throw new Error(
        `Invalid incident report id: ${id}`,
      );
    }

    await transaction(async (client) => {
      const values: unknown[] = [reportId];

      const setParts: string[] = [
        'updated_at = NOW()',
      ];

      const addSet = (
        column: string,
        value: unknown,
        cast?: string,
      ) => {
        if (value === undefined) {
          return;
        }

        values.push(value);
        const placeholder = `$${values.length}${cast || ''}`;
        setParts.push(`${column} = ${placeholder}`);
      };

      addSet(
        'officer_notes',
        input.officer_notes,
      );

      addSet(
        'ai_summary',
        input.ai_summary,
      );

      addSet(
        'final_recommendation',
        input.final_recommendation,
      );

      addSet(
        'report_status',
        input.report_status,
      );

      if (
        input.finalized_by_user_id !== undefined
      ) {
        const finalizedByUserId =
          input.finalized_by_user_id
            ? await resolveAppUserId(client, {
                user_id:
                  input.finalized_by_user_id,
                auth_uid:
                  input.finalized_by_user_id,
                full_name:
                  'Finalizing Officer',
              })
            : null;

        addSet(
          'finalized_by_user_id',
          finalizedByUserId,
          '::bigint',
        );
      }

      addSet(
        'finalized_at',
        input.finalized_at,
        '::timestamptz',
      );

      await client.query(
        `
          UPDATE incident_reports
          SET ${setParts.join(', ')}
          WHERE id = $1::bigint
        `,
        values,
      );

      if (input.alert_ids !== undefined) {
        await client.query(
          `
            DELETE FROM incident_report_alerts
            WHERE report_id = $1::bigint
          `,
          [reportId],
        );

        if (input.alert_ids.length > 0) {
          await client.query(
            `
              INSERT INTO incident_report_alerts (
                report_id,
                alert_id
              )
              SELECT
                $1::bigint,
                unnest($2::text[])
              ON CONFLICT DO NOTHING
            `,
            [reportId, input.alert_ids],
          );
        }
      }
    });

    const updated = await this.findById(reportId);

    if (!updated) {
      throw new Error(
        `Incident report ${reportId} was not found after update.`,
      );
    }

    return updated;
  }
}