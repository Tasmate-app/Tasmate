import { useEffect } from 'react';
import { useThree } from '@react-three/fiber/native';
import { Vector3 } from 'three';
import { createOrbitState, rotateOrbit, zoomOrbit } from './orbitCamera';

const CAMERA_TARGET = new Vector3(0, 0, 0);

type NativeTouch = {
  identifier: number;
  pageX: number;
  pageY: number;
};

type NativePointerEvent = Event & {
  touches?: NativeTouch[];
};

type GestureState =
  | { mode: 'rotate'; lastX: number; lastY: number }
  | { mode: 'pinch'; lastDistance: number };

function activeTouches(event: NativePointerEvent): NativeTouch[] {
  return Array.isArray(event.touches) ? event.touches : [];
}

function touchDistance(first: NativeTouch, second: NativeTouch): number {
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

export function TouchCameraControls() {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const viewportHeight = useThree((state) => state.size.height);

  useEffect(() => {
    if (viewportHeight <= 0) return;

    const spherical = createOrbitState(camera.position, CAMERA_TARGET);
    let gesture: GestureState | null = null;

    const syncGesture = (touches: NativeTouch[]) => {
      if (touches.length >= 2) {
        gesture = {
          mode: 'pinch',
          lastDistance: touchDistance(touches[0], touches[1]),
        };
        return;
      }
      if (touches.length === 1) {
        gesture = {
          mode: 'rotate',
          lastX: touches[0].pageX,
          lastY: touches[0].pageY,
        };
        return;
      }
      gesture = null;
    };

    const applyCamera = () => {
      camera.position.setFromSpherical(spherical).add(CAMERA_TARGET);
      camera.lookAt(CAMERA_TARGET);
    };

    const updateGesture = (touches: NativeTouch[]) => {
      if (touches.length >= 2) {
        const distance = touchDistance(touches[0], touches[1]);
        if (gesture?.mode !== 'pinch') {
          syncGesture(touches);
          return;
        }
        zoomOrbit(spherical, gesture.lastDistance, distance);
        gesture.lastDistance = distance;
        applyCamera();
        return;
      }

      if (touches.length === 1) {
        const touch = touches[0];
        if (gesture?.mode !== 'rotate') {
          syncGesture(touches);
          return;
        }
        const deltaX = touch.pageX - gesture.lastX;
        const deltaY = touch.pageY - gesture.lastY;
        rotateOrbit(spherical, deltaX, deltaY, viewportHeight);
        gesture.lastX = touch.pageX;
        gesture.lastY = touch.pageY;
        applyCamera();
      }
    };

    const handlePointerDown = (event: Event) => {
      syncGesture(activeTouches(event as NativePointerEvent));
    };
    const handlePointerMove = (event: Event) => {
      updateGesture(activeTouches(event as NativePointerEvent));
    };
    const handlePointerEnd = (event: Event) => {
      syncGesture(activeTouches(event as NativePointerEvent));
    };

    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerEnd);
    domElement.addEventListener('pointercancel', handlePointerEnd);
    domElement.addEventListener('lostpointercapture', handlePointerEnd);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerEnd);
      domElement.removeEventListener('pointercancel', handlePointerEnd);
      domElement.removeEventListener('lostpointercapture', handlePointerEnd);
    };
  }, [camera, domElement, viewportHeight]);

  return null;
}
