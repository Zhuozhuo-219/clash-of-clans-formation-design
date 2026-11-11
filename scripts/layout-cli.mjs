#!/usr/bin/env node
/** ChatGPT or another LLM can produce JSON; this CLI is the deterministic tool boundary. */
import fs from 'node:fs';
import path from 'node:path';
import * as topology from '../src/topology.mjs';
import {CAT} from '../src/catalog.generated.mjs';
import {parseCandidate,makeLayoutDocument} from '../src/layout-contract.mjs';
const [, , command, input, output] = process.argv;
function help(){console.log('用法: node scripts/layout-cli.mjs catalog | validate <file.json> | materialize <draft.json> [out.json]');}
if(!['catalog','validate','materialize'].includes(command)){help();process.exit(command?2:0)}
if(command==='catalog'){
 const result={format:'coc-th18-catalog-summary-v1',map:{width:44,height:44},buildingTypes:Object.values(CAT).map(({id,name,w,h,max,group,zoneSource})=>({id,name,w,h,max,group,zoneSource}))};
 console.log(JSON.stringify(result,null,2));
}else{
 if(!input){help();process.exit(2)}
 let raw;
 try{raw=JSON.parse(fs.readFileSync(input,'utf8'))}catch(e){console.error('读取或JSON解析失败：'+e.message);process.exit(2)}
 const report=parseCandidate(raw,CAT,topology);
 if(!report.ok){console.error(JSON.stringify({ok:false,errors:report.errors,warnings:report.warnings},null,2));process.exit(1)}
 if(command==='validate'){console.log(JSON.stringify({ok:true,objects:report.objects.length,warnings:report.warnings,topology:topology.stats(report.objects,CAT)},null,2))}
 else{
  const target=output||path.join(process.cwd(),'layouts','generated.json');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const doc=makeLayoutDocument(report.objects,'iso',topology.stats(report.objects,CAT),{created_by:'external-model draft through layout-cli',description:raw.description||'',source_draft:input});
  fs.writeFileSync(target,JSON.stringify(doc,null,2)+'\n');
  console.log(JSON.stringify({ok:true,target,objects:report.objects.length,warnings:report.warnings},null,2));
 }
}
