import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  projectInput,
  projectEdit,
  taskInput,
  taskEdit,
  repositoryUrl,
  parse,
  WorkspaceError,
} from '../../src/domain/workspace';
import {
  workspaceService,
  type WorkspaceStore,
} from '../../src/application/workspace';
import {
  authorizeOwner,
  authorizeOwnerMutation,
} from '../../src/application/auth/owner';

test('workspace inputs normalize identifiers and repositories and reject unsupported fields', () => {
  assert.deepEqual(
    parse(projectInput, {
      name: ' Example ',
      key: 'els',
      repositoryUrl: 'https://github.com/OWNER/Example.git/',
    }),
    {
      name: 'Example',
      key: 'ELS',
      description: '',
      repositoryUrl: 'https://github.com/owner/example',
    },
  );
  assert.equal(
    parse(projectInput, { name: 'A', key: 'AB' }).repositoryUrl,
    null,
  );
  for (const value of [
    'http://github.com/a/b',
    'https://evil.example/a/b',
    'https://github.com/a/b?token=x',
    'https://user:pass@github.com/a/b',
    'https://github.com/a/..',
    'https://github.com/a/b/tree/main',
    'https://github.com/a/.git',
  ])
    assert.throws(() => parse(repositoryUrl, value), WorkspaceError);
  for (const input of [
    { name: '', key: 'AB' },
    { name: 'A', key: '1A' },
    { name: 'A', key: 'AB', ownerId: 'spoof' },
    { name: 'A', key: 'AB', description: 'x'.repeat(10001) },
  ])
    assert.throws(() => parse(projectInput, input), WorkspaceError);
  assert.throws(
    () => parse(projectEdit, { name: 'A', key: 'NEW', revision: 1 }),
    WorkspaceError,
  );
  for (const input of [
    { title: ' ' },
    { title: 'A', status: 'done' },
    { title: 'A', projectId: 'spoof' },
  ])
    assert.throws(() => parse(taskInput, input), WorkspaceError);
  assert.throws(
    () => parse(taskEdit, { title: 'A', revision: 0 }),
    WorkspaceError,
  );
});

test('every workspace operation independently authorizes before reaching persistence', async () => {
  let reached = 0;
  const request = new Request('https://workspace.example/api/projects', {
    method: 'POST',
    headers: { Origin: 'https://workspace.example' },
  });
  for (const id of [null, '2']) {
    const reader = async () =>
      id ? { userId: 'verified', anonymous: false, githubIds: [id] } : null;
    const service = workspaceService(
      {
        requireOwner: () => authorizeOwner(reader, '159822857'),
        requireOwnerMutation: (r) =>
          authorizeOwnerMutation(
            r,
            'https://workspace.example',
            reader,
            '159822857',
          ),
      },
      () => {
        reached++;
        throw new Error('Forbidden persistence access');
      },
    );
    for (const operation of [
      () => service.listProjects(),
      () => service.getProject('invalid'),
      () => service.getProjectSummary('invalid'),
      () => service.getTask('invalid', 'invalid'),
      () => service.createProject(request, {}),
      () => service.editProject(request, 'invalid', {}),
      () => service.createTask(request, 'invalid', {}),
      () => service.editTask(request, 'invalid', 'invalid', {}),
    ])
      await assert.rejects(operation, /Access could not be authorized/);
  }
  assert.equal(reached, 0);
});

test('services pass only verified owner identity; client owner/status overrides cannot reach store', async () => {
  let reached = 0;
  const unexpected = async (): Promise<never> => {
    throw new Error('Unexpected persistence call');
  };
  const store: WorkspaceStore = {
    getProject: unexpected,
    getProjectSummary: unexpected,
    createProject: unexpected,
    editProject: unexpected,
    getTask: unexpected,
    createTask: unexpected,
    editTask: unexpected,
    listProjects: async (owner: string) => {
      assert.equal(owner, '159822857');
      reached++;
      return { items: [], hasMore: false };
    },
  };
  const auth = {
    requireOwner: async () => ({
      userId: 'verified',
      githubProviderId: '159822857',
    }),
    requireOwnerMutation: async () => ({
      userId: 'verified',
      githubProviderId: '159822857',
    }),
  };
  const service = workspaceService(auth, () => store);
  await service.listProjects();
  assert.equal(reached, 1);
  await assert.rejects(
    () =>
      service.createProject(new Request('http://local'), {
        name: 'A',
        key: 'AB',
        owner: '2',
      }),
    WorkspaceError,
  );
});
