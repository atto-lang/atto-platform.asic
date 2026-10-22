// Manifest structure validation only: cannot authenticate physical reports or silicon.
import {readFileSync} from 'node:fs';
export function checkEvidence(obj){
 if(!obj||obj.schemaVersion!==1||!['synthesis-only','place-route','signoff'].includes(obj.stage))throw Error('bad schema/stage');
 for(const k of ['sourceSha256','rtlSha256','toolchain','technology'])
  if(typeof obj[k]!=='string'||!obj[k].trim())throw Error('missing '+k);
 if(obj.stage==='signoff'){
  for(const k of ['staReportSha256','drcReportSha256','lvsReportSha256','gdsSha256','pdkRevision','constraintsSha256'])
   if(typeof obj[k]!=='string'||!/^[a-f0-9]{64}$/.test(obj[k]))throw Error('signoff requires '+k);
 }
 if(obj.tapeoutReady===true)throw Error('manifest alone cannot claim tapeout readiness');
 return true;
}
if(process.argv[1]?.endsWith('/check-evidence.mjs')){
 try{
  if(process.argv.length!==3)throw Error('usage: node scripts/check-evidence.mjs MANIFEST.json');
  checkEvidence(JSON.parse(readFileSync(process.argv[2],'utf8')));
  console.log('ASIC_MANIFEST_SCHEMA_PASS_ONLY');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
