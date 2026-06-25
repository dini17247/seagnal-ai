import { WorkOS } from '@workos-inc/node';
import * as env from '../config/env';

let workos: WorkOS | null = null;

if (env.WORKOS_API_KEY) {
  try {
    workos = new WorkOS(env.WORKOS_API_KEY, {
      clientId: env.WORKOS_CLIENT_ID,
    });

    console.log('✅ WorkOS client initialized.');
  } catch (error) {
    console.error(
      '❌ WorkOS client initialization failed:',
      error
    );
  }
} else {
  console.warn(
    '⚠️ WORKOS_API_KEY is not configured.'
  );
}

export { workos };