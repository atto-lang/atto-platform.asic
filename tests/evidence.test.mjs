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


// additional fail-closed manifest schema regressions (source-only, not hardware).
test('rejects non-integer and wrong-version manifest schema identities',()=>{
  for(const schemaVersion of [0,2,-1,'1',1.0+Number.EPSILON,null,undefined,true,{},[]]){
    assert.throws(()=>checkEvidence({...base,schemaVersion}),/schema\/stage/);
  }
});

test('rejects inherited metadata, arrays, null and missing own required fields',()=>{
  for(const input of [null,[],{},Object.create(base),Object.assign(Object.create(null),{...base,toolchain:undefined})]){
    assert.throws(()=>checkEvidence(input));
  }
  for(const key of Object.keys(base)){
    const copy={...base};delete copy[key];
    assert.throws(()=>checkEvidence(copy),`missing key: ${key}`);
  }
});

test('rejects noncanonical signoff hashes independently for each report field',()=>{
  const all={...base,stage:'signoff',...reports};
  for(const key of ['staReportSha256','drcReportSha256','lvsReportSha256','gdsSha256','constraintsSha256']){
    for(const bad of ['0'.repeat(63),'0'.repeat(65),'F'.repeat(64),'0'.repeat(63)+'g',0,false,null,{}]){
      assert.throws(()=>checkEvidence({...all,[key]:bad}),/signoff requires exact SHA-256/,key);
    }
  }
});

test('rejects signoff-only evidence fields at every earlier physical stage',()=>{
  for(const stage of ['synthesis-only','place-route']){
    for(const key of Object.keys(reports)){
      assert.throws(()=>checkEvidence({...base,stage,[key]:reports[key]}),/field/,stage+':'+key);
    }
  }
});

test('rejects controls and oversized provenance strings at exact label boundary',()=>{
  for(const field of ['toolchain','technology']){
    for(const bad of ['', '  ','x'.repeat(257),'test\nline','test\rline','test\tline','x\u0000y','x\u007fy',7,[],{}]){
      assert.throws(()=>checkEvidence({...base,[field]:bad}),/invalid/,field);
    }
    assert.equal(checkEvidence({...base,[field]:'x'.repeat(256)}),true);
    assert.equal(checkEvidence({...base,[field]:'λ-ref-2026'}),true);
  }
});

test('rejects escaped duplicate JSON member aliases across all required top-level keys',()=>{
  for(const key of Object.keys(base)){
    const raw=JSON.stringify(base);
    const escaped='\\u'+key.codePointAt(0).toString(16).padStart(4,'0')+key.slice(1);
    const scalar=JSON.stringify(base[key]);
    const needle=JSON.stringify(key)+':'+scalar;
    assert.ok(raw.includes(needle));
    const modified=raw.replace(needle,JSON.stringify(key)+':'+scalar+',"'+escaped+'":'+scalar);
    const root=mkdtempSync(join(tmpdir(),'asic-alias-'));
    try{
      const file=join(root,'aliases.json');writeFileSync(file,modified);
      assert.throws(()=>readEvidence(file),/duplicate JSON member/,key);
    }finally{rmSync(root,{recursive:true,force:true});}
  }
});

test('enforces manifest file size at the 64 KiB boundary without truncation',()=>{
  const root=mkdtempSync(join(tmpdir(),'asic-bound-'));
  try{
    const file=join(root,'manifest.json');
    const raw=JSON.stringify(base);
    writeFileSync(file,raw+' '.repeat(65536-Buffer.byteLength(raw)));
    assert.deepEqual(readEvidence(file),base);
    writeFileSync(file,raw+' '.repeat(65537-Buffer.byteLength(raw)));
    assert.throws(()=>readEvidence(file),/bounded regular file|exceeds 64 KiB/);
    writeFileSync(file,Buffer.alloc(0));
    assert.throws(()=>readEvidence(file),/bounded regular file/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
