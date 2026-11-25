import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkEvidence,parseEvidenceJson} from '../scripts/check-evidence.mjs';
const h=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

const PROVENANCE_KEYS=[
  'schemaVersion','sourceRepo','sourcePath','sourceSha256','compilerFixturePath',
  'rtlSha256','status','siliconQualified','tapeoutReady','sourceCommit','rtlGitBlobSha'
];
function parsePinnedProvenance(raw) {
  // The parser already rejects duplicate keys. Require canonical serialization
  // too, so escaped-key aliases and ambiguous physical claims fail closed.
  const p=parseEvidenceJson(raw);
  assert.equal(raw,JSON.stringify(p,null,2)+'\n','noncanonical provenance bytes');
  assert.deepEqual(Object.keys(p).sort(),[...PROVENANCE_KEYS].sort(),
    'provenance must contain precisely the expected members');
  assert.equal(p.schemaVersion,1);
  assert.equal(p.sourceRepo,'ores-truffle-oreslang/oreslang-source.hdl');
  assert.equal(p.sourcePath,'tests/fixtures/add8.ores');
  assert.equal(p.sourceSha256,'26d446e1d903edca9691d37fc55c946033b590687468449103507c61b7026e80');
  assert.equal(p.compilerFixturePath,'tests/fixtures/add8.generated.sv');
  assert.equal(p.status,'pre-pdk-generic-logic-only');
  assert.equal(p.siliconQualified,false);
  assert.equal(p.tapeoutReady,false);
  return p;
}

test('ASIC inputs are byte-exact pinned compiler-generated RTL',()=>{
  const p=parsePinnedProvenance(readFileSync('generated/provenance.json','utf8'));
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

test('pinned ASIC provenance denies duplicate and escaped evidence keys',()=>{
  const raw=readFileSync('generated/provenance.json','utf8');
  const duplicate=raw.replace('"tapeoutReady": false,',
    '"tapeoutReady": true,\n  "tapeoutReady": false,');
  assert.throws(()=>parsePinnedProvenance(duplicate),/duplicate/);
  const alias=raw.replace('"tapeoutReady"',
    '"tapeout\\u0052eady"');
  assert.throws(()=>parsePinnedProvenance(alias),/noncanonical/);
});
test('pinned ASIC provenance denies extra/missing fields and false physical claims',()=>{
  const p=JSON.parse(readFileSync('generated/provenance.json','utf8'));
  for(const mutation of [
    {...p,foundrySignoff:true},
    {...p,sourceRepo:'attacker/hdl'},
    {...p,siliconQualified:true},
    {...p,tapeoutReady:true}
  ])
    assert.throws(()=>parsePinnedProvenance(JSON.stringify(mutation,null,2)+'\n'));
  const missing={...p};
  delete missing.sourcePath;
  assert.throws(()=>parsePinnedProvenance(JSON.stringify(missing,null,2)+'\n'));
  assert.throws(()=>parsePinnedProvenance(JSON.stringify(p)),/noncanonical/);
});
