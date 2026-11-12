import { describe, expect, it } from 'vitest';
import { Spherical, Vector3 } from 'three';
import {
  DEFAULT_ORBIT_LIMITS,
  createOrbitState,
  rotateOrbit,
  zoomOrbit,
} from '../apps/mobile/src/game3d/orbitCamera';

describe('mobile orbit camera math', () => {
  it('creates spherical coordinates relative to the target', () => {
    const state = createOrbitState(new Vector3(0, 2, 4), new Vector3(0, 0, 0));

    expect(state.radius).toBeCloseTo(Math.hypot(2, 4));
    expect(state.phi).toBeCloseTo(Math.acos(2 / Math.hypot(2, 4)));
    expect(state.theta).toBeCloseTo(0);
  });

  it('rotates yaw and clamps pitch', () => {
    const state = new Spherical(5, Math.PI / 3, 0);

    rotateOrbit(state, 100, 0, 400);
    expect(state.theta).toBeCloseTo(-Math.PI / 2);

    rotateOrbit(state, 0, 10000, 400);
    expect(state.phi).toBeCloseTo(DEFAULT_ORBIT_LIMITS.minPolarAngle);

    rotateOrbit(state, 0, -10000, 400);
    expect(state.phi).toBeCloseTo(DEFAULT_ORBIT_LIMITS.maxPolarAngle);
  });

  it('clamps pinch zoom distance', () => {
    const state = new Spherical(5, Math.PI / 3, 0);

    zoomOrbit(state, 100, 20);
    expect(state.radius).toBeCloseTo(DEFAULT_ORBIT_LIMITS.maxDistance);

    zoomOrbit(state, 20, 100);
    expect(state.radius).toBeCloseTo(DEFAULT_ORBIT_LIMITS.minDistance);
  });

  it('ignores invalid gesture measurements', () => {
    const state = new Spherical(5, Math.PI / 3, 0);

    rotateOrbit(state, 100, 100, 0);
    zoomOrbit(state, 0, 100);
    zoomOrbit(state, 100, 0);

    expect(state.theta).toBe(0);
    expect(state.phi).toBe(Math.PI / 3);
    expect(state.radius).toBe(5);
  });
});
