import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
let mod={};try{mod=await import('./core.js')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
const room={nx:2720,ny:3120};
test('isoProject returns to the identical screen point after four 90-degree turns',()=>{
 assert.equal(typeof mod.isoProject,'function','isoProject missing');
 const first=mod.isoProject(400,900,500,0,room);
 assert.ok(Number.isFinite(first.sx)&&Number.isFinite(first.sy));
 for(let turns=1;turns<4;turns++){
  const turned=mod.isoProject(400,900,500,turns,room);
  assert.notDeepEqual([turned.sx.toFixed(3),turned.sy.toFixed(3)],[first.sx.toFixed(3),first.sy.toFixed(3)],'turn '+turns+' must change the view');
 }
 const full=mod.isoProject(400,900,500,4,room);
 assert.equal(full.sx.toFixed(6),first.sx.toFixed(6));
 assert.equal(full.sy.toFixed(6),first.sy.toFixed(6));
 const higher=mod.isoProject(400,900,900,0,room);
 assert.ok(higher.sy<first.sy,'greater height must draw higher on screen');
});

test('isoRotate keeps the room footprint and maps corners to corners',()=>{
 for(let turns=0;turns<4;turns++){
  const pts=[[0,0],[room.nx,0],[room.nx,room.ny],[0,room.ny]].map(([x,y])=>mod.isoRotate(x,y,turns,room));
  for(const p of pts){
   const onCorner=(Math.abs(p.x)<1||Math.abs(p.x-room.nx)<1||Math.abs(p.x-(room.nx/2-room.ny/2))<1||Math.abs(p.x-(room.nx/2+room.ny/2))<1);
   assert.ok(onCorner,'rotated corner stays a corner at turn '+turns);
  }
  assert.deepEqual(mod.isoRotate(room.nx/2,room.ny/2,turns,room),{x:room.nx/2,y:room.ny/2},'centre is fixed');
 }
});
test('isoBoxFaces draws a solid box with top and exactly two visible walls',()=>{
 assert.equal(typeof mod.isoBoxFaces,'function','isoBoxFaces missing');
 const bed={x0:1300,y0:1120,x1:2700,y1:3120};
 for(let turns=0;turns<4;turns++){
  const box=mod.isoBoxFaces(bed,450,0,turns,room);
  assert.equal(box.top.points.length,4);
  assert.equal(box.sides.length,2,'exactly two side faces are visible at turn '+turns);
  for(const face of box.sides)assert.equal(face.points.length,4);
  const top=box.top.points.map(p=>p.sy),bottom=mod.isoBoxFaces(bed,0,0,turns,room).top.points.map(p=>p.sy);
  assert.ok(Math.min(...top)<Math.min(...bottom),'height lifts the top face at turn '+turns);
 }
});
test('taller furniture overlaps shorter furniture by painter depth order',()=>{
 const near={x0:0,y0:2620,x1:900,y1:3120},far={x0:1400,y0:0,x1:2600,y1:60};
 for(let turns=0;turns<4;turns++){
  const a=mod.isoBoxFaces(near,750,0,turns,room),b=mod.isoBoxFaces(far,1100,0,turns,room);
  assert.notEqual(a.depth,b.depth,'objects must be depth-sortable at turn '+turns);
 }
});
test('published editor exposes both projections and rotation controls',()=>{
 const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
 for(const id of ['plan','iso','isoRotateLeft','isoRotateRight','isoAngle'])assert.ok(html.includes('id="'+id+'"'),id+' missing');
 assert.ok(html.includes('isoProject'),'iso geometry must be embedded');
});
