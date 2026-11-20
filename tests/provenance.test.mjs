import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkEvidence} from '../scripts/check-evidence.mjs';
const h=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
test('ASIC inputs are byte-exact pinned compiler-generated RTL',()=>{
  const p=JSON.parse(readFileSync('generated/provenance.json','utf8'));
  assert.equal(h('generated/add8.ores'),p.sourceSha256);
  assert.equal(p.sourceCommit,'2be4899ec3ad2e8dd38d6514d06e38d3d81a6b13');
  assert.equal(p.rtlGitBlobSha,'93f75db8bf1725a7fe0f1150f1c949f8919863ce');
  assert.equal(h('generated/add8.generated.sv'),p.rtlSha256);
  assert.equal(p.rtlSha256,'7888f715405fb1207ee4988d9b9cf9cd03ecc9eeca58b85782654d46104e01cd');
  assert.equal(p.siliconQualified,false);
  assert.equal(p.tapeoutReady,false);
});
test('stage and claims are fail-closed',()=>{
  const m={schemaVersion:1,stage:'synthesis-only',sourceSha256:'26d446e1d903edca9691d37fc55c946033b590687468449103507c61b7026e80',rtlSha256:'7888f715405fb1207ee4988d9b9cf9cd03ecc9eeca58b85782654d46104e01cd',toolchain:'yosys',technology:'generic-unmapped',tapeoutReady:false};
  assert.equal(checkEvidence(m),true);
  assert.throws(()=>checkEvidence({...m,stage:'signoff'}),/signoff/);
  assert.throws(()=>checkEvidence({...m,tapeoutReady:true}),/tapeout/);
  assert.throws(()=>checkEvidence({...m,stage:'fake'}),/schema/);
});
