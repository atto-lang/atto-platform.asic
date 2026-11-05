// Host-only parser regressions; NOT ASIC tapeout evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEvidence, parseEvidenceJson} from '../scripts/check-evidence.mjs';

const baseline = {
  schemaVersion: 1, stage: 'synthesis-only',
  sourceSha256: 'a'.repeat(64), rtlSha256: 'b'.repeat(64),
  toolchain: 'host-test', technology: 'not-fabricated', tapeoutReady: false,
};

test('escaped aliases of source identities cannot overwrite a matching field', () => {
  const h = 'a'.repeat(64);
  for (const raw of [
    '{"sourceSha256":"' + h + '","sour\\u0063eSha256":"' + h + '"}',
    '{"tapeoutReady":true,"\\u0074apeoutReady":false}',
    '{"stage":"signoff","st\\u0061ge":"synthesis-only"}',
  ]) {
    assert.throws(() => parseEvidenceJson(raw), /duplicate JSON member/);
  }
});

test('case-distinct keys are not collapsed into false duplicate identities', () => {
  const parsed = parseEvidenceJson('{"toolchain":"one","Toolchain":"two"}');
  assert.equal(parsed.toolchain, 'one');
  assert.equal(parsed.Toolchain, 'two');
  assert.throws(() => checkEvidence({...baseline, ...parsed}), /field/);
});

test('signoff-shaped manifest still cannot claim tapeout authorization', () => {
  const hash = 'c'.repeat(64);
  const signoff = {
    ...baseline, stage: 'signoff', staReportSha256: hash,
    drcReportSha256: hash, lvsReportSha256: hash, gdsSha256: hash,
    constraintsSha256: hash, pdkRevision: 'test-only',
  };
  assert.equal(checkEvidence(signoff), true);
  for (const claim of [true, 1, 'false', null]) {
    assert.throws(() => checkEvidence({...signoff, tapeoutReady: claim}), /tapeoutReady/);
  }
});
