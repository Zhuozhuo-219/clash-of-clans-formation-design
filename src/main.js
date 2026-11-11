import { CATALOG_RECORDS, CAT } from './catalog.generated.mjs';
import * as T from './topology.mjs';
import { parseCandidate, makeLayoutDocument } from './layout-contract.mjs';
import { sampleDraft } from './samples.mjs';
const N=44, STORAGE_KEY='th18-grid-deploy-v0.2';
const $=id=>document.getElementById(id);
const canvas=$('board'),ctx=canvas.getContext('2d'),vp=$('viewport');
const colors={core:'#f2bb72',defense:'#769fe1',wall:'#bdcbd5',resource:'#70b99d',utility:'#a3a3d6',trap:'#e6a46d'};
let objects=[],serial=0,tool='select',group='all',chosen='town_hall',view='iso';
let options={grid:true,tint:true,boundary:true,holes:true,coord:false};
let hover=null,focusUid=null,testPoint=null,drag=null,pan={x:0,y:0},zoom=1;
let history=[],historyIndex=-1,cvW=500,cvH=600, dpr=1;
let layoutMask=new Set(),edgeList=[],spawnHoleCells=[];
function newId(){return 'b'+(++serial)}
function world(x,y){return view==='iso'?{x:(x-y)*16,y:(x+y)*9}:{x:x*20,y:y*20};}
function drawPolygon(x,y,w,h,fill,stroke,width=1){let a=world(x,y),b=world(x+w,y),c=world(x+w,y+h),d=world(x,y+h);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function measure(){const box=vp.getBoundingClientRect();const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));const nextDpr=Math.min(2,window.devicePixelRatio||1);if(width===cvW&&height===cvH&&nextDpr===dpr)return;cvW=width;cvH=height;dpr=nextDpr;const pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);if(canvas.width!==pixelWidth)canvas.width=pixelWidth;if(canvas.height!==pixelHeight)canvas.height=pixelHeight;render();}
function scene(){let minX=view==='iso'?-N*16:0,maxX=view==='iso'?N*16:N*20,minY=0,maxY=view==='iso'?N*18:N*20;
 const scale=Math.min((cvW-70)/(maxX-minX+100),(cvH-90)/(maxY-minY+90))*zoom;
 return {scale,ox:cvW/2-(minX+maxX)/2*scale+pan.x,oy:cvH/2-(minY+maxY)/2*scale+pan.y};}
function ptEvent(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function toCell(px,py){const s=scene(), wx=(px-s.ox)/s.scale, wy=(py-s.oy)/s.scale;let x,y;
 if(view==='iso'){x=(wx/16+wy/9)/2;y=(wy/9-wx/16)/2;}else{x=wx/20;y=wy/20;}
 return {x:Math.floor(x+1e-7),y:Math.floor(y+1e-7)};}
function within(c){return c&&c.x>=0&&c.y>=0&&c.x<N&&c.y<N}
function findObject(c){if(!within(c))return null;for(let i=objects.length-1;i>=0;i--){const o=objects[i],m=CAT[o.id];if(c.x>=o.x&&c.x<o.x+m.w&&c.y>=o.y&&c.y<o.y+m.h)return o;}return null;}
function recompute(){layoutMask=T.deploymentMask(objects,CAT,N);edgeList=T.boundaryEdges(layoutMask);spawnHoleCells=T.allowedRegions(layoutMask,N).filter(r=>!r.connects_to_map_edge).flatMap(r=>r.cells);updateStats();render();}
function snapshot(){const str=JSON.stringify(objects);if(history[historyIndex]===str)return;history=history.slice(0,historyIndex+1);history.push(str);if(history.length>100)history.shift();historyIndex=history.length-1;saveLocal();refreshHistory();}
function refreshHistory(){$('undo').disabled=historyIndex<=0;$('redo').disabled=historyIndex>=history.length-1;}
function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({objects,serial}));}catch(_){}}
function restoreLocal(){try{const s=localStorage.getItem(STORAGE_KEY);if(!s)return false;const d=JSON.parse(s);return installObjects(d.objects,false);}catch(_){return false}}
function installObjects(list,showWarnings=true){if(!Array.isArray(list))return false;const good=[],bad=[];let i=0;
 for(const it of list){if(!it||!CAT[it.id]){bad.push('未知类型');continue;}const obj={uid:'b'+(++i),id:it.id,x:Number(it.x),y:Number(it.y)};let checked=T.placementCheck(good,CAT,obj);if(checked.ok)good.push(obj);else bad.push(checked.reason);}
 objects=good;serial=i;focusUid=null;history=[];historyIndex=-1;snapshot();recompute();if(showWarnings)toast('已导入 '+good.length+' 个对象'+(bad.length?'，跳过 '+bad.length+' 个不合规对象':''));return true;}
function makeDemo(){const specs=[['town_hall',20,20],['clan_castle',17,18],['monolith',25,22],['revenge_tower',13,23],['multi_gear_tower',20,13],['super_wizard_tower',14,14],['firespitter',29,17],['scattershot',14,29],['inferno_tower',24,16],['spell_tower',18,25],['air_defense',26,29],['hidden_tesla',24,27],['giant_bomb',11,17],['army_camp',4,15],['gold_storage',30,27]];
 const demo=[], wall=(x,y)=>specs.push(['wall',x,y]);for(let x=10;x<=34;x++){wall(x,10);wall(x,34);}for(let y=11;y<34;y++){wall(10,y);wall(34,y);}for(const [id,x,y] of specs){const obj={uid:'b'+(demo.length+1),id,x,y};if(T.placementCheck(demo,CAT,obj).ok)demo.push(obj);}return demo;}
function undo(){if(historyIndex<=0)return;historyIndex--;objects=JSON.parse(history[historyIndex]);focusUid=null;recompute();refreshHistory();saveLocal()}
function redo(){if(historyIndex>=history.length-1)return;historyIndex++;objects=JSON.parse(history[historyIndex]);focusUid=null;recompute();refreshHistory();saveLocal()}
function fillGrid(){const s=scene();ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cvW,cvH);ctx.fillStyle='#0e1927';ctx.fillRect(0,0,cvW,cvH);
 ctx.translate(s.ox,s.oy);ctx.scale(s.scale,s.scale);
 drawPolygon(-2,-2,N+4,N+4,'#1b3442','#33515c',1.1/s.scale);
 drawPolygon(0,0,N,N,'#29443f','#79a28d',1.8/s.scale);
 if(options.grid){ctx.beginPath();for(let i=0;i<=N;i++){let a=world(i,0),b=world(i,N);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);a=world(0,i);b=world(N,i);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.strokeStyle='rgba(201,236,220,.145)';ctx.lineWidth=.8/s.scale;ctx.stroke();}
 return s;}
function render(){if(!ctx||!cvH)return;const s=fillGrid();
 if(options.tint){ctx.fillStyle='rgba(138,79,142,.26)';for(const id of layoutMask){const [x,y]=id.split(',').map(Number);if(x<0||x>=N||y<0||y>=N)continue;drawPolygon(x,y,1,1,'rgba(155,88,163,.26)',null);}}
 if(options.holes){for(const [x,y] of spawnHoleCells)drawPolygon(x,y,1,1,'rgba(243,195,83,.37)',null);}
 if(options.boundary&&edgeList.length){ctx.beginPath();for(const [x1,y1,x2,y2] of edgeList){const a=world(x1,y1),b=world(x2,y2);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(83,203,233,.55)';ctx.lineWidth=7/s.scale;ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=2.2/s.scale;ctx.stroke();}
 for(const o of objects){const m=CAT[o.id],isExempt=!m.zoneSource,sel=o.uid===focusUid;let fill=colors[m.group]+'c4';if(isExempt)fill='#e2a373b7';drawPolygon(o.x,o.y,m.w,m.h,fill,sel?'#fff4aa':isExempt?'#ffda9e66':'#e7f5ff66',(sel?3:1)/s.scale);
 if(m.group==='wall')continue;const p=world(o.x+m.w/2,o.y+m.h/2);ctx.save();ctx.translate(p.x,p.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 '+(m.w>=4?12:10)+'px sans-serif';ctx.fillStyle='#101725';ctx.strokeStyle='#ffffff55';ctx.lineWidth=.8;const label=m.name.length>5?m.name.slice(0,4):m.name;ctx.fillText(label,0,0);ctx.restore();
 if(isExempt){let a=world(o.x+.3,o.y+.3);ctx.fillStyle='#fff9c1';ctx.beginPath();ctx.arc(a.x,a.y,2,0,Math.PI*2);ctx.fill();}}
 if(options.coord){ctx.fillStyle='#e7e9d4';ctx.font='13px sans-serif';for(let n=0;n<=44;n+=4){let a=world(n,0);ctx.fillText(n,a.x,a.y-5);a=world(0,n);ctx.fillText(n,a.x-17,a.y+6);}}
 if(testPoint&&within(testPoint))drawPolygon(testPoint.x,testPoint.y,1,1,T.deploymentStatus(testPoint.x,testPoint.y,layoutMask)==='blocked'?'#fa555888':'#7dff9c99','#ffffff',2/s.scale);
 if(hover&&within(hover)){let overlay='#ffffff33',line='#e6fbff';if(tool==='place'){const meta=CAT[chosen];const cand={id:chosen,x:hover.x,y:hover.y};const check=T.placementCheck(objects,CAT,cand);overlay=check.ok?'#7de6cb66':'#ff637d77';line=check.ok?'#a8ffdb':'#ffa6ac';drawPolygon(hover.x,hover.y,meta.w,meta.h,overlay,line,2/s.scale);}else drawPolygon(hover.x,hover.y,1,1,overlay,line,1.6/s.scale);}
 if(drag&&drag.type==='move'&&drag.preview){const p=drag.preview,m=CAT[p.id],check=T.placementCheck(objects,CAT,p,p.uid);drawPolygon(p.x,p.y,m.w,m.h,check.ok?'#62eaba88':'#ff536e88',check.ok?'#b1ffe6':'#ffc2cb',2.6/s.scale);}
 ctx.restore();
}
function updateStats(){const z=T.stats(objects,CAT,N);$('stat').textContent=`对象 ${z.objects} 个（禁区源 ${z.sources}） · 禁下兵 ${z.blocked} 格 · 可测试下兵 ${z.allowed} 格 · 内部下兵洞 ${z.spawn_holes} 处（${z.spawn_hole_cells} 格） · 白线边段 ${z.edges}`;syncChosen();updateHUD();}
function syncChosen(){const m=CAT[chosen];const count=objects.filter(x=>x.id===chosen).length;$('chosen').innerHTML='<b>'+m.name+'</b><span>'+m.w+'×'+m.h+' 格 ｜ 已放 '+count+' / '+m.max+' ｜ '+(m.zoneSource?'产生1格禁下兵边缘':'不产生禁下兵边缘')+'</span>';}
function updateHUD(){let c=hover;let o=c?findObject(c):null;$('hoverText').textContent='坐标：'+(within(c)?'('+c.x+','+c.y+')':'地图之外');const state=within(c)?T.deploymentStatus(c.x,c.y,layoutMask,N):'outside_canvas';$('deployText').textContent='下兵状态：'+(state==='blocked'?'⛔ 禁止':state==='allowed'?'✓ 允许（基础模型）':'地图外侧示意');let s=objects.find(o=>o.uid===focusUid);$('selectedText').textContent='选择：'+(s?CAT[s.id].name+' ('+s.x+','+s.y+')':o?CAT[o.id].name:'—');}
function toast(msg){const box=$('toast');box.textContent=msg;box.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('show'),2200);}
function changeTool(t){tool=t;for(const b of document.querySelectorAll('#tools button'))b.classList.toggle('active',b.dataset.tool===t);canvas.style.cursor=t==='pan'?'grab':t==='select'?'pointer':'crosshair';render();}
function setGroup(g){group=g;for(const b of document.querySelectorAll('#groups button'))b.classList.toggle('active',b.dataset.group===g);refreshPicker();}
function refreshPicker(){const q=$('search').value.trim().toLowerCase();let opts=CATALOG_RECORDS.filter(a=>(group==='all'||a.group===group)&&(a.name.toLowerCase().includes(q)||a.name_en.toLowerCase().includes(q)||a.id.includes(q)));let chosenStill=opts.some(a=>a.id===chosen);if(!chosenStill&&opts.length)chosen=opts[0].id;
 $('picker').innerHTML=opts.map(a=>'<option value="'+a.id+'">'+a.name+' ['+a.w+'×'+a.h+']</option>').join('');if(opts.length){$('picker').value=chosen;syncChosen();}else $('chosen').innerHTML='没有匹配的建筑';}
function placeOne(id,x,y,silent=false){const obj={uid:newId(),id,x,y};const check=T.placementCheck(objects,CAT,obj);if(!check.ok){if(!silent)toast(check.reason);return false;}objects.push(obj);recompute();if(!silent)snapshot();return true;}
function removeAt(c){const o=findObject(c);if(!o)return;objects=objects.filter(x=>x.uid!==o.uid);if(o.uid===focusUid)focusUid=null;recompute();snapshot();}
function lineCells(a,b){let x0=a.x,y0=a.y,x1=b.x,y1=b.y;const cells=[],dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx-dy;while(true){cells.push({x:x0,y:y0});if(x0===x1&&y0===y1)break;let e2=2*err;if(e2>-dy){err-=dy;x0+=sx}if(e2<dx){err+=dx;y0+=sy;}}return cells;}
canvas.addEventListener('pointerdown',e=>{const p=ptEvent(e),c=toCell(p.x,p.y);canvas.setPointerCapture(e.pointerId);hover=c;
 if(e.button===2){removeAt(c);return;}
 if(e.button===1||e.shiftKey||tool==='pan'){drag={type:'pan',sx:p.x,sy:p.y,ox:pan.x,oy:pan.y};return;}
 if(tool==='test'){testPoint=within(c)?c:null;toast(within(c)?T.deploymentStatus(c.x,c.y,layoutMask)==='blocked'?'该格禁止下兵':'该格允许下兵（静态判定）':'请点击44×44格内');render();return;}
 if(tool==='erase'){removeAt(c);drag={type:'erase',last:c.x+','+c.y};return;}
 if(tool==='place'){if(chosen==='wall'){drag={type:'wall',last:c,changed:false};drag.changed=placeOne('wall',c.x,c.y,true);render();}else placeOne(chosen,c.x,c.y);return;}
 if(tool==='select'){const o=findObject(c);focusUid=o?o.uid:null;if(o)drag={type:'move',uid:o.uid,id:o.id,dx:c.x-o.x,dy:c.y-o.y,preview:{...o}};render();updateHUD();}
});
canvas.addEventListener('pointermove',e=>{const p=ptEvent(e),c=toCell(p.x,p.y);hover=c;
 if(drag){if(drag.type==='pan'){pan.x=drag.ox+(p.x-drag.sx);pan.y=drag.oy+(p.y-drag.sy);}else if(drag.type==='move'){drag.preview={uid:drag.uid,id:drag.id,x:c.x-drag.dx,y:c.y-drag.dy};}else if(drag.type==='wall'){if(c.x!==drag.last.x||c.y!==drag.last.y){for(const t of lineCells(drag.last,c))if(placeOne('wall',t.x,t.y,true))drag.changed=true;drag.last=c;}}else if(drag.type==='erase'){const k=c.x+','+c.y;if(k!==drag.last){removeAt(c);drag.last=k;}}}updateHUD();render();});
function endPointer(e){if(!drag)return;if(drag.type==='move'&&drag.preview){const check=T.placementCheck(objects,CAT,drag.preview,drag.uid);if(check.ok){const i=objects.findIndex(o=>o.uid===drag.uid);if(i>=0){objects[i]={...drag.preview};recompute();snapshot();}}else toast(check.reason);}else if(drag.type==='wall'&&drag.changed)snapshot();drag=null;recompute();}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',()=>{drag=null;render();});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerleave',()=>{if(!drag){hover=null;updateHUD();render();}});
canvas.addEventListener('wheel',e=>{e.preventDefault();let before=zoom;zoom=Math.max(.4,Math.min(4.5,zoom*(e.deltaY>0?.90:1.10)));if(before!==zoom)render();},{passive:false});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}else if((e.key==='Backspace'||e.key==='Delete')&&focusUid){objects=objects.filter(o=>o.uid!==focusUid);focusUid=null;recompute();snapshot();}else if(e.key==='Escape'){focusUid=null;drag=null;changeTool('select');}else if(e.key===' '){e.preventDefault();if(!window._spaceTool){window._spaceTool=tool;changeTool('pan');}}});
window.addEventListener('keyup',e=>{if(e.key===' '&&window._spaceTool){changeTool(window._spaceTool);window._spaceTool=null;}});
document.querySelectorAll('#tools button').forEach(b=>b.addEventListener('click',()=>changeTool(b.dataset.tool)));
document.querySelectorAll('#groups button').forEach(b=>b.addEventListener('click',()=>setGroup(b.dataset.group)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;pan={x:0,y:0};zoom=1;document.querySelectorAll('[data-view]').forEach(i=>i.classList.toggle('active',i===b));render();}));
$('picker').addEventListener('change',e=>{chosen=e.target.value;syncChosen();changeTool('place');});$('search').addEventListener('input',refreshPicker);
for(const [name,id] of [['grid','showGrid'],['tint','showTint'],['boundary','showBoundary'],['holes','showHoles'],['coord','showCoord']])$(id).addEventListener('change',e=>{options[name]=e.target.checked;render();});
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
$('demo').addEventListener('click',()=>{if(objects.length&&!confirm('载入示例会替换当前阵型，继续吗？'))return;installObjects(makeDemo());toast('示例已载入；并非经过实战验证的阵型');});
$('clear').addEventListener('click',()=>{if(objects.length&&!confirm('清空全部建筑？'))return;objects=[];focusUid=null;recompute();snapshot();toast('已清空画布');});
function exportFile(name,contents,mime){const blob=new Blob([contents],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
$('save').addEventListener('click',()=>{const doc=makeLayoutDocument(objects,view,T.stats(objects,CAT));exportFile('TH18_阵型_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(doc,null,2),'application/json');toast('阵型 JSON 已导出');});
$('load').addEventListener('click',()=>$('file').click());$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const raw=JSON.parse(await file.text());const checked=parseCandidate(raw,CAT,T);if(!checked.ok){toast('导入校验失败：'+checked.errors.slice(0,2).join('；'));return;}installObjects(checked.objects);toast('已成功导入 '+checked.objects.length+' 个对象');}catch(err){toast('读取失败：'+err.message)}e.target.value='';});
$('shot').addEventListener('click',()=>{const a=document.createElement('a');a.download='TH18_网格与下兵线.png';a.href=canvas.toDataURL('image/png');a.click();});
refreshPicker();if(!restoreLocal())installObjects(makeDemo(),false);new ResizeObserver(measure).observe(vp);measure();

function readDraft(){try{return parseCandidate(JSON.parse($('draftInput').value),CAT,T);}catch(e){return {ok:false,errors:['JSON解析失败：'+e.message],warnings:[],objects:[]};}}
function draftReport(result){const messages=[result.ok?'✓ 草案通过校验，共 '+result.objects.length+' 个可放置对象。':'✗ 校验未通过，未改变当前阵型。',...result.errors.slice(0,18).map(x=>'错误：'+x),...result.warnings.map(x=>'注意：'+x)];$('draftReport').textContent=messages.join('\n');return result.ok;}
$('checkDraft').addEventListener('click',()=>draftReport(readDraft()));
$('applyDraft').addEventListener('click',()=>{const result=readDraft();if(!draftReport(result))return;if(objects.length&&!confirm('应用草案将替换当前画布。继续吗？'))return;installObjects(result.objects);toast('已应用有效草案');});
$('draftExample').addEventListener('click',()=>{$('draftInput').value=JSON.stringify(sampleDraft,null,2);draftReport(readDraft());});
