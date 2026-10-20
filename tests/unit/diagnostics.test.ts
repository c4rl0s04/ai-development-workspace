import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WorkspaceError } from '../../src/domain/workspace';
import { AccessError } from '../../src/application/auth/owner';
import {
  databaseFailure,
  markFailure,
  reportFailure,
  type Operation,
} from '../../src/infrastructure/diagnostics';

test('diagnostics omit expected business and access failures', () => {
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(value);
  };
  try {
    for (const code of [
      'validation',
      'conflict',
      'unique_conflict',
      'not_found',
    ] as const)
      assert.equal(
        reportFailure(
          new WorkspaceError(code, 'business message'),
          'projects.create',
        ),
        undefined,
      );
    for (const reason of ['unauthenticated', 'forbidden', 'origin'] as const)
      assert.equal(
        reportFailure(new AccessError(reason), 'tasks.edit'),
        undefined,
      );
    assert.deepEqual(logs, []);
  } finally {
    console.error = original;
  }
});

test('database normalization retains only allowlisted failure classification', () => {
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(value);
  };
  const sensitive = [
    'password-sentinel',
    'postgresql://private-user:password-sentinel@private-host/private-db',
    'Bearer token-sentinel',
    'aw-auth=cookie-sentinel',
    'SELECT payload-sentinel',
    'provider-data-sentinel',
  ];
  try {
    for (const [code, category, state] of [
      ['ECONNREFUSED', 'database_connection', undefined],
      ['CERT_HAS_EXPIRED', 'database_tls', undefined],
      ['42501', 'database_permission', '42501'],
      ['42P01', 'database_query', '42P01'],
      ['55P03', 'database_timeout', '55P03'],
      ['unknown-sensitive-code', 'database_failure', undefined],
    ]) {
      const raw = Object.assign(new Error(sensitive.join(' ')), {
        code,
        detail: sensitive,
        query: sensitive,
        cause: { provider: sensitive },
      });
      const safe = databaseFailure(
        new WorkspaceError('unavailable', 'Safe existing message.'),
        new Error('wrapper', { cause: raw }),
      );
      assert.equal(safe.cause, undefined);
      const id = reportFailure(safe, 'projects.get');
      const event = JSON.parse(logs.at(-1) ?? '');
      assert.equal(event.correlationId, id);
      assert.equal(event.category, category);
      assert.equal(event.sqlState, state);
      assert.deepEqual(
        Object.keys(event).sort(),
        [
          'category',
          'correlationId',
          'event',
          'operation',
          ...(state ? ['sqlState'] : []),
        ].sort(),
      );
      assert.equal(safe.message, 'Safe existing message.');
    }
    for (const value of sensitive) assert.ok(!logs.join('').includes(value));
    assert.ok(!logs.join('').includes('unknown-sensitive-code'));
  } finally {
    console.error = original;
  }
});

test('unknown exceptions, invalid operation values and hostile causes cannot inject logs', () => {
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(value);
  };
  try {
    let accessed = 0;
    const raw = {
      get code() {
        accessed++;
        throw new Error('secret getter');
      },
      toJSON() {
        throw new Error('secret serializer');
      },
    };
    Object.defineProperty(raw, 'cause', { value: raw });
    const failure = databaseFailure(
      new WorkspaceError('unavailable', 'Safe.'),
      raw,
    );
    reportFailure(failure, 'payload-sentinel' as Operation);
    reportFailure(
      Object.assign(new Error('secret exception'), {
        toJSON() {
          throw new Error();
        },
      }),
      'tasks.create',
    );
    reportFailure('secret thrown primitive', 'tasks.edit');
    assert.equal(accessed, 0);
    assert.equal(JSON.parse(logs[0]).operation, 'unknown');
    assert.equal(JSON.parse(logs[0]).category, 'database_failure');
    assert.equal(JSON.parse(logs[1]).category, 'unexpected');
    assert.ok(!logs.join('').includes('secret'));
    assert.ok(!logs.join('').includes('payload-sentinel'));
  } finally {
    console.error = original;
  }
});

test('references are server generated and independent; configuration/auth failures are classified', () => {
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(value);
  };
  try {
    const ids = [
      reportFailure(
        markFailure(
          new WorkspaceError('unavailable', 'Safe.'),
          'database_role',
        ),
        'projects.list',
      ),
      reportFailure(
        markFailure(
          new WorkspaceError('unavailable', 'Safe.'),
          'database_configuration',
        ),
        'projects.summary',
      ),
      reportFailure(new AccessError('unavailable'), 'tasks.get'),
    ];
    assert.equal(new Set(ids).size, 3);
    for (const id of ids) assert.match(id ?? '', /^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    assert.deepEqual(
      logs.map((line) => JSON.parse(line).category),
      ['database_role', 'database_configuration', 'authentication_unavailable'],
    );
  } finally {
    console.error = original;
  }
});

test('diagnostic sink failure does not replace the original failure outcome', () => {
  const original = console.error;
  console.error = () => {
    throw new Error('sink unavailable');
  };
  try {
    assert.ok(reportFailure(new Error('sensitive cause'), 'tasks.get'));
  } finally {
    console.error = original;
  }
});
