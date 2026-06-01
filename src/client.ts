/**
 * Factory: builds an LkwClient configured from the active profile
 * in ~/.lkw/config.json.
 */
import { LkwClient } from '@lkw-ai/sdk';
import { getActiveProfile } from './config.js';

export function makeClient(): LkwClient {
  const profile = getActiveProfile();
  return new LkwClient({
    apiBaseUrl: profile.apiBaseUrl,
    bearerToken: profile.token,
    userAgent: `@lkw-ai/cli`,
  });
}
