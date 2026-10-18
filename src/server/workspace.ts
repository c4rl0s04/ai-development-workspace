import 'server-only';
import { workspaceService } from '../application/workspace';
import { requireOwner, requireOwnerMutation } from './auth';
import { connectDatabase } from '../infrastructure/db/connection';
import { postgresWorkspaceStore } from '../infrastructure/db/workspace-store';
let connection: ReturnType<typeof connectDatabase> | undefined;
// Pool creation is lazy and only reached after service authorization.
export const workspace = workspaceService(
  { requireOwner, requireOwnerMutation },
  () => {
    connection ??= connectDatabase(process.env.DATABASE_URL);
    return postgresWorkspaceStore(connection.db);
  },
);
