/** Simple deterministic space assignment, not troop AI or war-defense optimization.
 * The planner describes *what* and rough *where*, this tool finds legal coordinates.
 */
const CENTER = 22;
const targetOf = region => ({
  center:[CENTER,CENTER], core:[CENTER,CENTER],
  north:[CENTER,8],south:[CENTER,36],west:[8,CENTER],east:[36,CENTER],
  northwest:[9,9],northeast:[35,9],southwest:[9,35],southeast:[35,35]
})[region] || [CENTER,CENTER];
function centerOf(o, meta){return [o.x+meta.w/2,o.y+meta.h/2]}
function squareDist(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2}
function validPlacement(existing,candidate,catalog,topology){return topology.placementCheck(existing,catalog,candidate).ok}
function candidateScore(candidate, existing, meta, catalog, item){
 const cc=centerOf(candidate,meta), anchor=targetOf(item.region);
 const existingSame=existing.filter(o=>o.id===candidate.id);
 const sameDistances=existingSame.map(o=>squareDist(cc,centerOf(o,catalog[o.id])));
 const minSame=sameDistances.length?Math.min(...sameDistances):400;
 const coreDistances=existing.filter(o=>['town_hall','hero_hall','monolith','clan_castle'].includes(o.id)).map(o=>squareDist(cc,centerOf(o,catalog[o.id])));
 // Region preference, distribution, and bounded spacing; deterministic tie breaking.
 const region=item.region||'distributed';
 let score=region==='distributed'?Math.min(minSame,400)*2: -squareDist(cc,anchor);
 if(region==='outer'){score=squareDist(cc,[CENTER,CENTER]);}
 if(region==='core'){score-= Math.min(minSame,400)*.15}
 if(region==='distributed'&&coreDistances.length)score-=Math.min(...coreDistances)*.03;
 const jitter=((candidate.x*73856093)^(candidate.y*19349663)^(item.seed||17))&255;
 return score+jitter/100000;
}
export function materializeAutoFill(objects, requests, catalog, topology) {
 const errors=[],warnings=[], result=objects.map(o=>({...o}));
 if(requests==null)return {objects:result,errors,warnings};
 if(!Array.isArray(requests)){errors.push('autoFill 必须是数组');return {objects:result,errors,warnings}}
 if(requests.length>100){errors.push('autoFill 请求不能超过100项');return {objects:result,errors,warnings}}
 for(const [ri,item] of requests.entries()){
  if(!item||typeof item!=='object'||!Object.hasOwn(catalog,item.id)){errors.push(`autoFill[${ri}] 建筑 id 不存在`);continue}
  const meta=catalog[item.id];const existing=result.filter(o=>o.id===item.id).length;
  const count=item.count==='remaining'?meta.max-existing:item.count;
  if(!Number.isInteger(count)||count<0||count>meta.max-existing){errors.push(`autoFill[${ri}] 数量无效；剩余可放 ${meta.max-existing}`);continue}
  const regions=['center','core','north','south','east','west','northeast','northwest','southeast','southwest','distributed','outer'];
  if(item.region!==undefined&&!regions.includes(item.region)){errors.push(`autoFill[${ri}] region 无效`);continue}
  const separation=item.minSeparation??0;
  if(!Number.isFinite(separation)||separation<0||separation>44){errors.push(`autoFill[${ri}] minSeparation 无效`);continue}
  for(let i=0;i<count;i++){
   let best=null,bestScore=-Infinity;
   for(let y=0;y<=44-meta.h;y++)for(let x=0;x<=44-meta.w;x++){
     const candidate={id:item.id,x,y};
     if(!validPlacement(result,candidate,catalog,topology))continue;
     const cc=centerOf(candidate,meta);
     if(separation>0&&result.some(o=>o.id===item.id&&squareDist(cc,centerOf(o,catalog[o.id]))<separation**2))continue;
     const score=candidateScore(candidate,result,meta,catalog,item);
     if(score>bestScore){best=candidate;bestScore=score}
   }
   if(!best){errors.push(`autoFill[${ri}] 无可用位置（已放 ${i}/${count}）`);break}
   result.push({uid:`auto-${ri}-${i}`, ...best});
  }
 }
 if(requests.length)warnings.push('autoFill 只进行尺寸/占格和粗略区域偏好搜索，不是经过实战验证的阵型生成算法。');
 return {objects:result,errors,warnings};
}
