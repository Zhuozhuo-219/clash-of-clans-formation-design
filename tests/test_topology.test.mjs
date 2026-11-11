import assert from 'node:assert/strict';
import * as T from '../src/topology.mjs';
import {CAT as C} from '../src/catalog.generated.mjs';
assert.equal(T.GRID,44);
assert.equal(C.hidden_tesla.zoneSource,false);
assert.equal(C.giant_bomb.zoneSource,false);
assert.equal(C.wall.zoneSource,true);
assert.equal(T.placementCheck([],C,{id:'town_hall',x:40,y:40}).ok,true);
assert.equal(T.placementCheck([],C,{id:'town_hall',x:41,y:40}).ok,false);
let obs=[{uid:'a',id:'town_hall',x:10,y:10}];
let mask=T.deploymentMask(obs,C);
assert.equal(mask.size,36,'4×4 + one tile on each side => 6×6');
assert.equal(T.deploymentStatus(9,9,mask),'blocked');
assert.equal(T.deploymentStatus(8,8,mask),'allowed');
assert.equal(T.deploymentStatus(14,14,mask),'blocked');
assert.equal(T.deploymentStatus(15,15,mask),'allowed');
assert.equal(T.boundaryEdges(mask).length,24,'6x6 perimeter has 24 edges');
obs=[{uid:'a',id:'hidden_tesla',x:10,y:10},{uid:'b',id:'giant_bomb',x:13,y:13}];
assert.equal(T.deploymentMask(obs,C).size,0,'Teslas/traps never generate boundary');
obs=[{uid:'a',id:'wall',x:10,y:10},{uid:'b',id:'wall',x:14,y:10}];
mask=T.deploymentMask(obs,C);
assert.equal(T.deploymentStatus(12,10,mask),'allowed','three tile gap creates spawn hole');
obs=[{uid:'a',id:'wall',x:10,y:10},{uid:'b',id:'wall',x:13,y:10}];
mask=T.deploymentMask(obs,C);
assert.equal(T.deploymentStatus(11,10,mask),'blocked');
assert.equal(T.deploymentStatus(12,10,mask),'blocked');
const th=[{uid:'a',id:'town_hall',x:20,y:20}];
assert.equal(T.placementCheck(th,C,{uid:'b',id:'hidden_tesla',x:21,y:21}).ok,false);
assert.equal(T.placementCheck(th,C,{uid:'b',id:'town_hall',x:3,y:3}).ok,false);
assert.equal(T.validateLayout([{uid:'a',id:'town_hall',x:20,y:20},{uid:'b',id:'town_hall',x:21,y:21}],C).length,1);
console.log('Topology tests passed (mask, outline, 1-tile boundary, gap, Tesla/trap, collisions, counts).');
let ring=[];for(let x=10;x<=13;x++){ring.push({uid:'t'+x,id:'wall',x,y:10});ring.push({uid:'b'+x,id:'wall',x,y:13});}for(let y=11;y<13;y++){ring.push({uid:'l'+y,id:'wall',x:10,y});ring.push({uid:'r'+y,id:'wall',x:13,y});}
// Full 1-tile dilation seals the interior of a narrow 4x4 wall square, leaving no hole.
assert.equal(T.stats(ring,C).spawn_holes,0);
const bigRing=[];for(let x=7;x<=17;x++){bigRing.push({uid:'t'+x,id:'wall',x,y:7});bigRing.push({uid:'b'+x,id:'wall',x,y:17});}for(let y=8;y<17;y++){bigRing.push({uid:'l'+y,id:'wall',x:7,y});bigRing.push({uid:'r'+y,id:'wall',x:17,y});}
assert.equal(T.stats(bigRing,C).spawn_holes,1,'enclosed but non-blocked tiles are a spawn hole');
console.log('Hole topology tests passed (fully covered chamber versus true hole).');
