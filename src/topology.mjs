/* Shared pure ES module: geometry, occupancy, no-deploy masks, connectivity.
 * 1-tile dilation is a provisional research rule, not a certified CN-client model.
 */
  const GRID = 44;
  const key = (x, y) => x + ',' + y;
  function blockDims(b, catalog) {
    const meta = catalog[b.id];
    return meta ? { w: meta.w, h: meta.h } : null;
  }
  function boundsCheck(x, y, w, h, n = GRID) {
    return [x,y,w,h].every(Number.isInteger) && w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= n && y + h <= n;
  }
  function isSource(meta) { return !!meta && meta.zoneSource === true; }
  function placementCheck(objects, catalog, candidate, ignoreUid = null, n = GRID) {
    const meta = catalog[candidate.id];
    if (!meta) return {ok:false, reason:'没有此建筑数据'};
    if (!boundsCheck(candidate.x,candidate.y,meta.w,meta.h,n)) return {ok:false, reason:'建筑超出44×44画布'};
    let ownCount = 0;
    for (const old of objects) {
      if (old.uid === ignoreUid) continue;
      if (old.id === candidate.id) ownCount++;
      const om = catalog[old.id];
      if (!om) continue;
      if (candidate.x < old.x + om.w && candidate.x + meta.w > old.x && candidate.y < old.y + om.h && candidate.y + meta.h > old.y) {
        return {ok:false, reason:'与 ' + om.name + ' 占位重叠'};
      }
    }
    if (ownCount >= meta.max) return {ok:false, reason:meta.name + ' 数量已达上限 '+meta.max};
    return {ok:true, reason:'位置合法（仅校验边界、数量与重叠）'};
  }
  function deploymentMask(objects, catalog, n = GRID) {
    // The mask deliberately includes coordinates -1 and n to trace white contours at the edge.
    const tiles = new Set();
    for (const b of objects) {
      const meta = catalog[b.id];
      if (!isSource(meta)) continue;
      for (let y = b.y - 1; y <= b.y + meta.h; y++) {
        for (let x = b.x - 1; x <= b.x + meta.w; x++) {
          tiles.add(key(x, y));
        }
      }
    }
    return tiles;
  }
  function boundaryEdges(mask) {
    const edges = [];
    for (const cell of mask) {
      const [x,y] = cell.split(',').map(Number);
      if (!mask.has(key(x,y-1))) edges.push([x,y,x+1,y]);
      if (!mask.has(key(x+1,y))) edges.push([x+1,y,x+1,y+1]);
      if (!mask.has(key(x,y+1))) edges.push([x+1,y+1,x,y+1]);
      if (!mask.has(key(x-1,y))) edges.push([x,y+1,x,y]);
    }
    return edges;
  }
  function deploymentStatus(x, y, mask, n = GRID) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return 'unknown';
    if (x < 0 || y < 0 || x >= n || y >= n) return 'outside_canvas';
    return mask.has(key(x,y)) ? 'blocked' : 'allowed';
  }
  function allowedRegions(mask, n = GRID) {
    // 4-connected regions in tile space: one outside-connected region plus possible enclosed spawn holes.
    const seen = new Uint8Array(n*n), regions = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let y=0;y<n;y++) for (let x=0;x<n;x++) {
      const index=y*n+x;
      if(seen[index] || mask.has(key(x,y))) continue;
      const cells=[], queue=[[x,y]];seen[index]=1;
      let boundary=false,minX=x,minY=y,maxX=x,maxY=y;
      for(let head=0;head<queue.length;head++){
        const [cx,cy]=queue[head];cells.push([cx,cy]);
        minX=Math.min(minX,cx);minY=Math.min(minY,cy);maxX=Math.max(maxX,cx);maxY=Math.max(maxY,cy);
        if(cx===0||cy===0||cx===n-1||cy===n-1)boundary=true;
        for(const [dx,dy] of dirs){const nx=cx+dx,ny=cy+dy;
          if(nx<0||ny<0||nx>=n||ny>=n)continue;
          const i=ny*n+nx;
          if(seen[i]||mask.has(key(nx,ny)))continue;
          seen[i]=1;queue.push([nx,ny]);
        }
      }
      regions.push({size:cells.length,connects_to_map_edge:boundary,bounds:[minX,minY,maxX,maxY],cells});
    }
    return regions;
  }
  function stats(objects, catalog, n=GRID) {
    const mask = deploymentMask(objects,catalog,n);
    let inside=0;
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(mask.has(key(x,y))) inside++;
    const regions=allowedRegions(mask,n), holes=regions.filter(r=>!r.connects_to_map_edge);
    return {n, total:n*n, blocked:inside, allowed:n*n-inside, sources:objects.filter(o=>isSource(catalog[o.id])).length, objects:objects.length, edges:boundaryEdges(mask).length, spawn_holes:holes.length, spawn_hole_cells:holes.reduce((a,r)=>a+r.size,0)};
  }
  function validateLayout(objects, catalog, n=GRID) {
    const problems=[];
    const checked=[];
    for(const obj of objects){
      const v=placementCheck(checked,catalog,obj,null,n);
      if (!v.ok) problems.push({uid:obj.uid, id:obj.id, reason:v.reason});
      checked.push(obj);
    }
    return problems;
  }
export {GRID,key,boundsCheck,placementCheck,deploymentMask,boundaryEdges,deploymentStatus,allowedRegions,stats,validateLayout};
