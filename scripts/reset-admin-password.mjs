/**
 * Reset the password of the single existing Tools4Genz admin account used by
 * the currently running local frontend. This utility never creates users and
 * never calls or changes the one-time bootstrap endpoint.
 *
 * Run from the repository root:
 *   npx -y tsx scripts/reset-admin-password.mjs
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { hashPassword } from '../worker/src/utils/password.ts';

const FRONTEND_URL = 'http://localhost:5174';
const LOCAL_WORKER_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DATABASE_NAME = 'tools4genz-db';
const WRANGLER_CONFIG = 'worker/wrangler.toml';
const MIN_PASSWORD_LENGTH = 8;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[invalid email]';
  const visible = local.length > 1 ? `${local[0]}${'*'.repeat(Math.max(3, local.length - 2))}${local.at(-1)}` : `${local[0]}***`;
  return `${visible}@${domain}`;
}

function runWrangler(sql, targetFlag) {
  const windowsNpxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
  const executable = process.platform === 'win32' ? process.execPath : 'npx';
  const launcherArgs = process.platform === 'win32' ? [windowsNpxCli] : [];
  const result = spawnSync(executable, [...launcherArgs,
    'wrangler', 'd1', 'execute', DATABASE_NAME,
    targetFlag, '--config', WRANGLER_CONFIG,
    '--command', sql, '--json', '--yes',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) throw new Error('D1 operation failed. No credential data was printed.');
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('D1 returned an unexpected response.');
  }
}

function resultRows(output) {
  const executions = Array.isArray(output) ? output : [output];
  return executions.flatMap((execution) => Array.isArray(execution?.results) ? execution.results : []);
}

async function detectDatabaseTarget() {
  let source;
  try {
    const response = await fetch(`${FRONTEND_URL}/src/config/api.ts`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('configuration endpoint unavailable');
    source = await response.text();
  } catch {
    throw new Error(`Cannot verify the API used by ${FRONTEND_URL}. Start that frontend before resetting its Admin password.`);
  }

  const configured = source.match(/"VITE_API_BASE_URL"\s*:\s*"([^"]+)"/)?.[1];
  if (!configured) throw new Error('The running frontend does not expose a verifiable VITE_API_BASE_URL. Reset aborted.');

  let apiUrl;
  try { apiUrl = new URL(configured); }
  catch { throw new Error('The running frontend has an invalid API URL. Reset aborted.'); }

  const local = LOCAL_WORKER_HOSTS.has(apiUrl.hostname);
  return { apiUrl: apiUrl.origin, targetFlag: local ? '--local' : '--remote', label: local ? 'local D1' : 'production D1' };
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('An interactive terminal is required. Password input is never accepted through command-line arguments.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const finish = (error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };

    const onData = (character) => {
      if (character === '\u0003') return finish(new Error('Password reset cancelled.'));
      if (character === '\r' || character === '\n') return finish();
      if (character === '\u007f' || character === '\b') {
        if (value.length) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (character >= ' ') {
        value += character;
        process.stdout.write('•');
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error('This utility accepts no command-line password or account arguments.');
  }

  const target = await detectDatabaseTarget();
  const adminOutput = runWrangler(
    `SELECT id, email, role, status FROM admin_users ORDER BY id;`,
    target.targetFlag,
  );
  const admins = resultRows(adminOutput);

  if (admins.length === 0) throw new Error(`No existing Admin account was found in ${target.label}. Bootstrap was not invoked.`);
  if (admins.length !== 1) throw new Error(`Expected exactly one existing Admin account in ${target.label}; found ${admins.length}. Reset aborted without changes.`);

  const admin = admins[0];
  if (!Number.isInteger(Number(admin.id)) || typeof admin.email !== 'string') throw new Error('Existing Admin record is invalid. Reset aborted.');

  console.log('Tools4Genz — Admin Password Reset');
  console.log(`Frontend API: ${target.apiUrl}`);
  console.log(`Database target: ${target.label} (${DATABASE_NAME})`);
  console.log(`Existing Admin: ${maskEmail(admin.email)} [${admin.status}]`);
  console.log(`Password policy: minimum ${MIN_PASSWORD_LENGTH} characters`);

  const password = await readHidden('New password: ');
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  const confirmation = await readHidden('Confirm new password: ');
  if (password !== confirmation) throw new Error('Password confirmation does not match. No database changes were made.');

  const passwordHash = await hashPassword(password);
  const updatedAt = new Date().toISOString().replaceAll("'", "''");
  const adminId = Number(admin.id);
  const safeHash = passwordHash.replaceAll("'", "''");
  const updateSql = [
    `UPDATE admin_users SET password_hash = '${safeHash}', updated_at = '${updatedAt}' WHERE id = ${adminId};`,
    `SELECT changes() AS password_rows_updated;`,
    `DELETE FROM admin_sessions WHERE admin_user_id = ${adminId};`,
    `SELECT changes() AS sessions_revoked;`,
  ].join(' ');

  // Suppress Wrangler stdout/stderr for this operation so neither the password
  // hash nor the generated SQL can be echoed by the utility.
  const updateOutput = runWrangler(updateSql, target.targetFlag);
  const rows = resultRows(updateOutput);
  const updated = rows.find((row) => Object.hasOwn(row, 'password_rows_updated'))?.password_rows_updated;
  if (Number(updated) !== 1) throw new Error('The existing Admin password was not updated exactly once.');

  const verification = resultRows(runWrangler(
    `SELECT COUNT(*) AS remaining_sessions FROM admin_sessions WHERE admin_user_id = ${adminId};`,
    target.targetFlag,
  ));
  if (Number(verification[0]?.remaining_sessions) !== 0) throw new Error('Password changed, but existing Admin sessions could not be fully revoked.');

  console.log('Admin password updated successfully. All existing Admin sessions were revoked.');
  console.log(`Login email: ${admin.email}`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'Password reset failed.'));
