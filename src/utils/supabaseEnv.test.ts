import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupabaseEnv } from './supabaseEnv';

test('resolveSupabaseEnv flags missing or placeholder env vars', () => {
  const empty = resolveSupabaseEnv({});
  assert.equal(empty.isConfigured, false);
  assert.deepEqual(empty.missingVars, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']);

  const placeholder = resolveSupabaseEnv({
    VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'your-supabase-publishable-or-anon-key',
  });
  assert.equal(placeholder.isConfigured, false);
  assert.equal(placeholder.missingVars.length, 2);
});

test('resolveSupabaseEnv accepts valid URL and publishable or anon key', () => {
  const validPublishable = resolveSupabaseEnv({
    VITE_SUPABASE_URL: 'https://xibgmucfyfvxllnajutg.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo_key_123',
  });
  assert.equal(validPublishable.isConfigured, true);
  assert.deepEqual(validPublishable.missingVars, []);
  assert.equal(validPublishable.authEmailDomain, 'teman.local');

  const validAnonFallback = resolveSupabaseEnv({
    VITE_SUPABASE_URL: 'https://xibgmucfyfvxllnajutg.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    VITE_AUTH_EMAIL_DOMAIN: 'workspace.teman.id',
  });
  assert.equal(validAnonFallback.isConfigured, true);
  assert.equal(validAnonFallback.authEmailDomain, 'workspace.teman.id');
});
