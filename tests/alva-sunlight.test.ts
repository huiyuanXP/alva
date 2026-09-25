import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {evaluateSunlight, formatSolarDate, formatSolarTime, parseSunlightSettings, SunlightInputError,
  type SunlightSettings} from '../packages/contracts/alva/sunlight.js';
import {createSunlightRig} from '../web/src/scene/sunlight.js';

const base: SunlightSettings = {time: 12, day: 172, latitude: 31, north: 0};
const near = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const sun = (changes: Partial<SunlightSettings> = {}) => evaluateSunlight({...base, ...changes});

test('ALVA-040 noon solstice elevations agree with independent 90-latitude+declination benchmarks', () => {
  near(sun().altitudeDegrees, 82.45, 0.1);
  near(sun({day: 355}).altitudeDegrees, 35.58, 0.1);
  near(sun({day: 80, latitude: 0}).altitudeDegrees, 90, 0.15);
});

test('ALVA-040 morning is east and afternoon west when plan top is north', () => {
  const morning = sun({time: 9}), afternoon = sun({time: 15});
  assert.ok(morning.direction.x > 0 && afternoon.direction.x < 0);
  assert.ok(morning.azimuthDegrees < 180 && afternoon.azimuthDegrees > 180);
  near(morning.direction.x, -afternoon.direction.x);
  near(morning.direction.z, afternoon.direction.z);
  near(morning.altitudeDegrees, afternoon.altitudeDegrees);
});

test('ALVA-040 changing north rotates the light without changing elevation or geographic azimuth', () => {
  const original = sun({time: 9}), rotated = sun({time: 9, north: 90});
  near(rotated.direction.x, -original.direction.z);
  near(rotated.direction.z, original.direction.x);
  near(rotated.altitudeDegrees, original.altitudeDegrees);
  near(rotated.azimuthDegrees, original.azimuthDegrees);
});

test('ALVA-040 hemisphere changes are real geometry, not fixed northern-hemisphere presets', () => {
  assert.ok(sun({latitude: -31, day: 355}).altitudeDegrees > sun({latitude: -31, day: 172}).altitudeDegrees);
  assert.ok(sun({latitude: -31, day: 355}).direction.z < 0, 'southern observer sees noon sun to the north');
  assert.ok(sun({latitude: 31, day: 172}).direction.z > 0, 'northern observer sees noon sun to the south');
});

test('ALVA-040 night is below the horizon with zero direct sunlight', () => {
  for (const latitude of [-66, -31, 0, 31, 66]) {
    for (const day of [1, 172, 355]) {
      const state = sun({time: 0, latitude, day});
      assert.ok(state.altitudeDegrees < 0 && state.direction.y < 0);
      assert.equal(state.directIntensity, 0);
      assert.equal(state.daylight, false);
    }
  }
});

test('ALVA-040 24:00/00:00 and north 360/0 are equivalent, without mutating the input', () => {
  const settings = {time: 24, day: 172, latitude: 31, north: 360};
  const copy = structuredClone(settings), wrapped = evaluateSunlight(settings), zero = sun({time: 0});
  assert.deepEqual(wrapped.direction, zero.direction);
  near(wrapped.directIntensity, zero.directIntensity);
  assert.deepEqual(settings, copy);
  assert.ok(Object.isFrozen(wrapped) && Object.isFrozen(wrapped.settings) && Object.isFrozen(wrapped.direction));
});

test('ALVA-040 all supported latitude/date/hour/orientation samples yield finite unit directions', () => {
  let samples = 0;
  for (const latitude of [-66, -31, 0, 31, 66]) for (const day of [1, 80, 172, 266, 355, 365]) {
    for (let time = 0; time <= 24; time += 0.5) for (const north of [0, 90, 180, 270, 360]) {
      const state = sun({time, day, latitude, north});
      near(Math.hypot(state.direction.x, state.direction.y, state.direction.z), 1);
      assert.ok([state.altitudeDegrees, state.azimuthDegrees, state.directIntensity, state.skyBlend].every(Number.isFinite));
      assert.ok(state.skyBlend >= 0 && state.skyBlend <= 1);
      if (!state.daylight) assert.equal(state.directIntensity, 0);
      samples++;
    }
  }
  assert.equal(samples, 7350);
});

test('ALVA-040 malformed or out-of-contract parameters return stable errors, never silent coercion', () => {
  const invalid: unknown[] = [null, [], {}, 'summer', {...base, time: '14'}, {...base, time: NaN},
    {...base, time: Infinity}, {...base, time: -1}, {...base, time: 25}, {...base, day: 0},
    {...base, day: 366}, {...base, day: 172.5}, {...base, latitude: -67}, {...base, latitude: 67},
    {...base, north: -1}, {...base, north: 361}, {...base, unexpected: true}];
  for (const value of invalid) assert.throws(() => parseSunlightSettings(value), (error: unknown) =>
    error instanceof SunlightInputError && error.code === 'INVALID_SUNLIGHT_PARAMETERS' && !!error.field && !!error.message);
});

test('ALVA-040 ground-shadow rays reverse east/west and grow in winter', () => {
  const shadow = (state: ReturnType<typeof sun>) => ({x: -2 * state.direction.x / state.direction.y,
    z: -2 * state.direction.z / state.direction.y});
  assert.ok(shadow(sun({time: 9})).x < 0 && shadow(sun({time: 15})).x > 0);
  assert.ok(Math.abs(shadow(sun({day: 355})).z) > Math.abs(shadow(sun()).z) * 5);
});

test('ALVA-040 both renderers use a real Three.js directional light aimed relative to scene center', () => {
  const world = new THREE.Scene(), bounds = new THREE.Box3(new THREE.Vector3(40, 0, -30), new THREE.Vector3(60, 4, -20));
  const rig = createSunlightRig(world, bounds);
  try {
    const state = rig.update({...base, time: 9});
    const direction = rig.sun.position.clone().sub(rig.sun.target.position).normalize();
    near(direction.x, state.direction.x); near(direction.y, state.direction.y); near(direction.z, state.direction.z);
    assert.deepEqual(rig.sun.target.position.toArray(), [50, 2, -25]);
    assert.equal(rig.sun.target.parent, world);
    assert.equal(rig.sun.castShadow, true);
    assert.equal(rig.sun.intensity, state.directIntensity);
  } finally { rig.dispose(); }
  assert.equal(world.children.length, 0);
});

test('ALVA-040 shadow camera encloses all scene corners for small/large and translated layouts', () => {
  for (const bounds of [new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(8, 3, 6)),
    new THREE.Box3(new THREE.Vector3(100, 0, -80), new THREE.Vector3(220, 6, 20))]) {
    const world = new THREE.Scene(), rig = createSunlightRig(world, bounds);
    try {
      for (const settings of [{...base, time: 9}, {...base, day: 355, time: 15}, {...base, north: 90}]) {
        rig.update(settings); world.updateMatrixWorld(true); rig.sun.shadow.updateMatrices(rig.sun);
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = new THREE.Vector3(x, y, z).project(rig.sun.shadow.camera);
            assert.ok(projected.toArray().every(value => Number.isFinite(value) && Math.abs(value) < 1));
          }
        }
      }
    } finally { rig.dispose(); }
  }
});

test('ALVA-040 rendering night disables sun shadows and subsequent daylight restores them', () => {
  const world = new THREE.Scene(), rig = createSunlightRig(world, new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(8, 3, 6)));
  try {
    rig.update(base); const daytimeAmbient = rig.ambient.intensity;
    rig.update({...base, time: 0});
    assert.equal(rig.sun.intensity, 0); assert.equal(rig.sun.castShadow, false);
    assert.ok(rig.sun.position.y < rig.sun.target.position.y);
    assert.ok(rig.ambient.intensity < daytimeAmbient);
    rig.update(base); assert.equal(rig.sun.castShadow, true); assert.ok(rig.sun.intensity > 0);
  } finally { rig.dispose(); }
});

test('ALVA-040 visible date/time labels are non-leap and half hours are minutes, not 14.5:00', () => {
  assert.equal(formatSolarTime(14.5), '14:30'); assert.equal(formatSolarTime(0), '00:00');
  assert.equal(formatSolarTime(24), '24:00');
  for (const [day, expected] of [[1, '01月01日'], [59, '02月28日'], [60, '03月01日'], [172, '06月21日'], [355, '12月21日'], [365, '12月31日']] as const) {
    assert.equal(formatSolarDate(day), expected);
  }
  assert.throws(() => formatSolarDate(366), SunlightInputError);
  assert.throws(() => formatSolarTime(NaN), SunlightInputError);
});

test('ALVA-040 empty/non-finite render bounds are rejected before creating lights', () => {
  const world = new THREE.Scene();
  assert.throws(() => createSunlightRig(world, new THREE.Box3()));
  assert.throws(() => createSunlightRig(world, new THREE.Box3(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(2, 3, 4))));
  assert.equal(world.children.length, 0);
});
