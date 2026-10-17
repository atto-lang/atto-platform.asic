import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEvidence} from '../scripts/check-evidence.mjs';
const base={schemaVersion:1,stage:'synthesis-only',sourceSha256:'demo-only',rtlSha256:'demo-only',toolchain:'yosys',technology:'unmapped',tapeoutReady:false};
test('synthesis-only evidence schema accepted',()=>assert.equal(checkEvidence(base),true));
test('unverified tapeout forbidden',()=>assert.throws(()=>checkEvidence({...base,tapeoutReady:true}),/tapeout/));
test('signoff needs separately hashed reports',()=>assert.throws(()=>checkEvidence({...base,stage:'signoff'}),/requires/));
test('bad stage forbidden',()=>assert.throws(()=>checkEvidence({...base,stage:'silicon-fabricated'}),/schema/));
