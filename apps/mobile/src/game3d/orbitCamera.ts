import { MathUtils, Spherical, Vector3 } from 'three';

export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

export const DEFAULT_ORBIT_LIMITS: OrbitLimits = {
  minDistance: 3,
  maxDistance: 12,
  minPolarAngle: 0.2,
  maxPolarAngle: Math.PI / 2.2,
};

export function createOrbitState(position: Vector3, target: Vector3): Spherical {
  return new Spherical().setFromVector3(position.clone().sub(target));
}

export function rotateOrbit(
  spherical: Spherical,
  deltaX: number,
  deltaY: number,
  viewportHeight: number,
  limits: OrbitLimits = DEFAULT_ORBIT_LIMITS,
): void {
  if (viewportHeight <= 0) return;

  spherical.theta -= (deltaX / viewportHeight) * Math.PI * 2;
  spherical.phi = MathUtils.clamp(
    spherical.phi - (deltaY / viewportHeight) * Math.PI,
    limits.minPolarAngle,
    limits.maxPolarAngle,
  );
}

export function zoomOrbit(
  spherical: Spherical,
  previousDistance: number,
  distance: number,
  limits: OrbitLimits = DEFAULT_ORBIT_LIMITS,
): void {
  if (previousDistance <= 0 || distance <= 0) return;

  spherical.radius = MathUtils.clamp(
    spherical.radius * (previousDistance / distance),
    limits.minDistance,
    limits.maxDistance,
  );
}
