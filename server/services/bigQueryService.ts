import { BigQuery } from '@google-cloud/bigquery';
import * as env from '../config/env';

export class BigQueryService {
  private bqClient: BigQuery | null = null;

  constructor() {
    if (!env.USE_MOCK_DATA) {
      try {
        // Initialize with Application Default Credentials (ADC).
        // Run `gcloud auth application-default login` locally before starting the server.
        this.bqClient = new BigQuery({
          projectId: env.GCP_PROJECT_ID,
        });
        console.log('✅ BigQuery Service initialized with Application Default Credentials.');
      } catch (err: any) {
        console.warn(
          '⚠️  BigQuery client initialization failed:',
          err.message,
          '\n   Ensure ADC is configured: gcloud auth application-default login'
        );
        this.bqClient = null;
      }
    } else {
      console.log('ℹ️  BigQuery skipped — USE_MOCK_DATA=true');
    }
  }

  get client(): BigQuery | null {
    return this.bqClient;
  }

  isAvailable(): boolean {
    return this.bqClient !== null;
  }

  /**
   * Execute a parameterized BigQuery query.
   * Table identifiers are always interpolated from server-side config — never from user input.
   * Throws on failure — callers decide whether to use mock data based on USE_MOCK_DATA.
   */
  async query<T>(sqlText: string, params: Record<string, any> = {}): Promise<T[]> {
    if (!this.bqClient) {
      throw new Error(
        'BigQuery client is not initialized. ' +
        'Ensure USE_MOCK_DATA=false and ADC credentials are configured.'
      );
    }

    const options = {
      query: sqlText,
      params,
      useLegacySql: false,
    };

    console.log(`[BigQuery] Executing: ${sqlText.substring(0, 120).replace(/\s+/g, ' ')}...`);
    const [rows] = await this.bqClient.query(options);
    return rows as T[];
  }
}

export const bigQueryService = new BigQueryService();
