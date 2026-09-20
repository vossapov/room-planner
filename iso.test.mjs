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

const CONCEPT=JSON.parse(fs.readFileSync(new URL('./presets/concept-02.json',import.meta.url),'utf8'));
test('isoDepthSort paints separated objects strictly back to front at every corner',()=>{
 assert.equal(typeof mod.isoDepthSort,'function','isoDepthSort missing');
 const items=[{key:'bed',rect:CONCEPT.bed},{key:'desk',rect:CONCEPT.desk},{key:'storage',rect:CONCEPT.storage},{key:'tv',rect:CONCEPT.tv},{key:'conv',rect:{x0:0,y0:0,x1:250,y1:750}}];
 for(let turns=0;turns<4;turns++){
  const order=mod.isoDepthSort(items,turns,room);
  assert.equal(order.length,items.length,'no object may be dropped');
  const index=Object.fromEntries(order.map((o,i)=>[o.key,i]));
  for(const a of items)for(const b of items){
   if(a.key===b.key)continue;
   const ra=mod.isoRotateRect(a.rect,turns,room),rb=mod.isoRotateRect(b.rect,turns,room);
   const aFar=(room.nx-ra.x0)<=(room.nx-rb.x1)||ra.y1<=rb.y0;
   const bFar=(room.nx-rb.x0)<=(room.nx-ra.x1)||rb.y1<=ra.y0;
   if(aFar&&!bFar)assert.ok(index[a.key]<index[b.key],`turn ${turns}: ${a.key} is behind ${b.key} and must be drawn first`);
  }
 }
});
test('the television is a vertical panel hung on the wall, not a flat slab',()=>{
 assert.ok(mod.FURNITURE_HEIGHT,'FURNITURE_HEIGHT missing');
 const tv=mod.FURNITURE_HEIGHT.tv;
 assert.ok(tv.height>=500,'a 1200 mm television must be at least 500 mm tall, got '+tv.height);
 assert.ok(tv.base>=900,'the television hangs above the floor');
 assert.ok(tv.height>Math.abs(CONCEPT.tv.y1-CONCEPT.tv.y0),'height must exceed the 60 mm panel thickness');
});
test('wall openings cut real holes with sill, lintel and side panels',()=>{
 assert.equal(typeof mod.isoWallPanels,'function','isoWallPanels missing');
 const panels=mod.isoWallPanels({from:0,to:3120,height:2500},[{from:250,to:1150,z0:0,z1:2100}]);
 assert.ok(panels.length>=2,'a door must leave side panels and a lintel');
 for(const p of panels)assert.ok(p.to>p.from&&p.z1>p.z0,'panels must be real rectangles');
 const covers=(a,b)=>panels.some(p=>p.from<=a&&p.to>=b);
 assert.ok(covers(0,250)&&covers(1150,3120),'wall continues on both sides of the opening');
 assert.ok(panels.some(p=>p.from<=250&&p.to>=1150&&p.z0>=2100),'lintel above the door');
 assert.ok(!panels.some(p=>p.from<1150&&p.to>250&&p.z0<2100&&p.z1>0&&p.from>=250&&p.to<=1150),'no panel inside the doorway');
 const win=mod.isoWallPanels({from:0,to:3120,height:2500},[{from:2710,to:3060,z0:900,z1:2100}]);
 assert.ok(win.some(p=>p.from<=2710&&p.to>=3060&&p.z1<=900),'window keeps a sill below the glass');
 assert.ok(win.some(p=>p.from<=2710&&p.to>=3060&&p.z0>=2100),'window keeps a lintel above the glass');
});
test('built page renders wall openings and marks assumed heights',()=>{
 const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.ok(html.includes('isoWallPanels')&&html.includes('isoDepthSort'),'fixed geometry must be embedded');
 assert.ok(/припущен/i.test(html),'assumed opening heights must be disclosed to the user');
});

test('the shell only has openings that exist inside this room',()=>{
 assert.ok(mod.ROOM_SHELL,'ROOM_SHELL missing');
 const {nx,ny}=room;
 for(const [side,list] of Object.entries(mod.ROOM_SHELL.openings||{}))
  for(const o of list){
   const limit=(side==='top'||side==='bottom')?nx:ny;
   assert.ok(o.from>=0&&o.to<=limit,`${side} opening ${o.from}..${o.to} leaves the room (limit ${limit})`);
  }
 const right=(mod.ROOM_SHELL.openings||{}).right||[];
 assert.equal(right.length,0,'the balcony passage belongs to the old room, not this partition');
});
test('the boarded niche is a recess on the balcony wall, not a hole',()=>{
 const niche=mod.ROOM_SHELL.recesses.find(r=>r.kind==='niche');
 assert.ok(niche,'niche recess missing');
 assert.equal(niche.side,'top','the niche is on the balcony wall Y=0');
 assert.deepEqual([niche.from,niche.to],[1340,2720],'niche interval must match the validated 1340..2720');
 assert.ok(niche.depth>0&&niche.depth<mod.ROOM_SHELL.wall,'a recess is shallower than the wall, it does not pierce it');
});
test('the small window sits on the street wall where the plan puts it',()=>{
 const win=(mod.ROOM_SHELL.openings.left||[])[0];
 assert.ok(win,'window missing from the left wall');
 assert.deepEqual([win.from,win.to],[2710,3060]);
});

test('every opening gets a reveal so it reads as a doorway, not a void',()=>{
 assert.equal(typeof mod.isoOpeningReveal,'function','isoOpeningReveal missing');
 const faces=mod.isoOpeningReveal({side:'right',from:250,to:1150,z0:0,z1:2100},60,0,room);
 assert.ok(faces.length>=3,'a reveal needs a back plane plus jambs/head');
 for(const f of faces)assert.equal(f.points.length,4);
 const ys=faces.flatMap(f=>f.points.map(p=>p.sy));
 assert.ok(Math.max(...ys)-Math.min(...ys)>100,'the reveal has real height on screen');
});

test('the reveal back plane has real width, never a degenerate line',()=>{
 for(const side of ['left','right','top','bottom']){
  const faces=mod.isoOpeningReveal({side,from:250,to:1150,z0:0,z1:2100},60,0,room);
  const xs=faces[0].points.map(p=>p.sx),ys=faces[0].points.map(p=>p.sy);
  assert.ok(Math.max(...xs)-Math.min(...xs)>50,side+' back plane collapsed horizontally');
  assert.ok(Math.max(...ys)-Math.min(...ys)>50,side+' back plane collapsed vertically');
 }});

test('openings are filled surfaces, never see-through voids',()=>{
 const faces=mod.isoOpeningReveal({side:'right',from:250,to:1150,z0:0,z1:2100},60,0,room);
 assert.ok(faces.length>=4,'reveal must close the hole on both faces of the wall');
 const spans=faces.map(f=>{const xs=f.points.map(p=>p.sx),ys=f.points.map(p=>p.sy);return [Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]});
 assert.ok(spans.filter(([w,h])=>w>50&&h>50).length>=2,'at least the near and far planes must be full surfaces');
});
