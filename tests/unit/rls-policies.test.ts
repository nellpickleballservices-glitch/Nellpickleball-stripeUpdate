import { describe, it, expect } from 'vitest'

// Stub: will use Supabase test client with anon key to verify RLS
// Tests run against a real Supabase project (requires NEXT_PUBLIC_SUPABASE_URL etc.)
describe('RLS policies', () => {
  describe('profiles table', () => {
    it.todo('RLS is enabled on profiles table')
    it.todo('user can read their own profile row')
    it.todo('user cannot read another user\'s profile row')
  })
  describe('memberships table', () => {
    it.todo('RLS is enabled on memberships table')
    it.todo('user can read their own membership row')
    it.todo('user cannot read another user\'s membership row')
  })
  describe('session_signups table', () => {
    it.todo('RLS is enabled on session_signups table')
    it.todo('anon cannot read any sign-up rows (rosters hold other players\' contact info)')
    it.todo('service role can read and write sign-up rows')
  })
})
