import dotenv from 'dotenv';

dotenv.config();

export const PORT = Number(process.env.PORT) || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
export const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
export const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === 'true';
export const CLOUD_SQL_ENABLED =
  process.env.CLOUD_SQL_ENABLED === 'true';

export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

export const BIGQUERY_DATASET_ID =
  process.env.BIGQUERY_DATASET_ID || 'seagnal_ai';

export const BIGQUERY_LOCATION =
  process.env.BIGQUERY_LOCATION || '';

export const BIGQUERY_VESSELS_TABLE =
  process.env.BIGQUERY_VESSELS_TABLE || 'vessels';

export const BIGQUERY_MOVEMENTS_TABLE =
  process.env.BIGQUERY_MOVEMENTS_TABLE || 'vessel_movements';

export const BIGQUERY_ALERTS_TABLE =
  process.env.BIGQUERY_ALERTS_TABLE || 'alerts';

export const BIGQUERY_ZONES_TABLE =
  process.env.BIGQUERY_ZONES_TABLE || 'maritime_zones';

export const WORKOS_API_KEY = process.env.WORKOS_API_KEY;
export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;
export const WORKOS_COOKIE_PASSWORD =
  process.env.WORKOS_COOKIE_PASSWORD;
export const CSRF_SECRET = process.env.CSRF_SECRET;
export const WORKOS_ORGANIZATION_ID =
  process.env.WORKOS_ORGANIZATION_ID;

export const APP_BASE_URL =
  process.env.APP_BASE_URL || 'http://localhost:3000';

export const WORKOS_REDIRECT_URI =
  process.env.WORKOS_REDIRECT_URI ||
  'http://localhost:3000/callback';

export const CLOUD_SQL_INSTANCE_CONNECTION_NAME =
  process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME;

export const CLOUD_SQL_DATABASE =
  process.env.CLOUD_SQL_DATABASE;

export const CLOUD_SQL_USER =
  process.env.CLOUD_SQL_USER;

export const CLOUD_SQL_PASSWORD =
  process.env.CLOUD_SQL_PASSWORD;

export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

export function validateEnv() {
  console.log('--- SEAGNAL AI RUNTIME CONFIG ---');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Express Port: ${PORT}`);
  console.log(`USE_MOCK_DATA: ${USE_MOCK_DATA}`);
  console.log(`AUTH_REQUIRED: ${AUTH_REQUIRED}`);
  console.log(`USE_MOCK_AUTH: ${USE_MOCK_AUTH}`);
  console.log(`CLOUD_SQL_ENABLED: ${CLOUD_SQL_ENABLED}`);

  console.log(
    `GCP Project ID: ${
      GCP_PROJECT_ID || 'Not specified'
    }`
  );

  console.log(
    `BigQuery Dataset: ${BIGQUERY_DATASET_ID}`
  );

  console.log(
    `BigQuery Location: ${
      BIGQUERY_LOCATION || 'Auto'
    }`
  );

  if (!USE_MOCK_DATA && !GCP_PROJECT_ID) {
    console.warn(
      '⚠️ USE_MOCK_DATA=false but GCP_PROJECT_ID is missing.'
    );
  }

  if (AUTH_REQUIRED && !USE_MOCK_AUTH) {
    const missing: string[] = [];

    if (!WORKOS_API_KEY) {
      missing.push('WORKOS_API_KEY');
    }

    if (!WORKOS_CLIENT_ID) {
      missing.push('WORKOS_CLIENT_ID');
    }

    if (!WORKOS_COOKIE_PASSWORD) {
      missing.push('WORKOS_COOKIE_PASSWORD');
    }

    if (missing.length > 0) {
      console.error(
        `❌ Missing WorkOS variables: ${missing.join(', ')}`
      );

      process.exit(1);
    }

    console.log('✅ WorkOS credentials present.');
  }
}