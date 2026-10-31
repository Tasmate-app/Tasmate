import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import lunaAsset from '../../assets/luna.glb';

// React Native exposes a navigator without userAgent. GLTFLoader reads it
// during parser construction and assumes the browser DOM shape.
if (typeof navigator !== 'undefined' && typeof navigator.userAgent !== 'string') {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'ReactNative',
  });
}

const LUNA_HEIGHT = 1.7;

interface LunaSceneProps {
  selected: boolean;
  onToggleSelected: () => void;
  onModelReady: () => void;
  onModelError: () => void;
  onContextReady: () => void;
  onFps: (fps: number) => void;
}

export function LunaScene({
  selected,
  onToggleSelected,
  onModelReady,
  onModelError,
  onContextReady,
  onFps,
}: LunaSceneProps) {
  return (
    <Canvas
      style={{ flex: 1 }}
      camera={{ position: [0, 1.1, 3.2], fov: 40, near: 0.1, far: 20 }}
      gl={{ antialias: true }}
      onCreated={() => onContextReady()}
      onPointerMissed={() => {
        if (selected) onToggleSelected();
      }}
    >
      <color attach="background" args={['#e7f6ff']} />
      <ambientLight intensity={1.3} />
      <hemisphereLight args={['#ffffff', '#7dd3fc', 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <pointLight position={[-3, 2, -2]} intensity={12} color="#a5b4fc" distance={9} />

      <FrameReporter onFps={onFps} />
      <Backdrop />

      <ModelBoundary fallback={<ModelFallback />} onError={onModelError}>
        <Suspense fallback={<LoadingCube />}>
          <LunaModel
            selected={selected}
            onToggleSelected={onToggleSelected}
            onReady={onModelReady}
          />
        </Suspense>
      </ModelBoundary>
    </Canvas>
  );
}

function FrameReporter({ onFps }: { onFps: (fps: number) => void }) {
  const frames = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    frames.current += 1;
    elapsed.current += delta;
    if (elapsed.current >= 1) {
      onFps(Math.round(frames.current / elapsed.current));
      frames.current = 0;
      elapsed.current = 0;
    }
  });

  return null;
}

function Backdrop() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial color="#d8effb" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[1.25, 1.28, 96]} />
        <meshBasicMaterial color="#9ddcf7" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function LoadingCube() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ref.current === null) return;
    ref.current.rotation.x += delta * 0.8;
    ref.current.rotation.y += delta * 1.1;
    ref.current.position.y = 0.85 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });

  return (
    <mesh ref={ref} position={[0, 0.85, 0]}>
      <boxGeometry args={[0.55, 0.55, 0.55]} />
      <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

function ModelFallback() {
  return (
    <mesh position={[0, 0.85, 0]}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#f87171" wireframe />
    </mesh>
  );
}

function LunaModel({
  selected,
  onToggleSelected,
  onReady,
}: {
  selected: boolean;
  onToggleSelected: () => void;
  onReady: () => void;
}) {
  // Metro asset IDs are numbers, but R3F's public type only accepts URL strings.
  const gltf = useLoader(GLTFLoader, lunaAsset as unknown as string);
  const model = useMemo(() => prepareLuna(gltf.scene), [gltf.scene]);
  const modelRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const targetScale = selected ? 1.05 : 1;

    if (modelRef.current !== null) {
      modelRef.current.rotation.y = Math.sin(time * 0.45) * 0.28;
      const nextScale = THREE.MathUtils.damp(modelRef.current.scale.x, targetScale, 8, delta);
      modelRef.current.scale.setScalar(nextScale);
    }

    if (ringRef.current !== null) {
      const pulse = selected ? 1 + Math.sin(time * 3.2) * 0.045 : 1;
      ringRef.current.scale.setScalar(pulse);
    }

    if (ringMaterialRef.current !== null) {
      ringMaterialRef.current.opacity = selected
        ? 0.75 + Math.sin(time * 3.2) * 0.2
        : 0.35;
    }
  });

  return (
    <group onClick={() => onToggleSelected()}>
      <group ref={modelRef}>
        <primitive object={model} dispose={null} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.4, 48]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.43, 0.5, 64]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color={selected ? '#06b6d4' : '#94a3b8'}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 1.9, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function prepareLuna(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  const bounds = new THREE.Box3().setFromObject(clone);
  const size = bounds.getSize(new THREE.Vector3());
  if (size.y <= 0) return clone;

  clone.scale.setScalar(LUNA_HEIGHT / size.y);
  clone.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(clone);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  clone.position.set(-center.x, -scaledBounds.min.y, -center.z);

  return clone;
}

class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
