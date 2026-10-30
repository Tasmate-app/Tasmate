import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CHARACTER_DEFINITIONS, FACILITY_DEFINITIONS } from '../data/seed';
import { useAppStore } from '../stores/appStore';

const ATTRIBUTE_COLORS: Record<string, string> = {
  sun: '#f59e0b',
  moon: '#818cf8',
  star: '#f472b6',
  none: '#94a3b8',
};

/** 仮モデル（カプセル）と GLB で共通の身長 */
const CHARACTER_HEIGHT = 1.55;

function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

/** キャラクターの GLB を読み込み、身長を揃えて足元を床に合わせる */
function useCharacterModel(url: string | undefined): THREE.Group | null {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    setScene(null);
    if (url === undefined) return;

    let cancelled = false;
    let loaded: THREE.Group | null = null;

    new GLTFLoader().load(
      resolveAssetUrl(url),
      (gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const height = box.getSize(new THREE.Vector3()).y;
        if (height > 0) {
          root.scale.setScalar(CHARACTER_HEIGHT / height);
          root.updateMatrixWorld(true);
          const scaled = new THREE.Box3().setFromObject(root);
          const center = scaled.getCenter(new THREE.Vector3());
          root.position.set(-center.x, -scaled.min.y, -center.z);
        }
        loaded = root;
        setScene(root);
      },
      undefined,
      () => {
        // 読み込みに失敗した場合は仮モデルを表示し続ける
        if (!cancelled) setScene(null);
      },
    );

    return () => {
      cancelled = true;
      if (loaded !== null) disposeObject(loaded);
    };
  }, [url]);

  return scene;
}

interface RoomSceneProps {
  selectedCharacterId?: string | null;
  selectedFacilityId?: string | null;
  onSelectCharacter?: (definitionId: string) => void;
  onSelectFacility?: (definitionId: string) => void;
  /** 何もない背景をクリックしたとき（選択解除用） */
  onBackgroundClick?: () => void;
}

/** キャラ表示。GLB があればそれを使い、なければ仮モデルを出す。作業中は動きが速くなる */
function CharacterFigure({
  position,
  color,
  name,
  selected,
  working,
  modelUrl,
  onSelect,
}: {
  position: [number, number, number];
  color: string;
  name: string;
  selected: boolean;
  working: boolean;
  modelUrl?: string;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = useCharacterModel(modelUrl);
  useFrame((state) => {
    if (ref.current === null) return;
    const speed = working ? 4 : 2;
    const amp = working ? 0.09 : 0.05;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + position[0]) * amp;
  });

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group ref={ref} position={position}>
      <group
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {model !== null ? (
          <primitive object={model} />
        ) : (
          <>
            {/* 体 */}
            <mesh position={[0, 0.55, 0]}>
              <capsuleGeometry args={[0.28, 0.5, 8, 16]} />
              <meshStandardMaterial
                color={color}
                roughness={0.6}
                emissive={selected ? color : '#000000'}
                emissiveIntensity={selected ? 0.45 : 0}
              />
            </mesh>
            {/* 頭 */}
            <mesh position={[0, 1.25, 0]}>
              <sphereGeometry args={[0.26, 24, 24]} />
              <meshStandardMaterial color="#ffe4c4" roughness={0.7} />
            </mesh>
          </>
        )}
      </group>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.52, 32]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* 名前は3D内に出さず、クリック対象の対応づけは position＋id で行う（a11y は下の一覧で担保） */}
      <object3D name={name} />
    </group>
  );
}

/** 施設の仮モデル。稼働中はランプが点灯し、作業中は点滅する */
function FacilityFigure({
  position,
  definitionId,
  name,
  color,
  enabled,
  selected,
  working,
  onSelect,
}: {
  position: [number, number, number];
  definitionId: string;
  name: string;
  color: string;
  enabled: boolean;
  selected: boolean;
  working: boolean;
  onSelect: () => void;
}) {
  const lamp = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (lamp.current === null) return;
    const mat = lamp.current.material as THREE.MeshStandardMaterial;
    if (!enabled) {
      mat.emissiveIntensity = 0.05;
      return;
    }
    mat.emissiveIntensity = working
      ? 1.2 + Math.sin(state.clock.elapsedTime * 5 + position[0]) * 0.8
      : 1.0;
  });

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group position={position} name={name}>
      {/* 本体 */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.9, 1.0, 0.9]} />
        <meshStandardMaterial
          color={enabled ? color : '#64748b'}
          roughness={0.75}
          emissive={selected ? '#4f46e5' : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      {/* 屋根 */}
      <mesh position={[0, 1.15, 0]}>
        <coneGeometry args={[0.75, 0.5, 4]} />
        <meshStandardMaterial color={enabled ? '#7dd3fc' : '#cbd5e1'} roughness={0.85} />
      </mesh>
      {/* 稼働ランプ */}
      <mesh ref={lamp} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={enabled ? '#22c55e' : '#334155'}
          emissive={enabled ? '#22c55e' : '#000000'}
          emissiveIntensity={1}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.78, 32]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
        </mesh>
      )}
      <object3D name={definitionId} />
    </group>
  );
}

/** 3D部屋（ホームの主役。キャラ・施設をクリックして関連操作を開く） */
function RoomContents({ selectedCharacterId, selectedFacilityId, onSelectCharacter, onSelectFacility }: RoomSceneProps) {
  const characters = useAppStore((s) => s.characters);
  const facilities = useAppStore((s) => s.facilities);
  const activeSession = useAppStore((s) => s.activeSession);
  const working = activeSession !== null && activeSession.state === 'running';

  const facilityPositions: Array<[number, number, number]> = [
    [-3.1, 0, 1.4],
    [3.1, 0, 1.4],
  ];

  return (
    <>
      {/* 明るく柔らかいライティング（UIパレットに合わせた昼光色） */}
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#e0f2fe', '#fde68a', 0.5]} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#f3e5cd" roughness={0.9} />
      </mesh>
      {/* 奥の壁・左の壁 */}
      <mesh position={[0, 1.5, -3]}>
        <boxGeometry args={[8, 3, 0.15]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>
      <mesh position={[-4, 1.5, 0]}>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.95} />
      </mesh>
      {/* テーブル（仮・装飾） */}
      <mesh position={[1.2, 0.4, -0.8]}>
        <boxGeometry args={[1.8, 0.12, 1.0]} />
        <meshStandardMaterial color="#a5b4fc" roughness={0.8} />
      </mesh>
      {[-0.5, 0.5].map((dx) =>
        [-0.35, 0.35].map((dz) => (
          <mesh key={`${dx}:${dz}`} position={[1.2 + dx * 1.6, 0.2, -0.8 + dz]}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshStandardMaterial color="#818cf8" roughness={0.8} />
          </mesh>
        )),
      )}
      {/* ベッド（仮・装飾） */}
      <mesh position={[-2.2, 0.3, -1.8]}>
        <boxGeometry args={[2.0, 0.5, 1.2]} />
        <meshStandardMaterial color="#fbcfe8" roughness={0.9} />
      </mesh>
      {/* まくら（仮・装飾） */}
      <mesh position={[-2.8, 0.62, -1.8]}>
        <boxGeometry args={[0.5, 0.18, 0.8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* 施設（クリックで強化パネルへ） */}
      {facilities.slice(0, 2).map((f, i) => {
        const def = FACILITY_DEFINITIONS.find((d) => d.id === f.definitionId);
        return (
          <FacilityFigure
            key={f.definitionId}
            position={facilityPositions[i] ?? [0, 0, 1.4]}
            definitionId={f.definitionId}
            name={def?.name ?? f.definitionId}
            color={def?.type === 'currency' ? '#fbbf24' : '#38bdf8'}
            enabled={f.enabled}
            selected={selectedFacilityId === f.definitionId}
            working={working && f.enabled}
            onSelect={() => onSelectFacility?.(f.definitionId)}
          />
        );
      })}
      {/* 所持キャラ（クリックで育成パネルへ） */}
      {characters.slice(0, 3).map((c, i) => {
        const def = CHARACTER_DEFINITIONS.find((d) => d.id === c.definitionId);
        return (
          <CharacterFigure
            key={c.definitionId}
            position={[-1.2 + i * 1.2, 0, 0.8]}
            color={ATTRIBUTE_COLORS[def?.attribute ?? 'none']}
            name={def?.name ?? c.definitionId}
            modelUrl={def?.modelUrl}
            selected={selectedCharacterId === c.definitionId}
            working={working}
            onSelect={() => onSelectCharacter?.(c.definitionId)}
          />
        );
      })}
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={12} />
    </>
  );
}

export function RoomScene(props: RoomSceneProps) {
  const { onBackgroundClick, ...contentsProps } = props;
  return (
    <div className="room-canvas-wrap room-canvas-wrap--fill">
      <Canvas
        camera={{ position: [4.5, 3.5, 5.5], fov: 50 }}
        dpr={[1, 2]}
        onPointerMissed={() => onBackgroundClick?.()}
      >
        <color attach="background" args={['#e8f6ff']} />
        <RoomContents {...contentsProps} />
      </Canvas>
    </div>
  );
}
