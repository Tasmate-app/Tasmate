import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import lunaAsset from '../../assets/luna.glb';

if (typeof navigator !== 'undefined' && typeof navigator.userAgent !== 'string') {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'ReactNative',
  });
}

const LUNA_HEIGHT = 1.55;

type InfoLogContext = {
  getProgramInfoLog: (program: WebGLProgram) => string | null | undefined;
  getShaderInfoLog: (shader: WebGLShader) => string | null | undefined;
};

const patchedInfoLogContexts = new WeakSet<InfoLogContext>();

function patchShaderInfoLogs(renderer: THREE.WebGLRenderer) {
  const context = renderer.getContext() as unknown as InfoLogContext;
  if (patchedInfoLogContexts.has(context)) return;
  patchedInfoLogContexts.add(context);

  const programInfoLog = context.getProgramInfoLog?.bind(context);
  if (programInfoLog !== undefined) {
    context.getProgramInfoLog = (program) => programInfoLog(program) ?? '';
  }

  const shaderInfoLog = context.getShaderInfoLog?.bind(context);
  if (shaderInfoLog !== undefined) {
    context.getShaderInfoLog = (shader) => shaderInfoLog(shader) ?? '';
  }
}

export interface RoomCharacterVisual {
  definitionId: string;
  color: string;
}

interface RoomSceneProps {
  characters: RoomCharacterVisual[];
  selectedCharacterId: string | null;
  selectedFacilityId: string | null;
  onSelectCharacter: (definitionId: string) => void;
  onSelectFacility: (definitionId: string) => void;
  onClearSelection: () => void;
  onModelReady: () => void;
  onModelError: () => void;
}

const CHARACTER_POSITIONS: Record<string, [number, number, number]> = {
  'c-hinata': [-0.62, 0, 0.8],
  'c-luna': [0.45, 0, 0.45],
  'c-aster': [1.4, 0, 0.72],
};

function characterPosition(definitionId: string, index: number): [number, number, number] {
  return CHARACTER_POSITIONS[definitionId] ?? [-0.9 + index * 0.85, 0, 0.75];
}

export function RoomScene({
  characters,
  selectedCharacterId,
  selectedFacilityId,
  onSelectCharacter,
  onSelectFacility,
  onClearSelection,
  onModelReady,
  onModelError,
}: RoomSceneProps) {
  const hasLuna = characters.some((character) => character.definitionId === 'c-luna');
  const otherCharacters = characters.filter(
    (character) => character.definitionId !== 'c-luna',
  );
  return (
    <Canvas
      style={{ flex: 1 }}
      camera={{ position: [0, 2.3, 5.2], fov: 42, near: 0.1, far: 30 }}
      gl={{ antialias: true }}
      onPointerMissed={onClearSelection}
      onCreated={({ gl }) => patchShaderInfoLogs(gl)}
    >
      <color attach="background" args={['#ecf9ff']} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#ffffff', '#7dd3fc', 1.2]} />
      <directionalLight position={[4, 6, 4]} intensity={2.6} />
      <pointLight position={[-3, 2.5, 1]} intensity={10} color="#c4b5fd" distance={10} />
      <pointLight position={[2, 2, 2]} intensity={7} color="#67e8f9" distance={8} />

      <RoomShell />
      <Bed />
      <Desk
        selected={selectedFacilityId === 'f-coin'}
        onSelect={() => onSelectFacility('f-coin')}
      />
      <Shelf
        selected={selectedFacilityId === 'f-star'}
        onSelect={() => onSelectFacility('f-star')}
      />
      <Plant />

      {otherCharacters.map((character, index) => (
        <PlaceholderCharacter
          key={character.definitionId}
          position={characterPosition(character.definitionId, index)}
          color={character.color}
          selected={selectedCharacterId === character.definitionId}
          onSelect={() => onSelectCharacter(character.definitionId)}
        />
      ))}

      {hasLuna && (
        <ModelBoundary
          fallback={
            <PlaceholderCharacter
              position={characterPosition('c-luna', 0)}
              color="#818cf8"
              selected={selectedCharacterId === 'c-luna'}
              onSelect={() => onSelectCharacter('c-luna')}
            />
          }
          onError={onModelError}
        >
          <Suspense fallback={<LoadingCube />}>
            <LunaCharacter
              selected={selectedCharacterId === 'c-luna'}
              onSelect={() => onSelectCharacter('c-luna')}
              onReady={onModelReady}
            />
          </Suspense>
        </ModelBoundary>
      )}
    </Canvas>
  );
}

function RoomShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[5.6, 4.4]} />
        <meshStandardMaterial color="#c7e8f7" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.35, -2.22]} receiveShadow>
        <boxGeometry args={[5.6, 2.8, 0.12]} />
        <meshStandardMaterial color="#e6f7ff" roughness={1} />
      </mesh>
      <mesh position={[-2.82, 1.35, 0]} receiveShadow>
        <boxGeometry args={[0.12, 2.8, 4.5]} />
        <meshStandardMaterial color="#dbf3ff" roughness={1} />
      </mesh>
      <mesh position={[0, 1.95, -2.14]}>
        <planeGeometry args={[2.3, 1.15]} />
        <meshStandardMaterial
          color="#bdefff"
          emissive="#7dd3fc"
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 1.95, -2.12]}>
        <boxGeometry args={[0.07, 1.15, 0.03]} />
        <meshStandardMaterial color="#f8fdff" />
      </mesh>
      <mesh position={[0, 1.95, -2.12]}>
        <boxGeometry args={[2.3, 0.07, 0.03]} />
        <meshStandardMaterial color="#f8fdff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.45, 0.005, 0.45]}>
        <circleGeometry args={[1.25, 48]} />
        <meshStandardMaterial color="#f0c987" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.45, 0.012, 0.45]}>
        <ringGeometry args={[0.98, 1.02, 48]} />
        <meshStandardMaterial color="#e8b565" roughness={1} />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group position={[-1.85, 0, -1.25]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.35, 0.44, 1.75]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.25, 0.16, 1.6]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, -0.55]}>
        <boxGeometry args={[1.05, 0.16, 0.38]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, -0.82]}>
        <boxGeometry args={[1.35, 0.75, 0.12]} />
        <meshStandardMaterial color="#bfe9fb" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Desk({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (glow.current === null) return;
    const target = selected ? 1.5 : 0.7;
    glow.current.emissiveIntensity =
      target + Math.sin(state.clock.elapsedTime * 3) * (selected ? 0.35 : 0.1);
  });

  return (
    <group position={[1.75, 0, -1.55]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.2, 0.09, 0.72]} />
        <meshStandardMaterial color="#f8d9a8" roughness={0.8} />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.32, 0]}>
          <boxGeometry args={[0.08, 0.65, 0.62]} />
          <meshStandardMaterial color="#e7c48c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.84, 0.02]}>
        <boxGeometry args={[0.35, 0.07, 0.25]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      <mesh position={[0, 0.98, 0.02]}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial
          ref={glow}
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.7}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function Shelf({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (glow.current === null) return;
    const target = selected ? 1.4 : 0.55;
    glow.current.emissiveIntensity =
      target + Math.sin(state.clock.elapsedTime * 2.6) * (selected ? 0.3 : 0.08);
  });

  return (
    <group position={[-2.3, 0, -1.9]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.8, 1.7, 0.38]} />
        <meshStandardMaterial color="#f4e4cd" roughness={0.9} />
      </mesh>
      {[0.4, 0.82, 1.24].map((y) => (
        <mesh key={y} position={[0, y, 0.2]}>
          <boxGeometry args={[0.68, 0.05, 0.5]} />
          <meshStandardMaterial color="#e0bd94" />
        </mesh>
      ))}
      <mesh position={[0.02, 0.98, 0.22]}>
        <sphereGeometry args={[0.1, 18, 18]} />
        <meshStandardMaterial
          ref={glow}
          color="#f472b6"
          emissive="#f472b6"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Plant() {
  return (
    <group position={[2.25, 0, 0.35]}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.22, 0.17, 0.44, 20]} />
        <meshStandardMaterial color="#f0a879" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color="#4ade80" roughness={0.95} />
      </mesh>
      <mesh position={[0.18, 0.53, 0.12]}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshStandardMaterial color="#22c55e" roughness={0.95} />
      </mesh>
      <mesh position={[-0.17, 0.9, -0.05]}>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshStandardMaterial color="#86efac" roughness={0.95} />
      </mesh>
    </group>
  );
}

function LoadingCube() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ref.current === null) return;
    ref.current.rotation.x += delta * 0.8;
    ref.current.rotation.y += delta * 1.1;
    ref.current.position.y = 0.75 + Math.sin(state.clock.elapsedTime * 2) * 0.07;
  });

  return (
    <mesh ref={ref} position={[0.45, 0.75, 0.45]}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color="#38bdf8" roughness={0.35} />
    </mesh>
  );
}

function PlaceholderCharacter({
  position,
  color,
  selected,
  onSelect,
}: {
  position: [number, number, number];
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.28, 0.8, 8, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#f3d6c2" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[0.36, 0.42, 40]} />
        <meshBasicMaterial
          color={selected ? '#06b6d4' : '#94a3b8'}
          transparent
          opacity={selected ? 0.8 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function LunaCharacter({
  selected,
  onSelect,
  onReady,
}: {
  selected: boolean;
  onSelect: () => void;
  onReady: () => void;
}) {
  const gltf = useLoader(GLTFLoader, lunaAsset as unknown as string);
  const model = useMemo(() => prepareLuna(gltf.scene), [gltf.scene]);
  const modelRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (modelRef.current !== null) {
      modelRef.current.rotation.y = Math.sin(time * 0.4) * 0.22;
      const target = selected ? 1.06 : 1;
      const next = THREE.MathUtils.damp(modelRef.current.scale.x, target, 8, delta);
      modelRef.current.scale.setScalar(next);
    }
    if (ringMaterialRef.current !== null) {
      ringMaterialRef.current.opacity = selected
        ? 0.7 + Math.sin(time * 3) * 0.2
        : 0.32;
    }
  });

  return (
    <group position={[0.45, 0, 0.45]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <group ref={modelRef}>
        <primitive object={model} dispose={null} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[0.36, 0.43, 48]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color={selected ? '#06b6d4' : '#94a3b8'}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
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
