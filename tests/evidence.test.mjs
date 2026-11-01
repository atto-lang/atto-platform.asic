import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, symlinkSync, rmSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkEvidence, readEvidence} from '../scripts/check-evidence.mjs';

const base = {schemaVersion:1, stage:'synthesis-only', sourceSha256:'a'.repeat(64),
  rtlSha256:'b'.repeat(64), toolchain:'yosys', technology:'unmapped', tapeoutReady:false};
const reports = {staReportSha256:'c'.repeat(64), drcReportSha256:'d'.repeat(64),
  lvsReportSha256:'e'.repeat(64), gdsSha256:'f'.repeat(64),
  constraintsSha256:'0'.repeat(64), pdkRevision:'test-process-revision'};

test('bounded synthesis-only and place-route manifest shapes accepted without promotion', () => {
  assert.equal(checkEvidence(base), true);
  assert.equal(checkEvidence({...base,stage:'place-route'}), true);
});
test('stage-specific signoff shape is not physical proof', () => {
  assert.equal(checkEvidence({...base,stage:'signoff',...reports}),true);
  for (const key of Object.keys(reports)) {
    assert.throws(() => checkEvidence({...base,stage:'signoff',...reports,[key]:''}),/requires/);
  }
});
test('rejects missing, placeholder, noncanonical or wrongly typed digests', () => {
  for (const field of ['sourceSha256','rtlSha256']) {
    for (const value of ['demo-only','A'.repeat(64),'f'.repeat(63),'f'.repeat(65),null,1]) {
      assert.throws(() => checkEvidence({...base,[field]:value}),/SHA-256/);
    }
  }
});
test('tapeout must be explicitly false, never a truthy substitute', () => {
  for (const tapeoutReady of [true,'true',1,0,null,undefined]) {
    assert.throws(() => checkEvidence({...base,tapeoutReady}),/tapeoutReady/);
  }
});
test('rejects unknown fields, signoff-only fields at lower stages and bad labels', () => {
  assert.throws(() => checkEvidence({...base, unknown:'true'}),/field/);
  assert.throws(() => checkEvidence({...base,staReportSha256:'a'.repeat(64)}),/field/);
  assert.throws(() => checkEvidence({...base,toolchain:'\n'}),/toolchain/);
  assert.throws(() => checkEvidence({...base,technology:'a'.repeat(257)}),/technology/);
  assert.throws(() => checkEvidence({...base,stage:'tapeout'}),/schema/);
});

test('rejects duplicate JSON members including escaped aliases and nested members', () => {
  const root=mkdtempSync(join(tmpdir(),'asic-dupe-'));
  try {
    const file=join(root,'manifest.json');
    const raw=JSON.stringify(base);
    writeFileSync(file,raw.replace('"tapeoutReady":false',
      '"tapeoutReady":true,"tapeoutReady":false'));
    assert.throws(()=>readEvidence(file),/duplicate JSON member/);
    writeFileSync(file,raw.replace('"tapeoutReady":false',
      '"\\u0074apeoutReady":true,"tapeoutReady":false'));
    assert.throws(()=>readEvidence(file),/duplicate JSON member/);
    writeFileSync(file,'{"extra":{"nested":1,"nested":2}}');
    assert.throws(()=>readEvidence(file),/duplicate JSON member/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('descriptor-bound CLI input rejects symlink, directory and oversize', () => {
  const root=mkdtempSync(join(tmpdir(),'asic-manifest-'));
  try {
    const valid=join(root,'ok.json');
    writeFileSync(valid,JSON.stringify(base));
    assert.deepEqual(readEvidence(valid),base);
    const sym=join(root,'link.json');
    symlinkSync(valid,sym);
    assert.throws(()=>readEvidence(sym));
    const dir=join(root,'dir');
    mkdirSync(dir);
    assert.throws(()=>readEvidence(dir),/bounded regular file/);
    const huge=join(root,'huge.json');
    writeFileSync(huge,'x'.repeat(65537));
    assert.throws(()=>readEvidence(huge),/bounded regular file/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('invalid UTF-8 in a provenance field fails rather than normalizing to replacement characters', () => {
  const root=mkdtempSync(join(tmpdir(),'asic-utf8-'));
  try {
    const manifest=join(root,'evidence.json');
    for (const sequence of [[0xc3,0x28], [0xc0,0xaf], [0xed,0xa0]]) {
      const raw=Buffer.from(JSON.stringify(base),'utf8');
      const at=raw.indexOf(Buffer.from('yosys'));
      assert.ok(at>=0);
      raw[at]=sequence[0]; raw[at+1]=sequence[1];
      writeFileSync(manifest,raw);
      assert.throws(()=>readEvidence(manifest), /encoded|UTF-8|valid|encoding/i);
    }
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('admitted UTF-8 provenance labels remain exact, without lossy normalization', () => {
  const root=mkdtempSync(join(tmpdir(),'asic-utf8-valid-'));
  try {
    const manifest=join(root,'evidence.json');
    const record={...base,technology:'FinFET \\u03bc-test',toolchain:'Synthesis \\u03bb-v1'};
    writeFileSync(manifest,JSON.stringify(record));
    assert.deepEqual(readEvidence(manifest),record);
    assert.equal(checkEvidence(readEvidence(manifest)),true);
  } finally {rmSync(root,{recursive:true,force:true});}
});
