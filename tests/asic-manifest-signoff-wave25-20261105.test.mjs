// Schema evidence is not authenticated physical design or tapeout authorization.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEvidence as check,parseEvidenceJson as parse} from '../scripts/check-evidence.mjs';

const sha=x=>x.repeat(64);
const base=()=>({schemaVersion:1,stage:'synthesis-only',sourceSha256:sha('a'),
 rtlSha256:sha('b'),toolchain:'yosys',technology:'generic-unmapped',tapeoutReady:false});
const reports=()=>({staReportSha256:sha('c'),drcReportSha256:sha('d'),
 lvsReportSha256:sha('e'),gdsSha256:sha('f'),constraintsSha256:sha('0'),
 pdkRevision:'foundry-locked-revision'});

test('every exact signoff report field is necessary but never promotes tapeoutReady',()=>{
 const signoff={...base(),stage:'signoff',...reports()};
 assert.equal(check(signoff),true);
 for(const field of Object.keys(reports())){
  const bad={...signoff};delete bad[field];
  assert.throws(()=>check(bad),/signoff requires/);
 }
 for(const promoted of [true,1,'false',null]){
  assert.throws(()=>check({...signoff,tapeoutReady:promoted}),/tapeoutReady/);
 }
});

test('lower stages cannot borrow the authority of signoff-only report fields',()=>{
 for(const stage of ['synthesis-only','place-route']){
  assert.equal(check({...base(),stage}),true);
  for(const field of Object.keys(reports()))
   assert.throws(()=>check({...base(),stage,[field]:reports()[field]}),/manifest field/);
 }
});

test('report digests and labels have canonical lexical limits',()=>{
 const valid={...base(),stage:'signoff',...reports()};
 for(const field of ['staReportSha256','drcReportSha256','lvsReportSha256','gdsSha256','constraintsSha256']){
  for(const value of [sha('A'),'f'.repeat(63),'f'.repeat(65),1,null])
   assert.throws(()=>check({...valid,[field]:value}),/exact SHA-256/);
 }
 for(const label of ['', ' ', 'a\nb', 'x'.repeat(257)])
  assert.throws(()=>check({...valid,pdkRevision:label}),/pdkRevision/);
});

test('escaped duplicate keys cannot hide a contradictory tapeout claim',()=>{
 const raw=JSON.stringify(base());
 const altered=raw.replace('"tapeoutReady":false',
  '"\\u0074apeoutReady":true,"tapeoutReady":false');
 assert.throws(()=>parse(altered),/duplicate JSON member/);
 assert.equal(check(parse(raw)),true);
 assert.throws(()=>check({...base(),extra:'inert'}),/manifest field/);
});
