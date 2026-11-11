import fs from 'node:fs';
import path from 'node:path';
import * as topology from '../src/topology.mjs';
import {CAT} from '../src/catalog.generated.mjs';
import {parseCandidate} from '../src/layout-contract.mjs';
let checked=0,errors=0;
for(const dir of ['drafts','layouts']){
 if(!fs.existsSync(dir))continue;
 for(const filename of fs.readdirSync(dir)){
  if(!filename.endsWith('.json'))continue;
  const full=path.join(dir,filename);
  try{
    const data=JSON.parse(fs.readFileSync(full,'utf8'));
    const report=parseCandidate(data,CAT,topology);
    if(!report.ok){console.error(`FAIL ${full}: ${report.errors.join('; ')}`);errors++}
    else{console.log(`PASS ${full}: ${report.objects.length} objects`);checked++}
  }catch(e){console.error(`FAIL ${full}: ${e.message}`);errors++}
 }
}
console.log(`Verified ${checked} layout/draft files with ${errors} failures`);
if(errors)process.exit(1);
