import {
  Pool,
  PoolClient,
  QueryResult,
  QueryResultRow,
} from 'pg';

import * as env from '../config/env';

let pool: Pool | null = null;

function requireValue(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(
      `${name} is required when CLOUD_SQL_ENABLED=true.`,
    );
  }

  return value;
}

export function getCloudSqlPool(): Pool {
  if (pool) {
    return pool;
  }

  const host =
    process.env.CLOUD_SQL_HOST?.trim() ||
    (env.CLOUD_SQL_INSTANCE_CONNECTION_NAME
      ? `/cloudsql/${env.CLOUD_SQL_INSTANCE_CONNECTION_NAME}`
      : undefined);

  pool = new Pool({
    host: requireValue('Cloud SQL host', host),
    port: Number(process.env.CLOUD_SQL_PORT || 5432),
    database: requireValue(
      'CLOUD_SQL_DATABASE',
      env.CLOUD_SQL_DATABASE,
    ),
    user: requireValue(
      'CLOUD_SQL_USER',
      env.CLOUD_SQL_USER,
    ),
    password: requireValue(
      'CLOUD_SQL_PASSWORD',
      env.CLOUD_SQL_PASSWORD,
    ),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (error) => {
    console.error(
      '[Cloud SQL] Unexpected idle client error:',
      error,
    );
  });

  return pool;
}

export async function query<
  T extends QueryResultRow = QueryResultRow,
>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getCloudSqlPool().query<T>(text, params);
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getCloudSqlPool().connect();

  try {
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
}