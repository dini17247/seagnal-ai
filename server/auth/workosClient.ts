import { WorkOS } from '@workos-inc/node';
import * as env from '../config/env';

let workos: WorkOS | null = null;

if (env.WORKOS_API_KEY) {
  try {
    workos = new WorkOS(env.WORKOS_API_KEY, {
      clientId: env.WORKOS_CLIENT_ID,
    });
    console.log('💼 WorkOS Client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ WorkOS Client initialization failed:', err);
  }
} else {
  console.log('ℹ️ WorkOS API key is not configured.');
}

export { workos };
