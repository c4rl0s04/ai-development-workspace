export type VerifiedIdentity = {
  userId: string;
  anonymous: boolean;
  githubIds: readonly string[];
};

export type Owner = { userId: string; githubProviderId: string };
export type IdentityReader = () => Promise<VerifiedIdentity | null>;

export class AccessError extends Error {
  constructor(
    public readonly reason:
      | 'unauthenticated'
      | 'forbidden'
      | 'unavailable'
      | 'origin',
  ) {
    super('Access could not be authorized');
  }
}

// The reader must be a server-owned adapter, never identity supplied by a request.
export async function authorizeOwner(
  readIdentity: IdentityReader,
  ownerId: string,
): Promise<Owner> {
  const identity = await readIdentity();
  if (!identity) throw new AccessError('unauthenticated');
  if (identity.anonymous || !identity.githubIds.includes(ownerId))
    throw new AccessError('forbidden');
  return { userId: identity.userId, githubProviderId: ownerId };
}

export function assertMutationOrigin(request: Request, appOrigin: string) {
  if (
    request.method !== 'POST' ||
    request.headers.get('origin') !== appOrigin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AccessError('origin');
}

export async function authorizeOwnerMutation(
  request: Request,
  appOrigin: string,
  readIdentity: IdentityReader,
  ownerId: string,
) {
  assertMutationOrigin(request, appOrigin);
  return authorizeOwner(readIdentity, ownerId);
}
