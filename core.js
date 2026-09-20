// Core geometry library for room layout editor
// Pure functions, no UI dependencies, testable with Node

export function rectOverlap(r1, r2) {
  // Two rects overlap if they are NOT separated
  // Touching edges are NOT considered overlapping
  return !(r1.x1 <= r2.x0 || r2.x1 <= r1.x0 || 
           r1.y1 <= r2.y0 || r2.y1 <= r1.y0);
}

export function pointInRect(x, y, rect) {
  return x >= rect.x0 && x <= rect.x1 && 
         y >= rect.y0 && y <= rect.y1;
}

export function rotatePoint(x, y, cx, cy, angle) {
  // Rotate (x, y) around (cx, cy) by angle radians (positive = CCW)
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

export function rotateBedHeadEnd(bed, newHeadEnd, room) {
  // Rotate bed around its center so head_end points to newHeadEnd
  // room = { nx, ny } = room dimensions
  const headEnds = ['x0', 'y0', 'x1', 'y1'];
  const currentIdx = headEnds.indexOf(bed.head_end);
  const newIdx = headEnds.indexOf(newHeadEnd);
  if (currentIdx === -1 || newIdx === -1) 
    throw new Error(`Invalid head_end: ${bed.head_end} or ${newHeadEnd}`);
  
  let rotations = (newIdx - currentIdx + 4) % 4;
  let result = { ...bed };
  
  for (let i = 0; i < rotations; i++) {
    result = _rotateBedOnce(result, room);
  }
  
  return result;
}

function _rotateBedOnce(bed, room) {
  // Rotate bed 90deg CCW (in world coords: Y up, X right)
  // head_end cycles: x0 -> y0 -> x1 -> y1 -> x0
  const w = bed.x1 - bed.x0;  // width along X
  const h = bed.y1 - bed.y0;  // height along Y
  const cx = bed.x0 + w / 2;
  const cy = bed.y0 + h / 2;
  
  // 90deg CCW rotation: new coords
  const corners = [
    { x: bed.x0, y: bed.y0 },
    { x: bed.x1, y: bed.y0 },
    { x: bed.x1, y: bed.y1 },
    { x: bed.x0, y: bed.y1 }
  ];
  
  const rotated = corners.map(c => rotatePoint(c.x, c.y, cx, cy, Math.PI / 2));
  
  const xs = rotated.map(c => c.x);
  const ys = rotated.map(c => c.y);
  const nx0 = Math.min(...xs);
  const nx1 = Math.max(...xs);
  const ny0 = Math.min(...ys);
  const ny1 = Math.max(...ys);
  
  const headEnds = ['x0', 'y0', 'x1', 'y1'];
  const currentIdx = headEnds.indexOf(bed.head_end);
  const newHeadEnd = headEnds[(currentIdx + 1) % 4];
  
  return {
    ...bed,
    x0: nx0,
    y0: ny0,
    x1: nx1,
    y1: ny1,
    head_end: newHeadEnd
  };
}

export function rotateDeskWorkSide(desk, newWorkSide, room) {
  // Rotate desk so work_side points to newWorkSide
  const sides = ['-X', '-Y', '+X', '+Y'];
  const currentIdx = sides.indexOf(desk.work_side);
  const newIdx = sides.indexOf(newWorkSide);
  if (currentIdx === -1 || newIdx === -1)
    throw new Error(`Invalid work_side: ${desk.work_side} or ${newWorkSide}`);
  
  let rotations = (newIdx - currentIdx + 4) % 4;
  let result = { ...desk };
  
  for (let i = 0; i < rotations; i++) {
    result = _rotateDeskOnce(result, room);
  }
  
  return result;
}

function _rotateDeskOnce(desk, room) {
  // Rotate desk 90deg CCW
  // work_side cycles: -X -> -Y -> +X -> +Y -> -X
  const w = desk.x1 - desk.x0;
  const h = desk.y1 - desk.y0;
  const cx = desk.x0 + w / 2;
  const cy = desk.y0 + h / 2;
  
  const corners = [
    { x: desk.x0, y: desk.y0 },
    { x: desk.x1, y: desk.y0 },
    { x: desk.x1, y: desk.y1 },
    { x: desk.x0, y: desk.y1 }
  ];
  
  const rotated = corners.map(c => rotatePoint(c.x, c.y, cx, cy, Math.PI / 2));
  
  const xs = rotated.map(c => c.x);
  const ys = rotated.map(c => c.y);
  const nx0 = Math.min(...xs);
  const nx1 = Math.max(...xs);
  const ny0 = Math.min(...ys);
  const ny1 = Math.max(...ys);
  
  const sides = ['-X', '-Y', '+X', '+Y'];
  const currentIdx = sides.indexOf(desk.work_side);
  const newWorkSide = sides[(currentIdx + 1) % 4];
  
  return {
    ...desk,
    x0: nx0,
    y0: ny0,
    x1: nx1,
    y1: ny1,
    work_side: newWorkSide
  };
}

export function rotateDoor4ways(door,targetSwing,room) {
  if(!['InLeft','InRight','OutLeft','OutRight'].includes(targetSwing))throw Error('Invalid swing');
  const outward=targetSwing.startsWith('Out'),top=targetSwing.endsWith('Left');
  if(!Number.isFinite(door.d_mm))throw Error('Invalid door position');
  return {...door,swing:targetSwing,hinge_mm:[outward?room.nx+100:room.nx,door.d_mm+(top?50:850)]};
}
export function computeDoorSwingGeo(hinge_mm,leafLen,swing,rough){
 const [hx,hy]=hinge_mm,thick=40,out=swing.startsWith('Out'),top=swing.endsWith('Left');
 const leaf_closed={x0:out?hx-thick:hx,y0:top?hy:hy-leafLen,x1:out?hx:hx+thick,y1:top?hy+leafLen:hy};
 const sign=out===top?-1:1,corners=[];
 for(const x of [leaf_closed.x0,leaf_closed.x1])for(const y of [leaf_closed.y0,leaf_closed.y1])corners.push([hx-sign*(y-hy),hy+sign*(x-hx)]);
 const leaf_open={x0:Math.min(...corners.map(p=>p[0])),y0:Math.min(...corners.map(p=>p[1])),x1:Math.max(...corners.map(p=>p[0])),y1:Math.max(...corners.map(p=>p[1]))};
 const radius=Math.hypot(leafLen,thick);
 const swing_zone={x0:out?hx-thick:hx-radius,y0:top?hy:hy-radius,x1:out?hx+radius:hx+thick,y1:top?hy+radius:hy};
 return {leaf_closed,leaf_open,swing_zone};
}

export function validateLayoutSchema(layout) {
  // Validate that layout has required numeric fields and no NaN/Infinity
  // Must reject empty {}, null, or objects with incomplete rect fields
  
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
    throw new Error('Layout must be a non-array object');
  }
  
  // Must have at least one furniture item
  const itemNames = ['bed', 'desk', 'storage', 'tv', 'door', 'chair_work', 'chair_pulled', 'chair_swept'];
  const hasAnyItem = itemNames.some(name => name in layout && layout[name] !== null);
  if (!hasAnyItem) {
    throw new Error('Layout must have at least one furniture item');
  }
  
  const checkRect = (obj, name) => {
    if (!obj) return;
    
    // Check that all required coord fields exist
    const requiredFields = ['x0', 'y0', 'x1', 'y1'];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        throw new Error(`${name}.${field} is missing`);
      }
      const val = obj[field];
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new Error(`${name}.${field} must be finite number, got ${val}`);
      }
    }
    
    if (obj.x0 >= obj.x1)
      throw new Error(`${name}: x0 >= x1`);
    if (obj.y0 >= obj.y1)
      throw new Error(`${name}: y0 >= y1`);
  };
  
  ['bed', 'desk', 'storage', 'tv', 'chair_work', 'chair_pulled', 'chair_swept']
    .forEach(key => checkRect(layout[key], key));
  
  if (layout.door) {
    if ('d_mm' in layout.door) {
      const val = layout.door.d_mm;
      if (typeof val !== 'number' || !Number.isFinite(val))
        throw new Error('door.d_mm must be finite number');
    }
    if ('swing' in layout.door && typeof layout.door.swing !== 'string')
      throw new Error('door.swing must be string');
    if ('hinge_mm' in layout.door) {
      if (!Array.isArray(layout.door.hinge_mm) || layout.door.hinge_mm.length !== 2)
        throw new Error('door.hinge_mm must be 2-element array');
      for (let i = 0; i < 2; i++) {
        const val = layout.door.hinge_mm[i];
        if (typeof val !== 'number' || !Number.isFinite(val))
          throw new Error(`door.hinge_mm[${i}] must be finite number`);
      }
    }
  }
}

export function snapToGrid(value, gridSize) {
  // Snap value to nearest grid line
  return Math.round(value / gridSize) * gridSize;
}

export function clampRect(rect, room) {
  // Translate rect to keep it within room bounds without shrinking
  let x0 = rect.x0;
  let y0 = rect.y0;
  const width = rect.x1 - rect.x0;
  const height = rect.y1 - rect.y0;
  
  // Clamp x0 to left wall
  if (x0 < 0) x0 = 0;
  // Clamp x1 to right wall by moving x0
  if (x0 + width > room.nx) x0 = room.nx - width;
  
  // Clamp y0 to top wall
  if (y0 < 0) y0 = 0;
  // Clamp y1 to bottom wall by moving y0
  if (y0 + height > room.ny) y0 = room.ny - height;
  
  return {
    x0,
    y0,
    x1: x0 + width,
    y1: y0 + height
  };
}

export function distPointToRect(px, py, rect) {
  // Minimum distance from point to rect
  const dx = Math.max(rect.x0 - px, 0, px - rect.x1);
  const dy = Math.max(rect.y0 - py, 0, py - rect.y1);
  return Math.sqrt(dx * dx + dy * dy);
}

export function rectCenter(rect) {
  return {
    x: (rect.x0 + rect.x1) / 2,
    y: (rect.y0 + rect.y1) / 2
  };
}

// Default room geometry (mm)
export const DEFAULT_ROOM = {
  nx: 2720,
  ny: 3120,
  window_y0_mm: 2710,
  window_y1_mm: 3060,
  convector_rect: { x0: 0, y0: 0, x1: 250, y1: 750 },
  niche_x0_mm: 1340,
  niche_x1_mm: 2720,
  partition_x: 2720,
  partition_thickness: 100
};

export function screenToWorld(screenX, room = DEFAULT_ROOM) {
  // Convert screen X coordinate to world X
  // screenX = 2720 - worldX (mirrored)
  return room.nx - screenX;
}

export function worldToScreen(worldX, room = DEFAULT_ROOM) {
  return room.nx - worldX;
}

