import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Shuffle } from 'lucide-react';
import './index.css';

const getValidMoves = (emptyIndex) => {
  const moves = [];
  const x = emptyIndex % 3;
  const y = Math.floor(emptyIndex / 3);
  if (x > 0) moves.push(emptyIndex - 1);
  if (x < 2) moves.push(emptyIndex + 1);
  if (y > 0) moves.push(emptyIndex - 3);
  if (y < 2) moves.push(emptyIndex + 3);
  return moves;
};

const shuffleBoard = () => {
  let board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let emptyIdx = 8;
  // ランダムに100回移動させてシャッフルする（解ける状態を維持）
  for (let i = 0; i < 150; i++) {
    const moves = getValidMoves(emptyIdx);
    const move = moves[Math.floor(Math.random() * moves.length)];
    [board[emptyIdx], board[move]] = [board[move], board[emptyIdx]];
    emptyIdx = move;
  }
  return board;
};

function Block({ id, index, onClick }) {
  const meshRef = useRef();
  // 目的地の座標を計算
  const targetPos = new THREE.Vector3(
    (index % 3) - 1,
    1 - Math.floor(index / 3),
    0
  ).multiplyScalar(1.2);

  useFrame((state, delta) => {
    // スムーズに移動させる
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos, delta * 12);
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[1.1, 1.1, 0.2]}
      radius={0.1}
      smoothness={4}
      position={targetPos} // 初期位置
      onClick={() => onClick(index)}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        document.body.style.cursor = 'pointer';
        e.object.material.emissiveIntensity = 0.5;
      }}
      onPointerOut={(e) => {
        document.body.style.cursor = 'default';
        e.object.material.emissiveIntensity = 0;
      }}
    >
      <meshStandardMaterial
        color={id % 2 === 0 ? '#ff7b00' : '#ff4500'}
        roughness={0.1}
        metalness={0.5}
        emissive={id % 2 === 0 ? '#ff7b00' : '#ff4500'}
        emissiveIntensity={0}
      />
      <Text position={[0, 0, 0.11]} fontSize={0.6} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjQ.ttf">
        {id + 1}
      </Text>
    </RoundedBox>
  );
}

export default function ThreePuzzle() {
  const navigate = useNavigate();
  const [board, setBoard] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setBoard(shuffleBoard());
  }, []);

  const handleBlockClick = (index) => {
    if (isComplete) return;
    const emptyIndex = board.indexOf(8);
    if (getValidMoves(emptyIndex).includes(index)) {
      const newBoard = [...board];
      [newBoard[emptyIndex], newBoard[index]] = [newBoard[index], newBoard[emptyIndex]];
      setBoard(newBoard);
      
      if (newBoard.every((val, i) => val === i)) {
        setIsComplete(true);
      }
    }
  };

  const handleShuffle = () => {
    setBoard(shuffleBoard());
    setIsComplete(false);
  };

  return (
    <div className="app-container" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <button className="start-button" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
          <HomeIcon size={20} /> ホーム
        </button>
      </div>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button className="start-button mode-button" onClick={handleShuffle} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
          <Shuffle size={20} /> シャッフル
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
            クリア！
          </h2>
          <button className="start-button" onClick={handleShuffle} style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>
            もう一度遊ぶ
          </button>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f3ff" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ff00ff" />
        
        <group>
          {board.map((id, index) => {
            if (id === 8) return null; // 8 is the empty space
            return <Block key={id} id={id} index={index} onClick={handleBlockClick} />;
          })}
        </group>

        {/* 枠や背景などの装飾 */}
        <RoundedBox args={[4.2, 4.2, 0.1]} position={[0, 0, -0.2]} radius={0.2} smoothness={4} receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.8} metalness={0.2} />
        </RoundedBox>

        <ContactShadows position={[0, -2.5, 0]} opacity={0.3} scale={15} blur={2.5} far={4} />
        <Environment preset="city" />
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          maxPolarAngle={Math.PI / 2 + 0.2} 
          minPolarAngle={Math.PI / 4} 
          maxAzimuthAngle={Math.PI / 4} 
          minAzimuthAngle={-Math.PI / 4} 
        />
      </Canvas>
      <div style={{ position: 'absolute', bottom: '20px', left: '0', width: '100%', textAlign: 'center', color: '#64748b', pointerEvents: 'none', fontWeight: 'bold' }}>
        ブロックをクリックして空きスペースに移動させてください
      </div>
    </div>
  );
}
