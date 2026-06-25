import { BigQuery } from '@google-cloud/bigquery';
import * as env from '../config/env';

export interface BigQueryTableSchema {
  tableName: string;
  exists: boolean;
  columns: string[];
}

export class BigQueryService {
  private bqClient: BigQuery | null = null;

  private readonly schemaCache =
    new Map<string, string[]>();

  constructor() {
    if (env.USE_MOCK_DATA) {
      console.log(
        'ℹ️ BigQuery skipped because USE_MOCK_DATA=true'
      );

      return;
    }

    try {
      this.bqClient = new BigQuery({
        projectId: env.GCP_PROJECT_ID,
      });

      console.log(
        '✅ BigQuery service initialized.'
      );
    } catch (error: any) {
      console.error(
        '❌ BigQuery initialization failed:',
        error.message
      );

      this.bqClient = null;
    }
  }

  get client(): BigQuery | null {
    return this.bqClient;
  }

  isAvailable(): boolean {
    return this.bqClient !== null;
  }

  async query<T>(
    sqlText: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    if (!this.bqClient) {
      throw new Error(
        'BigQuery client is not initialized. ' +
          'Check USE_MOCK_DATA and Google Cloud credentials.'
      );
    }

    const options = {
      query: sqlText,
      params,
      useLegacySql: false,

      ...(env.BIGQUERY_LOCATION
        ? {
            location: env.BIGQUERY_LOCATION,
          }
        : {}),
    };

    console.log(
      '[BigQuery]',
      sqlText.substring(0, 160).replace(/\s+/g, ' ')
    );

    const [rows] =
      await this.bqClient.query(options);

    return rows as T[];
  }

  async getTableColumns(
    tableName: string,
    refresh = false
  ): Promise<string[]> {
    if (
      !refresh &&
      this.schemaCache.has(tableName)
    ) {
      return this.schemaCache.get(tableName)!;
    }

    if (!env.GCP_PROJECT_ID) {
      throw new Error(
        'GCP_PROJECT_ID is required.'
      );
    }

    const sql = `
      SELECT column_name
      FROM \`${env.GCP_PROJECT_ID}.${env.BIGQUERY_DATASET_ID}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableName
      ORDER BY ordinal_position
    `;

    const rows = await this.query<{
      column_name: string;
    }>(sql, {
      tableName,
    });

    const columns = rows.map((row) =>
      String(row.column_name)
    );

    this.schemaCache.set(
      tableName,
      columns
    );

    return columns;
  }

  async inspectTable(
    tableName: string,
    refresh = false
  ): Promise<BigQueryTableSchema> {
    const columns =
      await this.getTableColumns(
        tableName,
        refresh
      );

    return {
      tableName,
      exists: columns.length > 0,
      columns,
    };
  }
}

export const bigQueryService =
  new BigQueryService();