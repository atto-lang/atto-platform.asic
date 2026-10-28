// Schema admission only. Even a fully populated manifest is NOT authenticated
// physical-design evidence or an ASIC tapeout/signoff approval.
import {openSync, closeSync, fstatSync, readSync, constants} from 'node:fs';

const SHA256 = /^[0-9a-f]{64}$/;
const BASE_KEYS = new Set(['schemaVersion', 'stage', 'sourceSha256', 'rtlSha256',
  'toolchain', 'technology', 'tapeoutReady']);
const SIGNOFF_KEYS = ['staReportSha256', 'drcReportSha256', 'lvsReportSha256',
  'gdsSha256', 'pdkRevision', 'constraintsSha256'];
const MAX_MANIFEST_BYTES = 65536;

function nonemptyBounded(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.length <= 256 && !/[\x00-\x1f\x7f]/.test(value);
}

export function checkEvidence(obj) {
  if (!obj || Array.isArray(obj) || typeof obj !== 'object' ||
      obj.schemaVersion !== 1 ||
      !['synthesis-only', 'place-route', 'signoff'].includes(obj.stage)) {
    throw Error('bad schema/stage');
  }
  const allowed = new Set([...BASE_KEYS, ...(obj.stage === 'signoff' ? SIGNOFF_KEYS : [])]);
  if (Object.keys(obj).some(key => !allowed.has(key)) ||
      [...allowed].some(key => !Object.hasOwn(obj, key))) {
    throw Error(obj.stage === 'signoff' ? 'signoff requires exact report fields' : 'missing/unknown manifest field');
  }
  for (const key of ['sourceSha256', 'rtlSha256']) {
    if (typeof obj[key] !== 'string' || !SHA256.test(obj[key])) {
      throw Error(key + ' requires exact lowercase SHA-256');
    }
  }
  for (const key of ['toolchain', 'technology']) {
    if (!nonemptyBounded(obj[key])) throw Error('invalid ' + key);
  }
  if (obj.stage === 'signoff') {
    for (const key of SIGNOFF_KEYS.filter(key => key !== 'pdkRevision')) {
      if (typeof obj[key] !== 'string' || !SHA256.test(obj[key])) {
        throw Error('signoff requires exact SHA-256 ' + key);
      }
    }
    if (!nonemptyBounded(obj.pdkRevision)) throw Error('signoff requires pdkRevision');
  }
  // No level of this shape-only checker grants tapeout authorization.
  if (obj.tapeoutReady !== false) throw Error('tapeoutReady must be explicitly false');
  return true;
}


// The accepted manifest schema is flat. JSON.parse alone silently takes the
// final value for duplicate member names, allowing contradictory claims.
// Scan quoted tokens after syntax validation and reject duplicate key names,
// including names that differ only by JSON escapes (e.g. "\u0074apeoutReady").
export function parseEvidenceJson(content) {
  const parsed = JSON.parse(content);
  const keys = new Set();
  for (let i = 0; i < content.length; ++i) {
    if (content[i] !== '"') continue;
    const start = i++;
    for (; i < content.length; ++i) {
      if (content[i] === '\\') { ++i; continue; }
      if (content[i] === '"') break;
    }
    let next = i + 1;
    while (next < content.length && /\s/.test(content[next])) ++next;
    if (content[next] !== ':') continue;
    const key = JSON.parse(content.slice(start, i + 1));
    if (keys.has(key)) throw Error('duplicate JSON member: ' + key);
    keys.add(key);
  }
  return parsed;
}

export function readEvidence(path) {
  if (typeof path !== 'string' || path.length === 0) throw Error('manifest path required');
  // Linux CI runs this parser. Do not silently weaken no-follow admission.
  if (typeof constants.O_NOFOLLOW !== 'number' || typeof constants.O_NONBLOCK !== 'number') {
    throw Error('safe regular-file admission unsupported');
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size < 1 || st.size > MAX_MANIFEST_BYTES) {
      throw Error('manifest must be a bounded regular file');
    }
    const bytes = Buffer.allocUnsafe(MAX_MANIFEST_BYTES + 1);
    let used = 0;
    while (used < bytes.length) {
      const got = readSync(fd, bytes, used, bytes.length - used, null);
      if (got === 0) break;
      used += got;
    }
    if (used === 0 || used > MAX_MANIFEST_BYTES) throw Error('manifest exceeds 64 KiB');
    return parseEvidenceJson(bytes.toString('utf8', 0, used));
  } finally {
    closeSync(fd);
  }
}

if (process.argv[1]?.endsWith('/check-evidence.mjs')) {
  try {
    if (process.argv.length !== 3) throw Error('usage: node scripts/check-evidence.mjs MANIFEST.json');
    checkEvidence(readEvidence(process.argv[2]));
    console.log('ASIC_MANIFEST_SCHEMA_PASS_ONLY');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
