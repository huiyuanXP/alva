import * as THREE from 'three';
import {evaluateSunlight, type SunlightSettings, type SunlightState} from '../../../packages/contracts/alva/sunlight.js';

export type SunlightRig = ReturnType<typeof createSunlightRig>;

/** One lighting implementation for the topology/furniture and generated-building views. */
export function createSunlightRig(world: THREE.Scene, bounds: THREE.Box3) {
  if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)) {
    throw new Error('日照渲染需要有效的场景边界。');
  }
  const center = bounds.getCenter(new THREE.Vector3());
  // A bounding sphere fits the orthographic shadow camera at every sun angle.
  const radius = Math.max(3, bounds.getBoundingSphere(new THREE.Sphere()).radius) + 1;
  const distance = radius * 2 + 10;
  const sun = new THREE.DirectionalLight('#fff0ca', 0);
  const ambient = new THREE.HemisphereLight('#fffae8', '#797762', 0.25);
  sun.name = 'alva-sunlight';
  ambient.name = 'alva-sky-light';
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -radius, right: radius, top: radius, bottom: -radius,
    near: Math.max(0.1, distance - radius - 2), far: distance + radius + 2});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.target.position.copy(center);
  world.add(sun, sun.target, ambient);
  const night = new THREE.Color('#282f39'), day = new THREE.Color('#e7e5da');
  const background = new THREE.Color();
  world.background = background;
  let state: SunlightState | undefined;

  return {
    sun, ambient,
    get state() { return state; },
    update(settings: SunlightSettings): SunlightState {
      const next = evaluateSunlight(settings);
      sun.position.set(center.x + next.direction.x * distance, center.y + next.direction.y * distance,
        center.z + next.direction.z * distance);
      sun.intensity = next.directIntensity;
      sun.castShadow = next.daylight;
      sun.shadow.needsUpdate = true;
      ambient.intensity = 0.25 + 1.25 * next.skyBlend;
      background.copy(night).lerp(day, next.skyBlend);
      state = next;
      return next;
    },
    dispose() {
      sun.shadow.dispose();
      world.remove(sun, sun.target, ambient);
    },
  };
}
