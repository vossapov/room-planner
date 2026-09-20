#!/usr/bin/env node
// Core geometry tests - works with node
import { 
  rectOverlap, 
  rotatePoint, 
  rotateBedHeadEnd, 
  rotateDeskWorkSide,
  rotateDoor4ways,
  validateLayoutSchema,
  computeDoorSwingGeo,
  snapToGrid,
  pointInRect
} from './core.js';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passCount++;
  } else {
    console.error(`✗ ${message}`);
    failCount++;
    throw new Error(`FAIL: ${message}`);
  }
}

// Geometry corner tests
console.log('\n=== TEST: rectOverlap basic ===');
{
  const r1 = { x0: 0, y0: 0, x1: 100, y1: 100 };
  const r2 = { x0: 50, y0: 50, x1: 150, y1: 150 };
  assert(rectOverlap(r1, r2), 'overlapping rects detected');

  assert(!rectOverlap(r1, { x0: 100, y0: 100, x1: 200, y1: 200 }), 
    'touching edge not counted as overlap');
}

console.log('\n=== TEST: rotatePoint 4 ways ===');
{
  // (100, 100) around (50, 50) rotates 90deg CCW to (0, 100)
  const p = rotatePoint(100, 100, 50, 50, Math.PI / 2);
  const eps = 0.001;
  assert(Math.abs(p.x - 0) < eps && Math.abs(p.y - 100) < eps, 
    '90deg rotation correct (100,100) -> (0,100)');

  // 4x rotation should return to original
  let pt = { x: 100, y: 100 };
  const center = { x: 50, y: 50 };
  for (let i = 0; i < 4; i++) {
    pt = rotatePoint(pt.x, pt.y, center.x, center.y, Math.PI / 2);
  }
  assert(Math.abs(pt.x - 100) < eps && Math.abs(pt.y - 100) < eps,
    '4x 90deg returns to original');
}

console.log('\n=== TEST: rotateBedHeadEnd corners ===');
{
  // Bed 2000x1400 at (0, 1720, 2000, 3120), head_end "x0"
  const bed = { x0: 0, y0: 1720, x1: 2000, y1: 3120, head_end: 'x0' };
  const room = { nx: 2720, ny: 3120 };

  // Rotate x0 -> y0 (90deg CCW in plan view)
  let rotated = rotateBedHeadEnd(bed, 'y0', room);
  assert(rotated.head_end === 'y0', 'head_end updated to y0');

  // Verify dims swapped and position adjusted
  const width = rotated.x1 - rotated.x0;
  const height = rotated.y1 - rotated.y0;
  assert(Math.abs(width - 1400) < 1 && Math.abs(height - 2000) < 1,
    'bed dims swapped after rotation');

  // 4x rotation returns to original
  let b = bed;
  for (let i = 0; i < 4; i++) {
    const ends = ['x0', 'y0', 'x1', 'y1'];
    const nextEnd = ends[(ends.indexOf(b.head_end) + 1) % 4];
    b = rotateBedHeadEnd(b, nextEnd, room);
  }
  assert(Math.abs(b.x0 - bed.x0) < 1 && b.head_end === bed.head_end,
    '4x bed rotation returns to original');
}

console.log('\n=== TEST: rotateDeskWorkSide corners ===');
{
  const desk = { x0: 2120, y0: 0, x1: 2720, y1: 900, work_side: '-X' };
  const room = { nx: 2720, ny: 3120 };

  let d = desk;
  for (let i = 0; i < 4; i++) {
    const sides = ['-X', '-Y', '+X', '+Y'];
    const nextSide = sides[(sides.indexOf(d.work_side) + 1) % 4];
    d = rotateDeskWorkSide(d, nextSide, room);
  }
  assert(Math.abs(d.x0 - desk.x0) < 1 && d.work_side === desk.work_side,
    '4x desk rotation returns to original');
}

console.log('\n=== TEST: rotateDoor4ways all corners ===');
{
  const door = {
    d_mm: 900,
    swing: 'OutLeft',
    hinge_mm: [2820, 950],
    rough: { x0: 2720, y0: 900, x1: 2820, y1: 1800 }
  };
  const room = { nx: 2720, ny: 3120 };

  const swings = ['OutLeft', 'OutRight', 'InRight', 'InLeft'];
  for (const targetSwing of swings) {
    let rotated = rotateDoor4ways(door, targetSwing, room);
    assert(rotated.swing === targetSwing, `door rotated to ${targetSwing}`);
  }
}

console.log('\n=== TEST: validateLayoutSchema rejects malformed ===');
{
  const bad1 = { bed: { x0: 'notanumber', y0: 0, x1: 100, y1: 200 } };
  try {
    validateLayoutSchema(bad1);
    assert(false, 'should reject non-numeric x0');
  } catch (e) {
    assert(e.message.includes('x0'), 'rejects non-numeric x0');
  }

  const bad2 = { bed: { x0: 0, y0: 0, x1: -100, y1: 200 } };
  try {
    validateLayoutSchema(bad2);
    assert(false, 'should reject x0 >= x1');
  } catch (e) {
    assert(e.message.includes('x1'), 'rejects x0 >= x1');
  }
}

console.log('\n=== TEST: validateLayoutSchema accepts valid ===');
{
  const valid = {
    bed: { x0: 0, y0: 0, x1: 100, y1: 200 },
    desk: { x0: 100, y0: 0, x1: 200, y1: 100 }
  };
  try {
    validateLayoutSchema(valid);
    assert(true, 'valid layout accepted');
  } catch (e) {
    assert(false, `rejected valid layout: ${e.message}`);
  }
}

console.log('\n=== TEST: computeDoorSwingGeo OutLeft (variant-01) ===');
{
  const hinge_mm = [2820, 950];
  const d_mm = 800;
  const rough = { x0: 2720, y0: 900, x1: 2820, y1: 1800 };
  
  const geo = computeDoorSwingGeo(hinge_mm, d_mm, 'OutLeft', rough);
  assert(geo.leaf_closed && geo.leaf_open && geo.swing_zone,
    'computeDoorSwingGeo generates all geometries');
}

console.log('\n=== TEST: snapToGrid ===');
{
  const val = 437;
  const snapped = snapToGrid(val, 50);
  assert(Math.abs(snapped - 450) < 1 || Math.abs(snapped - 400) < 1,
    'snap to grid works');
}

console.log('\n=== TEST: pointInRect ===');
{
  const rect = { x0: 0, y0: 0, x1: 100, y1: 100 };
  assert(pointInRect(50, 50, rect), 'point inside rect');
  assert(!pointInRect(150, 50, rect), 'point outside rect');
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ ${passCount} tests passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
