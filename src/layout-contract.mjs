import {materializeAutoFill} from './fill-engine.mjs';
export const DRAFT_FORMAT='coc-th18-draft-v1';
export const LAYOUT_FORMAT='coc-th18-layout-v0.2';
function validId(id,catalog){return typeof id==='string'&&Object.hasOwn(catalog,id)}
/** Accept legacy layout objects or v1 model plans. No silent dropping of invalid positions. */
export function parseCandidate(payload,catalog,topology){
 const errors=[],warnings=[];
 if(!payload||typeof payload!=='object'||Array.isArray(payload)&&payload.some(x=>!x))return {ok:false,errors:['根对象必须为数组或对象'],warnings,objects:[]};
 const format=Array.isArray(payload)?'legacy-array':payload.format;
 const known=[DRAFT_FORMAT,LAYOUT_FORMAT,'coc-th18-layout-v0.1','legacy-array'];
 if(!known.includes(format))errors.push('未知 format：'+String(format)+ '（仅支持 '+known.join('、')+'）');
 const list=Array.isArray(payload)?payload:format===DRAFT_FORMAT?payload.placements:payload.objects;
 if(!Array.isArray(list))errors.push('必须提供 placements 或 objects 数组');
 if(Array.isArray(list)&&list.length>1000)errors.push('不能超过1000个对象');
 const objects=[];
 if(Array.isArray(list)&&list.length<=1000)for(const [i,raw] of list.entries()){
  if(!raw||typeof raw!=='object'||!validId(raw.id,catalog)){errors.push(`对象[${i}] 未知建筑 id ${String(raw?.id)}`);continue}
  if(!Number.isInteger(raw.x)||!Number.isInteger(raw.y)){errors.push(`对象[${i}] (${raw.id}) 坐标必须为整数`);continue}
  const obj={uid:`p${i+1}`,id:raw.id,x:raw.x,y:raw.y};
  const r=topology.placementCheck(objects,catalog,obj);
  if(!r.ok)errors.push(`对象[${i}] (${raw.id}) ${r.reason}`);
  else objects.push(obj);
 }
 if(payload.map && (payload.map.width!==44||payload.map.height!==44)) errors.push('地图尺寸必须为44×44');
 if(payload.grid && (payload.grid.width!==44||payload.grid.height!==44)) errors.push('grid尺寸必须为44×44');
 if(format===DRAFT_FORMAT){
  const filled=materializeAutoFill(objects,payload.autoFill,catalog,topology);
  errors.push(...filled.errors);warnings.push(...filled.warnings);objects.splice(0,objects.length,...filled.objects);
  warnings.push('自然语言规划由外部模型完成；本程序只负责规则校验与初步合法位置补全。');
 }
 if(format==='legacy-array'||format==='coc-th18-layout-v0.1')warnings.push('旧版阵型已按当前建筑占地重新校验；原5×5兵营和工坊需注意。');
 if(!objects.length) warnings.push('当前草案没有建筑。');
 return {ok:errors.length===0, errors, warnings, objects};
}
export function makeLayoutDocument(objects,projection='iso',statistics=null,options={}){
 return {format:LAYOUT_FORMAT,game:'clash-of-clans',server:'CN',townHall:18,map:{width:44,height:44,projection},rules:{no_deploy_margin_tiles:1,excluded_zone_sources:['hidden_tesla','traps'],buildable_mask_verified:false},metadata:{created_by:options.created_by||'TH18 editor',description:options.description||'',source_draft:options.source_draft||null},objects:objects.map(o=>({uid:o.uid,id:o.id,x:o.x,y:o.y})),...(statistics?{statistics}:{})};
}
