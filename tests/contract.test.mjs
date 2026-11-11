import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as topology from '../src/topology.mjs';
import {CAT,CATALOG_RECORDS} from '../src/catalog.generated.mjs';
import {parseCandidate,makeLayoutDocument} from '../src/layout-contract.mjs';
import {materializeAutoFill} from '../src/fill-engine.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
const dataset=JSON.parse(fs.readFileSync(new URL('../data/coc_th18_cn_2026-11-10.json',import.meta.url)));
test('Town Hall, Army Camp, Hero Hall and Workshop are 4x4 in all 3 sources',()=>{
 for(const id of ['town_hall','army_camp','hero_hall','workshop']){
  assert.equal(CAT[id].w,4);assert.equal(CAT[id].h,4);
  const b=dataset.units.buildings.find(x=>x.id===id);
  assert.deepEqual([b.footprint.width_tiles,b.footprint.height_tiles,b.footprint.area_tiles],[4,4,16]);
  const c=catalog.objects.find(x=>x.id===id); assert.deepEqual([c.w,c.h],[4,4]);
 }
 assert.deepEqual([CAT.barracks.w,CAT.barracks.h],[3,3]);
});
test('Generated catalog exactly matches canonical data/catalog.json',()=>assert.deepEqual(CATALOG_RECORDS,catalog.objects));
test('4x4 no-deploy zone adds one tile around',()=>{
 const mask=topology.deploymentMask([{id:'army_camp',x:10,y:10}],CAT);
 assert.equal(mask.size,36);
 assert.equal(topology.boundaryEdges(mask).length,24);
});
test('Model draft geometry is validated; rejecting overlaps and non-integral coordinates',()=>{
 const ok=parseCandidate({format:'coc-th18-draft-v1',placements:[{id:'army_camp',x:10,y:10},{id:'town_hall',x:14,y:14}]},CAT,topology);
 assert.equal(ok.ok,true);
 const collision=parseCandidate({format:'coc-th18-draft-v1',placements:[{id:'army_camp',x:10,y:10},{id:'town_hall',x:13,y:13}]},CAT,topology);
 assert.equal(collision.ok,false);assert.match(collision.errors.join(' '),/重叠/);
 const fractional=parseCandidate({format:'coc-th18-draft-v1',placements:[{id:'town_hall',x:5.5,y:5}]},CAT,topology);
 assert.equal(fractional.ok,false);
});
test('Imported legacy layout is revalidated under corrected sizes',()=>{
 const old=parseCandidate({format:'coc-th18-layout-v0.1',objects:[{id:'army_camp',x:0,y:0},{id:'town_hall',x:4,y:0}]},CAT,topology);
 assert.equal(old.ok,true);assert.equal(old.objects.length,2);
});
test('Deterministic autoFill, legal counts and placement, invalid entries rejected',()=>{
 const sample=JSON.parse(fs.readFileSync(new URL('../examples/llm_draft.json',import.meta.url)));
 const a=parseCandidate(sample,CAT,topology),b=parseCandidate(sample,CAT,topology);
 assert.equal(a.ok,true,a.errors.join('; '));assert.equal(a.objects.length,15);
 assert.deepEqual(a.objects,b.objects);
 assert.deepEqual(topology.validateLayout(a.objects,CAT),[]);
 assert.equal(a.objects.filter(x=>x.id==='air_defense').length,4);
 assert.equal(parseCandidate({...sample,autoFill:[{id:'air_defense',count:5}]},CAT,topology).ok,false);
});
test('Normalized layout exports and reloads without losing geometry',()=>{
 const draft=JSON.parse(fs.readFileSync(new URL('../examples/llm_draft.json',import.meta.url)));
 const p=parseCandidate(draft,CAT,topology);
 const doc=makeLayoutDocument(p.objects,'iso',topology.stats(p.objects,CAT));
 const reload=parseCandidate(doc,CAT,topology);
 assert.equal(reload.ok,true);assert.equal(reload.objects.length,p.objects.length);
});
