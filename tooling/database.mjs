// Credentials are passed via environment, never CLI arguments or log output.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

try { process.loadEnvFile('.env'); } catch {}
const mode = process.argv[2];
const file = process.argv[3];
const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
const env = {
  ...process.env,
  PGHOST: connection.hostname,
  PGPORT: connection.port || '5432',
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGDATABASE: connection.pathname.slice(1),
  PGSSLMODE: 'require',
  PGCONNECT_TIMEOUT: '8',
};
if (mode === 'audit') env.PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=15000';
else if (mode !== 'apply') throw new Error('Use audit or apply with an SQL file');
let sql = readFileSync(file, 'utf8');
if (mode === 'apply') {
  const filename = basename(file);
  const version = filename.match(/^(\d{14})_[a-z0-9_]+\.sql$/)?.[1];
  if (!version) throw new Error('A generated versioned migration file is required');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const emails = [...new Set([process.env.ADMIN_EMAIL, process.env.STAFF_EMAIL].filter(Boolean).map(email => email.trim().toLowerCase()))];
  if (!emails.length) throw new Error('Configured staff accounts are required for initial provisioning');
  const json = JSON.stringify(emails).replaceAll("'", "''");
  sql = `
create schema if not exists crm_private;
create table if not exists crm_private.schema_migrations(version text primary key,checksum text not null,name text not null,applied_at timestamptz not null default now());
revoke all on crm_private.schema_migrations from public,anon,authenticated;
select exists(select 1 from crm_private.schema_migrations where version='${version}') as already_applied \\gset
\\if :already_applied
do $check$ begin if not exists(select 1 from crm_private.schema_migrations where version='${version}' and checksum='${checksum}') then raise exception 'Migration checksum mismatch'; end if; end $check$;
\\echo Migration already applied; checksum verified.
\\else
do $bootstrap$ begin
  if (select count(*) from auth.users where lower(email) in (select value from jsonb_array_elements_text('${json}'::jsonb))) <> ${emails.length} then raise exception 'Configured staff account missing in Auth'; end if;
  perform set_config('crm.bootstrap_emails', '${json}', true);
end $bootstrap$;
${sql}
insert into crm_private.schema_migrations(version,checksum,name) values('${version}','${checksum}','${filename}');
\\endif
`;
}
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', ...(mode === 'apply' ? ['--single-transaction'] : [])], {
  env, input: sql, encoding: 'utf8',
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
