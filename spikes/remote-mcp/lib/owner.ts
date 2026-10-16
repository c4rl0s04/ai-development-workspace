import type { User } from '@supabase/supabase-js';

export function isOwner(user: User | null, ownerId: string) {
  // Auth's JSON `id` maps to auth.identities.provider_id; identity_id is its UUID.
  return !!user && !user.is_anonymous && user.identities?.some(
    identity => identity.provider === 'github' && identity.id === ownerId,
  ) === true;
}
