import dotenv from 'dotenv';

dotenv.config();

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Cloud Run automatically provides PORT.
 *
 * Port 3001 is retained as the local development fallback because:
 * - Vite frontend runs on port 3000
 * - Express backend runs on port 3001
 */
export const PORT = Number(process.env.PORT || 3001);

export const NODE_ENV =
  optionalEnv('NODE_ENV') || 'development';

/**
 * Feature flags
 */
export const USE_MOCK_DATA =
  process.env.USE_MOCK_DATA === 'true';

export const AUTH_REQUIRED =
  process.env.AUTH_REQUIRED === 'true';

export const USE_MOCK_AUTH =
  process.env.USE_MOCK_AUTH === 'true';

export const CLOUD_SQL_ENABLED =
  process.env.CLOUD_SQL_ENABLED === 'true';

/**
 * Google Cloud and BigQuery configuration
 */
export const GCP_PROJECT_ID =
  optionalEnv('GCP_PROJECT_ID');

export const BIGQUERY_DATASET_ID =
  optionalEnv('BIGQUERY_DATASET_ID') ||
  'seagnal_ai';

export const BIGQUERY_LOCATION =
  optionalEnv('BIGQUERY_LOCATION') || '';

export const BIGQUERY_VESSELS_TABLE =
  optionalEnv('BIGQUERY_VESSELS_TABLE') ||
  'vessels';

export const BIGQUERY_MOVEMENTS_TABLE =
  optionalEnv('BIGQUERY_MOVEMENTS_TABLE') ||
  'vessel_movements';

export const BIGQUERY_ALERTS_TABLE =
  optionalEnv('BIGQUERY_ALERTS_TABLE') ||
  'alerts';

export const BIGQUERY_ZONES_TABLE =
  optionalEnv('BIGQUERY_ZONES_TABLE') ||
  'maritime_zones';

/**
 * WorkOS configuration
 */
export const WORKOS_API_KEY =
  optionalEnv('WORKOS_API_KEY');

export const WORKOS_CLIENT_ID =
  optionalEnv('WORKOS_CLIENT_ID');

export const WORKOS_COOKIE_PASSWORD =
  optionalEnv('WORKOS_COOKIE_PASSWORD');

export const CSRF_SECRET =
  optionalEnv('CSRF_SECRET');

export const WORKOS_ORGANIZATION_ID =
  optionalEnv('WORKOS_ORGANIZATION_ID');

/**
 * Optional application URL overrides.
 *
 * Local development:
 * APP_BASE_URL=http://localhost:3000
 * WORKOS_REDIRECT_URI=http://localhost:3000/callback
 *
 * Production-style local test:
 * APP_BASE_URL=http://localhost:8080
 * WORKOS_REDIRECT_URI=http://localhost:8080/callback
 *
 * Cloud Run:
 * These may be omitted. The server derives the HTTPS Cloud Run URL
 * from the incoming request and proxy headers.
 */
export const APP_BASE_URL =
  optionalEnv('APP_BASE_URL');

export const WORKOS_REDIRECT_URI =
  optionalEnv('WORKOS_REDIRECT_URI');

/**
 * Cloud SQL configuration
 */
export const CLOUD_SQL_INSTANCE_CONNECTION_NAME =
  optionalEnv(
    'CLOUD_SQL_INSTANCE_CONNECTION_NAME',
  );

export const CLOUD_SQL_DATABASE =
  optionalEnv('CLOUD_SQL_DATABASE');

export const CLOUD_SQL_USER =
  optionalEnv('CLOUD_SQL_USER');

export const CLOUD_SQL_PASSWORD =
  optionalEnv('CLOUD_SQL_PASSWORD');

/**
 * Gemini configuration
 */
export const GEMINI_API_KEY =
  optionalEnv('GEMINI_API_KEY');

export const GEMINI_MODEL =
  optionalEnv('GEMINI_MODEL') ||
  'gemini-3.5-flash';

export function validateEnv(): void {
  console.log(
    '--- SEAGNAL AI RUNTIME CONFIG ---',
  );

  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Express Port: ${PORT}`);
  console.log(
    `USE_MOCK_DATA: ${USE_MOCK_DATA}`,
  );
  console.log(
    `AUTH_REQUIRED: ${AUTH_REQUIRED}`,
  );
  console.log(
    `USE_MOCK_AUTH: ${USE_MOCK_AUTH}`,
  );
  console.log(
    `CLOUD_SQL_ENABLED: ${CLOUD_SQL_ENABLED}`,
  );

  console.log(
    `GCP Project ID: ${
      GCP_PROJECT_ID || 'Not specified'
    }`,
  );

  console.log(
    `BigQuery Dataset: ${BIGQUERY_DATASET_ID}`,
  );

  console.log(
    `BigQuery Location: ${
      BIGQUERY_LOCATION || 'Auto'
    }`,
  );

  console.log(
    `Application URL: ${
      APP_BASE_URL || 'Derived from request'
    }`,
  );

  console.log(
    `WorkOS Redirect URI: ${
      WORKOS_REDIRECT_URI ||
      'Derived from request + /callback'
    }`,
  );

  if (
    !USE_MOCK_DATA &&
    !GCP_PROJECT_ID
  ) {
    console.error(
      '❌ USE_MOCK_DATA=false but GCP_PROJECT_ID is missing.',
    );

    process.exit(1);
  }

  if (
    AUTH_REQUIRED &&
    !USE_MOCK_AUTH
  ) {
    const missing: string[] = [];

    if (!WORKOS_API_KEY) {
      missing.push('WORKOS_API_KEY');
    }

    if (!WORKOS_CLIENT_ID) {
      missing.push('WORKOS_CLIENT_ID');
    }

    if (!WORKOS_COOKIE_PASSWORD) {
      missing.push(
        'WORKOS_COOKIE_PASSWORD',
      );
    }

    if (!CSRF_SECRET) {
      missing.push('CSRF_SECRET');
    }

    if (missing.length > 0) {
      console.error(
        `❌ Missing WorkOS variables: ${missing.join(
          ', ',
        )}`,
      );

      process.exit(1);
    }

    console.log(
      '✅ WorkOS credentials present.',
    );
  }

  if (CLOUD_SQL_ENABLED) {
    const missing: string[] = [];

    if (
      !CLOUD_SQL_INSTANCE_CONNECTION_NAME
    ) {
      missing.push(
        'CLOUD_SQL_INSTANCE_CONNECTION_NAME',
      );
    }

    if (!CLOUD_SQL_DATABASE) {
      missing.push(
        'CLOUD_SQL_DATABASE',
      );
    }

    if (!CLOUD_SQL_USER) {
      missing.push('CLOUD_SQL_USER');
    }

    if (!CLOUD_SQL_PASSWORD) {
      missing.push(
        'CLOUD_SQL_PASSWORD',
      );
    }

    if (missing.length > 0) {
      console.error(
        `❌ CLOUD_SQL_ENABLED=true but variables are missing: ${missing.join(
          ', ',
        )}`,
      );

      process.exit(1);
    }

    console.log(
      '✅ Cloud SQL configuration present.',
    );
  }

  if (GEMINI_API_KEY) {
    console.log(
      `✅ Gemini configuration present. Model: ${GEMINI_MODEL}`,
    );
  } else {
    console.warn(
      '⚠️ GEMINI_API_KEY is not configured.',
    );
  }

  console.log(
    '---------------------------------',
  );
}