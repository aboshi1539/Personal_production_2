import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, RotateCcw } from 'lucide-react';
import './index.css';

function FloatingBlock({ id, isPlaced, onClick }) {
  const meshRef = useRef();
  
  // 目標の位置 (3x3グリッド)
  const targetPos = useMemo(() => new THREE.Vector3(
    (id % 3) - 1,
    1 - Math.floor(id / 3),
    0
  ).multiplyScalar(1.5), [id]);

  // 初期位置をランダムに設定（画面外に広げすぎず、カメラから見える範囲内）
  const initialPos = useMemo(() => new THREE.Vector3(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 6 - 2
  ), []);

  // 移動の速度
  const speed = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 5
  ));
  
  // 回転の速度
  const rotSpeed = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4
  ));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (!isPlaced) {
      // 浮遊アニメーションとバウンス
      const pos = meshRef.current.position;
      pos.addScaledVector(speed.current, delta);
      
      meshRef.current.rotation.x += rotSpeed.current.x * delta;
      meshRef.current.rotation.y += rotSpeed.current.y * delta;
      meshRef.current.rotation.z += rotSpeed.current.z * delta;

      // 空間の境界で跳ね返る (X: -6 to 6, Y: -4.5 to 4.5, Z: -5 to 2)
      if (pos.x > 6 || pos.x < -6) speed.current.x *= -1;
      if (pos.y > 4.5 || pos.y < -4.5) speed.current.y *= -1;
      if (pos.z > 2 || pos.z < -5) speed.current.z *= -1;

      pos.x = THREE.MathUtils.clamp(pos.x, -6, 6);
      pos.y = THREE.MathUtils.clamp(pos.y, -4.5, 4.5);
      pos.z = THREE.MathUtils.clamp(pos.z, -5, 2);
    } else {
      // クリックされたら所定の位置にスムーズに移動・回転をリセット
      meshRef.current.position.lerp(targetPos, delta * 8);
      
      const currentRot = new THREE.Quaternion().setFromEuler(meshRef.current.rotation);
      const targetRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      currentRot.slerp(targetRot, delta * 8);
      meshRef.current.rotation.setFromQuaternion(currentRot);
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[1.4, 1.4, 0.3]}
      radius={0.15}
      smoothness={4}
      position={initialPos}
      onClick={(e) => {
        e.stopPropagation();
        if (!isPlaced) {
          document.body.style.cursor = 'default';
          onClick(id);
        }
      }}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        if (!isPlaced) {
          e.stopPropagation();
          document.body.style.cursor = 'crosshair';
          e.object.material.emissiveIntensity = 0.8;
        }
      }}
      onPointerOut={(e) => {
        if (!isPlaced) {
          document.body.style.cursor = 'default';
          e.object.material.emissiveIntensity = 0;
        }
      }}
    >
      <meshStandardMaterial
        color={id % 2 === 0 ? '#ff7b00' : '#ff4500'}
        roughness={0.1}
        metalness={0.5}
        emissive={id % 2 === 0 ? '#ff7b00' : '#ff4500'}
        emissiveIntensity={0}
      />
      <Text position={[0, 0, 0.16]} fontSize={0.9} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjQ.ttf">
        {id + 1}
      </Text>
    </RoundedBox>
  );
}

export default function CatchPuzzle() {
  const navigate = useNavigate();
  const [placedBlocks, setPlacedBlocks] = useState(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const blocks = Array.from({ length: 9 }, (_, i) => i);

  const handleBlockCatch = (id) => {
    setPlacedBlocks((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (next.size === 9) {
        setTimeout(() => setIsComplete(true), 800); // 少し待ってからクリア画面を表示
      }
      return next;
    });
  };

  const handleReset = () => {
    setPlacedBlocks(new Set());
    setIsComplete(false);
    setResetKey(k => k + 1); // ブロックの再生成（ランダム位置リセット）
  };

  return (
    <div className="app-container" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <button className="start-button" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
          <HomeIcon size={20} /> ホーム
        </button>
      </div>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button className="start-button mode-button" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
          <RotateCcw size={20} /> リセット
        </button>
      </div>
      
      {isComplete && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          background: 'rgba(255,255,255,0.95)',
          padding: '3rem',
          borderRadius: '16px',
          border: '2px solid var(--primary-glow)',
          boxShadow: '0 4px 30px rgba(255,123,0,0.2)',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ color: 'var(--primary-glow)', fontSize: '2.5rem', marginBottom: '1.5rem' }}>
            パーフェクト！
          </h2>
          <button className="start-button" onClick={handleReset} style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>
            もう一度挑戦
          </button>
        </div>
      )}

      {/* スコア表示など */}
      <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none', color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 'bold' }}>
        捕まえたピース: {placedBlocks.size} / 9
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f3ff" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ff00ff" />
        
        <group key={resetKey}>
          {blocks.map((id) => (
            <FloatingBlock
              key={id}
              id={id}
              isPlaced={placedBlocks.has(id)}
              onClick={handleBlockCatch}
            />
          ))}

          {/* ガイド枠（どこにはまるか分かりやすくする） */}
          <group position={[0, 0, -0.2]}>
            {blocks.map((id) => {
               const x = (id % 3) - 1;
               const y = 1 - Math.floor(id / 3);
               return (
                 <mesh key={`guide-${id}`} position={[x * 1.5, y * 1.5, 0]}>
                   <planeGeometry args={[1.4, 1.4]} />
                   <meshBasicMaterial color="#00f3ff" transparent opacity={0.05} wireframe />
                 </mesh>
               );
            })}
          </group>
        </group>

        <ContactShadows position={[0, -4, 0]} opacity={0.6} scale={20} blur={2.5} far={8} />
        <Environment preset="city" />
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          maxPolarAngle={Math.PI / 2 + 0.3} 
          minPolarAngle={Math.PI / 4} 
          maxAzimuthAngle={Math.PI / 3} 
          minAzimuthAngle={-Math.PI / 3} 
        />
      </Canvas>

      <div style={{ position: 'absolute', bottom: '20px', left: '0', width: '100%', textAlign: 'center', color: '#64748b', pointerEvents: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}>
        飛び回るピースをクリックしてキャッチしよう！
      </div>
    </div>
  );
}
